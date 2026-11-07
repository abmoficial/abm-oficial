BEGIN;
CREATE TABLE IF NOT EXISTS admins (
 id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'editor' CHECK(role IN ('editor','publisher','admin')),
 active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS site_settings (
 id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id=1),
 site_name TEXT NOT NULL DEFAULT 'Nossa Associação',
 hero_title TEXT NOT NULL DEFAULT 'Juntos transformamos vidas',
 hero_text TEXT NOT NULL DEFAULT 'Sua contribuição faz a diferença em nossa comunidade.',
 hero_image TEXT NOT NULL DEFAULT '', logo_url TEXT NOT NULL DEFAULT '',
 about_title TEXT NOT NULL DEFAULT 'Nossa missão',
 about_text TEXT NOT NULL DEFAULT 'Trabalhamos para fortalecer nossa comunidade.',
 primary_color TEXT NOT NULL DEFAULT '#173b32',
 button_text TEXT NOT NULL DEFAULT 'Quero contribuir',
 footer_text TEXT NOT NULL DEFAULT 'Transparência e compromisso com a comunidade.',
 published BOOLEAN NOT NULL DEFAULT TRUE,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by BIGINT REFERENCES admins(id)
);
INSERT INTO site_settings(id) VALUES (1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS campaigns (
 id BIGSERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
 image_url TEXT NOT NULL DEFAULT '', target_cents BIGINT CHECK(target_cents IS NULL OR target_cents>0),
 active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS media (
 id BIGSERIAL PRIMARY KEY, url TEXT NOT NULL, original_name TEXT NOT NULL,
 mime_type TEXT NOT NULL, size_bytes BIGINT NOT NULL, uploaded_by BIGINT REFERENCES admins(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS contributions (
 id BIGSERIAL PRIMARY KEY, amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 100 AND 100000000),
 donor_name TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '',
 campaign_id BIGINT REFERENCES campaigns(id),
 pix_txid TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'awaiting_manual_verification'
 CHECK(status IN ('awaiting_manual_verification','confirmed','cancelled')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), confirmed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS audit_logs (
 id BIGSERIAL PRIMARY KEY, actor_id BIGINT REFERENCES admins(id), action TEXT NOT NULL,
 details JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contributions_created ON contributions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
COMMIT;
