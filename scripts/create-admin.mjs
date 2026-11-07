import './_env.mjs';
import pg from 'pg';
import { scryptSync, randomBytes } from 'crypto';
import { createInterface } from 'readline/promises';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const email = (await rl.question('E-mail do administrador: ')).trim().toLowerCase();
const pw = await rl.question('Senha (mínimo 6 caracteres): ');
rl.close();

if (!email.includes('@') || pw.length < 6) {
  throw Error('E-mail inválido ou senha com menos de 6 caracteres');
}

const salt = randomBytes(16).toString('hex');
const hash = salt + ':' + scryptSync(pw, salt, 64).toString('hex');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query(
  'INSERT INTO admins(email,password_hash,role) VALUES($1,$2,$3) ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash,role=excluded.role',
  [email, hash, 'admin']
);
await db.end();
console.log('Administrador criado.');
