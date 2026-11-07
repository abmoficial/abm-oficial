import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { scryptSync, timingSafeEqual } from 'crypto';
import { pool } from './db';
import { ensureSchema } from './schema';

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw Error('SESSION_SECRET invalido');
  return new TextEncoder().encode(s);
}
function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64).toString('hex');
  try { return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(next, 'hex')); }
  catch { return false; }
}
export async function getAdmin() {
  try {
    const c = await cookies();
    const token = c.get('assoc_session')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret(), { issuer: 'assoc-cms' });
    const id = Number(payload.sub);
    if (!Number.isSafeInteger(id)) return null;
    await ensureSchema();
    const r = await pool.query('SELECT id,email,role,permissions FROM admins WHERE id=$1 AND active=true', [id]);
    return r.rows[0] ?? null;
  } catch { return null; }
}
export async function signIn(id: number) {
  return new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(String(id))
    .setIssuer('assoc-cms').setIssuedAt().setExpirationTime('8h').sign(secret());
}
export async function requireAdmin() {
  const a = await getAdmin();
  if (!a) throw Error('UNAUTHORIZED');
  return a;
}
export async function login(email: string, password: string) {
  const r = await pool.query('SELECT id, password_hash FROM admins WHERE email=$1 AND active=true', [email.toLowerCase().trim()]);
  const row = r.rows[0];
  if (!row || !verifyPassword(password, row.password_hash)) return false;
  const token = await signIn(row.id);
  const c = await cookies();
  c.set('assoc_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 8 });
  return true;
}
export async function logout() {
  const c = await cookies();
  c.set('assoc_session', '', { httpOnly: true, path: '/', maxAge: 0 });
}
export const AREAS = ['site','stories','impact','carousel','campaigns','presets','donations','shop'] as const;
export type Area = typeof AREAS[number];
export function canAccess(user: {role:string; permissions?:string[]}, area: Area) {
  if (user.role === 'admin' || user.role === 'director') return true;
  if (user.role === 'publisher') return true;
  return (user.permissions || []).includes(area);
}
export async function requireArea(area: Area) {
  const user = await requireAdmin();
  if (!canAccess(user, area)) throw Error('Sem permissão para esta área');
  return user;
}
export async function requirePixConfirmationAdmin() {
  const user = await requireAdmin();
  if (user.role !== 'admin') throw Error('Sem permissão para confirmar recebimentos Pix');
  return user;
}
