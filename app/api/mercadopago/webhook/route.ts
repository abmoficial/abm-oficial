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
  if (type !== 'order' || !id) return NextResponse.json({ok:true});
  if (!validOrderSignature(req,id)) return NextResponse.json({error:'Assinatura inválida'},{status:401});
  const order = await getPixOrder(id);
  if (order.id !== id || !order.external_reference || !/^[A-F0-9]{24}$/.test(order.external_reference)) return NextResponse.json({ok:true});
  await ensureSchema();
  const found = await pool.query(`SELECT amount_cents, mp_order_id, status FROM contributions WHERE pix_txid=$1 AND payment_provider='mercadopago'`,[order.external_reference]);
  if (!found.rowCount) return NextResponse.json({ok:true});
  const row = found.rows[0];
  if (row.mp_order_id && row.mp_order_id !== id) return NextResponse.json({error:'Order não corresponde à doação'},{status:409});
  const verified = isAccreditedPix(order, Number(row.amount_cents));
  if (!verified.paid || !verified.paymentId) return NextResponse.json({ok:true});
  await pool.query(`UPDATE contributions SET status='confirmed', confirmed_at=COALESCE(confirmed_at,now()), mp_order_id=$1, mp_payment_id=$2 WHERE pix_txid=$3 AND payment_provider='mercadopago' AND status='awaiting_manual_verification' AND (mp_order_id IS NULL OR mp_order_id=$1)`,[id,verified.paymentId,order.external_reference]);
  return NextResponse.json({ok:true});
 } catch(e) { console.error('Mercado Pago webhook:',(e as Error).message); return NextResponse.json({error:'Falha temporária'},{status:500}); }
}
