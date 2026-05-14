-- ============================================================
-- Semana 8 — Integração 360dialog BSP
-- ============================================================

-- Adicionar colunas do 360dialog à tabela whatsapp_connections
ALTER TABLE whatsapp_connections
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'meta_cloud',
  ADD COLUMN IF NOT EXISTS channel_id TEXT,
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS api_key TEXT,
  ADD COLUMN IF NOT EXISTS waba_id TEXT,
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS quality_rating TEXT DEFAULT 'GREEN',
  ADD COLUMN IF NOT EXISTS messaging_tier TEXT DEFAULT 'TIER_1K',
  ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ;

-- Criar índice para busca por provider e tenant
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_provider
  ON whatsapp_connections(tenant_id, provider, status);

-- Tabela de templates submetidos para aprovação
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  connection_id UUID REFERENCES whatsapp_connections(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  template_category TEXT NOT NULL DEFAULT 'UTILITY',
  language TEXT NOT NULL DEFAULT 'pt_BR',
  body_text TEXT NOT NULL,
  components JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  meta_template_id TEXT,
  rejected_reason TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS desabilitado por enquanto (autenticação customizada via service_role_key)

-- Trigger de updated_at
CREATE OR REPLACE TRIGGER set_whatsapp_templates_updated_at
  BEFORE UPDATE ON whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índice para busca de templates por tenant e status
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_tenant_status
  ON whatsapp_templates(tenant_id, status);

-- Tabela de webhook events do 360dialog (para auditoria e debug)
CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  connection_id UUID REFERENCES whatsapp_connections(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  wa_message_id TEXT,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca de eventos por tenant e tipo
CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant_type
  ON whatsapp_webhook_events(tenant_id, event_type, created_at DESC);

-- Limpar eventos antigos (mais de 30 dias) via policy
-- (será executado pelo cron job)
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at
  ON whatsapp_webhook_events(created_at);
