-- ============================================================
-- Migration: Múltiplos Fluxos de Kanban (kanban_boards)
-- Execute este SQL no painel do Supabase > SQL Editor
-- ============================================================

-- 1. Criar tabela de fluxos (boards)
CREATE TABLE IF NOT EXISTS kanban_boards (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT        NOT NULL,
  name        TEXT        NOT NULL DEFAULT 'Meu Funil',
  description TEXT,
  color       TEXT        DEFAULT '#6366f1',
  position    INTEGER     DEFAULT 0,
  is_default  BOOLEAN     DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Adicionar board_id e tenant_id nas etapas (kanban_stages)
ALTER TABLE kanban_stages ADD COLUMN IF NOT EXISTS board_id  UUID REFERENCES kanban_boards(id) ON DELETE CASCADE;
ALTER TABLE kanban_stages ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- 3. Adicionar board_id nos leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS board_id UUID;

-- 4. Índices de performance
CREATE INDEX IF NOT EXISTS idx_kanban_boards_tenant ON kanban_boards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kanban_stages_board  ON kanban_stages(board_id);
CREATE INDEX IF NOT EXISTS idx_leads_board          ON leads(board_id);

-- ============================================================
-- PRONTO! Após executar, o sistema criará automaticamente
-- o fluxo padrão para cada tenant na primeira vez que acessar.
-- ============================================================
