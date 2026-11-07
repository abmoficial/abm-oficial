'use client';

import { useState } from 'react';
import { addStory } from './actions';

export default function StoryForm() {
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
    <form action={addStory} style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
      <label className="field" style={{ color: 'var(--texto)' }}>
        <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Nome</span>
        <input name="name" required style={inp} />
      </label>
      <label className="field" style={{ color: 'var(--texto)' }}>
        <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Papel / contexto</span>
        <input name="role" style={inp} />
      </label>
      <label className="field" style={{ color: 'var(--texto)' }}>
        <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Depoimento</span>
        <textarea name="quote" required rows={4} style={inp} />
      </label>
      <label className="field" style={{ color: 'var(--texto)' }}>
        <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Emoji (se sem foto)</span>
        <input name="emoji" defaultValue="💚" style={inp} />
      </label>

      <label className="field" style={{ color: 'var(--texto)' }}>
        <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Foto da pessoa</span>
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
          <img
            src={imageUrl}
            alt="Preview"
            style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }}
          />
          <span className="small muted">Foto pronta para salvar</span>
        </div>
      )}

      <input type="hidden" name="image_url" value={imageUrl} />

      <button className="btn btn-primary" type="submit" disabled={uploading}>
        Adicionar historia
      </button>
    </form>
  );
}

const inp = {
  background: '#fff',
  color: 'var(--texto)',
  border: '1px solid #c9d4ce',
} as const;
