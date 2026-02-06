-- Migration: Adicionar sistema de tenant_id para multi-tenancy
-- Data: 2026-02-05
-- Descrição: Adiciona tenant_id nas tabelas para permitir que múltiplos usuários compartilhem a mesma empresa

-- 1. Adicionar colunas na tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tenant_id UUID,
ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT false;

-- 2. Adicionar colunas na tabela team_members
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 3. Adicionar colunas na tabela team_invites
ALTER TABLE team_invites 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 4. Migrar dados existentes
-- Para usuários existentes sem tenant_id, criar um tenant para cada um (cada usuário vira seu próprio tenant)
UPDATE users 
SET tenant_id = id, is_owner = true 
WHERE tenant_id IS NULL;

-- 5. Atualizar team_members com tenant_id do owner
UPDATE team_members tm
SET tenant_id = u.tenant_id
FROM users u
WHERE tm.owner_id = u.id
AND tm.tenant_id IS NULL;

-- 6. Atualizar team_invites com tenant_id do owner
UPDATE team_invites ti
SET tenant_id = u.tenant_id
FROM users u
WHERE ti.owner_id = u.id
AND ti.tenant_id IS NULL;

-- 7. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_members_tenant_id ON team_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_tenant_id ON team_invites(tenant_id);

-- 8. Comentários nas colunas
COMMENT ON COLUMN users.tenant_id IS 'ID do tenant (empresa) ao qual o usuário pertence';
COMMENT ON COLUMN users.is_owner IS 'Indica se o usuário é o dono/criador do tenant';
COMMENT ON COLUMN team_members.tenant_id IS 'ID do tenant (empresa) ao qual o membro pertence';
COMMENT ON COLUMN team_invites.tenant_id IS 'ID do tenant (empresa) ao qual o convite pertence';
