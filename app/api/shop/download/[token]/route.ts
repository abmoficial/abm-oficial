import { readFile } from 'fs/promises';
import path from 'path';
import { pool } from '../../../../../lib/db';
import { ensureSchema } from '../../../../../lib/schema';
import { KEY_RE, safeName, storageDir } from '../../../../../lib/shopfiles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Só entrega o arquivo se o pedido estiver pago/entregue. O arquivo nunca fica em /public.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) return new Response('Link inválido', { status: 404 });
  await ensureSchema();

  const r = await pool
    .query(
      `SELECT o.status, f.key, f.original_name, f.mime_type
         FROM shop_orders o
         JOIN shop_products p ON p.id = o.product_id
         JOIN shop_files f ON f.key = p.digital_file_key
        WHERE o.access_token = $1`,
      [token]
    )
    .catch(() => ({ rows: [] as any[] }));
  const row = r.rows[0];
  if (!row) return new Response('Arquivo não encontrado', { status: 404 });
  if (!['paid', 'delivered'].includes(row.status)) {
    return new Response('Pagamento ainda não confirmado', { status: 403 });
  }
  if (!KEY_RE.test(row.key)) return new Response('Arquivo inválido', { status: 404 });

  try {
    const buf = await readFile(path.join(storageDir(), row.key));
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': row.mime_type,
        'Content-Length': String(buf.length),
        'Content-Disposition': `attachment; filename="${safeName(row.original_name)}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new Response('Arquivo indisponível. Fale com a associação.', { status: 404 });
  }
}
