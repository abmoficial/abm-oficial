'use client';

import { useState } from 'react';

type Camp = { id: number; title: string };
type Preset = { value: string; label: string; desc: string };

const DEFAULT_PRESETS: Preset[] = [
  { value: '50', label: 'R$ 50', desc: '1 cesta' },
  { value: '100', label: 'R$ 100', desc: '2 cestas' },
  { value: '120', label: 'R$ 120', desc: '1 curso' },
  { value: '180', label: 'R$ 180', desc: 'kit completo' },
];

export default function Donation({
  campaigns,
  presets,
}: {
  campaigns: Camp[];
  presets?: Preset[];
}) {
  const options = presets && presets.length > 0 ? presets : DEFAULT_PRESETS;
  const [amount, setAmount] = useState(options[0]?.value || '50');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [campaign, setCampaign] = useState('');
  const [pix, setPix] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPix(null);
    try {
      const r = await fetch('/api/pix', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          amount,
          name,
          message,
          campaignId: campaign || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.error || 'Erro ao gerar PIX');
      setPix(j);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="amount-options">
        {options.map((p) => (
          <button
            key={p.value}
            type="button"
            className={`amount-btn ${amount === p.value ? 'active' : ''}`}
            onClick={() => setAmount(p.value)}
          >
            {p.label}
            {p.desc && <small>{p.desc}</small>}
          </button>
        ))}
      </div>

      <div className="field">
        <label htmlFor="valor">Ou digite outro valor (R$)</label>
        <input
          id="valor"
          type="number"
          step="0.01"
          min="1"
          max="1000000"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ex: 250"
        />
      </div>

      <div className="field">
        <label htmlFor="nome">Seu nome (opcional)</label>
        <input
          id="nome"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Como podemos te chamar?"
        />
      </div>

      <div className="field">
        <label htmlFor="msg">Mensagem (opcional)</label>
        <textarea
          id="msg"
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Deixe uma mensagem de carinho..."
          rows={3}
        />
      </div>

      {campaigns.length > 0 && (
        <div className="field">
          <label htmlFor="camp">Destinar a um projeto</label>
          <select id="camp" value={campaign} onChange={(e) => setCampaign(e.target.value)}>
            <option value="">Contribuição geral</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      )}

      <button className="btn btn-gold btn-lg" style={{ width: '100%' }} disabled={loading} type="submit">
        {loading ? 'Gerando PIX seguro...' : 'Gerar PIX agora'}
      </button>

      {error && <p className="error">{error}</p>}

      {pix && (
        <div className="pix-result">
          <img width={220} height={220} src={pix.qr} alt="QR Code PIX" />
          <p style={{ marginBottom: 12, fontSize: '0.95rem', opacity: 0.9 }}>
            <strong>Beneficiário: {pix.receiver}</strong>
          </p>
          <p className="small muted" style={{ marginBottom: 12, color: 'rgba(255,255,255,0.6)' }}>
            Confira o nome do beneficiário no aplicativo do banco antes de pagar.
          </p>
          <div className="pix-code">{pix.code}</div>
          <button
            type="button"
            className="btn btn-outline"
            style={{ width: '100%', borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
            onClick={() => navigator.clipboard.writeText(pix.code)}
          >
            Copiar código PIX
          </button>
          <p className="trust-note">
            🔒 PIX gerado com segurança no servidor · A geração do código não comprova pagamento
          </p>
        </div>
      )}

      {!pix && (
        <p className="trust-note">
          🔒 Pagamento seguro via PIX · A chave nunca fica exposta no navegador
        </p>
      )}
    </form>
  );
}
