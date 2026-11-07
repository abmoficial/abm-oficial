import { Pool } from 'pg';

const g = globalThis as unknown as { __pool?: Pool };

// Códigos de erro de conexão que justificam repetir um SELECT uma vez
const RETRY = new Set(['ECONNRESET', 'EPIPE', 'ETIMEDOUT', '57P01', '08006', '08003']);

function create(): Pool {
  const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 8,
    idleTimeoutMillis: 10000,       // descarta conexões ociosas antes de ficarem "velhas"
    connectionTimeoutMillis: 10000,
    keepAlive: true,
  });

  // Sem isso, um erro em conexão ociosa derruba o processo
  p.on('error', (err) => console.error('[pg] erro em conexão ociosa:', err.message));

  // SELECT que falhar por conexão resetada é repetido uma vez (escritas nunca são repetidas)
  const original = p.query.bind(p) as (...a: unknown[]) => Promise<unknown>;
  (p as unknown as { query: unknown }).query = async (...args: unknown[]) => {
    try {
      return await original(...args);
    } catch (e) {
      const first = args[0];
      const sql = typeof first === 'string' ? first : (first as { text?: string })?.text ?? '';
      const code = (e as { code?: string })?.code ?? '';
      if (/^\s*select/i.test(sql) && RETRY.has(code)) return original(...args);
      throw e;
    }
  };
  return p;
}

export const pool = g.__pool ?? create();
if (process.env.NODE_ENV !== 'production') g.__pool = pool;
