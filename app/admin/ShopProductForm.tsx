'use client';

import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import ImageUploadField from './ImageUploadField';
import DigitalFileField from './DigitalFileField';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.gif,.mp3,.mp4,.zip,.docx,.xlsx,.pptx,.txt';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? 'Salvando…' : label}
    </button>
  );
}

export default function ShopProductForm({
  action,
  product,
  file,
  submitLabel,
}: {
  action: (fd: FormData) => Promise<void>;
  product?: any;
  file?: { original_name: string; size_bytes: number } | null;
  submitLabel: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [n, setN] = useState(0);
  const [saved, setSaved] = useState(false);
  const editing = !!product;

  async function run(fd: FormData) {
    setSaved(false);
    await action(fd);
    setSaved(true);
    if (!editing) {
      ref.current?.reset();
      setN((v) => v + 1);
    }
  }

  const label = (t: string) => <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>{t}</span>;

  return (
    <form ref={ref} action={run} style={{ display: 'grid', gap: 12, maxWidth: 620 }}>
      {editing && <input type="hidden" name="id" value={product.id} />}

      <label className="field" style={{ color: 'var(--texto)' }}>
        {label('Título')}
        <input name="title" required defaultValue={product?.title} style={inp} />
      </label>
      <label className="field" style={{ color: 'var(--texto)' }}>
        {label('Descrição curta (aparece no cartão)')}
        <input name="short_description" defaultValue={product?.short_description} style={inp} />
      </label>
      <label className="field" style={{ color: 'var(--texto)' }}>
        {label('Descrição completa')}
        <textarea name="description" rows={3} defaultValue={product?.description} style={inp} />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
        <label className="field" style={{ color: 'var(--texto)' }}>
          {label('Preço (R$)')}
          <input
            name="price"
            type="number"
            step="0.01"
            min="1"
            required
            defaultValue={product ? (product.price_cents / 100).toFixed(2) : undefined}
            style={inp}
          />
        </label>
        <label className="field" style={{ color: 'var(--texto)' }}>
          {label('Tipo')}
          <select name="product_type" defaultValue={product?.product_type || 'card'} style={inp}>
            <option value="card">Cartão digital</option>
            <option value="message">Mensagem-presente</option>
            <option value="wallpaper">Wallpaper</option>
            <option value="image">Imagem digital</option>
            <option value="certificate">Certificado</option>
            <option value="other">Outro digital</option>
          </select>
        </label>
      </div>

      <ImageUploadField key={'c' + n} name="cover_image" label="Imagem de capa (vitrine)" defaultUrl={product?.cover_image || ''} />

      <label className="field" style={{ color: 'var(--texto)' }}>
        {label('Mensagem liberada após o pagamento (opcional)')}
        <textarea
          name="digital_content"
          rows={4}
          defaultValue={product?.digital_content}
          style={inp}
          placeholder="Texto do cartão, mensagem de agradecimento ou instruções…"
        />
      </label>

      <DigitalFileField
        key={'f' + n}
        name="digital_file_key"
        label="Arquivo digital para download (envie do seu computador)"
        accept={ACCEPT}
        defaultKey={product?.digital_file_key || ''}
        defaultName={file?.original_name || ''}
        defaultSize={Number(file?.size_bytes || 0)}
      />

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--texto)' }}>
          <input type="checkbox" name="is_gift" defaultChecked={product ? product.is_gift : true} />
          <span>Pode ser presente (pede nome e mensagem)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--texto)' }}>
          <input type="checkbox" name="featured" defaultChecked={product ? product.featured : false} />
          <span>Destaque (aparece primeiro)</span>
        </label>
      </div>

      <Submit label={submitLabel} />
      {saved && <p className="small" style={{ color: 'var(--verde)' }}>✔ Salvo com sucesso.</p>}
    </form>
  );
}

const inp = {
  background: '#fff',
  color: 'var(--texto)',
  border: '1px solid #c9d4ce',
  borderRadius: 12,
  padding: '12px 14px',
  width: '100%',
  font: 'inherit',
} as const;
