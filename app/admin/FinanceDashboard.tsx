import { pool } from '../../lib/db';

export const CARD_KEYS = [
  'revenue', 'pix', 'shop', 'pending', 'generated', 'projects', 'gallery',
] as const;

export const CARD_LABELS = [
  'Receita confirmada',
  'Doações PIX confirmadas',
  'Receita da lojinha',
  'PIX aguardando verificação',
  'Códigos PIX gerados',
  'Projetos ativos',
  'Itens ativos na galeria',
] as const;

type Props = {
  activeProjects: number;
  galleryCount: number;
  readOnly?: boolean;
  visibleCards?: string[];
};

type Month = { label: string; pix: number; shop: number };
type Metric = { key: string; label: string; value: string; hint: string; accent?: boolean };

const money = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const number = (value: unknown) => Number(value || 0);

export default async function FinanceDashboard({
  activeProjects,
  galleryCount,
  readOnly = false,
  visibleCards,
}: Props) {
  // O PIX gerado é apenas uma solicitação; nunca deve ser tratado como receita.
  const [pixResult, shopResult, monthsResult, recentResult] = await Promise.allSettled([
    pool.query(`
      SELECT
        COUNT(*)::int AS generated,
        COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
        COALESCE(SUM(amount_cents) FILTER (WHERE status = 'confirmed'), 0)::bigint AS received,
        COUNT(*) FILTER (WHERE status = 'awaiting_manual_verification')::int AS pending_count,
        COALESCE(SUM(amount_cents) FILTER (WHERE status = 'awaiting_manual_verification'), 0)::bigint AS pending
      FROM contributions
    `),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('paid', 'delivered'))::int AS paid_orders,
        COALESCE(SUM(amount_cents) FILTER (WHERE status IN ('paid', 'delivered')), 0)::bigint AS received
      FROM shop_orders
    `),
    pool.query(`
      WITH calendar AS (
        SELECT generate_series(
          date_trunc('month', now()) - interval '5 months',
          date_trunc('month', now()),
          interval '1 month'
        ) AS month
      )
      SELECT
        to_char(calendar.month, 'MM/YYYY') AS label,
        COALESCE((
          SELECT SUM(c.amount_cents)
          FROM contributions c
          WHERE c.status = 'confirmed'
            AND COALESCE(c.confirmed_at, c.created_at) >= calendar.month
            AND COALESCE(c.confirmed_at, c.created_at) < calendar.month + interval '1 month'
        ), 0)::bigint AS pix,
        COALESCE((
          SELECT SUM(o.amount_cents)
          FROM shop_orders o
          WHERE o.status IN ('paid', 'delivered')
            AND COALESCE(o.paid_at, o.created_at) >= calendar.month
            AND COALESCE(o.paid_at, o.created_at) < calendar.month + interval '1 month'
        ), 0)::bigint AS shop
      FROM calendar
      ORDER BY calendar.month
    `),
    readOnly
      ? Promise.resolve({ rows: [] })
      : pool.query(`
          SELECT l.action, l.created_at, l.details, a.email, a.role
          FROM audit_logs l
          LEFT JOIN admins a ON a.id = l.actor_id
          ORDER BY l.id DESC
          LIMIT 20
        `),
  ]);

  const pixOk = pixResult.status === 'fulfilled';
  const shopOk = shopResult.status === 'fulfilled';
  const monthsOk = monthsResult.status === 'fulfilled';
  const recentOk = recentResult.status === 'fulfilled';

  if (!pixOk) console.error('Erro ao consultar indicadores PIX:', pixResult.reason);
  if (!shopOk) console.error('Erro ao consultar indicadores da loja:', shopResult.reason);
  if (!monthsOk) console.error('Erro ao consultar evolução financeira:', monthsResult.reason);
  if (!recentOk) console.error('Erro ao consultar auditoria:', recentResult.reason);

  const pix = pixOk ? pixResult.value.rows[0] : null;
  const shop = shopOk ? shopResult.value.rows[0] : null;
  const recent = recentOk ? recentResult.value.rows : [];
  const receivedPix = number(pix?.received);
  const receivedShop = number(shop?.received);

  const data: Month[] = monthsOk
    ? monthsResult.value.rows.map((row: any) => ({
        label: String(row.label),
        pix: number(row.pix),
        shop: number(row.shop),
      }))
    : [];

  const max = Math.max(1, ...data.map((month) => month.pix + month.shop));
  const allowed = (key: string) => !visibleCards || visibleCards.includes(key);

  const metrics: Metric[] = [
    {
      key: 'revenue',
      label: CARD_LABELS[0],
      value: pixOk && shopOk ? money(receivedPix + receivedShop) : 'Indisponível',
      hint: 'PIX confirmado + vendas pagas',
      accent: true,
    },
    {
      key: 'pix',
      label: CARD_LABELS[1],
      value: pixOk ? money(receivedPix) : 'Indisponível',
      hint: pixOk ? `${number(pix?.confirmed)} doações confirmadas` : 'Falha na consulta PIX',
    },
    {
      key: 'shop',
      label: CARD_LABELS[2],
      value: shopOk ? money(receivedShop) : 'Indisponível',
      hint: shopOk ? `${number(shop?.paid_orders)} pedidos pagos/entregues` : 'Falha na consulta da loja',
    },
    {
      key: 'pending',
      label: CARD_LABELS[3],
      value: pixOk ? money(number(pix?.pending)) : 'Indisponível',
      hint: pixOk
        ? `${number(pix?.pending_count)} solicitações • não contabilizadas como receita`
        : 'Falha na consulta PIX',
    },
    {
      key: 'generated',
      label: CARD_LABELS[4],
      value: pixOk ? String(number(pix?.generated)) : 'Indisponível',
      hint: 'Inclui códigos ainda não pagos',
    },
    {
      key: 'projects',
      label: CARD_LABELS[5],
      value: String(activeProjects),
      hint: 'Projetos publicados',
    },
    {
      key: 'gallery',
      label: CARD_LABELS[6],
      value: String(galleryCount),
      hint: 'Fotos e vídeos publicados',
    },
  ];

  const displayed = metrics.filter((metric) => allowed(metric.key));
  const showEvolution = allowed('evolution');

  return (
    <section className="abm-finance">
      <style>{`
        .abm-finance, .abm-finance * { box-sizing: border-box; }
        .abm-finance { width: 100%; min-width: 0; max-width: 100%; display: grid; gap: 22px; }
        .abm-finance h2, .abm-finance h3, .abm-finance p { margin-top: 0; }
        .abm-finance__title { color: #143b30; font: 700 clamp(23px, 4vw, 30px)/1.2 Georgia, serif; margin-bottom: 7px; overflow-wrap: anywhere; }
        .abm-finance__subtitle { color: #64746d; font-size: 14px; line-height: 1.6; margin-bottom: 0; }
        .abm-finance__grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; min-width: 0; }
        .abm-finance__card { background: #fff; border: 1px solid #e2e9e5; border-radius: 16px; padding: 20px; min-width: 0; max-width: 100%; box-shadow: 0 3px 12px rgba(20,55,44,.035); overflow-wrap: anywhere; }
        .abm-finance__card--accent { border-color: #c7ddd2; background: linear-gradient(135deg, #fff, #f3f9f5); }
        .abm-finance__label { color: #687a73; font-size: 13px; line-height: 1.45; margin-bottom: 11px; }
        .abm-finance__value { display: block; color: #103b2f; font-size: clamp(20px, 2.3vw, 27px); line-height: 1.3; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
        .abm-finance__hint { color: #7b8984; font-size: 12px; line-height: 1.5; margin-top: 10px; }
        .abm-finance__panel { background: #fff; border: 1px solid #e2e9e5; border-radius: 16px; padding: 22px; min-width: 0; max-width: 100%; }
        .abm-finance__panel h3 { color: #173e32; font-size: 18px; margin-bottom: 7px; }
        .abm-finance__legend { display: flex; flex-wrap: wrap; gap: 10px 20px; margin: 16px 0; color: #596c62; font-size: 12px; }
        .abm-finance__swatch { display: inline-block; width: 11px; height: 11px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
        .abm-finance__chart-scroll { max-width: 100%; overflow-x: auto; overflow-y: hidden; padding-bottom: 8px; }
        .abm-finance__chart { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); align-items: end; gap: 12px; min-width: 490px; height: 235px; border-bottom: 1px solid #dde5df; }
        .abm-finance__bar-group { height: 100%; min-width: 0; display: flex; flex-direction: column; justify-content: flex-end; }
        .abm-finance__bar-value { text-align: center; color: #64746d; font-size: 11px; white-space: nowrap; margin-bottom: 6px; }
        .abm-finance__bar { display: flex; flex-direction: column; justify-content: flex-end; overflow: hidden; border-radius: 6px 6px 0 0; background: #e9efec; }
        .abm-finance__months { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; min-width: 490px; margin-top: 8px; }
        .abm-finance__months span { text-align: center; font-size: 11px; color: #6b7772; }
        .abm-finance__audit { display: grid; gap: 0; }
        .abm-finance__audit-item { display: flex; flex-wrap: wrap; gap: 5px 12px; padding: 12px 0; border-bottom: 1px solid #edf0ed; font-size: 13px; line-height: 1.5; min-width: 0; overflow-wrap: anywhere; }
        .abm-finance__notice { color: #75847e; font-size: 12px; line-height: 1.6; margin-bottom: 0; }
        .abm-finance__warning { padding: 13px 16px; background: #fff8e8; border: 1px solid #efdfb5; border-radius: 12px; color: #76591b; font-size: 13px; line-height: 1.5; }
        @media (max-width: 1100px) { .abm-finance__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 600px) {
          .abm-finance { gap: 17px; }
          .abm-finance__grid { grid-template-columns: minmax(0, 1fr); gap: 11px; }
          .abm-finance__card, .abm-finance__panel { padding: 16px; border-radius: 14px; }
          .abm-finance__value { font-size: 25px; }
          .abm-finance__chart { min-width: 450px; gap: 9px; }
          .abm-finance__months { min-width: 450px; gap: 9px; }
        }
      `}</style>

      <header>
        <h2 className="abm-finance__title">
          {readOnly ? 'Relatório financeiro' : 'Painel executivo'}
        </h2>
        <p className="abm-finance__subtitle">
          {readOnly ? 'Consulta somente leitura' : 'Visão financeira e operacional'}
          {' • '}Dados registrados no sistema
        </p>
      </header>

      {(!pixOk || !shopOk || !monthsOk) && (
        <div className="abm-finance__warning" role="status">
          Alguns indicadores não puderam ser carregados. Os valores indisponíveis não foram substituídos por zero.
          Verifique os logs do servidor e a conexão com o banco.
        </div>
      )}

      {displayed.length > 0 ? (
        <div className="abm-finance__grid">
          {displayed.map((metric) => (
            <article
              key={metric.key}
              className={`abm-finance__card${metric.accent ? ' abm-finance__card--accent' : ''}`}
            >
              <div className="abm-finance__label">{metric.label}</div>
              <strong className="abm-finance__value">{metric.value}</strong>
              <div className="abm-finance__hint">{metric.hint}</div>
            </article>
          ))}
        </div>
      ) : (
        <p className="abm-finance__notice">Nenhum indicador foi habilitado para este perfil.</p>
      )}

      {showEvolution && (
        <section className="abm-finance__panel">
          <h3>Evolução das receitas confirmadas</h3>
          <p className="abm-finance__subtitle">Últimos 6 meses • valores confirmados no banco</p>
          <div className="abm-finance__legend">
            <span><i className="abm-finance__swatch" style={{ background: '#217558' }} />Doações PIX</span>
            <span><i className="abm-finance__swatch" style={{ background: '#cba75c' }} />Lojinha</span>
          </div>
          {monthsOk ? (
            <div className="abm-finance__chart-scroll" aria-label="Gráfico financeiro dos últimos seis meses">
              <div className="abm-finance__chart">
                {data.map((month) => {
                  const total = month.pix + month.shop;
                  const height = total > 0 ? Math.max(8, (total / max) * 170) : 3;
                  return (
                    <div
                      key={month.label}
                      className="abm-finance__bar-group"
                      title={`${month.label}: PIX ${money(month.pix)}; lojinha ${money(month.shop)}`}
                    >
                      <div className="abm-finance__bar-value">{money(total)}</div>
                      <div className="abm-finance__bar" style={{ height }}>
                        <div style={{ height: `${total ? (month.shop / total) * 100 : 0}%`, background: '#cba75c' }} />
                        <div style={{ height: `${total ? (month.pix / total) * 100 : 0}%`, background: '#217558' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="abm-finance__months">
                {data.map((month) => <span key={month.label}>{month.label}</span>)}
              </div>
            </div>
          ) : (
            <p className="abm-finance__notice">Não foi possível carregar o histórico mensal.</p>
          )}
          {monthsOk && data.every((month) => month.pix + month.shop === 0) && (
            <p className="abm-finance__notice" style={{ marginTop: 12 }}>
              Ainda não há receitas confirmadas neste período.
            </p>
          )}
        </section>
      )}

      {!readOnly && (
        <section className="abm-finance__panel">
          <h3>Atividade recente</h3>
          {recentOk ? (
            recent.length > 0 ? (
              <div className="abm-finance__audit">
                {recent.map((entry: any, index: number) => (
                  <div key={index} className="abm-finance__audit-item">
                    <time style={{ color: '#74817c' }}>
                      {new Date(entry.created_at).toLocaleString('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                      })}
                    </time>
                    <strong style={{ color: '#244d40' }}>{entry.action}</strong>
                    <span>{entry.email || 'Conta removida'} ({entry.role || '—'})</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="abm-finance__notice">Nenhuma atividade registrada.</p>
            )
          ) : (
            <p className="abm-finance__notice">Histórico de atividades indisponível.</p>
          )}
        </section>
      )}

      <p className="abm-finance__notice">
        Receita confirmada representa registros marcados como confirmados ou pagos no banco de dados.
        Não há conciliação bancária automática. Confira os recebimentos com o extrato financeiro.
      </p>
    </section>
  );
}
