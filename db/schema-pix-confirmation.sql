BEGIN;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS payment_reported BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS payment_reported_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_contributions_reported_pending ON contributions(payment_reported_at DESC) WHERE payment_reported = TRUE AND status = 'awaiting_manual_verification';
COMMIT;
