import { pool } from '../../lib/db';

const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e9e5', borderRadius: 16, padding: 22, boxShadow: '0 3px 12px rgba(20,55,44,.035)' };

export default async function FinanceDashboard({ activeProjects, galleryCount, readOnly = false }: { activeProjects: number; galleryCount: number; readOnly?: boolean }) {
  // Valores arrecadados exigem confirmação explícita no banco; PIX gerado NÃO é pagamento.
  const [pix, shop, months, recent] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS generated,
      COUNT(*) FILTER (WHERE status='confirmed')::int AS confirmed,
      COALESCE(SUM(amount_cents) FILTER (WHERE status='confirmed'),0)::bigint AS received,
      COALESCE(SUM(amount_cents) FILTER (WHERE status='awaiting_manual_verification'),0)::bigint AS pending
      FROM contributions`),
    pool.query(`SELECT COUNT(*) FILTER (WHERE status IN ('paid','delivered'))::int AS paid_orders,
      COALESCE(SUM(amount_cents) FILTER (WHERE status IN ('paid','delivered')),0)::bigint AS received
      FROM shop_orders`).catch(() => ({ rows: [{ paid_orders: 0, received: 0 }] })),
    pool.query(`WITH calendar AS (
      SELECT generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') AS month
    ) SELECT to_char(calendar.month, 'MM/YYYY') AS label,
      COALESCE((SELECT SUM(c.amount_cents) FROM contributions c WHERE c.status='confirmed' AND c.confirmed_at >= calendar.month AND c.confirmed_at < calendar.month + interval '1 month'),0)::bigint AS pix,
      COALESCE((SELECT SUM(o.amount_cents) FROM shop_orders o WHERE o.status IN ('paid','delivered') AND COALESCE(o.paid_at,o.created_at) >= calendar.month AND COALESCE(o.paid_at,o.created_at) < calendar.month + interval '1 month'),0)::bigint AS shop
      FROM calendar ORDER BY calendar.month`),
    pool.query(`SELECT action,created_at FROM audit_logs ORDER BY id DESC LIMIT 8`),
  ]);
  const p = pix.rows[0], s = shop.rows[0];
  const receivedPix = Number(p.received || 0), receivedShop = Number(s.received || 0);
  const data = months.rows.map((r: any) => ({ label: String(r.label), pix: Number(r.pix), shop: Number(r.shop) }));
  const max = Math.max(1, ...data.map((d: any) => d.pix + d.shop));
  const cards = [
    ['Receita confirmada', money(receivedPix + receivedShop), 'PIX confirmado + vendas pagas'],
    ['Doações PIX confirmadas', money(receivedPix), `${p.confirmed} doações confirmadas`],
    ['Receita da lojinha', money(receivedShop), `${s.paid_orders} pedidos pagos/entregues`],
    ['PIX aguardando verificação', money(Number(p.pending || 0)), 'Não contabilizado como receita'],
    ['Códigos PIX gerados', String(p.generated), 'Inclui códigos ainda não pagos'],
    ['Projetos ativos', String(activeProjects), 'Projetos publicados'],
    ['Itens ativos na galeria', String(galleryCount), 'Fotos e vídeos publicados'],
  ];
  return <section style={{ display: 'grid', gap: 24 }}>
    <div><h2 style={{ fontFamily: 'Georgia,serif', color: '#143b30', marginBottom: 6 }}>{readOnly ? 'Relatório financeiro • somente leitura' : 'Painel executivo'}</h2><p style={{ color: '#64746d', fontSize: 14 }}>Visão financeira e operacional • valores reais registrados no sistema</p></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14 }}>
      {cards.map(([label,value,hint]) => <article key={label} style={card}><div style={{ color: '#687a73', fontSize: 13, marginBottom: 12 }}>{label}</div><strong style={{ color: '#103b2f', fontSize: 25, overflowWrap: 'anywhere' }}>{value}</strong><div style={{ color: '#7b8984', fontSize: 12, marginTop: 10 }}>{hint}</div></article>)}
    </div>
    <div style={card}>
      <h3 style={{ color: '#173e32', marginBottom: 6 }}>Evolução das receitas confirmadas</h3>
      <p style={{ color: '#71817b', fontSize: 13, marginBottom: 18 }}>Últimos 6 meses • PIX confirmado e vendas pagas</p>
      <div style={{ display: 'flex', gap: 20, fontSize: 12, marginBottom: 16 }}><span>🟩 Doações PIX</span><span>🟨 Lojinha</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', alignItems: 'end', gap: 12, height: 230, borderBottom: '1px solid #dde5df' }}>
        {data.map(d => <div key={d.label} title={`${d.label}: PIX ${money(d.pix)}; lojinha ${money(d.shop)}`} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'end', alignItems: 'stretch', minWidth: 0 }}>
          <div style={{ fontSize: 11, color: '#64746d', textAlign: 'center', marginBottom: 6 }}>{money(d.pix + d.shop)}</div>
          <div style={{ height: `${Math.max(2, (d.pix + d.shop) / max * 175)}px`, display: 'flex', flexDirection: 'column', justifyContent: 'end', borderRadius: '6px 6px 0 0', overflow: 'hidden', background: '#e9efec' }}>
            <div style={{ height: `${d.shop / Math.max(1,d.pix+d.shop)*100}%`, background: '#cba75c' }} />
            <div style={{ height: `${d.pix / Math.max(1,d.pix+d.shop)*100}%`, background: '#217558' }} />
          </div>
        </div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: 12, marginTop: 8 }}>{data.map(d => <span key={d.label} style={{ textAlign: 'center', fontSize: 11, color: '#6b7772' }}>{d.label}</span>)}</div>
    </div>
    {!readOnly && <div style={card}><h3 style={{ color: '#173e32', marginBottom: 15 }}>Atividade recente</h3>{recent.rows.length ? recent.rows.map((r: any, i: number) => <div key={i} style={{ padding: '9px 0', borderBottom: '1px solid #edf0ed', fontSize: 13 }}><span style={{ color: '#74817c' }}>{new Date(r.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span> <strong style={{ color: '#244d40', marginLeft: 10 }}>{r.action}</strong></div>) : <p style={{ color: '#74817c' }}>Nenhuma atividade registrada.</p>}</div>}
    <p style={{ color: '#75847e', fontSize: 12 }}>Atenção: a receita representa registros marcados como confirmados/pagos no banco, não conciliação bancária automática. Confira os recebimentos com o extrato financeiro.</p>
  </section>;
}
