BEGIN;

CREATE TABLE IF NOT EXISTS schema_flags (key TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS shop_products (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  short_description TEXT NOT NULL DEFAULT '',
  price_cents INT NOT NULL CHECK(price_cents >= 100),
  product_type TEXT NOT NULL DEFAULT 'card'
    CHECK(product_type IN ('card','image','message','wallpaper','certificate','other')),
  cover_image TEXT NOT NULL DEFAULT '',
  digital_content TEXT NOT NULL DEFAULT '',
  digital_file_url TEXT NOT NULL DEFAULT '',
  is_gift BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shop_orders (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES shop_products(id),
  product_title TEXT NOT NULL,
  amount_cents INT NOT NULL,
  buyer_name TEXT NOT NULL DEFAULT '',
  buyer_email TEXT NOT NULL DEFAULT '',
  recipient_name TEXT NOT NULL DEFAULT '',
  gift_message TEXT NOT NULL DEFAULT '',
  pix_txid TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'awaiting_payment'
    CHECK(status IN ('awaiting_payment','paid','cancelled','delivered')),
  access_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shop_orders_token ON shop_orders(access_token);
CREATE INDEX IF NOT EXISTS idx_shop_orders_created ON shop_orders(created_at DESC);

INSERT INTO shop_products (title, slug, description, short_description, price_cents, product_type, is_gift, featured, sort_order, digital_content)
SELECT * FROM (VALUES
  (
    'Cartao Digital de Carinho',
    'cartao-digital-carinho',
    'Um cartao virtual para enviar a alguem especial. Apos a contribuicao, voce recebe o cartao digital para compartilhar por WhatsApp ou e-mail.',
    'Envie um cartao virtual com mensagem',
    1500,
    'card',
    TRUE,
    TRUE,
    1,
    'Obrigado por espalhar carinho! Seu cartao digital da Associacao Manancial esta pronto para ser compartilhado. Que este gesto inspire mais solidariedade.'
  ),
  (
    'Papel de Parede Solidario',
    'papel-de-parede-solidario',
    'Wallpaper digital exclusivo com arte inspirada na nossa causa. Ideal para celular ou computador.',
    'Wallpaper digital exclusivo',
    1000,
    'wallpaper',
    FALSE,
    TRUE,
    2,
    'Seu papel de parede solidario foi liberado. Use com orgulho e lembre-se: cada gesto conta.'
  ),
  (
    'Mensagem-Presente',
    'mensagem-presente',
    'Voce escolhe o valor e dedicamos uma mensagem especial em nome de alguem querido. Perfeito para datas comemorativas.',
    'Dedique uma mensagem em nome de alguem',
    2500,
    'message',
    TRUE,
    FALSE,
    3,
    'Sua mensagem-presente foi registrada com carinho. Obrigado por transformar afeto em ajuda concreta.'
  ),
  (
    'Certificado Virtual de Apoiador',
    'certificado-apoiador',
    'Certificado digital personalizado reconhecendo seu apoio a associacao. Pode ser baixado e compartilhado.',
    'Certificado digital de apoiador',
    2000,
    'certificate',
    FALSE,
    TRUE,
    4,
    'Parabens! Seu Certificado Virtual de Apoiador da Associacao Manancial foi gerado. Obrigado por fazer parte desta rede de solidariedade.'
  )
) AS v(title, slug, description, short_description, price_cents, product_type, is_gift, featured, sort_order, digital_content)
WHERE NOT EXISTS (SELECT 1 FROM schema_flags WHERE key='shop_seed') AND NOT EXISTS (SELECT 1 FROM shop_products);
INSERT INTO schema_flags(key) VALUES ('shop_seed') ON CONFLICT DO NOTHING;

COMMIT;
