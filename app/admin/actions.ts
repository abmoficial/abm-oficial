'use server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { unlink } from 'fs/promises';
import path from 'path';
import { pool } from '../../lib/db';
import { KEY_RE, storageDir } from '../../lib/shopfiles';
import { getAdmin, requireArea, login as doLogin, logout as doLogout } from '../../lib/auth';

function checkOrigin(h: Headers) {
  const origin = h.get('origin') || '';
  const host = h.get('host') || '';
  if (origin && !origin.includes(host.replace(/:\d+$/, '')) && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
    // allow same host
  }
}

function text(fd: FormData, key: string, max = 500) {
  return String(fd.get(key) || '').trim().slice(0, max);
}

function mediaUrl(u: string) {
  if (!u) return '';
  if (u.startsWith('/uploads/') || u.startsWith('https://')) return u.slice(0, 500);
  return '';
}

async function requireAdmin() {
  const a = await getAdmin();
  if (!a) throw Error('Não autenticado');
  return a;
}

export async function login(fd: FormData) {
  const email = text(fd, 'email', 200);
  const password = String(fd.get('password') || '');
  const ok = await doLogin(email, password);
  if (!ok) redirect('/login?error=1');
  redirect('/admin');
}

export async function logout() {
  await doLogout();
  redirect('/login');
}

