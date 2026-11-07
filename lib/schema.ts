import { readFile } from 'fs/promises';
import path from 'path';
import { pool } from './db';

const FILES = ['schema-v2.sql', 'schema-shop.sql', 'schema-shop-files.sql', 'schema-team.sql', 'schema-pix-confirmation.sql'];
const g = globalThis as unknown as { __schemaReady?: Promise<void> };

async function run() {
  const client = await pool.connect();
  let locked = false;
  try {
    await client.query('SELECT pg_advisory_lock(73110)');
    locked = true;
    for (const f of FILES) {
      const sql = await readFile(path.join(process.cwd(), 'db', f), 'utf8');
      await client.query(sql);
    }
  } finally {
    if (locked) await client.query('SELECT pg_advisory_unlock(73110)').catch(() => {});
    client.release();
  }
}

export function ensureSchema(): Promise<void> {
  if (!g.__schemaReady) {
    g.__schemaReady = run().catch((e) => {
      g.__schemaReady = undefined;
      console.error('[schema] não foi possível atualizar o banco:', (e as Error).message);
      throw e;
    });
  }
  return g.__schemaReady;
}
