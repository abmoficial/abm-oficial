
import { NextResponse } from 'next/server';
import { getAdmin } from '../../../lib/auth';
import { pool } from '../../../lib/db';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

const types: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function signature(buf: Buffer, t: string) {
  if (t === 'image/jpeg')
    return buf[0] === 255 && buf[1] === 216 && buf[2] === 255;

  if (t === 'image/png')
    return buf.subarray(0, 8).equals(
      Buffer.from('89504e470d0a1a0a', 'hex')
    );

  if (t === 'image/gif')
    return ['GIF87a', 'GIF89a'].includes(
      buf.subarray(0, 6).toString()
    );

  if (t === 'image/webp')
    return buf.subarray(0, 4).toString() === 'RIFF' &&
      buf.subarray(8, 12).toString() === 'WEBP';

  return false;
}

export async function POST(req: Request) {
  const a = await getAdmin();

  if (!a || !['admin', 'publisher', 'editor'].includes(a.role)) {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401 }
    );
  }

  const origin = req.headers.get('origin');
  const host = req.headers.get('host');

  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json(
      { error: 'Origem inválida' },
      { status: 403 }
    );
  }

  try {
    const fd = await req.formData();
    const file = fd.get('file');

    if (
      !(file instanceof File) ||
      !types[file.type] ||
      file.size > 5 * 1024 * 1024 ||
      file.size < 12
    ) {
      return NextResponse.json(
        { error: 'Imagem inválida ou maior que 5 MB' },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    if (!signature(bytes, file.type)) {
      return NextResponse.json(
        { error: 'Assinatura do arquivo inválida' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase Storage não configurado');
    }

    const name = randomUUID() + '.' + types[file.type];
    const objectPath = 'uploads/' + name;

    const uploadUrl =
      supabaseUrl.replace(/\/$/, '') +
      '/storage/v1/object/site-images/' +
      objectPath;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': file.type,
        'x-upsert': 'false',
      },
      body: bytes,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Erro no Supabase Storage:', response.status, error);
      throw new Error('Falha ao armazenar imagem');
    }

    const url =
      supabaseUrl.replace(/\/$/, '') +
      '/storage/v1/object/public/site-images/' +
      objectPath;

    try {
      await pool.query(
        `INSERT INTO media
          (url, original_name, mime_type, size_bytes, uploaded_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [url, file.name.slice(0, 200), file.type, file.size, a.id]
      );

      await pool.query(
        `INSERT INTO audit_logs (actor_id, action, details)
         VALUES ($1, $2, $3)`,
        [a.id, 'media.upload', JSON.stringify({ url })]
      );
    } catch (dbError) {
      console.error('Erro ao registrar upload:', dbError);
      throw dbError;
    }

    return NextResponse.json({ url });
  } catch (e) {
    console.error('Erro no upload:', e);

    return NextResponse.json(
      { error: 'Falha no upload' },
      { status: 500 }
    );
  }
}
