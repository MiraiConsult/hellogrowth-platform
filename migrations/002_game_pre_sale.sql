-- Migration: Add game support to pre-sale forms
-- Description: Adds game_enabled column to forms table and source column to game_participations

-- Add game_enabled to forms table
ALTER TABLE forms ADD COLUMN IF NOT EXISTS game_enabled BOOLEAN DEFAULT false;

-- Add source to nps_game_participations table
ALTER TABLE nps_game_participations ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'post-sale';

-- Update existing nps_game_participations to have 'post-sale' as source
UPDATE nps_game_participations SET source = 'post-sale' WHERE source IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_nps_game_participations_source ON nps_game_participations(source);
CREATE INDEX IF NOT EXISTS idx_forms_game_enabled ON forms(game_enabled);
