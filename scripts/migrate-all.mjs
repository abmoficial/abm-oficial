// Aplica TODAS as migrações, na ordem. É seguro rodar várias vezes (idempotente, não apaga dados).
// Obs.: o site também faz isso sozinho ao abrir a primeira página.
import './_env.mjs';
import pg from 'pg';
import { readFileSync } from 'fs';
const arquivos = ['schema-v2.sql', 'schema-shop.sql', 'schema-shop-files.sql'];
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
for (const f of arquivos) {
  await db.query(readFileSync(new URL('../db/' + f, import.meta.url), 'utf8'));
  console.log('OK  ' + f);
}
await db.end();
console.log('Banco atualizado: histórias, impacto, galeria, presets, cores, loja e arquivos digitais.');
