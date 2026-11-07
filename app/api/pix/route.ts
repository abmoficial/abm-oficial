import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { ensureSchema } from '../../../lib/schema';
import { makePix } from '../../../lib/pix';
import { createPixOrder } from '../../../lib/mercadopago';
import QRCode from 'qrcode';
import { randomBytes } from 'crypto';
export const runtime = 'nodejs';
export async function POST(req: Request) {
 try {
  const mpEnabled = process.env.MERCADOPAGO_PIX_ENABLED === 'true';
  if (mpEnabled && !process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) return NextResponse.json({error:'Pix temporariamente indisponível.'},{status:503});
  if (!mpEnabled && (!process.env.PIX_KEY?.trim() || !process.env.PIX_RECEIVER_NAME?.trim())) return NextResponse.json({error:'Pix indisponível: configuração do servidor incompleta.'},{status:503});
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({error:'Dados inválidos.'},{status:400}); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({error:'Dados inválidos.'},{status:400});
  const amount = Number(body.amount), cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || Math.abs(amount*100-cents) > .001 || cents < 100 || cents > 100000000) return NextResponse.json({error:'Valor fora do limite permitido.'},{status:400});
  const name = String(body.name || '').trim().slice(0,80), message = String(body.message || '').trim().slice(0,500);
  const campaignId = body.campaignId === null || body.campaignId === undefined || body.campaignId === '' ? null : Number(body.campaignId);
  if (campaignId !== null && (!Number.isSafeInteger(campaignId) || campaignId <= 0)) return NextResponse.json({error:'Campanha inválida.'},{status:400});
  const email = String(body.email || '').trim().toLowerCase();
  if (mpEnabled && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return NextResponse.json({error:'Informe um e-mail válido para gerar o Pix.'},{status:400});
  await ensureSchema();
  if (campaignId !== null) { const c = await pool.query('SELECT 1 FROM campaigns WHERE id=$1 AND active=true',[campaignId]); if (!c.rowCount) return NextResponse.json({error:'Campanha inválida.'},{status:400}); }
  const txid = randomBytes(12).toString('hex').toUpperCase();
  if (!mpEnabled) {
   const code = makePix(cents,txid); const qr = await QRCode.toDataURL(code,{margin:2,width:320,errorCorrectionLevel:'M'});
   await pool.query('INSERT INTO contributions (amount_cents,donor_name,message,campaign_id,pix_txid) VALUES ($1,$2,$3,$4,$5)',[cents,name,message,campaignId,txid]);
   return NextResponse.json({code,qr,receiver:process.env.PIX_RECEIVER_NAME,txid,status:'awaiting_manual_verification',provider:'static_pix'},{headers:{'Cache-Control':'no-store'}});
  }
  // Persistir antes de chamar o provedor evita perder notificações que chegam muito cedo.
  await pool.query(`INSERT INTO contributions (amount_cents,donor_name,message,campaign_id,pix_txid,payment_provider) VALUES ($1,$2,$3,$4,$5,'mercadopago')`,[cents,name,message,campaignId,txid]);
  const order = await createPixOrder({cents,email,txid});
  const payment = order.transactions?.payments?.[0];
  if (!order.id || order.external_reference !== txid || !payment?.payment_method?.qr_code || payment.payment_method.id !== 'pix') {
   console.error('Mercado Pago retornou order sem QR Code válido',order.id || 'sem id');
   return NextResponse.json({error:'O Pix ainda não está disponível. Tente novamente.'},{status:502});
  }
  await pool.query('UPDATE contributions SET mp_order_id=$1 WHERE pix_txid=$2 AND payment_provider=$3',[order.id,txid,'mercadopago']);
  const code = payment.payment_method.qr_code;
  const qr = await QRCode.toDataURL(code,{margin:2,width:320,errorCorrectionLevel:'M'});
  return NextResponse.json({code,qr,receiver:process.env.PIX_RECEIVER_NAME || 'Mercado Pago',txid,status:'awaiting_manual_verification',provider:'mercadopago'},{headers:{'Cache-Control':'no-store'}});
 } catch(e) { console.error('PIX API error:',(e as Error).message); return NextResponse.json({error:'Não foi possível gerar Pix. Tente novamente.'},{status:500,headers:{'Cache-Control':'no-store'}}); }
}
