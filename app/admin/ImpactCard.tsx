'use client';

import { useState } from 'react';
import { toggleImpact, deleteImpact, updateImpact } from './actions';

const inp = {
  background: '#fff',
  color: 'var(--texto)',
  border: '1px solid #c9d4ce',
} as const;

export default function ImpactCard({
  item,
  canDelete,
}: {
  item: { id: number; icon: string; value: string; label: string; active: boolean };
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="panel" style={{ margin: 0 }}>
        <form action={updateImpact} style={{ display: 'grid', gap: 10 }}>
          <input type="hidden" name="id" value={item.id} />
          <label className="field" style={{ color: 'var(--texto)' }}>
            <span style={{ color: 'var(--texto-claro)', fontSize: '0.85rem' }}>Icone</span>
            <input name="icon" defaultValue={item.icon} style={inp} />
          </label>
          <label className="field" style={{ color: 'var(--texto)' }}>
            <span style={{ color: 'var(--texto-claro)', fontSize: '0.85rem' }}>Valor</span>
            <input name="value" defaultValue={item.value} required style={inp} />
          </label>
          <label className="field" style={{ color: 'var(--texto)' }}>
            <span style={{ color: 'var(--texto-claro)', fontSize: '0.85rem' }}>Rotulo</span>
            <input name="label" defaultValue={item.label} required style={inp} />
          </label>
          <div className="actions">
            <button className="btn btn-primary" type="submit">
              Salvar
            </button>
            <button className="btn btn-outline" type="button" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="panel" style={{ margin: 0, textAlign: 'center' }}>
      <div style={{ fontSize: '2rem' }}>{item.icon}</div>
      <strong style={{ fontSize: '1.6rem', color: 'var(--verde-escuro)' }}>{item.value}</strong>
      <p className="muted">{item.label}</p>
      <div className="actions" style={{ justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-outline" type="button" onClick={() => setEditing(true)}>
          Editar
        </button>
        <form action={toggleImpact}>
          <input type="hidden" name="id" value={item.id} />
          <button className="btn btn-outline" type="submit">
            {item.active ? 'Ocultar' : 'Mostrar'}
          </button>
        </form>
        {canDelete && (
          <form action={deleteImpact}>
            <input type="hidden" name="id" value={item.id} />
            <button className="btn" type="submit" style={{ background: '#fee', color: '#a00' }}>
              Excluir
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
