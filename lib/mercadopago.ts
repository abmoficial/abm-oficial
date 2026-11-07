import { createHmac, timingSafeEqual } from 'crypto';
const BASE = 'https://api.mercadopago.com/v1/orders';
export type MpOrder = { id?: string; type?: string; currency_id?: string; country_code?: string; status?: string; status_detail?: string; external_reference?: string; total_amount?: string; total_paid_amount?: string; transactions?: { payments?: Array<{ id?: string; status?: string; status_detail?: string; amount?: string; paid_amount?: string; payment_method?: { id?: string; type?: string; qr_code?: string; qr_code_base64?: string } }> } };
async function request(url: string, init?: RequestInit): Promise<MpOrder> {
 const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
 if (!token) throw Error('MERCADOPAGO_ACCESS_TOKEN ausente');
 const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(init?.headers || {}) }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
 if (!r.ok) { console.error('Mercado Pago Orders HTTP', r.status); throw Error(`Mercado Pago indisponível (${r.status})`); }
 return await r.json() as MpOrder;
}
export async function createPixOrder(args: { cents: number; email: string; txid: string }): Promise<MpOrder> {
 const amount = (args.cents / 100).toFixed(2);
 return request(BASE, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': args.txid }, body: JSON.stringify({ type: 'online', processing_mode: 'automatic', total_amount: amount, external_reference: args.txid, payer: { email: args.email }, transactions: { payments: [{ amount, payment_method: { id: 'pix', type: 'bank_transfer' } }] } }) });
}
export async function getPixOrder(id: string): Promise<MpOrder> {
 if (!/^ORD[A-Za-z0-9_-]{8,100}$/.test(id)) throw Error('ID de order inválido');
 return request(`${BASE}/${encodeURIComponent(id)}`);
}
export function validOrderSignature(req: Request, orderId: string): boolean {
 const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
 const header = req.headers.get('x-signature') || '';
 const requestId = req.headers.get('x-request-id') || '';
 const ts = header.match(/(?:^|,)\s*ts=([^,]+)/)?.[1];
 const hash = header.match(/(?:^|,)\s*v1=([a-f0-9]{64})(?:,|$)/i)?.[1];
 if (!secret || !ts || !hash || !requestId || !orderId) return false;
 const manifest = `id:${orderId.toLowerCase()};request-id:${requestId};ts:${ts};`;
 const expected = createHmac('sha256', secret).update(manifest).digest('hex');
 return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(hash, 'hex'));
}
export function isAccreditedPix(order: MpOrder, cents: number): { paid: boolean; paymentId?: string } {
 const money = (value: unknown) => typeof value === 'string' && /^\d+\.\d{2}$/.test(value) ? Math.round(Number(value) * 100) : NaN;
 const payments = order.transactions?.payments || [];
 const payment = payments.length === 1 ? payments[0] : undefined;
 const paid = order.type === 'online' && order.status === 'processed' && order.status_detail === 'accredited' &&
   (!order.currency_id || order.currency_id === 'BRL') && (!order.country_code || order.country_code === 'BRA') &&
   money(order.total_amount) === cents && money(order.total_paid_amount) === cents &&
   payment?.payment_method?.id === 'pix' && payment.payment_method.type === 'bank_transfer' &&
   payment.status === 'processed' && payment.status_detail === 'accredited' && money(payment.amount) === cents && money(payment.paid_amount) === cents && Boolean(payment.id);
 return { paid: Boolean(paid), paymentId: payment?.id };
}
