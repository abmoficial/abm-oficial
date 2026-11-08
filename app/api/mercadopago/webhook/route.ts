
import { NextResponse } from 'next/server';
import { pool } from '../../../../lib/db';
import { ensureSchema } from '../../../../lib/schema';
import {
  getPixOrder,
  isAccreditedPix,
  validOrderSignature,
} from '../../../../lib/mercadopago';

export const runtime = 'nodejs';

function json(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);

    const type = url.searchParams.get('type');
    const id = url.searchParams.get('data.id');

    if (type !== 'order' || !id) {
      return json({ ok: true });
    }

    // Nunca confiar em uma notificação sem assinatura válida.
    if (!validOrderSignature(req, id)) {
      console.warn('Mercado Pago: assinatura inválida');
      return json({ error: 'Assinatura inválida' }, 401);
    }

    // Confirma o estado diretamente na API do Mercado Pago.
    const order = await getPixOrder(id);

    if (
      order.id !== id ||
      !order.external_reference ||
      !/^[A-F0-9]{24}$/.test(order.external_reference)
    ) {
      console.warn('Mercado Pago: pedido incompatível');
      return json({ ok: true });
    }

    await ensureSchema();

    const found = await pool.query(
      `SELECT id, amount_cents, mp_order_id, status
       FROM contributions
       WHERE pix_txid = $1
         AND payment_provider = 'mercadopago'`,
      [order.external_reference]
    );

    // Se o registro ainda não estiver disponível,
    // solicitar uma nova tentativa ao provedor.
    if (!found.rowCount) {
      console.warn('Mercado Pago: doação ainda não encontrada');
      return json({ error: 'Doação não localizada' }, 503);
    }

    const contribution = found.rows[0];

    // Não permitir que outro pedido confirme esta doação.
    if (
      contribution.mp_order_id &&
      contribution.mp_order_id !== id
    ) {
      console.error('Mercado Pago: order divergente');
      return json({ error: 'Pedido incompatível' }, 409);
    }

    // Confirma valor, método Pix e crédito efetivo.
    const verified = isAccreditedPix(
      order,
      Number(contribution.amount_cents)
    );

    // Pagamento ainda não creditado: não confirmar receita.
    if (!verified.paid || !verified.paymentId) {
      return json({ ok: true, confirmed: false });
    }

    // Atualização idempotente: apenas doações pendentes.
    const updated = await pool.query(
      `UPDATE contributions
       SET
         status = 'confirmed',
         confirmed_at = COALESCE(confirmed_at, NOW()),
         mp_order_id = $1,
         mp_payment_id = $2
       WHERE id = $3
         AND payment_provider = 'mercadopago'
         AND status = 'awaiting_manual_verification'
         AND (mp_order_id IS NULL OR mp_order_id = $1)
       RETURNING id`,
      [
        id,
        verified.paymentId,
        contribution.id,
      ]
    );

    if (updated.rowCount) {
      console.info(
        'Mercado Pago: doação confirmada',
        contribution.id
      );
    }

    return json({
      ok: true,
      confirmed: Boolean(updated.rowCount),
    });
  } catch (error) {
    console.error(
      'Mercado Pago webhook:',
      error instanceof Error ? error.message : 'Erro desconhecido'
    );

    // Erros temporários devem permitir nova tentativa.
    return json({ error: 'Falha temporária' }, 500);
  }
}
