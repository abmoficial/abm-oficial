'use server';
import { randomBytes, scryptSync } from 'crypto';
import { revalidatePath } from 'next/cache';
import { requireAdmin, AREAS } from '../../lib/auth';
import { pool } from '../../lib/db';

async function owner() {
  const a = await requireAdmin();
  if (!['admin','director'].includes(a.role)) throw Error('Sem permissão para gerenciar a equipe');
  return a;
}
export async function createMember(fd: FormData) {
  const a = await owner();
  const email = String(fd.get('email') || '').trim().toLowerCase();
  const password = String(fd.get('password') || '');
  const role = String(fd.get('role') || 'staff');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw Error('E-mail inválido');
  if (password.length < 12 || password.length > 256) throw Error('A senha deve ter entre 12 e 256 caracteres');
  if (!['director','staff'].includes(role) || (a.role === 'director' && role !== 'staff')) throw Error('Função não permitida');
  const permissions = role === 'staff' ? AREAS.filter(x => fd.getAll('permissions').includes(x)) : [...AREAS];
  const salt = randomBytes(16).toString('hex');
  const hash = salt + ':' + scryptSync(password, salt, 64).toString('hex');
  const result = await pool.query('INSERT INTO admins(email,password_hash,role,permissions) VALUES($1,$2,$3,$4) RETURNING id',[email,hash,role,permissions]);
  await pool.query('INSERT INTO audit_logs(actor_id,action,details) VALUES($1,$2,$3)',[a.id,'team.create',JSON.stringify({id:result.rows[0].id,role})]);
  revalidatePath('/admin');
}
export async function updateMember(fd: FormData) {
  const a = await owner();
  const id = Number(fd.get('id'));
  const role = String(fd.get('role') || 'staff');
  const active = fd.get('active') === 'on';
  if (!Number.isSafeInteger(id) || id <= 0 || id === a.id) throw Error('Usuário inválido');
  if (!['director','staff'].includes(role) || (a.role === 'director' && role !== 'staff')) throw Error('Função não permitida');
  const permissions = role === 'staff' ? AREAS.filter(x => fd.getAll('permissions').includes(x)) : [...AREAS];
  const result = await pool.query("UPDATE admins SET role=$1,active=$2,permissions=$3 WHERE id=$4 AND role = ANY($5::text[]) RETURNING id",[role,active,permissions,id,a.role === 'admin' ? ['director','staff'] : ['staff']]);
  if (!result.rowCount) throw Error('Membro não encontrado ou conta protegida');
  await pool.query('INSERT INTO audit_logs(actor_id,action,details) VALUES($1,$2,$3)',[a.id,'team.update',JSON.stringify({id,role,active})]);
  revalidatePath('/admin');
}
export async function resetMemberPassword(fd: FormData) {
  const a = await owner();
  const id = Number(fd.get('id'));
  const password = String(fd.get('password') || '');
  if (!Number.isSafeInteger(id) || id === a.id || password.length < 12 || password.length > 256) throw Error('Dados inválidos');
  const salt = randomBytes(16).toString('hex');
  const hash = salt + ':' + scryptSync(password,salt,64).toString('hex');
  const r = await pool.query("UPDATE admins SET password_hash=$1 WHERE id=$2 AND role = ANY($3::text[]) RETURNING id",[hash,id,a.role === 'admin' ? ['director','staff'] : ['staff']]);
  if (!r.rowCount) throw Error('Membro não encontrado');
  await pool.query('INSERT INTO audit_logs(actor_id,action,details) VALUES($1,$2,$3)',[a.id,'team.password.reset',JSON.stringify({id})]);
  revalidatePath('/admin');
}
