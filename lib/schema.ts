import { readFile } from 'fs/promises';
import path from 'path';
import { pool } from './db';

// Aplica as migrações (idempotentes) uma vez por processo. Evita "tabela não existe"
// quando o banco foi restaurado de um backup antigo.
const FILES = ['schema-v2.sql', 'schema-shop.sql', 'schema-shop-files.sql', 'schema-team.sql'];
const g = globalThis as unknown as { __schemaReady?: Promise<void> };

async function run() {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(73110)');
    for (const f of FILES) {
      const sql = await readFile(path.join(process.cwd(), 'db', f), 'utf8');
      try {
        await client.query(sql);
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        throw e;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(73110)').catch(() => {});
    client.release();
  }
}

export function ensureSchema(): Promise<void> {
  if (!g.__schemaReady) {
    g.__schemaReady = run().catch((e) => {
      g.__schemaReady = undefined; // tenta de novo na próxima requisição
      console.error('[schema] não foi possível atualizar o banco:', (e as Error).message);
    });
  }
  return g.__schemaReady;
}
