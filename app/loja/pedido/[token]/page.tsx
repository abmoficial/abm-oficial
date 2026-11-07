import { headers } from 'next/headers';
import { pool } from '../../../../lib/db';
import { ensureSchema } from '../../../../lib/schema';
import AutoRefresh from './AutoRefresh';

export const dynamic = 'force-dynamic';

export default async function PedidoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  await ensureSchema();
  const r = await pool
    .query(
      `SELECT o.*, p.digital_content, p.digital_file_url, p.digital_file_key, p.cover_image, p.product_type,
            f.original_name AS file_name, f.size_bytes AS file_size
     FROM shop_orders o
     LEFT JOIN shop_products p ON p.id = o.product_id
     LEFT JOIN shop_files f ON f.key = p.digital_file_key
     WHERE o.access_token = $1`,
      [token]
    )
    .catch(() => ({ rows: [] }));

  const order = r.rows[0];

  if (!order) {
    return (
      <main className="container" style={{ padding: '80px 0' }}>
        <div className="panel">
          <h1>Pedido não encontrado</h1>
          <p className="muted">Verifique o link ou volte a lojinha.</p>
          <a href="/loja" className="btn btn-primary">
            Ir para a lojinha
          </a>
        </div>
      </main>
    );
  }

  const paid = order.status === 'paid' || order.status === 'delivered';
  const h = await headers();
  const host = h.get('host') || 'localhost:3000';
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  const link = `${proto}://${host}/loja/pedido/${token}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(
    `${order.recipient_name ? order.recipient_name + ', ' : ''}você recebeu um presente digital! Abra aqui: ${link}`
  )}`;

  return (
    <main style={{ background: '#f7faf9', minHeight: '100vh', padding: '48px 0' }}>
      <div className="container" style={{ maxWidth: 640 }}>
        <a href="/loja" className="muted small">
          ← Voltar à lojinha
        </a>
        <div className="panel" style={{ marginTop: 16 }}>
          <p className="muted small">Pedido digital</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>{order.product_title}</h1>
          <p>
            Valor:{' '}
            <strong>
              {(order.amount_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </strong>
          </p>
          <p className="muted small">Status: {labelStatus(order.status)}</p>

          {order.recipient_name && (
            <p style={{ marginTop: 12 }}>
              Presente para: <strong>{order.recipient_name}</strong>
            </p>
          )}
          {order.gift_message && (
            <blockquote
              style={{
                marginTop: 12,
                padding: 16,
                background: '#f0f7f4',
                borderRadius: 12,
                fontStyle: 'italic',
              }}
            >
              “{order.gift_message}”
            </blockquote>
          )}

          {paid ? (
            <div style={{ marginTop: 24, padding: 20, background: '#e8f5e9', borderRadius: 16 }}>
              <h2 style={{ marginBottom: 12 }}>Seu produto digital</h2>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {order.digital_content || 'Conteúdo liberado. Obrigado pela contribuição!'}
              </p>
              {order.digital_file_key ? (
                <a
                  href={`/api/shop/download/${token}`}
                  className="btn btn-primary"
                  style={{ marginTop: 16, display: 'inline-block' }}
                >
                  ⬇ Baixar {order.file_name || 'arquivo'}
                  {order.file_size ? ` (${(Number(order.file_size) / 1024 / 1024).toFixed(1).replace('.', ',')} MB)` : ''}
                </a>
              ) : (
                order.digital_file_url && (
                  <a href={order.digital_file_url} className="btn btn-primary" style={{ marginTop: 16 }} target="_blank" rel="noreferrer">
                    Baixar arquivo
                  </a>
                )
              )}
              {(order.recipient_name || order.gift_message) && (
                <p style={{ marginTop: 16 }}>
                  <a href={wa} target="_blank" rel="noreferrer" className="btn btn-outline">
                    💬 Enviar este presente pelo WhatsApp
                  </a>
                </p>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 24, padding: 20, background: '#fff8e6', borderRadius: 16 }}>
              <h3 style={{ marginBottom: 8 }}>Aguardando confirmação</h3>
              <p className="muted">
                Pague o PIX gerado e aguarde a associação confirmar o recebimento no painel. Depois desta
                confirmação, o conteúdo digital aparece aqui automaticamente.
              </p>
              <p className="small muted" style={{ marginTop: 12 }}>
                TXID: <code>{order.pix_txid}</code>
              </p>
              <p className="small muted" style={{ marginTop: 8 }}>Esta página atualiza sozinha a cada 15 segundos.</p>
              <AutoRefresh />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function labelStatus(s: string) {
  const map: Record<string, string> = {
    awaiting_payment: 'Aguardando pagamento',
    paid: 'Pago',
    delivered: 'Entregue (digital)',
    cancelled: 'Cancelado',
  };
  return map[s] || s;
}
