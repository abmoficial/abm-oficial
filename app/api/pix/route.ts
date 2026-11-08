
import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { ensureSchema } from '../../../lib/schema';
import { makePix } from '../../../lib/pix';
import { createPixOrder } from '../../../lib/mercadopago';
import QRCode from 'qrcode';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

function respond(
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
    const mpEnabled =
      process.env.MERCADOPAGO_PIX_ENABLED === 'true';

    if (
      mpEnabled &&
      !process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()
    ) {
      return respond(
        { error: 'Pix temporariamente indisponível.' },
        503
      );
    }

    if (
      !mpEnabled &&
      (
        !process.env.PIX_KEY?.trim() ||
        !process.env.PIX_RECEIVER_NAME?.trim()
      )
    ) {
      return respond(
        { error: 'Configuração Pix incompleta.' },
        503
      );
    }

    let body: any;

    try {
      body = await req.json();
    } catch {
      return respond({ error: 'Dados inválidos.' }, 400);
    }

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return respond({ error: 'Dados inválidos.' }, 400);
    }

    const amount = Number(body.amount);
    const cents = Math.round(amount * 100);

    if (
      body.amount === null ||
      body.amount === undefined ||
      body.amount === '' ||
      !Number.isFinite(amount) ||
      !Number.isSafeInteger(cents) ||
      Math.abs(amount * 100 - cents) > 0.001 ||
      cents < 100 ||
      cents > 100000000
    ) {
      return respond(
        { error: 'Valor fora do limite permitido.' },
        400
      );
    }

    const name = String(body.name || '')
      .trim()
      .slice(0, 80);

    const message = String(body.message || '')
      .trim()
      .slice(0, 500);

    const campaignId =
      body.campaignId === null ||
      body.campaignId === undefined ||
      body.campaignId === ''
        ? null
        : Number(body.campaignId);

    if (
      campaignId !== null &&
      (
        !Number.isSafeInteger(campaignId) ||
        campaignId <= 0
      )
    ) {
      return respond(
        { error: 'Campanha inválida.' },
        400
      );
    }

    const email = String(body.email || '')
      .trim()
      .toLowerCase();

    if (
      mpEnabled &&
      (
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      )
    ) {
      return respond(
        {
          error:
            'Informe um e-mail válido para gerar o Pix.',
        },
        400
      );
    }

    await ensureSchema();

    if (campaignId !== null) {
      const campaign = await pool.query(
        `SELECT 1
         FROM campaigns
         WHERE id = $1
           AND active = true`,
        [campaignId]
      );

      if (!campaign.rowCount) {
        return respond(
          { error: 'Campanha inválida.' },
          400
        );
      }
    }

    const txid = randomBytes(12)
      .toString('hex')
      .toUpperCase();

    // PIX ANTIGO
    // Mantido enquanto Mercado Pago estiver desativado.
    if (!mpEnabled) {
      const code = makePix(cents, txid);

      const qr = await QRCode.toDataURL(code, {
        margin: 2,
        width: 320,
        errorCorrectionLevel: 'M',
      });

      await pool.query(
        `INSERT INTO contributions
         (
           amount_cents,
           donor_name,
           message,
           campaign_id,
           pix_txid,
           payment_provider
         )
         VALUES ($1, $2, $3, $4, $5, 'static_pix')`,
        [cents, name, message, campaignId, txid]
      );

      return respond({
        code,
        qr,
        receiver: process.env.PIX_RECEIVER_NAME,
        txid,
        status: 'awaiting_manual_verification',
        provider: 'static_pix',
      });
    }

    // MERCADO PAGO
    // Registrar primeiro para que o webhook consiga
    // localizar uma notificação antecipada.
    await pool.query(
      `INSERT INTO contributions
       (
         amount_cents,
         donor_name,
         message,
         campaign_id,
         pix_txid,
         payment_provider
       )
       VALUES ($1, $2, $3, $4, $5, 'mercadopago')`,
      [cents, name, message, campaignId, txid]
    );

    // Uma falha aqui não significa necessariamente
    // que a cobrança não foi criada no provedor.
    // Preservamos o registro para conciliação.
    const order = await createPixOrder({
      cents,
      email,
      txid,
    });

    if (
      !order.id ||
      order.external_reference !== txid
    ) {
      console.error(
        'Mercado Pago: pedido sem identificação válida',
        txid
      );

      return respond(
        {
          error:
            'Não foi possível concluir a geração do Pix. Tente novamente.',
        },
        502
      );
    }

    // Salvar o pedido antes de devolver o QR Code.
    await pool.query(
      `UPDATE contributions
       SET mp_order_id = $1
       WHERE pix_txid = $2
         AND payment_provider = 'mercadopago'
         AND (
           mp_order_id IS NULL OR
           mp_order_id = $1
         )`,
      [order.id, txid]
    );

    const payments = order.transactions?.payments || [];

    if (payments.length !== 1) {
      console.error(
        'Mercado Pago: quantidade inesperada de pagamentos',
        txid
      );

      return respond(
        {
          error:
            'O Pix ainda não está disponível. Tente novamente.',
        },
        502
      );
    }

    const payment = payments[0];

    const code = payment.payment_method?.qr_code;

    if (
      payment.payment_method?.id !== 'pix' ||
      payment.payment_method?.type !== 'bank_transfer' ||
      typeof code !== 'string' ||
      !code.trim()
    ) {
      console.error(
        'Mercado Pago: QR Code Pix inválido',
        txid
      );

      return respond(
        {
          error:
            'O Pix ainda não está disponível. Tente novamente.',
        },
        502
      );
    }

    const qr = await QRCode.toDataURL(code, {
      margin: 2,
      width: 320,
      errorCorrectionLevel: 'M',
    });

    return respond({
      code,
      qr,
      receiver:
        process.env.PIX_RECEIVER_NAME ||
        'Mercado Pago',
      txid,
      status: 'awaiting_manual_verification',
      provider: 'mercadopago',
    });
  } catch (error) {
    console.error(
      'PIX API error:',
      error instanceof Error
        ? error.message
        : 'Erro desconhecido'
    );

    return respond(
      {
        error:
          'Não foi possível gerar Pix. Tente novamente.',
      },
      500
    );
  }
}
