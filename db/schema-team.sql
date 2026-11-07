-- Migração segura, mantém usuários existentes.
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check;
ALTER TABLE admins ADD CONSTRAINT admins_role_check CHECK (role IN ('admin','director','staff','publisher','editor'));
ALTER TABLE admins ADD COLUMN IF NOT EXISTS permissions TEXT[] NOT NULL DEFAULT '{}';
