BEGIN;

-- Arquivos digitais da lojinha (guardados fora de /public, só liberados após o pagamento)
CREATE TABLE IF NOT EXISTS shop_files (
  key TEXT PRIMARY KEY,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  uploaded_by BIGINT REFERENCES admins(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS digital_file_key TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_shop_products_list ON shop_products(active, featured DESC, sort_order);

COMMIT;
