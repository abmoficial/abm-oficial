import './_env.mjs';
import pg from 'pg';
import { readFileSync } from 'fs';

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const sql = readFileSync(new URL('../db/schema-v2.sql', import.meta.url), 'utf8');
await db.query(sql);
await db.end();
console.log('Migração v2 aplicada com sucesso (histórias, impacto, galeria, presets).');
