-- Migration: Add game_id column to forms table
-- Description: Links forms to a specific nps_game for pre-sale spin-the-wheel feature

-- Add game_id to forms table (references nps_games)
ALTER TABLE forms ADD COLUMN IF NOT EXISTS game_id UUID REFERENCES nps_games(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_forms_game_id ON forms(game_id);
