import { login } from '../admin/actions';

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const q = await searchParams;

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #e8f3f0 0%, #f8faf9 50%, white 100%)',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            className="logo"
            style={{ fontSize: '1.6rem', marginBottom: 8, display: 'block' }}
          >
            Associação <span>Manancial</span>
          </div>
          <p className="muted">Área restrita de administração</p>
        </div>

        <form
          action={login}
          className="panel"
          style={{ margin: 0, boxShadow: '0 20px 50px rgba(15,46,40,0.1)' }}
        >
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.5rem',
              color: 'var(--verde-escuro)',
              marginBottom: 24,
              textAlign: 'center',
            }}
          >
            Entrar
          </h1>

          <label className="field" style={{ color: 'var(--texto)' }}>
            <span style={{ color: 'var(--texto-claro)' }}>E-mail</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              style={{
                background: '#fff',
                color: 'var(--texto)',
                border: '1px solid #c9d4ce',
              }}
            />
          </label>

          <label className="field" style={{ color: 'var(--texto)' }}>
            <span style={{ color: 'var(--texto-claro)' }}>Senha</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={{
                background: '#fff',
                color: 'var(--texto)',
                border: '1px solid #c9d4ce',
              }}
            />
          </label>

          <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: 8 }}>
            Acessar painel
          </button>

          {q.error && (
            <p className="error" style={{ marginTop: 16, textAlign: 'center' }}>
              Credenciais inválidas ou acesso indisponível.
            </p>
          )}
        </form>

        <p style={{ textAlign: 'center', marginTop: 24 }}>
          <a href="/" className="muted" style={{ fontSize: '0.95rem' }}>
            ← Voltar ao site
          </a>
        </p>
      </div>
    </main>
  );
}
