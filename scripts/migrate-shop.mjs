import './_env.mjs';
import pg from 'pg';
import { readFileSync } from 'fs';
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
for (const f of ['schema-shop.sql', 'schema-shop-files.sql']) {
  await db.query(readFileSync(new URL('../db/' + f, import.meta.url), 'utf8'));
}
await db.end();
console.log('Lojinha virtual criada (produtos digitais + pedidos).');
