-- Tabela para armazenar configurações de games (Roleta da Sorte)
CREATE TABLE IF NOT EXISTS nps_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'wheel',
  status TEXT NOT NULL DEFAULT 'active',
  google_review_url TEXT,
  prizes JSONB NOT NULL DEFAULT '[]',
  messages JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar participações nos games
CREATE TABLE IF NOT EXISTS nps_game_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES nps_games(id) ON DELETE CASCADE,
  lead_id UUID,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  prize_won TEXT NOT NULL,
  prize_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_nps_games_tenant ON nps_games(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nps_games_status ON nps_games(status);
CREATE INDEX IF NOT EXISTS idx_nps_participations_game ON nps_game_participations(game_id);
CREATE INDEX IF NOT EXISTS idx_nps_participations_status ON nps_game_participations(status);
CREATE INDEX IF NOT EXISTS idx_nps_participations_code ON nps_game_participations(prize_code);

-- Comentários
COMMENT ON TABLE nps_games IS 'Configurações de games de gamificação para pesquisas NPS';
COMMENT ON TABLE nps_game_participations IS 'Registro de participações e prêmios ganhos nos games';
