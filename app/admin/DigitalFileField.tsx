'use client';

import { useRef, useState } from 'react';

function fmt(n: number) {
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
  return Math.max(1, Math.round(n / 1024)) + ' KB';
}

export default function DigitalFileField({
  name,
  label,
  accept,
  defaultKey = '',
  defaultName = '',
  defaultSize = 0,
}: {
  name: string;
  label: string;
  accept: string;
  defaultKey?: string;
  defaultName?: string;
  defaultSize?: number;
}) {
  const [key, setKey] = useState(defaultKey);
  const [fileName, setFileName] = useState(defaultName);
  const [size, setSize] = useState(defaultSize);
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function send(file: File) {
    setError('');
    setPct(0);
    const fd = new FormData();
    fd.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/shop/upload');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => {
      setPct(null);
      setError('Falha de conexão no envio.');
    };
    xhr.onload = () => {
      setPct(null);
      let j: any = {};
      try { j = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        setKey(j.key);
        setFileName(j.name);
        setSize(j.size);
      } else {
        setError(j.error || 'Falha no envio.');
      }
    };
    xhr.send(fd);
  }

  function pick(files: FileList | null) {
    const f = files?.[0];
    if (f) send(f);
    if (input.current) input.current.value = '';
  }

  return (
    <div className="field" style={{ color: 'var(--texto)' }}>
      <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>{label}</span>
      <input type="hidden" name={name} value={key} />

      {!key && pct === null && (
        <div
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
          onClick={() => input.current?.click()}
          style={{
            border: `2px dashed ${over ? 'var(--verde)' : '#c9d4ce'}`,
            background: over ? '#eef6f2' : '#fff',
            borderRadius: 14,
            padding: '22px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            color: 'var(--texto)',
          }}
        >
          <div style={{ fontSize: '1.6rem' }}>📎</div>
          <strong>Clique ou arraste o arquivo aqui</strong>
          <p className="muted small" style={{ marginTop: 4 }}>
            PDF, imagem, MP3, MP4, ZIP, DOCX, XLSX, PPTX ou TXT · só é liberado após o pagamento
          </p>
        </div>
      )}

      <input ref={input} type="file" accept={accept} hidden onChange={(e) => pick(e.target.files)} />

      {pct !== null && (
        <div style={{ background: '#fff', border: '1px solid #c9d4ce', borderRadius: 14, padding: 14 }}>
          <p className="small" style={{ marginBottom: 6 }}>Enviando… {pct}%</p>
          <div style={{ height: 8, background: '#e5ebe8', borderRadius: 99 }}>
            <div style={{ width: `${pct}%`, height: 8, background: 'var(--verde)', borderRadius: 99, transition: 'width .2s' }} />
          </div>
        </div>
      )}

      {key && pct === null && (
        <div style={{ background: '#eef6f2', border: '1px solid #cfe3d9', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.6rem' }}>✅</span>
          <div style={{ flex: 1, minWidth: 160 }}>
            <strong style={{ wordBreak: 'break-all' }}>{fileName || 'Arquivo enviado'}</strong>
            {size > 0 && <p className="muted small">{fmt(size)} · pronto para entrega</p>}
          </div>
          <button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => input.current?.click()}>
            Trocar
          </button>
          <button
            type="button"
            className="btn"
            style={{ padding: '6px 12px', fontSize: 12, background: '#fee', color: '#a00' }}
            onClick={() => { setKey(''); setFileName(''); setSize(0); }}
          >
            Remover
          </button>
        </div>
      )}

      {error && <p className="error" style={{ color: '#b00020' }}>{error}</p>}
    </div>
  );
}
