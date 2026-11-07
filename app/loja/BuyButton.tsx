'use client';

import { useState } from 'react';

type Product = {
  id: number;
  title: string;
  price_cents: number;
  is_gift: boolean;
};

export default function BuyButton({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          buyerName,
          buyerEmail,
          recipientName,
          giftMessage,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.error || 'Erro ao gerar pedido');
      setResult(j);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button className="btn btn-primary" type="button" onClick={() => setOpen(true)} style={{ width: '100%' }}>
        Presentear / Adquirir
      </button>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      {!result ? (
        <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
          <p className="muted small">
            Produto digital — nada físico. Após o PIX, você recebe o acesso na hora nesta tela.
          </p>
          <label className="field" style={{ color: 'var(--texto)' }}>
            <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Seu nome</span>
            <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} required style={inp} />
          </label>
          <label className="field" style={{ color: 'var(--texto)' }}>
            <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Seu e-mail (opcional)</span>
            <input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} style={inp} />
          </label>
          {product.is_gift && (
            <>
              <label className="field" style={{ color: 'var(--texto)' }}>
                <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Nome de quem vai receber</span>
                <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} style={inp} />
              </label>
              <label className="field" style={{ color: 'var(--texto)' }}>
                <span style={{ color: 'var(--texto-claro)', fontSize: '0.9rem' }}>Mensagem de carinho</span>
                <textarea value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} rows={3} style={inp} />
              </label>
            </>
          )}
          <button className="btn btn-gold" type="submit" disabled={loading}>
            {loading
              ? 'Gerando PIX...'
              : `Gerar PIX de ${(product.price_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
          </button>
          <button className="btn btn-outline" type="button" onClick={() => setOpen(false)}>
            Cancelar
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 8 }}>
            <strong>{result.productTitle}</strong>
          </p>
          <p className="muted small" style={{ marginBottom: 12 }}>
            Beneficiário: {result.receiver}
          </p>
          <img src={result.qr} width={200} height={200} alt="QR PIX" style={{ margin: '0 auto 12px', background: '#fff', borderRadius: 12, padding: 8 }} />
          <div className="pix-code" style={{ background: '#f4f4f4', color: '#333', marginBottom: 12 }}>{result.code}</div>
          <button className="btn btn-primary" type="button" style={{ width: '100%', marginBottom: 8 }} onClick={() => navigator.clipboard.writeText(result.code)}>
            Copiar código PIX
          </button>
          <a className="btn btn-outline" style={{ width: '100%', display: 'block' }} href={`/loja/pedido/${result.accessToken}`}>
            Abrir meu produto digital
          </a>
          <p className="small muted" style={{ marginTop: 12 }}>
            Guarde este link. Após confirmar o pagamento com a associação, o conteúdo fica disponivel.
          </p>
        </div>
      )}
    </div>
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
