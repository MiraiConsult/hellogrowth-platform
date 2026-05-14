-- Módulo: Assinatura Eletrônica (Health Signatures)
-- Criado em: 2026-05-11
-- Descrição: Tabela para armazenar assinaturas eletrônicas dos pacientes
--             e colunas de configuração nos formulários de pré-venda.
-- Válido como assinatura eletrônica simples (Lei 14.063/2020 - Brasil)

-- 1. Criar tabela health_signatures
CREATE TABLE IF NOT EXISTS health_signatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  form_id UUID REFERENCES forms(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_email TEXT,
  patient_phone TEXT,
  signature_image TEXT NOT NULL,         -- base64 data URL da assinatura desenhada
  ip_address TEXT,                        -- IP do dispositivo (prova jurídica)
  user_agent TEXT,                        -- User-Agent do dispositivo
  consent_text TEXT,                      -- Texto do termo de consentimento assinado
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT FALSE,       -- Se o comprovante foi enviado por email
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_health_signatures_tenant_id ON health_signatures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_health_signatures_lead_id ON health_signatures(lead_id);
CREATE INDEX IF NOT EXISTS idx_health_signatures_form_id ON health_signatures(form_id);
CREATE INDEX IF NOT EXISTS idx_health_signatures_signed_at ON health_signatures(signed_at DESC);

-- 3. RLS (Row Level Security) - Apenas o tenant pode ver suas assinaturas
ALTER TABLE health_signatures ENABLE ROW LEVEL SECURITY;

-- Policy: tenant pode ler suas próprias assinaturas
CREATE POLICY "tenant_read_own_signatures" ON health_signatures
  FOR SELECT USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- Policy: service_role pode fazer tudo (para as APIs do backend)
CREATE POLICY "service_role_all" ON health_signatures
  FOR ALL USING (auth.role() = 'service_role');

-- 4. Adicionar colunas de configuração na tabela forms
ALTER TABLE forms
  ADD COLUMN IF NOT EXISTS signature_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS signature_auto_email BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consent_text TEXT;

-- 5. Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_health_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_health_signatures_updated_at ON health_signatures;
CREATE TRIGGER set_health_signatures_updated_at
  BEFORE UPDATE ON health_signatures
  FOR EACH ROW EXECUTE FUNCTION update_health_signatures_updated_at();
