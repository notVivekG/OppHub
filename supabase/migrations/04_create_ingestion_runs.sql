-- OppHub Phase 5 Migration: Ingestion Runs Telemetry Table
-- Records status, timing, and item counts for each ingestion run across all sources

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL, -- 'simplify', 'hackathons', 'github-issues', 'watchlist'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  item_count INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'empty_unexpected')),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_source ON ingestion_runs(source);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_started ON ingestion_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_status ON ingestion_runs(status);
