-- Migration: Adicionar coluna role na tabela users
-- Data: 2026-02-06

-- 1. Adicionar coluna role na tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';

-- 2. Atualizar role dos owners existentes para 'admin'
UPDATE users 
SET role = 'admin' 
WHERE is_owner = true;

-- 3. Comentário da coluna
COMMENT ON COLUMN users.role IS 'Nível de acesso do usuário: admin, manager, member, viewer';

-- 4. Verificar resultado
SELECT id, email, name, tenant_id, is_owner, role 
FROM users 
ORDER BY created_at DESC 
LIMIT 10;
