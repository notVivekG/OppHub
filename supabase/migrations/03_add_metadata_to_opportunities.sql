-- OppHub Phase 4 Additive Migration
-- Add flexible metadata JSONB column for type-specific attributes (prize pool, mode, issue number, labels, etc.)

ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB;
