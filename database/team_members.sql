-- ============================================
-- SISTEMA MULTI-USUÁRIO - ESTRUTURA DE BANCO
-- ============================================

-- 1. Tabela de membros da equipe
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(owner_id, email)
);

-- 2. Tabela de permissões por role
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission)
);

-- 3. Inserir permissões padrão
INSERT INTO role_permissions (role, permission) VALUES
  -- Admin (dono da conta) - acesso total
  ('admin', 'manage_team'),
  ('admin', 'manage_forms'),
  ('admin', 'manage_leads'),
  ('admin', 'manage_products'),
  ('admin', 'view_analytics'),
  ('admin', 'send_messages'),
  ('admin', 'export_data'),
  ('admin', 'manage_settings'),
  
  -- Manager - quase tudo exceto gerenciar equipe
  ('manager', 'manage_forms'),
  ('manager', 'manage_leads'),
  ('manager', 'manage_products'),
  ('manager', 'view_analytics'),
  ('manager', 'send_messages'),
  ('manager', 'export_data'),
  
  -- Member - operações básicas
  ('member', 'manage_leads'),
  ('member', 'view_analytics'),
  ('member', 'send_messages'),
  
  -- Viewer - apenas visualização
  ('viewer', 'view_analytics')
ON CONFLICT (role, permission) DO NOTHING;

-- 4. Tabela de convites pendentes
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(owner_id, email)
);

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_team_members_owner ON team_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON team_invites(token);
CREATE INDEX IF NOT EXISTS idx_team_invites_owner ON team_invites(owner_id);

-- 6. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Row Level Security (RLS) - Segurança
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- Política: usuário pode ver apenas membros da sua própria equipe
CREATE POLICY team_members_select_policy ON team_members
  FOR SELECT
  USING (
    owner_id = auth.uid() OR 
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Política: apenas owner pode inserir/atualizar/deletar membros
CREATE POLICY team_members_insert_policy ON team_members
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY team_members_update_policy ON team_members
  FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY team_members_delete_policy ON team_members
  FOR DELETE
  USING (owner_id = auth.uid());

-- Política: convites
CREATE POLICY team_invites_select_policy ON team_invites
  FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY team_invites_insert_policy ON team_invites
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY team_invites_delete_policy ON team_invites
  FOR DELETE
  USING (owner_id = auth.uid());

-- 9. Comentários para documentação
COMMENT ON TABLE team_members IS 'Membros da equipe com diferentes níveis de acesso';
COMMENT ON TABLE role_permissions IS 'Permissões associadas a cada role';
COMMENT ON TABLE team_invites IS 'Convites pendentes para novos membros';
COMMENT ON COLUMN team_members.role IS 'admin: dono | manager: gerente | member: membro | viewer: visualizador';
COMMENT ON COLUMN team_members.status IS 'pending: aguardando aceite | active: ativo | suspended: suspenso';
