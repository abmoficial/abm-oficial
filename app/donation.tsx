
'use client';

import { useState } from 'react';

type Camp = {
  id: number;
  title: string;
};

type Preset = {
  value: string;
  label: string;
  desc: string;
};

type PixResponse = {
  qr: string;
  code: string;
  receiver: string;
};

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
  const options =
    presets && presets.length > 0
      ? presets
      : DEFAULT_PRESETS;

  const [amount, setAmount] = useState(
    options[0]?.value || '50'
  );

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [campaign, setCampaign] = useState('');

  const [pix, setPix] = useState<PixResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentReported, setPaymentReported] = useState(false);
  const [error, setError] = useState('');
  const [copyError, setCopyError] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError('');
    setCopyError('');
    setPix(null);
    setCopied(false);
    setPaymentReported(false);

    try {
      const response = await fetch('/api/pix', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          name,
          message,
          campaignId: campaign || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Não foi possível gerar o Pix.'
        );
      }

      if (
        typeof data.code !== 'string' ||
        typeof data.qr !== 'string'
      ) {
        throw new Error(
          'O servidor retornou um Pix incompleto.'
        );
      }

      setPix({
        code: data.code,
        qr: data.qr,
        receiver: data.receiver || '',
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao gerar o Pix.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyPix() {
    if (!pix?.code || copying) return;

    setCopying(true);
    setCopyError('');

    try {
      await navigator.clipboard.writeText(pix.code);
      setCopied(true);
    } catch {
      setCopyError(
        'Não foi possível copiar automaticamente. Selecione o código acima e copie manualmente.'
      );
    } finally {
      setCopying(false);
    }
  }

  function reportPayment() {
    if (!pix || !copied) return;

    // Confirmação visual do doador.
    // Ainda não confirma o recebimento no banco.
    setPaymentReported(true);
  }

  return (
    <form onSubmit={submit}>
      <div className="amount-options">
        {options.map((p) => (
          <button
            key={p.value}
            type="button"
            className={`amount-btn ${
              amount === p.value ? 'active' : ''
            }`}
            onClick={() => setAmount(p.value)}
          >
            {p.label}
            {p.desc && <small>{p.desc}</small>}
          </button>
        ))}
      </div>

      <div className="field">
        <label htmlFor="valor">
          Ou digite outro valor (R$)
        </label>

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
        <label htmlFor="nome">
          Seu nome (opcional)
        </label>

        <input
          id="nome"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Como podemos te chamar?"
        />
      </div>

      <div className="field">
        <label htmlFor="msg">
          Mensagem (opcional)
        </label>

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
          <label htmlFor="camp">
            Destinar a um projeto
          </label>

          <select
            id="camp"
            value={campaign}
            onChange={(e) =>
              setCampaign(e.target.value)
            }
          >
            <option value="">
              Contribuição geral
            </option>

            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        className="btn btn-gold btn-lg"
        style={{ width: '100%' }}
        disabled={loading}
        type="submit"
      >
        {loading
          ? 'Gerando Pix seguro...'
          : 'Gerar Pix agora'}
      </button>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {pix && (
        <div className="pix-result">
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <img
              width={220}
              height={220}
              src={pix.qr}
              alt="QR Code Pix para doação"
              style={{
                display: 'block',
                background: '#ffffff',
                padding: 12,
                borderRadius: 14,
                maxWidth: '100%',
                height: 'auto',
              }}
            />
          </div>

          <p
            style={{
              marginBottom: 12,
              fontSize: '0.95rem',
              opacity: 0.95,
              textAlign: 'center',
              color: '#ffffff',
            }}
          >
            <strong>
              Beneficiário: {pix.receiver}
            </strong>
          </p>

          <p
            style={{
              marginBottom: 18,
              color: '#d5e5df',
              fontSize: 13,
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            Confira o nome do beneficiário no
            aplicativo do banco antes de pagar.
          </p>

          <div
            className="pix-code"
            style={{
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              maxWidth: '100%',
            }}
          >
            {pix.code}
          </div>

          {/* BOTÃO COPIAR PIX */}
          <button
            type="button"
            onClick={copyPix}
            disabled={copying}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              minHeight: 52,
              marginTop: 16,
              padding: '14px 18px',
              borderRadius: 12,
              border: '1px solid #d8e8df',
              background: copied
                ? '#e3f2e9'
                : '#ffffff',
              color: '#173e32',
              fontSize: 15,
              fontWeight: 700,
              cursor: copying
                ? 'wait'
                : 'pointer',
              transition: 'background 0.2s ease',
            }}
          >
            {copying
              ? 'Copiando...'
              : copied
                ? '✓ Código Pix copiado'
                : 'Copiar código Pix'}
          </button>

          {copyError && (
            <p
              role="alert"
              style={{
                marginTop: 10,
                color: '#ffe4c9',
                fontSize: 13,
              }}
            >
              {copyError}
            </p>
          )}

          {/* CONFIRMAÇÃO APÓS A CÓPIA */}
          {copied && !paymentReported && (
            <div
              style={{
                marginTop: 22,
                paddingTop: 20,
                borderTop:
                  '1px solid rgba(255,255,255,0.18)',
              }}
            >
              <p
                style={{
                  color: '#e4eee8',
                  textAlign: 'center',
                  fontSize: 14,
                  lineHeight: 1.6,
                  marginBottom: 14,
                }}
              >
                Já concluiu o pagamento no
                aplicativo do banco?
              </p>

              <button
                type="button"
                onClick={reportPayment}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  minHeight: 54,
                  padding: '14px 18px',
                  border: 'none',
                  borderRadius: 12,
                  background: '#d8b56b',
                  color: '#173e32',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Já fiz o Pix — Confirmar doação
              </button>
            </div>
          )}

          {paymentReported && (
            <div
              role="status"
              style={{
                marginTop: 20,
                padding: 20,
                borderRadius: 14,
                border: '1px solid #9fc9b3',
                background: '#e5f4e9',
                color: '#173e32',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 30,
                  marginBottom: 8,
                }}
              >
                ✓
              </div>

              <strong
                style={{
                  display: 'block',
                  fontSize: 17,
                  marginBottom: 8,
                }}
              >
                Obrigado por contribuir!
              </strong>

              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Você informou que realizou o Pix.
                Esta etapa ainda não registra
                a confirmação no sistema.
                O recebimento deverá ser
                conferido pela associação.
              </p>
            </div>
          )}

          <p
            className="trust-note"
            style={{
              marginTop: 22,
              color: '#d5e5df',
              textAlign: 'center',
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            🔒 Pix gerado com segurança no servidor.
            Copiar o código ou informar o pagamento
            não comprova o recebimento.
          </p>
        </div>
      )}

      {!pix && (
        <p className="trust-note">
          🔒 Pagamento seguro via Pix.
          A geração do código não confirma
          o recebimento da doação.
        </p>
      )}
    </form>
  );
}
