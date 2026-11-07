'use client';

import { useState } from 'react';

export default function ImageUploadField({
  name,
  label,
  defaultUrl = '',
}: {
  name: string;
  label: string;
  defaultUrl?: string;
}) {
  const [url, setUrl] = useState(defaultUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw Error(j.error || 'Falha no upload');
      setUrl(j.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field" style={{ color: 'var(--texto)' }}>
      <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>{label}</span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onFile}
        style={{ background: '#fff', color: 'var(--texto)', border: '1px solid #c9d4ce', padding: 10 }}
      />
      <input type="hidden" name={name} value={url} />
      {busy && <p className="muted small">Enviando imagem...</p>}
      {error && <p className="error">{error}</p>}
      {url && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src={url}
            alt="Preview"
            style={{ width: 96, height: 64, objectFit: 'cover', borderRadius: 10, border: '1px solid #e2e8e6' }}
          />
          <div>
            <p className="small muted">Imagem pronta</p>
            <button
              type="button"
              className="btn"
              style={{ padding: '6px 12px', fontSize: 12, background: '#fee', color: '#a00', marginTop: 4 }}
              onClick={() => setUrl('')}
            >
              Remover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
