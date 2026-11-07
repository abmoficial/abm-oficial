import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import QRCode from 'qrcode';
import { pool } from '../../../lib/db';
import { makePix } from '../../../lib/pix';
import { ensureSchema } from '../../../lib/schema';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json();
    const productId = Number(body.productId);
    if (!productId) {
      return NextResponse.json({ error: 'Produto invalido' }, { status: 400 });
    }

    const pr = await pool.query(
      'SELECT * FROM shop_products WHERE id=$1 AND active=true',
      [productId]
    );
    const product = pr.rows[0];
    if (!product) {
      return NextResponse.json({ error: 'Produto nao encontrado' }, { status: 404 });
    }

    const buyerName = String(body.buyerName || '').slice(0, 80);
    const buyerEmail = String(body.buyerEmail || '').slice(0, 120);
    const recipientName = String(body.recipientName || '').slice(0, 80);
    const giftMessage = String(body.giftMessage || '').slice(0, 500);

    const txid = randomBytes(12).toString('hex').toUpperCase();
    const accessToken = randomBytes(24).toString('hex');
    const code = makePix(product.price_cents, txid);

    await pool.query(
      `INSERT INTO shop_orders
        (product_id, product_title, amount_cents, buyer_name, buyer_email,
         recipient_name, gift_message, pix_txid, access_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        product.id,
        product.title,
        product.price_cents,
        buyerName,
        buyerEmail,
        recipientName,
        giftMessage,
        txid,
        accessToken,
      ]
    );

    const qr = await QRCode.toDataURL(code, { margin: 2, width: 320 });

    return NextResponse.json(
      {
        code,
        qr,
        receiver: process.env.PIX_RECEIVER_NAME,
        amount: product.price_cents / 100,
        accessToken,
        productTitle: product.title,
        status: 'awaiting_payment',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Nao foi possivel gerar o pedido. Verifique a configuracao PIX.' },
      { status: 500 }
    );
  }
}
