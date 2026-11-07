import { pool } from '../../lib/db';
import BuyButton from './BuyButton';
import { ensureSchema } from '../../lib/schema';
import { getAdmin } from '../../lib/auth';

export const dynamic = 'force-dynamic';

const typeLabel: Record<string, string> = {
  card: 'Cartão digital',
  image: 'Imagem digital',
  message: 'Mensagem',
  wallpaper: 'Wallpaper',
  certificate: 'Certificado',
  other: 'Digital',
};

export default async function LojaPage() {
  await ensureSchema();
  const admin = await getAdmin();
  const s = (await pool.query('SELECT site_name, primary_color FROM site_settings WHERE id=1')).rows[0] || {};
  const products = (
    await pool.query(
      'SELECT * FROM shop_products WHERE active=true ORDER BY featured DESC, sort_order, id'
    ).catch((e) => {
      console.error('[loja] erro ao ler produtos:', e.message);
      return { rows: [] };
    })
  ).rows;

  const primary = s.primary_color || '#1a4d42';

  return (
    <main style={{ background: '#f7faf9', minHeight: '100vh' }}>
      <style>{`
        .shop-hero {
          background: linear-gradient(135deg, ${primary} 0%, #0f2e28 100%);
          color: white;
          padding: 72px 0 56px;
        }
        .shop-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          padding: 40px 0 80px;
        }
        .shop-card {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid #e5ebe8;
          box-shadow: 0 12px 40px rgba(15,46,40,0.06);
          display: flex;
          flex-direction: column;
        }
        .shop-card-cover {
          height: 160px;
          background: linear-gradient(135deg, ${primary}33, ${primary}88);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
        }
        .shop-card-body { padding: 22px; flex: 1; display: flex; flex-direction: column; }
        .shop-tag {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: ${primary};
          margin-bottom: 8px;
        }
        .shop-price {
          font-size: 1.4rem;
          font-weight: 800;
          color: ${primary};
          margin: 12px 0;
        }
      `}</style>

      <header className="shop-hero">
        <div className="container">
          <p style={{ opacity: 0.85, marginBottom: 8, fontWeight: 600 }}>Lojinha virtual</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2rem,4vw,3rem)', marginBottom: 12 }}>
            Presentes digitais que geram impacto real
          </h1>
          <p style={{ maxWidth: 560, opacity: 0.9, fontSize: '1.1rem' }}>
            Tudo é virtual: cartões, mensagens, wallpapers e certificados.
            Você contribui com a {s.site_name || 'associação'} e recebe o presente digital na hora — sem entrega física.
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="/" className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
              Voltar ao site
            </a>
            <a href="#produtos" className="btn btn-primary" style={{ background: 'white', color: primary }}>
              Ver produtos
            </a>
          </div>
        </div>
      </header>

      <div className="container" id="produtos">
        <div style={{ paddingTop: 32 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: primary, marginBottom: 8 }}>Produtos digitais</h2>
          <p className="muted">Sem frete. Sem retirada. Só carinho e contribuição.</p>
        </div>

        {products.length === 0 ? (
          <div className="panel" style={{ marginTop: 24, textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '2.6rem' }}>🎁</div>
            <h3 style={{ margin: '8px 0' }}>Novidades chegando em breve</h3>
            <p className="muted">Estamos preparando presentes digitais especiais. Volte logo!</p>
            {admin && (
              <p className="small" style={{ marginTop: 16 }}>
                Você está logado como administrador:{' '}
                <a href="/admin?tab=shop">cadastre ou ative produtos na aba Lojinha</a>.
              </p>
            )}
          </div>
        ) : (
          <div className="shop-grid">
            {products.map((p: any) => (
              <article className="shop-card" key={p.id}>
                <div
                  className="shop-card-cover"
                  style={
                    p.cover_image
                      ? { backgroundImage: `url(${p.cover_image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : undefined
                  }
                >
                  {!p.cover_image && emojiFor(p.product_type)}
                </div>
                <div className="shop-card-body">
                  <span className="shop-tag">{typeLabel[p.product_type] || 'Digital'}</span>
                  {p.digital_file_key && (
                    <span className="small" style={{ marginLeft: 8, color: '#5b6b65' }}>📎 inclui arquivo para baixar</span>
                  )}
                  <h3 style={{ fontSize: '1.2rem', color: '#0f2e28', marginBottom: 8 }}>{p.title}</h3>
                  <p className="muted" style={{ fontSize: '0.95rem', flex: 1 }}>
                    {p.short_description || p.description}
                  </p>
                  <div className="shop-price">
                    {(p.price_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  {p.is_gift && (
                    <p className="small" style={{ color: primary, marginBottom: 10 }}>Pode ser presenteado</p>
                  )}
                  <BuyButton product={p} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function emojiFor(type: string) {
  const map: Record<string, string> = {
    card: '💌',
    image: '🖼️',
    message: '✨',
    wallpaper: '📱',
    certificate: '🏅',
    other: '🎁',
  };
  return map[type] || '🎁';
}
