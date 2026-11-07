
import { pool } from '../lib/db';
import { ensureSchema } from '../lib/schema';
import Donation from './donation';
import Carousel from './components/Carousel';

export const dynamic = 'force-dynamic';

export default async function Home() {
  await ensureSchema();

  const s = (await pool.query('SELECT * FROM site_settings WHERE id=1')).rows[0] || {};
  const cs = (await pool.query('SELECT * FROM campaigns WHERE active=true ORDER BY id DESC LIMIT 12')).rows;
  const stories = (await pool.query('SELECT * FROM stories WHERE active=true ORDER BY sort_order, id').catch(() => ({ rows: [] }))).rows;
  const stats = (await pool.query('SELECT * FROM impact_stats WHERE active=true ORDER BY sort_order, id').catch(() => ({ rows: [] }))).rows;
  const carousel = (await pool.query('SELECT * FROM carousel_items WHERE active=true ORDER BY sort_order, id').catch(() => ({ rows: [] }))).rows;
  const presets = (await pool.query('SELECT * FROM donation_presets WHERE active=true ORDER BY sort_order, id').catch(() => ({ rows: [] }))).rows;

  const primary = (s.primary_color || '#1a4d42').trim();
  const colorHeader = (s.color_header || primary).trim();
  const colorFooter = (s.color_footer || primary).trim();
  const colorButton = (s.color_button || primary).trim();
  const colorButtonText = (s.color_button_text || '#ffffff').trim();

  return (
    <div>
      <style>{`
        :root, body {
          --verde: ${primary} !important;
          --verde-medio: ${primary} !important;
          --verde-escuro: ${colorHeader} !important;
        }

        .site-header {
          background: ${colorHeader}ee !important;
          border-bottom-color: ${colorHeader}22 !important;
        }

        .site-header .logo,
        .site-header .logo span {
          color: #fff !important;
        }

        .site-header .nav-links a {
          color: rgba(255,255,255,0.85) !important;
        }

        .site-header .nav-links a:hover {
          color: #fff !important;
        }

        .btn-primary {
          background: ${colorButton} !important;
          color: ${colorButtonText} !important;
        }

        .btn-primary:hover {
          filter: brightness(0.92);
        }

        .btn-outline {
          color: ${colorButton} !important;
          border-color: ${colorButton} !important;
        }

        .btn-outline:hover {
          background: ${colorButton} !important;
          color: ${colorButtonText} !important;
        }

        .logo span,
        .hero h1,
        .section-header h2,
        .about-content h2,
        .cta-final h2,
        .stat strong,
        .impact-card strong,
        .help-card h3,
        .campaign-card h3 {
          color: ${primary};
        }

        .hero-badge,
        .section-header .label,
        .price {
          color: ${primary} !important;
        }

        .stories {
          background: ${primary} !important;
        }

        .donate {
          background: linear-gradient(
            160deg,
            ${primary} 0%,
            ${colorHeader} 100%
          ) !important;
        }

        footer {
          background: ${colorFooter} !important;
        }

        .impact-card {
          background: ${primary}14 !important;
        }

        .hero-badge {
          border-color: ${primary}33 !important;
        }

        /* BANNER RESPONSIVO */

        .hero-grid {
          align-items: center;
        }

        .hero-grid > * {
          min-width: 0;
        }

        .hero-card {
          min-width: 0;
          box-sizing: border-box;
        }

        .hero-card-image-fixed {
          display: block;
          width: 100%;
          height: auto;
          overflow: hidden;
          border-radius: 16px;
          background: #ffffff;
        }

        .hero-banner-img {
          display: block;
          width: 100%;
          height: auto;
          max-width: 100%;
          object-fit: contain;
          object-position: center;
        }

        .hero-placeholder {
          min-height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 60px;
        }

        /* CABEÇALHO E BANNER NO CELULAR */

        @media (max-width: 768px) {
          .site-header .nav {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            min-height: 72px;
            height: auto;
            padding-top: 10px;
            padding-bottom: 10px;
            box-sizing: border-box;
          }

          .site-header .logo {
            display: block;
            flex: 1 1 0;
            min-width: 0;
            max-width: 100%;
            font-size: 16px;
            line-height: 1.25;
            overflow-wrap: break-word;
          }

          .site-header .nav > .btn {
            flex: 0 0 auto;
            white-space: nowrap;
            padding: 12px 16px;
            font-size: 13px;
          }

          .site-header .nav-links {
            display: none;
          }

          .hero-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 32px;
          }

          .hero-card {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            box-sizing: border-box;
          }

          .hero-card-image-fixed {
            width: 100%;
            height: auto;
          }

          .hero-banner-img {
            width: 100%;
            height: auto;
            max-width: 100%;
            object-fit: contain;
            object-position: center;
          }

          .hero h1 {
            overflow-wrap: break-word;
          }
        }
      `}</style>

      {/* CABEÇALHO */}
      <header className="site-header">
        <div className="container nav">
          <a href="/" className="logo">
            {s.site_name?.split(' ')[0] || 'Associação'}{' '}
            <span>
              {s.site_name?.split(' ').slice(1).join(' ') || 'Manancial'}
            </span>
          </a>

          <ul className="nav-links">
            {stories.length > 0 && (
              <li><a href="#historias">Histórias</a></li>
            )}
            {stats.length > 0 && (
              <li><a href="#impacto">Impacto</a></li>
            )}
            {carousel.length > 0 && (
              <li><a href="#galeria">Galeria</a></li>
            )}
            {cs.length > 0 && (
              <li><a href="#projetos">Projetos</a></li>
            )}
            <li><a href="#doar">Doar</a></li>
            <li><a href="/loja">Lojinha</a></li>
          </ul>

          <a href="#doar" className="btn btn-primary">
            Quero doar
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="hero-badge">
              Associação sem fins lucrativos
            </div>

            <h1>
              {s.hero_title || 'Juntos transformamos vidas'}
            </h1>

            <p className="hero-text">
              {s.hero_text}
            </p>

            <div className="hero-actions">
              <a href="#doar" className="btn btn-primary btn-lg">
                {s.button_text || 'Fazer uma doação agora'}
              </a>

              {stories.length > 0 && (
                <a
                  href="#historias"
                  className="btn btn-outline btn-lg"
                >
                  Ver histórias reais
                </a>
              )}
            </div>

            {stats.length > 0 && (
              <div className="hero-stats">
                {stats.slice(0, 3).map((st: any) => (
                  <div className="stat" key={st.id}>
                    <strong>{st.value}</strong>
                    <span>{st.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BANNER CORRIGIDO */}
          <div className="hero-card">
            <div className="hero-card-image-fixed">
              {s.hero_image ? (
                <img
                  src={s.hero_image}
                  alt="Banner da Associação Beneficente Manancial"
                  className="hero-banner-img"
                />
              ) : (
                <div className="hero-placeholder">💚</div>
              )}
            </div>

            <h3>
              Sua doação chega onde mais precisa
            </h3>

            <p>
              Toda contribuição é registrada e destinada às ações da associação.
            </p>
          </div>
        </div>
      </section>

      {/* HISTÓRIAS */}
      {stories.length > 0 && (
        <section className="stories" id="historias">
          <div className="container">
            <div className="section-header">
              <span className="label">Histórias reais</span>
              <h2>
                {s.stories_title || 'Por trás de cada doação existe um rosto'}
              </h2>
              <p>{s.stories_subtitle}</p>
            </div>

            <div className="stories-grid">
              {stories.map((st: any) => (
                <article className="story-card" key={st.id}>
                  <div className="story-avatar">
                    {st.image_url ? (
                      <img
                        src={st.image_url}
                        alt={st.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '50%',
                        }}
                      />
                    ) : (
                      st.emoji || '💚'
                    )}
                  </div>

                  <h3>{st.name}</h3>
                  {st.role && <p className="role">{st.role}</p>}
                  <p>“{st.quote}”</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* IMPACTO */}
      {stats.length > 0 && (
        <section id="impacto">
          <div className="container">
            <div className="section-header">
              <span className="label">Nosso impacto</span>
              <h2>
                {s.impact_title || 'O que já construímos juntos'}
              </h2>
              <p>{s.impact_subtitle}</p>
            </div>

            <div className="impact-grid">
              {stats.map((st: any) => (
                <div className="impact-card" key={st.id}>
                  <div className="impact-icon">{st.icon}</div>
                  <strong>{st.value}</strong>
                  <span>{st.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GALERIA / CARROSSEL */}
      {carousel.length > 0 && (
        <section id="galeria" style={{ background: '#fafafa' }}>
          <div className="container">
            <div className="section-header">
              <span className="label">Galeria</span>
              <h2>Momentos que inspiram</h2>
              <p>
                Fotos e vídeos do nosso trabalho na comunidade.
              </p>
            </div>

            <Carousel items={carousel} />
          </div>
        </section>
      )}

      {/* SOBRE */}
      <section className="about-section">
        <div className="container about-content">
          <h2>{s.about_title || 'Nossa missão'}</h2>
          <p>{s.about_text}</p>
        </div>
      </section>

      {/* PROJETOS */}
      {cs.length > 0 && (
        <section id="projetos">
          <div className="container">
            <div className="section-header">
              <span className="label">Projetos ativos</span>
              <h2>Nossos projetos</h2>
              <p>
                Escolha um projeto específico ou faça uma contribuição geral.
              </p>
            </div>

            <div className="campaigns-grid">
              {cs.map((c: any) => (
                <article className="campaign-card" key={c.id}>
                  {c.image_url && (
                    <img src={c.image_url} alt={c.title} />
                  )}

                  <h3>{c.title}</h3>
                  <p>{c.description}</p>

                  {c.target_cents && (
                    <p className="price">
                      Meta:{' '}
                      {(Number(c.target_cents) / 100).toLocaleString(
                        'pt-BR',
                        {
                          style: 'currency',
                          currency: 'BRL',
                        }
                      )}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* DOAÇÃO */}
      <section className="donate" id="doar">
        <div className="container">
          <div className="section-header">
            <span className="label">Faça parte</span>
            <h2>
              {s.donate_title || 'Sua generosidade transforma realidades'}
            </h2>
            <p>{s.donate_subtitle}</p>
          </div>

          <div className="donate-box">
            <Donation
              campaigns={cs.map((c: any) => ({
                id: c.id,
                title: c.title,
              }))}
              presets={presets.map((p: any) => ({
                value: String(p.amount_cents / 100),
                label: p.label,
                desc: p.description,
              }))}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-final">
        <div className="container">
          <h2>
            {s.cta_title || 'O mundo muda quando alguém decide ajudar.'}
          </h2>

          <p>{s.cta_text}</p>

          <a href="#doar" className="btn btn-primary btn-lg">
            Quero fazer parte dessa mudança
          </a>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="/" className="logo">
                {s.site_name || 'Associação Manancial'}
              </a>
              <p>{s.footer_text}</p>
            </div>

            <div className="footer-links">
              <h4>Navegação</h4>
              <a href="#historias">Histórias</a>
              <a href="#impacto">Impacto</a>
              <a href="#doar">Doar</a>
              <a href="/loja">Lojinha virtual</a>
            </div>

            <div className="footer-links">
              <h4>Contato</h4>

              {s.contact_email && (
                <a href={`mailto:${s.contact_email}`}>
                  {s.contact_email}
                </a>
              )}

              {s.contact_whatsapp && (
                <a
                  href={`https://wa.me/${s.contact_whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              )}

              {s.youtube_url && (
                <a
                  href={s.youtube_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  YouTube
                </a>
              )}

              {s.instagram_url && (
                <a
                  href={s.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram
                </a>
              )}

              <a href="/login">Área restrita</a>
            </div>
          </div>

          <div className="footer-bottom">
            © {new Date().getFullYear()}{' '}
            {s.site_name || 'Associação Manancial'}.
            Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
