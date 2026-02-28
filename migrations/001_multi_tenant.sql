-- ============================================================
-- HelloGrowth Multi-Tenant Migration
-- Versão: 1.0
-- Data: 2026-02-19
-- Descrição: Cria tabela de empresas (companies) e tabela de
--            relacionamento user_companies para suportar
--            múltiplas empresas por usuário.
-- ============================================================

-- 1. Criar tabela de empresas (companies)
-- Cada empresa é um tenant isolado no sistema
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE, -- URL amigável (ex: mirai-consult)
  logo_url TEXT,
  
  -- Dados do plano/assinatura
  plan TEXT DEFAULT 'trial', -- trial, client, rating, growth, growth_lifetime
  plan_addons JSONB DEFAULT '[]'::jsonb, -- ["game", "mpd"]
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'trialing', -- trialing, active, canceled, past_due
  trial_start_at TIMESTAMPTZ DEFAULT now(),
  trial_end_at TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  
  -- Configurações da empresa
  settings JSONB DEFAULT '{}'::jsonb,
  google_place_id TEXT,
  
  -- Limites baseados no plano
  max_users INTEGER DEFAULT 1,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID -- user_id do criador
);

-- 2. Criar tabela de relacionamento user_companies (N:N)
-- Um usuário pode pertencer a múltiplas empresas com diferentes roles
CREATE TABLE IF NOT EXISTS public.user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, manager, member, viewer
  is_default BOOLEAN DEFAULT false, -- empresa padrão ao fazer login
  status TEXT DEFAULT 'active', -- active, invited, suspended
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Garante que um usuário não pode estar na mesma empresa duas vezes
  UNIQUE(user_id, company_id)
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON public.user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company_id ON public.user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON public.companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer ON public.companies(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_subscription ON public.companies(stripe_subscription_id);

-- 4. Migrar dados existentes: criar companies a partir dos tenants existentes
-- Para cada tenant_id único na tabela users, criar uma empresa
INSERT INTO public.companies (id, name, plan, settings, created_by, created_at)
SELECT DISTINCT ON (u.tenant_id)
  u.tenant_id,
  COALESCE(u.company_name, u.name, 'Empresa sem nome'),
  COALESCE(u.plan, 'trial'),
  COALESCE(u.settings, '{}'::jsonb),
  u.id,
  COALESCE(u.created_at, now())
FROM public.users u
WHERE u.tenant_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 5. Migrar dados existentes: criar user_companies a partir dos users
INSERT INTO public.user_companies (user_id, company_id, role, is_default, status, accepted_at)
SELECT 
  u.id,
  u.tenant_id,
  CASE WHEN u.is_owner = true THEN 'owner' ELSE COALESCE(u.role, 'member') END,
  true, -- empresa atual é a padrão
  'active',
  now()
FROM public.users u
WHERE u.tenant_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- 6. Migrar team_members existentes para user_companies
INSERT INTO public.user_companies (user_id, company_id, role, is_default, status, accepted_at)
SELECT 
  tm.user_id,
  tm.tenant_id,
  COALESCE(tm.role, 'member'),
  false,
  CASE WHEN tm.status = 'active' THEN 'active' ELSE 'invited' END,
  tm.accepted_at
FROM public.team_members tm
WHERE tm.user_id IS NOT NULL AND tm.tenant_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- 7. Copiar google_place_id do business_profile para companies
UPDATE public.companies c
SET google_place_id = bp.google_place_id
FROM public.business_profile bp
WHERE bp.tenant_id = c.id AND bp.google_place_id IS NOT NULL;

-- 8. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Triggers para updated_at
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_companies_updated_at ON public.user_companies;
CREATE TRIGGER update_user_companies_updated_at
    BEFORE UPDATE ON public.user_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
