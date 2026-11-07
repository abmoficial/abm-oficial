BEGIN;

CREATE TABLE IF NOT EXISTS schema_flags (key TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS stories_title TEXT NOT NULL DEFAULT 'Por tras de cada doacao existe um rosto';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS stories_subtitle TEXT NOT NULL DEFAULT 'Nao trabalhamos com numeros. Trabalhamos com nomes, sonhos e segundas chances.';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS impact_title TEXT NOT NULL DEFAULT 'O que ja construimos juntos';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS impact_subtitle TEXT NOT NULL DEFAULT 'Cada numero representa uma vida tocada pela generosidade de pessoas como voce.';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS donate_title TEXT NOT NULL DEFAULT 'Sua generosidade transforma realidades';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS donate_subtitle TEXT NOT NULL DEFAULT 'Escolha um valor. O PIX e gerado com seguranca no servidor.';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS cta_title TEXT NOT NULL DEFAULT 'O mundo muda quando alguem decide ajudar.';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS cta_text TEXT NOT NULL DEFAULT 'Voce pode ser essa pessoa hoje. Uma cesta, um curso, um sorriso.';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_email TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS youtube_url TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS instagram_url TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS stories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  quote TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '💚',
  image_url TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS impact_stats (
  id BIGSERIAL PRIMARY KEY,
  icon TEXT NOT NULL DEFAULT '⭐',
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carousel_items (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  youtube_id TEXT NOT NULL DEFAULT '',
  link_url TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS donation_presets (
  id BIGSERIAL PRIMARY KEY,
  amount_cents INT NOT NULL CHECK(amount_cents >= 100),
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO stories (name, role, quote, emoji, sort_order)
SELECT * FROM (VALUES
  ('Dona Maria, 72 anos', 'Participante do curso de artesanato',
   'Depois que meu marido faleceu, eu me sentia invisivel. No curso da Associacao eu voltei a sorrir, fiz amizades e ainda aprendi a gerar uma renda.',
   '👵', 1),
  ('Familia Santos', 'Recebeu cestas basicas',
   'Quando o desemprego bateu, nao sabiamos como alimentar as criancas. A cesta da Associacao nao foi so comida - foi alivio e dignidade.',
   '👨‍👩‍👧', 2),
  ('Seu Antonio, 68 anos', 'Aluno do curso de informatica',
   'Eu tinha vergonha de pedir ajuda pro meu neto com o celular. Hoje faco videochamada com meus filhos que moram longe.',
   '👴', 3)
) AS v(name, role, quote, emoji, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM schema_flags WHERE key='v2_seed_stories') AND NOT EXISTS (SELECT 1 FROM stories);
INSERT INTO schema_flags(key) VALUES ('v2_seed_stories') ON CONFLICT DO NOTHING;

INSERT INTO impact_stats (icon, value, label, sort_order)
SELECT * FROM (VALUES
  ('🛒', '3.800+', 'cestas basicas entregues', 1),
  ('📚', '12', 'cursos ativos para idosos', 2),
  ('❤️', '890', 'doadores recorrentes', 3),
  ('🏠', '4', 'bairros atendidos', 4)
) AS v(icon, value, label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM schema_flags WHERE key='v2_seed_impact') AND NOT EXISTS (SELECT 1 FROM impact_stats);
INSERT INTO schema_flags(key) VALUES ('v2_seed_impact') ON CONFLICT DO NOTHING;

INSERT INTO donation_presets (amount_cents, label, description, sort_order)
SELECT * FROM (VALUES
  (5000, 'R$ 50', '1 cesta', 1),
  (10000, 'R$ 100', '2 cestas', 2),
  (12000, 'R$ 120', '1 curso', 3),
  (18000, 'R$ 180', 'kit completo', 4)
) AS v(amount_cents, label, description, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM schema_flags WHERE key='v2_seed_presets') AND NOT EXISTS (SELECT 1 FROM donation_presets);
INSERT INTO schema_flags(key) VALUES ('v2_seed_presets') ON CONFLICT DO NOTHING;

COMMIT;

-- Cores extras (idempotente)
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS color_header TEXT NOT NULL DEFAULT '#0f2e28';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS color_footer TEXT NOT NULL DEFAULT '#0f2e28';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS color_button TEXT NOT NULL DEFAULT '#1a4d42';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS color_button_text TEXT NOT NULL DEFAULT '#ffffff';