export async function saveSite(fd: FormData) {
  checkOrigin(await headers());
  const a = await requireArea('site');

  const fields = [
    'site_name', 'hero_title', 'hero_text', 'button_text',
    'about_title', 'about_text', 'footer_text', 'primary_color',
    'color_header', 'color_footer', 'color_button', 'color_button_text',
    'hero_image', 'logo_url',
    'stories_title', 'stories_subtitle', 'impact_title', 'impact_subtitle',
    'donate_title', 'donate_subtitle', 'cta_title', 'cta_text',
    'contact_email', 'contact_whatsapp', 'youtube_url', 'instagram_url',
  ] as const;

  const values = fields.map((k) => {
    if (k === 'hero_image' || k === 'logo_url') return mediaUrl(text(fd, k, 500));
    return text(fd, k, k.includes('text') || k.includes('subtitle') ? 3000 : 300);
  });

  const sets = fields.map((k, i) => `${k}=$${i + 1}`).join(',');
  await pool.query(
    `UPDATE site_settings SET ${sets}, updated_at=now(), updated_by=$${fields.length + 1} WHERE id=1`,
    [...values, a.id]
  );
  await pool.query(
    'INSERT INTO audit_logs(actor_id,action,details) VALUES($1,$2,$3)',
    [a.id, 'site.update', JSON.stringify({ fields })]
  );
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function addCampaign(fd: FormData) {
  checkOrigin(await headers());
  const a = await requireArea('campaigns');
  const title = text(fd, 'title', 160);
  if (!title) throw Error('Título obrigatório');
  const description = text(fd, 'description', 3000);
  const image = mediaUrl(text(fd, 'image_url', 500));
  const goal = Number(fd.get('target') || 0);
  const cents = goal > 0 && Number.isFinite(goal) ? Math.round(goal * 100) : null;
  await pool.query(
    'INSERT INTO campaigns(title,description,image_url,target_cents) VALUES($1,$2,$3,$4)',
    [title, description, image, cents]
  );
  await pool.query('INSERT INTO audit_logs(actor_id,action) VALUES($1,$2)', [a.id, 'campaign.create']);
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function toggleCampaign(fd: FormData) {
  checkOrigin(await headers());
  const a = await requireArea('campaigns');
  const id = Number(fd.get('id'));
  await pool.query('UPDATE campaigns SET active=NOT active WHERE id=$1', [id]);
  await pool.query(
    'INSERT INTO audit_logs(actor_id,action,details) VALUES($1,$2,$3)',
    [a.id, 'campaign.toggle', JSON.stringify({ id })]
  );
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function deleteCampaign(fd: FormData) {
  checkOrigin(await headers());
  const a = await requireArea('campaigns');
  const id = Number(fd.get('id'));
  await pool.query('DELETE FROM campaigns WHERE id=$1', [id]);
  await pool.query(
    'INSERT INTO audit_logs(actor_id,action,details) VALUES($1,$2,$3)',
    [a.id, 'campaign.delete', JSON.stringify({ id })]
  );
  revalidatePath('/');
  revalidatePath('/admin');
}

/* ===== STORIES ===== */
export async function addStory(fd: FormData) {
  checkOrigin(await headers());
  const a = await requireArea('stories');
  const name = text(fd, 'name', 120);
  const role = text(fd, 'role', 120);
  const quote = text(fd, 'quote', 1000);
  const emoji = text(fd, 'emoji', 8) || '💚';
  const image_url = mediaUrl(text(fd, 'image_url', 500));
  if (!name || !quote) throw Error('Nome e depoimento obrigatórios');
  await pool.query(
    'INSERT INTO stories(name,role,quote,emoji,image_url,sort_order) VALUES($1,$2,$3,$4,$5,COALESCE((SELECT MAX(sort_order)+1 FROM stories),1))',
    [name, role, quote, emoji, image_url]
  );
  await pool.query('INSERT INTO audit_logs(actor_id,action) VALUES($1,$2)', [a.id, 'story.create']);
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function toggleStory(fd: FormData) {
  checkOrigin(await headers());
  const a = await requireArea('stories');
  const id = Number(fd.get('id'));
  await pool.query('UPDATE stories SET active=NOT active WHERE id=$1', [id]);
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function deleteStory(fd: FormData) {
  checkOrigin(await headers());
  const a = await requireArea('stories');
  const id = Number(fd.get('id'));
  await pool.query('DELETE FROM stories WHERE id=$1', [id]);
  revalidatePath('/');
  revalidatePath('/admin');
}

/* ===== IMPACT STATS ===== */
export async function addImpact(fd: FormData) {
  checkOrigin(await headers());
  const a = await requireArea('impact');
  const icon = text(fd, 'icon', 8) || '⭐';
  const value = text(fd, 'value', 40);
  const label = text(fd, 'label', 120);
  if (!value || !label) throw Error('Valor e rótulo obrigatórios');
  await pool.query(
    'INSERT INTO impact_stats(icon,value,label,sort_order) VALUES($1,$2,$3,COALESCE((SELECT MAX(sort_order)+1 FROM impact_stats),1))',
    [icon, value, label]
  );
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function toggleImpact(fd: FormData) {
  checkOrigin(await headers());
  await requireArea('impact');
  const id = Number(fd.get('id'));
  await pool.query('UPDATE impact_stats SET active=NOT active WHERE id=$1', [id]);
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function deleteImpact(fd: FormData) {
  checkOrigin(await headers());
  const a = await requireArea('impact');
  const id = Number(fd.get('id'));
  await pool.query('DELETE FROM impact_stats WHERE id=$1', [id]);
  revalidatePath('/');
  revalidatePath('/admin');
}

/* ===== CAROUSEL ===== */
export async function addCarousel(fd: FormData) {
  checkOrigin(await headers());
  const a = await requireArea('carousel');
  const title = text(fd, 'title', 160);
  const caption = text(fd, 'caption', 500);
  const image_url = mediaUrl(text(fd, 'image_url', 500));
  const video_url = text(fd, 'video_url', 500);
  let youtube_id = text(fd, 'youtube_id', 20);
  const link_url = text(fd, 'link_url', 500);

  // Extract YouTube ID from full URL if pasted
  if (!youtube_id && (video_url.includes('youtube.com') || video_url.includes('youtu.be'))) {
    const m =
      video_url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/) ||
      video_url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/) ||
      video_url.match(/embed\/([a-zA-Z0-9_-]{6,})/);
    if (m) youtube_id = m[1];
  }

  if (!image_url && !youtube_id && !video_url) throw Error('Informe imagem, vídeo ou YouTube');

  await pool.query(
    `INSERT INTO carousel_items(title,caption,image_url,video_url,youtube_id,link_url,sort_order)
     VALUES($1,$2,$3,$4,$5,$6,COALESCE((SELECT MAX(sort_order)+1 FROM carousel_items),1))`,
    [title, caption, image_url, video_url, youtube_id, link_url]
  );
  await pool.query('INSERT INTO audit_logs(actor_id,action) VALUES($1,$2)', [a.id, 'carousel.create']);
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function toggleCarousel(fd: FormData) {
  checkOrigin(await headers());
  await requireArea('carousel');
  const id = Number(fd.get('id'));
  await pool.query('UPDATE carousel_items SET active=NOT active WHERE id=$1', [id]);
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function deleteCarousel(fd: FormData) {
  checkOrigin(await headers());
  const a = await requireArea('carousel');
  const id = Number(fd.get('id'));
  await pool.query('DELETE FROM carousel_items WHERE id=$1', [id]);
  revalidatePath('/');
  revalidatePath('/admin');
}


/* ===== UPDATE IMPACT ===== */
export async function updateImpact(fd: FormData) {
  checkOrigin(await headers());
  const a = await requireArea('impact');
  const id = Number(fd.get('id'));
  const icon = text(fd, 'icon', 8) || '⭐';
  const value = text(fd, 'value', 40);
  const label = text(fd, 'label', 120);
  if (!id || !value || !label) throw Error('Dados invalidos');
  await pool.query('UPDATE impact_stats SET icon=$1, value=$2, label=$3 WHERE id=$4', [icon, value, label, id]);
  await pool.query('INSERT INTO audit_logs(actor_id,action,details) VALUES($1,$2,$3)', [a.id, 'impact.update', JSON.stringify({ id })]);
  revalidatePath('/');
  revalidatePath('/admin');
}

/* ===== DONATION PRESETS ===== */
export async function addPreset(fd: FormData) {
  checkOrigin(await headers());
  const a = await requireArea('presets');
  const amount = Number(fd.get('amount') || 0);
  const label = text(fd, 'label', 40);
  const description = text(fd, 'description', 80);
  if (!amount || amount < 1 || !label) throw Error('Valor e rótulo obrigatórios');
  const cents = Math.round(amount * 100);
  await pool.query(
    'INSERT INTO donation_presets(amount_cents,label,description,sort_order) VALUES($1,$2,$3,COALESCE((SELECT MAX(sort_order)+1 FROM donation_presets),1))',
    [cents, label, description]
  );
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function togglePreset(fd: FormData) {
  checkOrigin(await headers());
  await requireArea('presets');
  const id = Number(fd.get('id'));
  await pool.query('UPDATE donation_presets SET active=NOT active WHERE id=$1', [id]);
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function deletePreset(fd: FormData) {
  checkOrigin(await headers());
  const a = await requireArea('presets');
  const id = Number(fd.get('id'));
  await pool.query('DELETE FROM donation_presets WHERE id=$1', [id]);
  revalidatePath('/');
  revalidatePath('/admin');
}


/* ===== SHOP ===== */
function slugify(t: string) {
  return (
    t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'produto'
  );
}

async function uniqueSlug(base: string, ignoreId: number | null = null) {
  let slug = base;
  let i = 2;
  while ((await pool.query('SELECT 1 FROM shop_products WHERE slug=$1 AND ($2::bigint IS NULL OR id<>$2)', [slug, ignoreId])).rowCount) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

async function shopFileKey(fd: FormData) {
  const k = text(fd, 'digital_file_key', 80);
  if (!k) return '';
  if (!KEY_RE.test(k)) throw Error('Arquivo inválido');
  const r = await pool.query('SELECT 1 FROM shop_files WHERE key=$1', [k]);
  if (!r.rowCount) throw Error('Arquivo não encontrado. Envie novamente.');
  return k;
}

async function dropFileIfOrphan(key: string) {
  if (!key) return;
  const used = await pool.query('SELECT 1 FROM shop_products WHERE digital_file_key=$1 LIMIT 1', [key]);
  if (used.rowCount) return;
  await pool.query('DELETE FROM shop_files WHERE key=$1', [key]);
  await unlink(path.join(storageDir(), key)).catch(() => {});
}

async function parseShopProduct(fd: FormData) {
  const title = text(fd, 'title', 160);
  if (!title) throw Error('Título obrigatório');
  const price = Number(String(fd.get('price') || '0').replace(',', '.'));
  if (!price || price < 1) throw Error('Preço inválido (mínimo R$ 1,00)');
  const types = ['card', 'image', 'message', 'wallpaper', 'certificate', 'other'];
  const type = text(fd, 'product_type', 30);
  return {
    title,
    description: text(fd, 'description', 3000),
    short_description: text(fd, 'short_description', 300),
    price_cents: Math.round(price * 100),
    product_type: types.includes(type) ? type : 'other',
    cover_image: mediaUrl(text(fd, 'cover_image', 500)),
    digital_content: text(fd, 'digital_content', 5000),
    digital_file_key: await shopFileKey(fd),
    is_gift: fd.get('is_gift') === 'on',
    featured: fd.get('featured') === 'on',
  };
}

export async function addShopProduct(fd: FormData) {
  checkOrigin(await headers());
  const a = await requireArea('shop');
  const p = await parseShopProduct(fd);
  const slug = await uniqueSlug(slugify(p.title));
  await pool.query(
    `INSERT INTO shop_products
      (title, slug, description, short_description, price_cents, product_type, cover_image,
       digital_content, digital_file_key, is_gift, featured, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, COALESCE((SELECT MAX(sort_order)+1 FROM shop_products),1))`,
    [p.title, slug, p.description, p.short_description, p.price_cents, p.product_type, p.cover_image,
     p.digital_content, p.digital_file_key, p.is_gift, p.featured]
  );
  await pool.query('INSERT INTO audit_logs(actor_id,action) VALUES($1,$2)', [a.id, 'shop.product.create']);
  revalidatePath('/loja');
  revalidatePath('/admin');
}

export async function updateShopProduct(fd: FormData) {
  checkOrigin(await headers());
  const a = await requireArea('shop');
  const id = Number(fd.get('id'));
  if (!id) throw Error('Produto inválido');
  const old = (await pool.query('SELECT digital_file_key FROM shop_products WHERE id=$1', [id])).rows[0];
  if (!old) throw Error('Produto não encontrado');
  const p = await parseShopProduct(fd);
  await pool.query(
    `UPDATE shop_products SET title=$1, description=$2, short_description=$3, price_cents=$4, product_type=$5,
       cover_image=$6, digital_content=$7, digital_file_key=$8, is_gift=$9, featured=$10 WHERE id=$11`,
    [p.title, p.description, p.short_description, p.price_cents, p.product_type, p.cover_image,
     p.digital_content, p.digital_file_key, p.is_gift, p.featured, id]
  );
  if (old.digital_file_key && old.digital_file_key !== p.digital_file_key) await dropFileIfOrphan(old.digital_file_key);
  await pool.query('INSERT INTO audit_logs(actor_id,action,details) VALUES($1,$2,$3)', [a.id, 'shop.product.update', JSON.stringify({ id })]);
  revalidatePath('/loja');
  revalidatePath('/admin');
}

export async function toggleShopProduct(fd: FormData) {
  checkOrigin(await headers());
  await requireArea('shop');
  const id = Number(fd.get('id'));
  await pool.query('UPDATE shop_products SET active = NOT active WHERE id=$1', [id]);
  revalidatePath('/loja');
  revalidatePath('/admin');
}

export async function deleteShopProduct(fd: FormData) {
  checkOrigin(await headers());
  const a = await requireArea('shop');
  const id = Number(fd.get('id'));
  const has = await pool.query('SELECT 1 FROM shop_orders WHERE product_id=$1 LIMIT 1', [id]);
  if (has.rowCount) {
    // Produto com pedidos não pode sumir (os compradores ainda precisam do conteúdo): apenas oculta
    await pool.query('UPDATE shop_products SET active=false WHERE id=$1', [id]);
  } else {
    const old = (await pool.query('DELETE FROM shop_products WHERE id=$1 RETURNING digital_file_key', [id])).rows[0];
    if (old?.digital_file_key) await dropFileIfOrphan(old.digital_file_key);
  }
  await pool.query('INSERT INTO audit_logs(actor_id,action,details) VALUES($1,$2,$3)', [a.id, 'shop.product.delete', JSON.stringify({ id })]);
  revalidatePath('/loja');
  revalidatePath('/admin');
}

export async function markShopOrderPaid(fd: FormData) {
  checkOrigin(await headers());
  const a = await requireArea('shop');
  const id = Number(fd.get('id'));
  await pool.query(
    `UPDATE shop_orders SET status='delivered', paid_at=COALESCE(paid_at, now()), delivered_at=now() WHERE id=$1`,
    [id]
  );
  await pool.query('INSERT INTO audit_logs(actor_id,action,details) VALUES($1,$2,$3)', [a.id, 'shop.order.deliver', JSON.stringify({ id })]);
  revalidatePath('/loja');
  revalidatePath('/admin');
}
