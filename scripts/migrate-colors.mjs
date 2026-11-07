import './_env.mjs';
import pg from 'pg';
import { readFileSync } from 'fs';
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query(readFileSync(new URL('../db/schema-colors.sql', import.meta.url), 'utf8'));
await db.end();
console.log('Colunas de cores criadas/verificadas.');
