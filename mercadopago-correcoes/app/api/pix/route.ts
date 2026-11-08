import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { ensureSchema } from '../../../lib/schema';
import { makePix } from '../../../lib/pix';
import { createPixOrder } from '../../../lib/mercadopago';
import QRCode from 'qrcode';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

export async function POST(req: Request) {
  try {
    const mpEnabled = process.env.MERCADOPAGO_PIX_ENABLED === 'true';
    if (mpEnabled && !process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) {
      return NextResponse.json({ error: 'Pix temporariamente indisponível.' }, { status: 503, headers: noStore });
    }
    if (!mpEnabled && (!process.env.PIX_KEY?.trim() || !process.env.PIX_RECEIVER_NAME?.trim())) {
      return NextResponse.json({ error: 'Pix indisponível: configuração do servidor incompleta.' }, { status: 503, headers: noStore });
    }

    let body: any;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400, headers: noStore });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400, headers: noStore });
    }
    const amount = Number(body.amount);
    const cents = Math.round(amount * 100);
    if (!Number.isFinite(amount) || Math.abs(amount * 100 - cents) > 0.001 || cents < 100 || cents > 100000000) {
      return NextResponse.json({ error: 'Valor fora do limite permitido.' }, { status: 400, headers: noStore });
    }
    const name = String(body.name || '').trim().slice(0, 80);
    const message = String(body.message || '').trim().slice(0, 500);
    const campaignId = body.campaignId == null || body.campaignId === '' ? null : Number(body.campaignId);
    if (campaignId !== null && (!Number.isSafeInteger(campaignId) || campaignId <= 0)) {
      return NextResponse.json({ error: 'Campanha inválida.' }, { status: 400, headers: noStore });
    }
    const email = String(body.email || '').trim().toLowerCase();
    if (mpEnabled && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return NextResponse.json({ error: 'Informe um e-mail válido para gerar o Pix.' }, { status: 400, headers: noStore });
    }

    await ensureSchema();
    if (campaignId !== null) {
      const campaign = await pool.query('SELECT 1 FROM campaigns WHERE id=$1 AND active=true', [campaignId]);
      if (!campaign.rowCount) return NextResponse.json({ error: 'Campanha inválida.' }, { status: 400, headers: noStore });
    }

    const txid = randomBytes(12).toString('hex').toUpperCase();
    if (!mpEnabled) {
      const code = makePix(cents, txid);
      const qr = await QRCode.toDataURL(code, { margin: 2, width: 320, errorCorrectionLevel: 'M' });
      await pool.query(
        'INSERT INTO contributions (amount_cents,donor_name,message,campaign_id,pix_txid) VALUES ($1,$2,$3,$4,$5)',
        [cents, name, message, campaignId, txid],
      );
      return NextResponse.json({ code, qr, receiver: process.env.PIX_RECEIVER_NAME, txid, status: 'awaiting_manual_verification', provider: 'static_pix' }, { headers: noStore });
    }

    // Primeiro criar a referência local. Se o provedor responder lentamente,
    // o webhook já terá um registro com o qual conciliar o pagamento.
    await pool.query(
      `INSERT INTO contributions (amount_cents,donor_name,message,campaign_id,pix_txid,payment_provider)
       VALUES ($1,$2,$3,$4,$5,'mercadopago')`,
      [cents, name, message, campaignId, txid],
    );

    let order;
    try {
      order = await createPixOrder({ cents, email, txid });
    } catch (error) {
      // Uma falha de rede NÃO prova que a order não foi criada.
      // Preservar a referência para auditoria e eventual conciliação.
      console.error('Falha ao criar order Mercado Pago', txid, error instanceof Error ? error.message : 'Erro desconhecido');
      return NextResponse.json({ error: 'Não foi possível gerar o Pix agora. Tente novamente.' }, { status: 502, headers: noStore });
    }

    const payment = order.transactions?.payments?.[0];
    if (
      !order.id ||
      order.external_reference !== txid ||
      !payment?.payment_method?.qr_code ||
      payment.payment_method.id !== 'pix' ||
      payment.payment_method.type !== 'bank_transfer'
    ) {
      console.error('Mercado Pago retornou order sem QR Code válido', txid, order.id || 'sem id');
      // Persistir ID da order conhecida mesmo que não haja QR válido.
      if (order.id) {
        await pool.query(
          `UPDATE contributions SET mp_order_id=$1
           WHERE pix_txid=$2 AND payment_provider='mercadopago' AND (mp_order_id IS NULL OR mp_order_id=$1)`,
          [order.id, txid],
        );
      }
      return NextResponse.json({ error: 'O Pix ainda não está disponível. Tente novamente.' }, { status: 502, headers: noStore });
    }

    await pool.query(
      `UPDATE contributions SET mp_order_id=$1
       WHERE pix_txid=$2 AND payment_provider='mercadopago' AND (mp_order_id IS NULL OR mp_order_id=$1)`,
      [order.id, txid],
    );
    const code = payment.payment_method.qr_code;
    const qr = await QRCode.toDataURL(code, { margin: 2, width: 320, errorCorrectionLevel: 'M' });
    return NextResponse.json({ code, qr, receiver: process.env.PIX_RECEIVER_NAME || 'Mercado Pago', txid, status: 'awaiting_manual_verification', provider: 'mercadopago' }, { headers: noStore });
  } catch (error) {
    console.error('PIX API error:', error instanceof Error ? error.message : 'Erro desconhecido');
    return NextResponse.json({ error: 'Não foi possível gerar Pix. Tente novamente.' }, { status: 500, headers: noStore });
  }
}
