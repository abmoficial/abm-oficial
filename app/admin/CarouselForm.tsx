'use client';

import { useState } from 'react';
import { addCarousel } from './actions';

export default function CarouselForm() {
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw Error(j.error || 'Falha no upload');
      setImageUrl(j.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={addCarousel} style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
      <label className="field" style={{ color: 'var(--texto)' }}>
        <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Titulo (opcional)</span>
        <input name="title" style={inp} />
      </label>
      <label className="field" style={{ color: 'var(--texto)' }}>
        <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Legenda (opcional)</span>
        <textarea name="caption" rows={2} style={inp} />
      </label>

      <label className="field" style={{ color: 'var(--texto)' }}>
        <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Enviar imagem</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onFile}
          style={{ ...inp, padding: 10 }}
        />
      </label>
      {uploading && <p className="muted small">Enviando imagem...</p>}
      {error && <p className="error">{error}</p>}
      {imageUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={imageUrl} alt="Preview" style={{ width: 120, height: 68, borderRadius: 8, objectFit: 'cover' }} />
          <span className="small muted">Imagem pronta</span>
        </div>
      )}
      <input type="hidden" name="image_url" value={imageUrl} />

      <label className="field" style={{ color: 'var(--texto)' }}>
        <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Link do YouTube (cole a URL completa)</span>
        <input name="video_url" placeholder="https://www.youtube.com/watch?v=..." style={inp} />
      </label>
      <input type="hidden" name="youtube_id" value="" />
      <input type="hidden" name="link_url" value="" />

      <button className="btn btn-primary" type="submit" disabled={uploading}>
        Adicionar a galeria
      </button>
    </form>
  );
}

const inp = {
  background: '#fff',
  color: 'var(--texto)',
  border: '1px solid #c9d4ce',
} as const;
