import { NextResponse } from 'next/server';
import { pool } from '../../../../lib/db';
import { ensureSchema } from '../../../../lib/schema';
import { getPixOrder, isAccreditedPix, validOrderSignature } from '../../../../lib/mercadopago';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    const id = url.searchParams.get('data.id');
    if (type !== 'order' || !id) return NextResponse.json({ ok: true });
    if (!validOrderSignature(req, id)) {
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
    }

    // Não confiar no status enviado na notificação: consultar a Orders API.
    const order = await getPixOrder(id);
    if (
      order.id !== id ||
      !order.external_reference ||
      !/^[A-F0-9]{24}$/.test(order.external_reference)
    ) {
      return NextResponse.json({ ok: true });
    }

    await ensureSchema();
    const found = await pool.query(
      `SELECT id, amount_cents, mp_order_id, status
         FROM contributions
        WHERE pix_txid=$1 AND payment_provider='mercadopago'`,
      [order.external_reference],
    );

    // A notificação pode chegar antes do commit da criação da doação.
    // Retornar erro temporário permite que o provedor tente novamente.
    if (!found.rowCount) {
      console.warn('Webhook MP: doação ainda não encontrada', order.external_reference);
      return NextResponse.json({ error: 'Doação ainda não disponível' }, { status: 503 });
    }
    const contribution = found.rows[0];
    if (contribution.mp_order_id && contribution.mp_order_id !== id) {
      console.error('Webhook MP: order divergente', id);
      return NextResponse.json({ error: 'Order não corresponde à doação' }, { status: 409 });
    }

    const verified = isAccreditedPix(order, Number(contribution.amount_cents));
    if (!verified.paid || !verified.paymentId) return NextResponse.json({ ok: true });

    // A condição de status garante idempotência. O vínculo com a referência,
    // o provedor, a order e o valor foi conferido antes desta atualização.
    const result = await pool.query(
      `UPDATE contributions
          SET status='confirmed',
              confirmed_at=COALESCE(confirmed_at, now()),
              mp_order_id=$1,
              mp_payment_id=$2
        WHERE id=$3
          AND pix_txid=$4
          AND payment_provider='mercadopago'
          AND status='awaiting_manual_verification'
          AND (mp_order_id IS NULL OR mp_order_id=$1)`,
      [id, verified.paymentId, contribution.id, order.external_reference],
    );
    if (result.rowCount === 1) console.info('Webhook MP: doação confirmada', contribution.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Mercado Pago webhook:', error instanceof Error ? error.message : 'Erro desconhecido');
    return NextResponse.json({ error: 'Falha temporária' }, { status: 500 });
  }
}
