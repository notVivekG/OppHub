-- OppHub Phase 3 Additive Migration
-- Add status_changed_at to applications table to track response rates and time-to-first-response

ALTER TABLE applications ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT NOW();
