-- ============================================================
-- Semana 7: Delivery Tracking + Notification Settings
-- ============================================================

-- 1. Adicionar colunas de tracking na tabela ai_conversation_messages
ALTER TABLE ai_conversation_messages
  ADD COLUMN IF NOT EXISTS wa_message_id TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound', 'system')),
  ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;

-- Índice para busca por wa_message_id (usado no webhook de status)
CREATE INDEX IF NOT EXISTS idx_ai_conv_messages_wa_id
  ON ai_conversation_messages(wa_message_id)
  WHERE wa_message_id IS NOT NULL;

-- 2. Adicionar colunas de tracking na tabela ai_messages (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_messages') THEN
    ALTER TABLE ai_messages
      ADD COLUMN IF NOT EXISTS wa_message_id TEXT,
      ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS error_message TEXT,
      ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'outbound',
      ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;
  END IF;
END $$;

-- 3. Tabela de configurações de notificação por tenant
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL UNIQUE,
  
  -- Notificações de escalada
  escalation_whatsapp_phone TEXT,
  escalation_email TEXT,
  escalation_enabled BOOLEAN DEFAULT true,
  
  -- Notificações de relatório semanal
  weekly_report_email TEXT,
  weekly_report_enabled BOOLEAN DEFAULT false,
  weekly_report_day INTEGER DEFAULT 1 CHECK (weekly_report_day BETWEEN 0 AND 6), -- 0=Dom, 1=Seg
  weekly_report_hour INTEGER DEFAULT 8 CHECK (weekly_report_hour BETWEEN 0 AND 23),
  
  -- Notificações de opt-out
  optout_notify_email TEXT,
  optout_notify_enabled BOOLEAN DEFAULT false,
  
  -- Notificações de nova conversa
  new_conversation_notify BOOLEAN DEFAULT false,
  new_conversation_email TEXT,
  
  -- Configurações gerais
  business_name TEXT,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para notification_settings
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_notification_settings" ON notification_settings
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true));

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_settings_updated_at ON notification_settings;
CREATE TRIGGER notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_notification_settings_updated_at();

-- 4. Tabela de log de relatórios enviados
CREATE TABLE IF NOT EXISTS report_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'weekly', -- weekly, monthly, pilot
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  recipient_email TEXT,
  period_from TIMESTAMPTZ,
  period_to TIMESTAMPTZ,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  metrics_snapshot JSONB
);

CREATE INDEX IF NOT EXISTS idx_report_log_tenant ON report_send_log(tenant_id, sent_at DESC);

-- 5. Adicionar colunas de alerta na tabela whatsapp_connections (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_connections') THEN
    ALTER TABLE whatsapp_connections
      ADD COLUMN IF NOT EXISTS alert_phone TEXT,
      ADD COLUMN IF NOT EXISTS alert_email TEXT,
      ADD COLUMN IF NOT EXISTS business_name TEXT;
  END IF;
END $$;
