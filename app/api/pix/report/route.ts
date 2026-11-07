import { NextResponse } from 'next/server';
import { pool } from '../../../../lib/db';
import { ensureSchema } from '../../../../lib/schema';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const noStore = { 'Cache-Control': 'no-store' };
  // Bloqueia requisições cross-site quando Origin está presente.
  const origin = req.headers.get('origin');
  if (origin) {
    let requestOrigin: string;
    try { requestOrigin = new URL(req.url).origin; } catch { return NextResponse.json({ error: 'Origem inválida.' }, { status: 403, headers: noStore }); }
    if (origin !== requestOrigin) return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403, headers: noStore });
  }
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return NextResponse.json({ error: 'Formato inválido.' }, { status: 415, headers: noStore });
  try {
    const body = await req.json();
    const txid = typeof body?.txid === 'string' ? body.txid : '';
    if (!/^[A-F0-9]{24}$/.test(txid)) return NextResponse.json({ error: 'Identificador Pix inválido.' }, { status: 400, headers: noStore });
    await ensureSchema();
    const result = await pool.query(`UPDATE contributions SET payment_reported = TRUE, payment_reported_at = COALESCE(payment_reported_at, now()) WHERE pix_txid=$1 AND status='awaiting_manual_verification' RETURNING id`, [txid]);
    if (!result.rowCount) return NextResponse.json({ error: 'Pix não encontrado ou não está pendente.' }, { status: 404, headers: noStore });
    return NextResponse.json({ ok: true, message: 'Aviso registrado. Aguardando conferência bancária.' }, { headers: noStore });
  } catch (e) {
    console.error('PIX report error:', (e as Error).message);
    return NextResponse.json({ error: 'Não foi possível registrar o aviso. Tente novamente.' }, { status: 500, headers: noStore });
  }
}
