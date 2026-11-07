'use client';

import { addCampaign } from './actions';
import ImageUploadField from './ImageUploadField';

const inp = {
  background: '#fff',
  color: 'var(--texto)',
  border: '1px solid #c9d4ce',
} as const;

export default function CampaignForm() {
  return (
    <form action={addCampaign} style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
      <label className="field" style={{ color: 'var(--texto)' }}>
        <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Titulo</span>
        <input name="title" required style={inp} />
      </label>
      <label className="field" style={{ color: 'var(--texto)' }}>
        <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Descricao</span>
        <textarea name="description" rows={3} style={inp} />
      </label>
      <ImageUploadField name="image_url" label="Imagem do projeto" />
      <label className="field" style={{ color: 'var(--texto)' }}>
        <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Meta em R$ (opcional)</span>
        <input name="target" type="number" step="0.01" min="0" style={inp} />
      </label>
      <button className="btn btn-primary" type="submit">
        Adicionar projeto
      </button>
    </form>
  );
}
