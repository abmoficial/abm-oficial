-- Migração para identificar cobranças Mercado Pago nas doações.
-- Não altera o status das doações existentes.
ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS mp_order_id TEXT;

ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;

ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'static_pix';

CREATE UNIQUE INDEX IF NOT EXISTS contributions_mp_order_id_unique
  ON contributions (mp_order_id)
  WHERE mp_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contributions_mp_payment_id_unique
  ON contributions (mp_payment_id)
  WHERE mp_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS contributions_payment_provider_idx
  ON contributions (payment_provider);
