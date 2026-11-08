
import { createHmac, timingSafeEqual } from 'crypto';

const BASE = 'https://api.mercadopago.com/v1/orders';

export type MpOrder = {
  id?: string;
  type?: string;
  currency_id?: string;
  country_code?: string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  total_amount?: string | number;
  total_paid_amount?: string | number;
  transactions?: {
    payments?: Array<{
      id?: string;
      status?: string;
      status_detail?: string;
      amount?: string | number;
      paid_amount?: string | number;
      payment_method?: {
        id?: string;
        type?: string;
        qr_code?: string;
        qr_code_base64?: string;
      };
    }>;
  };
};

async function request(
  url: string,
  init?: RequestInit
): Promise<MpOrder> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();

  if (!token) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN ausente');
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    console.error('Mercado Pago Orders HTTP:', response.status);
    throw new Error(`Mercado Pago indisponível (${response.status})`);
  }

  return (await response.json()) as MpOrder;
}

export async function createPixOrder(args: {
  cents: number;
  email: string;
  txid: string;
}): Promise<MpOrder> {
  if (
    !Number.isSafeInteger(args.cents) ||
    args.cents < 100 ||
    !/^[A-F0-9]{24}$/.test(args.txid)
  ) {
    throw new Error('Dados inválidos para criar Pix');
  }

  const amount = (args.cents / 100).toFixed(2);

  return request(BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': args.txid,
    },
    body: JSON.stringify({
      type: 'online',
      processing_mode: 'automatic',
      total_amount: amount,
      external_reference: args.txid,
      payer: {
        email: args.email,
      },
      transactions: {
        payments: [
          {
            amount,
            payment_method: {
              id: 'pix',
              type: 'bank_transfer',
            },
          },
        ],
      },
    }),
  });
}

export async function getPixOrder(
  id: string
): Promise<MpOrder> {
  if (!/^ORD[A-Za-z0-9_-]{8,100}$/.test(id)) {
    throw new Error('ID de order inválido');
  }

  return request(`${BASE}/${encodeURIComponent(id)}`);
}

export function validOrderSignature(
  req: Request,
  orderId: string
): boolean {
  const secret =
    process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();

  const signature = req.headers.get('x-signature') || '';
  const requestId = req.headers.get('x-request-id') || '';

  const ts = signature.match(
    /(?:^|,)\s*ts=([^,]+)/
  )?.[1]?.trim();

  const hash = signature.match(
    /(?:^|,)\s*v1=([a-f0-9]{64})(?:,|$)/i
  )?.[1];

  if (
    !secret ||
    !ts ||
    !/^\d{10,16}$/.test(ts) ||
    !hash ||
    !requestId ||
    !orderId
  ) {
    return false;
  }

  const manifest =
    `id:${orderId.toLowerCase()};` +
    `request-id:${requestId};` +
    `ts:${ts};`;

  const expected = createHmac('sha256', secret)
    .update(manifest)
    .digest();

  const received = Buffer.from(hash, 'hex');

  return (
    expected.length === received.length &&
    timingSafeEqual(expected, received)
  );
}

function moneyToCents(value: unknown): number {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number'
  ) {
    return NaN;
  }

  const text = String(value);

  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    return NaN;
  }

  const [whole, decimal = ''] = text.split('.');

  const cents =
    Number(whole) * 100 +
    Number(decimal.padEnd(2, '0'));

  return Number.isSafeInteger(cents) ? cents : NaN;
}

export function isAccreditedPix(
  order: MpOrder,
  cents: number
): {
  paid: boolean;
  paymentId?: string;
} {
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    return { paid: false };
  }

  const payments = order.transactions?.payments || [];

  if (payments.length !== 1) {
    return { paid: false };
  }

  const payment = payments[0];

  const paid =
    order.type === 'online' &&
    order.status === 'processed' &&
    order.status_detail === 'accredited' &&
    (!order.currency_id || order.currency_id === 'BRL') &&
    (!order.country_code || order.country_code === 'BRA') &&
    moneyToCents(order.total_amount) === cents &&
    moneyToCents(order.total_paid_amount) === cents &&
    payment.payment_method?.id === 'pix' &&
    payment.payment_method?.type === 'bank_transfer' &&
    payment.status === 'processed' &&
    payment.status_detail === 'accredited' &&
    moneyToCents(payment.amount) === cents &&
    moneyToCents(payment.paid_amount) === cents &&
    Boolean(payment.id);

  return {
    paid,
    paymentId: paid ? payment.id : undefined,
  };
}
