import { redirect } from 'next/navigation';
import { getAdmin, canAccess } from '../../lib/auth';
import { pool } from '../../lib/db';
import {
  addCampaign, toggleCampaign, deleteCampaign, logout,
  addStory, toggleStory, deleteStory,
  addImpact, toggleImpact, deleteImpact,
  addCarousel, toggleCarousel, deleteCarousel,
  addPreset, togglePreset, deletePreset,
  addShopProduct, updateShopProduct, toggleShopProduct, deleteShopProduct, markShopOrderPaid, confirmPixDonation,
} from './actions';
import StoryForm from './StoryForm';
import CarouselForm from './CarouselForm';
import SiteForm from './SiteForm';
import CampaignForm from './CampaignForm';
import ImpactCard from './ImpactCard';
import ShopProductForm from './ShopProductForm';
import TeamPanel from './TeamPanel';
import { updateOwnProfile } from './team-actions';
import FinanceDashboard from './FinanceDashboard';
import { ensureSchema } from '../../lib/schema';

export const dynamic = 'force-dynamic';

export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await ensureSchema();
  const a = await getAdmin();
  if (!a) redirect('/login');
  const sp = await searchParams;
  const tab = sp.tab || (a.role === 'admin' ? 'dashboard' : 'site');

  const s = (await pool.query('SELECT * FROM site_settings WHERE id=1')).rows[0] || {};
  const campaigns = (await pool.query('SELECT * FROM campaigns ORDER BY id DESC')).rows;
  const contributions = (await pool.query("SELECT * FROM contributions ORDER BY CASE WHEN status='awaiting_manual_verification' AND payment_reported THEN 0 WHEN status='awaiting_manual_verification' THEN 1 ELSE 2 END, created_at DESC LIMIT 100")).rows;
  const stories = (await pool.query('SELECT * FROM stories ORDER BY sort_order, id').catch(() => ({ rows: [] }))).rows;
  const stats = (await pool.query('SELECT * FROM impact_stats ORDER BY sort_order, id').catch(() => ({ rows: [] }))).rows;
  const carousel = (await pool.query('SELECT * FROM carousel_items ORDER BY sort_order, id').catch(() => ({ rows: [] }))).rows;
  const presets = (await pool.query('SELECT * FROM donation_presets ORDER BY sort_order, id').catch(() => ({ rows: [] }))).rows;
  const logs = (await pool.query('SELECT action, created_at FROM audit_logs ORDER BY id DESC LIMIT 12')).rows;
  const shopProducts = (await pool.query('SELECT * FROM shop_products ORDER BY sort_order, id').catch(() => ({ rows: [] }))).rows;
  const shopOrders = (await pool.query('SELECT * FROM shop_orders ORDER BY created_at DESC LIMIT 40').catch(() => ({ rows: [] }))).rows;
  const shopFiles: Record<string, { original_name: string; size_bytes: number }> = {};
  (await pool.query('SELECT key, original_name, size_bytes FROM shop_files').catch(() => ({ rows: [] as any[] }))).rows.forEach(
    (f: any) => { shopFiles[f.key] = f; }
  );
  const shopAgg = (
    await pool
      .query(
        `SELECT COUNT(*) FILTER (WHERE status='awaiting_payment')::int AS pending,
                COUNT(*) FILTER (WHERE status IN ('paid','delivered'))::int AS done,
                COALESCE(SUM(amount_cents) FILTER (WHERE status IN ('paid','delivered')),0)::bigint AS total
           FROM shop_orders`
      )
      .catch(() => ({ rows: [{ pending: 0, done: 0, total: 0 }] }))
  ).rows[0];
  const shopStats = { pending: Number(shopAgg.pending), done: Number(shopAgg.done), total: Number(shopAgg.total) };
  const editable = a.role !== 'editor';
  const members = ['admin','director'].includes(a.role) ? (await pool.query("SELECT id,email,role,active,permissions FROM admins WHERE role = ANY($1::text[]) ORDER BY id DESC",[a.role === 'admin' ? ['director','staff'] : ['staff']])).rows : [];
  const totalCents = contributions.reduce((acc: number, c: any) => acc + Number(c.amount_cents || 0), 0);

  const tabs = [
    { id: 'dashboard', label: 'Painel' },
    { id: 'finance', label: 'Relatório financeiro' },
    { id: 'site', label: 'Textos do site' },
    { id: 'stories', label: 'Histórias' },
    { id: 'impact', label: 'Impacto' },
    { id: 'carousel', label: 'Galeria / Vídeos' },
    { id: 'campaigns', label: 'Projetos' },
    { id: 'presets', label: 'Valores PIX' },
    { id: 'donations', label: 'Doações' },
    { id: 'shop', label: 'Lojinha' },
    { id: 'team', label: 'Equipe e Acessos' },
    { id: 'profile', label: 'Editar meu perfil' },
  ].filter(t => t.id === 'profile' ? true : t.id === 'dashboard' ? a.role === 'admin' : (t.id === 'team' ? ['admin','director'].includes(a.role) : (t.id === 'finance' ? a.role === 'director' : canAccess(a,t.id as any))));
  if (!tabs.some(t => t.id === tab)) redirect(a.role === 'admin' ? '/admin?tab=dashboard' : '/admin?tab=site');

  return (
    <main style={{ background: '#f0f4f3', minHeight: '100vh' }}>
      <header style={{ background: 'var(--verde-escuro)', color: 'white', padding: '16px 0', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <strong style={{ fontSize: '1.15rem' }}>{s.site_name || 'Associacao'}</strong>
            <span style={{ opacity: 0.65, marginLeft: 12, fontSize: '0.85rem' }}>{a.email} · {a.role}</span>
          </div>
          <div className="actions">
            <a href="/" className="btn" style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 18px' }}>Ver site</a>
            <form action={logout}>
              <button className="btn" style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.25)', padding: '10px 18px' }}>Sair</button>
            </form>
          </div>
        </div>
      </header>

      <div style={{ background: 'white', borderBottom: '1px solid #e2e8e6', position: 'sticky', top: 64, zIndex: 40 }}>
        <div className="container" style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
          {tabs.map((t) => (
            <a
              key={t.id}
              href={`/admin?tab=${t.id}`}
              style={{
                padding: '14px 18px',
                fontSize: '0.9rem',
                fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? 'var(--verde)' : 'var(--texto-claro)',
                borderBottom: tab === t.id ? '3px solid var(--verde)' : '3px solid transparent',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </a>
          ))}
        </div>
      </div>

      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
        {tab === 'profile' && <section style={{background:'white',padding:24,borderRadius:14,maxWidth:650}}><h2>Editar meu perfil</h2><p>Altere seu e-mail e, opcionalmente, sua senha. Confirme com a senha atual.</p><form action={updateOwnProfile} style={{display:'grid',gap:14}}><label>E-mail<input name="email" type="email" defaultValue={a.email} required style={{display:'block',padding:12,width:'100%'}}/></label><label>Senha atual<input name="currentPassword" type="password" required style={{display:'block',padding:12,width:'100%'}}/></label><label>Nova senha (opcional, mínimo 12 caracteres)<input name="newPassword" type="password" minLength={12} style={{display:'block',padding:12,width:'100%'}}/></label><button className="btn" type="submit">Salvar meu perfil</button></form></section>}
        {tab === 'team' && ['admin','director'].includes(a.role) && <TeamPanel members={members} viewerRole={a.role} />}
        {tab === 'finance' && a.role === 'director' && <FinanceDashboard activeProjects={campaigns.filter((c: any) => c.active).length} galleryCount={carousel.filter((c: any) => c.active).length} readOnly visibleCards={a.permissions?.includes('cards:configured') ? a.permissions.filter((x:string)=>x.startsWith('card:')).map((x:string)=>x.slice(5)) : undefined} />}
        {tab === 'dashboard' && a.role === 'admin' && <><div style={{background:'white',borderRadius:14,padding:20,marginBottom:18}}><h3>Equipe cadastrada</h3><p><strong>{members.filter((m:any)=>m.role==='director').length}</strong> diretores · <strong>{members.filter((m:any)=>m.role==='staff').length}</strong> staffs · <strong>{members.filter((m:any)=>m.active).length}</strong> contas ativas</p><a href="/admin?tab=team">Gerenciar equipe e permissões</a></div><FinanceDashboard activeProjects={campaigns.filter((c: any) => c.active).length} galleryCount={carousel.filter((c: any) => c.active).length} /></>}

        {tab === 'site' && (
          <>
            <h2 style={h2}>Textos e identidade do site</h2>
            <p className="muted" style={{ marginBottom: 24 }}>
              Logo e banner com upload. Textos editaveis. Clique em Salvar tudo ao final.
            </p>
            <div className="panel">
              <SiteForm s={s} />
            </div>
          </>
        )}

        {tab === 'stories' && (
          <>
            <h2 style={h2}>Historias e depoimentos</h2>
            {editable && (
              <div className="panel">
                <h3 style={{ marginBottom: 16 }}>Adicionar historia</h3>
                <StoryForm />
              </div>
            )}
            <div className="grid">
              {stories.map((st: any) => (
                <div className="panel" key={st.id} style={{ margin: 0 }}>
                  {st.image_url ? (
                    <img src={st.image_url} alt={st.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', marginBottom: 12 }} />
                  ) : (
                    <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>{st.emoji}</div>
                  )}
                  <h3>{st.name}</h3>
                  <p className="muted small">{st.role}</p>
                  <p style={{ margin: '10px 0', fontSize: '0.95rem' }}>&ldquo;{st.quote}&rdquo;</p>
                  <p style={{ fontSize: '0.85rem', marginBottom: 12 }}>
                    {st.active ? <span style={{ color: '#177345' }}>● Visivel</span> : <span style={{ color: '#999' }}>○ Oculto</span>}
                  </p>
                  <div className="actions">
                    <form action={toggleStory}>
                      <input type="hidden" name="id" value={st.id} />
                      <button className="btn btn-outline" type="submit">{st.active ? 'Ocultar' : 'Mostrar'}</button>
                    </form>
                    {a.role === 'admin' && (
                      <form action={deleteStory}>
                        <input type="hidden" name="id" value={st.id} />
                        <button className="btn" type="submit" style={{ background: '#fee', color: '#a00' }}>Excluir</button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
              {stories.length === 0 && <p className="muted">Nenhuma historia ainda.</p>}
            </div>
          </>
        )}

        {tab === 'impact' && (
          <>
            <h2 style={h2}>Numeros de impacto</h2>
            {editable && (
              <div className="panel">
                <form action={addImpact} style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
                  <label className="field" style={{ color: 'var(--texto)' }}>
                    <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Icone (emoji)</span>
                    <input name="icon" defaultValue="⭐" style={inp} />
                  </label>
                  <label className="field" style={{ color: 'var(--texto)' }}>
                    <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Valor (ex: 3.800+)</span>
                    <input name="value" required style={inp} />
                  </label>
                  <label className="field" style={{ color: 'var(--texto)' }}>
                    <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Rotulo</span>
                    <input name="label" required style={inp} />
                  </label>
                  <button className="btn btn-primary" type="submit">Adicionar estatistica</button>
                </form>
              </div>
            )}
            <div className="grid">
              {stats.map((st: any) => (
                <ImpactCard key={st.id} item={st} canDelete={a.role === 'admin'} />
              ))}
              {stats.length === 0 && <p className="muted">Nenhuma estatistica ainda.</p>}
            </div>
          </>
        )}

        {tab === 'carousel' && (
          <>
            <h2 style={h2}>Galeria, fotos e videos YouTube</h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              Envie imagens do computador ou cole o link de um video do YouTube.
            </p>
            {editable && (
              <div className="panel">
                <h3 style={{ marginBottom: 16 }}>Novo item da galeria</h3>
                <CarouselForm />
              </div>
            )}
            <div className="grid">
              {carousel.map((item: any) => (
                <div className="panel" key={item.id} style={{ margin: 0 }}>
                  {item.youtube_id ? (
                    <div style={{ aspectRatio: '16/9', background: '#111', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
                      <img src={`https://img.youtube.com/vi/${item.youtube_id}/mqdefault.jpg`} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : item.image_url ? (
                    <img src={item.image_url} alt={item.title} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 12, marginBottom: 12 }} />
                  ) : null}
                  <h3>{item.title || (item.youtube_id ? 'Video YouTube' : 'Item')}</h3>
                  {item.caption && <p className="muted small">{item.caption}</p>}
                  <p style={{ fontSize: '0.85rem', margin: '8px 0' }}>
                    {item.active ? <span style={{ color: '#177345' }}>● Visivel</span> : <span style={{ color: '#999' }}>○ Oculto</span>}
                  </p>
                  <div className="actions">
                    <form action={toggleCarousel}>
                      <input type="hidden" name="id" value={item.id} />
                      <button className="btn btn-outline" type="submit">{item.active ? 'Ocultar' : 'Mostrar'}</button>
                    </form>
                    {a.role === 'admin' && (
                      <form action={deleteCarousel}>
                        <input type="hidden" name="id" value={item.id} />
                        <button className="btn" type="submit" style={{ background: '#fee', color: '#a00' }}>Excluir</button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
              {carousel.length === 0 && <p className="muted">Galeria vazia.</p>}
            </div>
          </>
        )}

        {tab === 'campaigns' && (
          <>
            <h2 style={h2}>Projetos / Campanhas</h2>
            {editable && (
              <div className="panel">
                <CampaignForm />
              </div>
            )}
            <div className="grid">
              {campaigns.map((c: any) => (
                <div className="panel" key={c.id} style={{ margin: 0 }}>
                  {c.image_url && (
                    <img src={c.image_url} alt={c.title} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 12, marginBottom: 12 }} />
                  )}
                  <h3>{c.title}</h3>
                  <p className="muted small">{c.description}</p>
                  <p style={{ fontSize: '0.85rem', margin: '8px 0' }}>
                    {c.active ? <span style={{ color: '#177345' }}>● Ativo</span> : <span style={{ color: '#999' }}>○ Oculto</span>}
                  </p>
                  <div className="actions">
                    <form action={toggleCampaign}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="btn btn-outline" type="submit">{c.active ? 'Ocultar' : 'Ativar'}</button>
                    </form>
                    {a.role === 'admin' && (
                      <form action={deleteCampaign}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="btn" type="submit" style={{ background: '#fee', color: '#a00' }}>Excluir</button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'presets' && (
          <>
            <h2 style={h2}>Valores rapidos de doacao</h2>
            {editable && (
              <div className="panel">
                <form action={addPreset} style={{ display: 'grid', gap: 12, maxWidth: 400 }}>
                  <label className="field" style={{ color: 'var(--texto)' }}>
                    <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Valor em R$</span>
                    <input name="amount" type="number" step="0.01" min="1" required style={inp} />
                  </label>
                  <label className="field" style={{ color: 'var(--texto)' }}>
                    <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Rotulo (ex: R$ 50)</span>
                    <input name="label" required style={inp} />
                  </label>
                  <label className="field" style={{ color: 'var(--texto)' }}>
                    <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Descricao curta</span>
                    <input name="description" style={inp} />
                  </label>
                  <button className="btn btn-primary" type="submit">Adicionar valor</button>
                </form>
              </div>
            )}
            <div className="grid">
              {presets.map((p: any) => (
                <div className="panel" key={p.id} style={{ margin: 0 }}>
                  <strong style={{ fontSize: '1.3rem', color: 'var(--verde)' }}>{p.label}</strong>
                  <p className="muted">{p.description}</p>
                  <div className="actions" style={{ marginTop: 12 }}>
                    <form action={togglePreset}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="btn btn-outline" type="submit">{p.active ? 'Ocultar' : 'Mostrar'}</button>
                    </form>
                    {a.role === 'admin' && (
                      <form action={deletePreset}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className="btn" type="submit" style={{ background: '#fee', color: '#a00' }}>Excluir</button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'donations' && (
          <>
            <h2 style={h2}>Doações Pix — conferência</h2>
            <p className="muted" style={{ marginBottom: 18 }}>Avisos dos doadores não comprovam recebimento. Confirme somente após conferir valor e crédito no extrato bancário.</p>
            <div className="panel" style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Data</th><th>Nome</th><th>Valor</th><th>Situação</th><th>TXID</th><th>Ação</th></tr></thead>
                <tbody>
                  {contributions.map((c: any) => (
                    <tr key={c.id}>
                      <td>{new Date(c.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                      <td>{c.donor_name || '—'}</td>
                      <td>{(Number(c.amount_cents) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td>{c.status === 'confirmed' ? '✓ Confirmado' : c.status === 'cancelled' ? 'Cancelado' : c.payment_reported ? '🔔 Doador informou pagamento' : 'Pix gerado — aguardando'}{c.payment_reported_at && <div className="small muted">Aviso: {new Date(c.payment_reported_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>}</td>
                      <td className="small" style={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}>{c.pix_txid}</td>
                      <td>{a.role === 'admin' && c.status === 'awaiting_manual_verification' ? <form action={confirmPixDonation}><input type="hidden" name="id" value={c.id} /><button className="btn btn-primary" type="submit" style={{ padding: '8px 12px', fontSize: 13 }}>Confirmar após conferir extrato</button></form> : '—'}</td>
                    </tr>
                  ))}
                  {contributions.length === 0 && <tr><td colSpan={6} className="muted">Nenhuma solicitação ainda.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'shop' && (
          <>
            <h2 style={h2}>Lojinha virtual (produtos digitais)</h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              Somente itens digitais: cartões, mensagens, wallpapers, certificados, e-books… Sem entrega física.
              {' '}<a href="/loja" target="_blank">Abrir lojinha ↗</a>
            </p>

            <div className="grid" style={{ marginBottom: 20 }}>
              <StatCard label="Produtos ativos" value={String(shopProducts.filter((p: any) => p.active).length)} hint={`${shopProducts.length} cadastrados`} />
              <StatCard label="Aguardando confirmação" value={String(shopStats.pending)} hint="confira o PIX no seu banco" />
              <StatCard label="Pedidos entregues" value={String(shopStats.done)} hint="conteúdo liberado" />
              <StatCard
                label="Arrecadado na loja"
                value={(shopStats.total / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                hint="pedidos confirmados"
              />
            </div>

            {shopStats.pending > 0 && (
              <div className="panel" style={{ background: '#fff8e6', border: '1px solid #f1deb0' }}>
                <strong>🔔 {shopStats.pending} pedido(s) aguardando confirmação.</strong>{' '}
                <span className="muted">Confirme o recebimento do PIX no banco e clique em “Confirmar e liberar” abaixo.</span>
              </div>
            )}

            {editable && (
              <div className="panel">
                <h3 style={{ marginBottom: 12 }}>Novo produto digital</h3>
                <ShopProductForm action={addShopProduct} submitLabel="Cadastrar produto" />
              </div>
            )}

            <h3 style={{ margin: '28px 0 12px' }}>Produtos</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              {shopProducts.map((p: any) => {
                const f = shopFiles[p.digital_file_key];
                return (
                  <div className="panel" key={p.id} style={{ margin: 0 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div
                        style={{
                          width: 88, height: 88, borderRadius: 14, flexShrink: 0,
                          background: p.cover_image ? `center/cover url(${p.cover_image})` : '#e8f1ed',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
                        }}
                      >
                        {!p.cover_image && '🎁'}
                      </div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <h3>{p.title}</h3>
                        <p className="muted small">{p.short_description}</p>
                        <p style={{ fontWeight: 700, color: 'var(--verde)' }}>
                          {(p.price_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                        <p className="small">
                          {p.active ? '● Ativo na vitrine' : '○ Oculto'} · {p.product_type}
                          {p.featured ? ' · ⭐ destaque' : ''}
                          {f ? ` · 📎 ${f.original_name}` : p.digital_file_key ? ' · 📎 arquivo' : ''}
                        </p>
                      </div>
                      <div className="actions">
                        <form action={toggleShopProduct}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="btn btn-outline" type="submit">{p.active ? 'Ocultar' : 'Ativar'}</button>
                        </form>
                        {a.role === 'admin' && (
                          <form action={deleteShopProduct}>
                            <input type="hidden" name="id" value={p.id} />
                            <button className="btn" type="submit" title="Se já houver pedidos, o produto é apenas ocultado" style={{ background: '#fee', color: '#a00' }}>Excluir</button>
                          </form>
                        )}
                      </div>
                    </div>
                    {editable && (
                      <details style={{ marginTop: 14 }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--verde)' }}>✏️ Editar produto / trocar arquivo</summary>
                        <div style={{ marginTop: 14 }}>
                          <ShopProductForm action={updateShopProduct} product={p} file={f || null} submitLabel="Salvar alterações" />
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
              {shopProducts.length === 0 && <p className="muted">Nenhum produto ainda. Cadastre o primeiro acima.</p>}
            </div>

            <h3 style={{ margin: '36px 0 12px' }}>Pedidos da lojinha</h3>
            <div className="panel" style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Produto</th>
                    <th>Comprador</th>
                    <th>Presente para</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {shopOrders.map((o: any) => (
                    <tr key={o.id}>
                      <td>{new Date(o.created_at).toLocaleString('pt-BR')}</td>
                      <td>{o.product_title}</td>
                      <td>{o.buyer_name || '—'}{o.buyer_email ? <><br /><span className="muted small">{o.buyer_email}</span></> : null}</td>
                      <td>{o.recipient_name || '—'}</td>
                      <td>{(o.amount_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td>{{ awaiting_payment: 'Aguardando', paid: 'Pago', delivered: 'Entregue', cancelled: 'Cancelado' }[o.status as string] || o.status}</td>
                      <td>
                        {o.status === 'awaiting_payment' && editable && (
                          <form action={markShopOrderPaid}>
                            <input type="hidden" name="id" value={o.id} />
                            <button className="btn btn-primary" type="submit" style={{ padding: '8px 12px', fontSize: 13 }}>
                              Confirmar e liberar
                            </button>
                          </form>
                        )}
                        {(o.status === 'paid' || o.status === 'delivered') && (
                          <a href={`/loja/pedido/${o.access_token}`} className="small">Ver entrega</a>
                        )}
                      </td>
                    </tr>
                  ))}
                  {shopOrders.length === 0 && (
                    <tr><td colSpan={7} className="muted">Nenhum pedido ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

      </div>
    </main>
  );
}

const h2: React.CSSProperties = {
  fontFamily: "'Playfair Display', serif",
  fontSize: '1.6rem',
  color: 'var(--verde-escuro)',
  marginBottom: 8,
};

const inp = {
  background: '#fff',
  color: 'var(--texto)',
  border: '1px solid #c9d4ce',
} as const;

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="panel" style={{ margin: 0 }}>
      <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 8 }}>{label}</p>
      <strong style={{ fontSize: 26, color: 'var(--verde-escuro)' }}>{value}</strong>
      <p className="small muted" style={{ marginTop: 6 }}>{hint}</p>
    </div>
  );
}