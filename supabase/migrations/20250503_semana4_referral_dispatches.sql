-- ============================================================
-- Migração Semana 4: Prêmios de Indicação e Disparos Agendados
-- ============================================================

-- ============================================================
-- 1. TABELA: referral_rewards
-- Prêmios configurados por tenant para o programa de indicação
-- ============================================================

CREATE TABLE IF NOT EXISTS referral_rewards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  reward_type   TEXT NOT NULL DEFAULT 'discount'
                  CHECK (reward_type IN ('discount', 'gift', 'service', 'cash', 'points', 'custom')),
  reward_value  TEXT NOT NULL,
  min_referrals INTEGER NOT NULL DEFAULT 1 CHECK (min_referrals >= 1),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  usage_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_tenant ON referral_rewards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_active ON referral_rewards(tenant_id, is_active);

-- RLS
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_referral_rewards"
  ON referral_rewards
  FOR ALL
  USING (tenant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = referral_rewards.tenant_id
    AND uc.user_id = auth.uid()
  ));

-- ============================================================
-- 2. TABELA: referral_leads
-- Leads indicados por promotores
-- ============================================================

CREATE TABLE IF NOT EXISTS referral_leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  referrer_name     TEXT NOT NULL,
  referrer_phone    TEXT NOT NULL,
  referrer_conv_id  UUID REFERENCES ai_conversations(id),
  lead_name         TEXT,
  lead_phone        TEXT,
  lead_email        TEXT,
  reward_id         UUID REFERENCES referral_rewards(id),
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'contacted', 'converted', 'delivered', 'cancelled')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_leads_tenant ON referral_leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_referral_leads_referrer ON referral_leads(tenant_id, referrer_phone);

ALTER TABLE referral_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_referral_leads"
  ON referral_leads
  FOR ALL
  USING (tenant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = referral_leads.tenant_id
    AND uc.user_id = auth.uid()
  ));

-- ============================================================
-- 3. TABELA: scheduled_dispatches
-- Disparos agendados processados pelo Cron Job Inngest
-- ============================================================

CREATE TABLE IF NOT EXISTS scheduled_dispatches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_name    TEXT NOT NULL,
  contact_phone   TEXT NOT NULL,
  dispatch_type   TEXT NOT NULL
                    CHECK (dispatch_type IN ('pre_sale_form', 'nps_survey', 'presale_followup')),
  scheduled_for   TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  metadata        JSONB DEFAULT '{}',
  retry_count     INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_dispatches_tenant ON scheduled_dispatches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_dispatches_pending ON scheduled_dispatches(status, scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_dispatches_tenant_status ON scheduled_dispatches(tenant_id, status);

ALTER TABLE scheduled_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_scheduled_dispatches"
  ON scheduled_dispatches
  FOR ALL
  USING (tenant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = scheduled_dispatches.tenant_id
    AND uc.user_id = auth.uid()
  ));

-- ============================================================
-- 4. COLUNA: last_message_at em ai_conversations (se não existir)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_conversations' AND column_name = 'last_message_at'
  ) THEN
    ALTER TABLE ai_conversations ADD COLUMN last_message_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================
-- 5. COLUNA: ai_reasoning em ai_conversation_messages (se não existir)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_conversation_messages' AND column_name = 'ai_reasoning'
  ) THEN
    ALTER TABLE ai_conversation_messages ADD COLUMN ai_reasoning TEXT;
  END IF;
END $$;

-- ============================================================
-- 6. COLUNA: mode em ai_conversations (se não existir)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_conversations' AND column_name = 'mode'
  ) THEN
    ALTER TABLE ai_conversations ADD COLUMN mode TEXT DEFAULT 'copilot'
      CHECK (mode IN ('copilot', 'autopilot'));
  END IF;
END $$;

-- ============================================================
-- 7. COLUNA: triggered_by em ai_conversations (se não existir)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_conversations' AND column_name = 'triggered_by'
  ) THEN
    ALTER TABLE ai_conversations ADD COLUMN triggered_by TEXT DEFAULT 'event';
  END IF;
END $$;

-- ============================================================
-- 8. TABELA: ai_prompt_versions (se não existir — criada na Semana 3)
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_prompt_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  flow_type     TEXT NOT NULL
                  CHECK (flow_type IN ('detractor', 'promoter', 'passive', 'pre_sale')),
  version_name  TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT false,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_versions_tenant ON ai_prompt_versions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_versions_active ON ai_prompt_versions(tenant_id, flow_type, is_active)
  WHERE is_active = true;

ALTER TABLE ai_prompt_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_ai_prompt_versions"
  ON ai_prompt_versions
  FOR ALL
  USING (tenant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = ai_prompt_versions.tenant_id
    AND uc.user_id = auth.uid()
  ));

-- ============================================================
-- Trigger: updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_referral_rewards_updated_at') THEN
    CREATE TRIGGER update_referral_rewards_updated_at
      BEFORE UPDATE ON referral_rewards
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_referral_leads_updated_at') THEN
    CREATE TRIGGER update_referral_leads_updated_at
      BEFORE UPDATE ON referral_leads
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_scheduled_dispatches_updated_at') THEN
    CREATE TRIGGER update_scheduled_dispatches_updated_at
      BEFORE UPDATE ON scheduled_dispatches
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
