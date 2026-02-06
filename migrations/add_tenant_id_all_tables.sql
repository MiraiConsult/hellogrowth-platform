-- Migration: Adicionar tenant_id em todas as tabelas do sistema
-- Data: 2026-02-06
-- Objetivo: Permitir que múltiplos usuários da mesma empresa compartilhem os mesmos dados

-- ============================================================================
-- PARTE 1: Adicionar coluna tenant_id em todas as tabelas
-- ============================================================================

-- 1. campaigns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

COMMENT ON COLUMN campaigns.tenant_id IS 'ID do tenant (empresa) - todas as campanhas da empresa';

-- 2. forms
ALTER TABLE forms 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

COMMENT ON COLUMN forms.tenant_id IS 'ID do tenant (empresa) - todos os formulários da empresa';

-- 3. leads
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

COMMENT ON COLUMN leads.tenant_id IS 'ID do tenant (empresa) - todos os leads da empresa';

-- 4. nps_responses
ALTER TABLE nps_responses 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

COMMENT ON COLUMN nps_responses.tenant_id IS 'ID do tenant (empresa) - todas as respostas NPS da empresa';

-- 5. digital_diagnostics
ALTER TABLE digital_diagnostics 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

COMMENT ON COLUMN digital_diagnostics.tenant_id IS 'ID do tenant (empresa) - todos os diagnósticos da empresa';

-- 6. customer_actions
ALTER TABLE customer_actions 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

COMMENT ON COLUMN customer_actions.tenant_id IS 'ID do tenant (empresa) - todas as ações de clientes da empresa';

-- 7. intelligence_actions
ALTER TABLE intelligence_actions 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

COMMENT ON COLUMN intelligence_actions.tenant_id IS 'ID do tenant (empresa) - todas as ações de inteligência da empresa';

-- 8. interaction_history
ALTER TABLE interaction_history 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

COMMENT ON COLUMN interaction_history.tenant_id IS 'ID do tenant (empresa) - todo o histórico de interações da empresa';

-- 9. products_services
ALTER TABLE products_services 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

COMMENT ON COLUMN products_services.tenant_id IS 'ID do tenant (empresa) - todos os produtos/serviços da empresa';

-- 10. business_profile
ALTER TABLE business_profile 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

COMMENT ON COLUMN business_profile.tenant_id IS 'ID do tenant (empresa) - perfil único da empresa';

-- ============================================================================
-- PARTE 2: Atualizar dados existentes com tenant_id
-- ============================================================================

-- Atualizar campaigns: pegar tenant_id do user_id
UPDATE campaigns c
SET tenant_id = u.tenant_id
FROM users u
WHERE c.user_id = u.id AND c.tenant_id IS NULL;

-- Atualizar forms: pegar tenant_id do user_id
UPDATE forms f
SET tenant_id = u.tenant_id
FROM users u
WHERE f.user_id = u.id AND f.tenant_id IS NULL;

-- Atualizar leads: pegar tenant_id do user_id
UPDATE leads l
SET tenant_id = u.tenant_id
FROM users u
WHERE l.user_id = u.id AND l.tenant_id IS NULL;

-- Atualizar nps_responses: pegar tenant_id do user_id
UPDATE nps_responses nr
SET tenant_id = u.tenant_id
FROM users u
WHERE nr.user_id = u.id AND nr.tenant_id IS NULL;

-- Atualizar digital_diagnostics: pegar tenant_id do user_id
UPDATE digital_diagnostics dd
SET tenant_id = u.tenant_id
FROM users u
WHERE dd.user_id = u.id AND dd.tenant_id IS NULL;

-- Atualizar customer_actions: pegar tenant_id do user_id
UPDATE customer_actions ca
SET tenant_id = u.tenant_id
FROM users u
WHERE ca.user_id = u.id AND ca.tenant_id IS NULL;

-- Atualizar intelligence_actions: pegar tenant_id do user_id
UPDATE intelligence_actions ia
SET tenant_id = u.tenant_id
FROM users u
WHERE ia.user_id = u.id AND ia.tenant_id IS NULL;

-- Atualizar interaction_history: pegar tenant_id do user_id
UPDATE interaction_history ih
SET tenant_id = u.tenant_id
FROM users u
WHERE ih.user_id = u.id AND ih.tenant_id IS NULL;

-- Atualizar products_services: pegar tenant_id do user_id
UPDATE products_services ps
SET tenant_id = u.tenant_id
FROM users u
WHERE ps.user_id = u.id AND ps.tenant_id IS NULL;

-- Atualizar business_profile: pegar tenant_id do user_id
UPDATE business_profile bp
SET tenant_id = u.tenant_id
FROM users u
WHERE bp.user_id = u.id AND bp.tenant_id IS NULL;

-- ============================================================================
-- PARTE 3: Criar índices para otimizar consultas por tenant_id
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_id ON campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_forms_tenant_id ON forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nps_responses_tenant_id ON nps_responses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_digital_diagnostics_tenant_id ON digital_diagnostics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_actions_tenant_id ON customer_actions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_actions_tenant_id ON intelligence_actions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interaction_history_tenant_id ON interaction_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_services_tenant_id ON products_services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_business_profile_tenant_id ON business_profile(tenant_id);

-- ============================================================================
-- PARTE 4: Alterar business_profile para ter tenant_id UNIQUE ao invés de user_id
-- ============================================================================

-- Remover constraint UNIQUE de user_id
ALTER TABLE business_profile 
DROP CONSTRAINT IF EXISTS business_profile_user_id_key;

-- Adicionar constraint UNIQUE em tenant_id
ALTER TABLE business_profile 
ADD CONSTRAINT business_profile_tenant_id_key UNIQUE (tenant_id);

-- ============================================================================
-- VERIFICAÇÃO: Mostrar estatísticas das tabelas atualizadas
-- ============================================================================

SELECT 
    'campaigns' as tabela,
    COUNT(*) as total_registros,
    COUNT(DISTINCT tenant_id) as total_tenants,
    COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as sem_tenant
FROM campaigns
UNION ALL
SELECT 
    'forms',
    COUNT(*),
    COUNT(DISTINCT tenant_id),
    COUNT(CASE WHEN tenant_id IS NULL THEN 1 END)
FROM forms
UNION ALL
SELECT 
    'leads',
    COUNT(*),
    COUNT(DISTINCT tenant_id),
    COUNT(CASE WHEN tenant_id IS NULL THEN 1 END)
FROM leads
UNION ALL
SELECT 
    'nps_responses',
    COUNT(*),
    COUNT(DISTINCT tenant_id),
    COUNT(CASE WHEN tenant_id IS NULL THEN 1 END)
FROM nps_responses
UNION ALL
SELECT 
    'digital_diagnostics',
    COUNT(*),
    COUNT(DISTINCT tenant_id),
    COUNT(CASE WHEN tenant_id IS NULL THEN 1 END)
FROM digital_diagnostics
UNION ALL
SELECT 
    'business_profile',
    COUNT(*),
    COUNT(DISTINCT tenant_id),
    COUNT(CASE WHEN tenant_id IS NULL THEN 1 END)
FROM business_profile
ORDER BY tabela;
