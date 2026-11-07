import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getAdmin, canAccess } from '../../../../lib/auth';
import { pool } from '../../../../lib/db';
import { ensureSchema } from '../../../../lib/schema';
import { MAX_BYTES, RULES, extOf, safeName, storageDir } from '../../../../lib/shopfiles';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const a = await getAdmin();
  if (!a || !['admin', 'publisher'].includes(a.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ error: 'Origem inválida' }, { status: 403 });
  }

  try {
    await ensureSchema();
    const fd = await req.formData();
    const file = fd.get('file');
    if (!(file instanceof File) || file.size < 4) {
      return NextResponse.json({ error: 'Selecione um arquivo válido.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Arquivo maior que ${Math.round(MAX_BYTES / 1024 / 1024)} MB.` },
        { status: 400 }
      );
    }
    const ext = extOf(file.name);
    const rule = RULES[ext];
    if (!rule) {
      return NextResponse.json(
        { error: 'Tipo não permitido. Use PDF, imagem, MP3, MP4, ZIP, DOCX, XLSX, PPTX ou TXT.' },
        { status: 400 }
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!rule.check(bytes)) {
      return NextResponse.json({ error: 'O conteúdo do arquivo não confere com a extensão.' }, { status: 400 });
    }

    const key = `${randomUUID()}.${ext}`;
    const dir = storageDir();
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, key), bytes, { flag: 'wx' });
    const name = safeName(file.name);
    await pool.query(
      'INSERT INTO shop_files(key, original_name, mime_type, size_bytes, uploaded_by) VALUES($1,$2,$3,$4,$5)',
      [key, name, rule.mime, file.size, a.id]
    );
    await pool.query('INSERT INTO audit_logs(actor_id,action,details) VALUES($1,$2,$3)', [
      a.id,
      'shop.file.upload',
      JSON.stringify({ key, name }),
    ]);
    return NextResponse.json({ key, name, size: file.size });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Falha ao enviar o arquivo.' }, { status: 500 });
  }
}
