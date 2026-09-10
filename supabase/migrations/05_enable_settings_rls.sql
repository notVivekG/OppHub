-- OppHub Phase 5 Migration: Settings Table Row Level Security (RLS)
-- Restricts public/anon access to sensitive credentials (Telegram bot token and chat ID).
-- Server-side routes and ingestion scripts using the service_role key bypass RLS automatically.

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Note: Without any permissive policies for the 'anon' role, public client-side queries
-- from the browser will return empty results, protecting Telegram bot tokens and chat IDs.
-- The Next.js server API (/api/settings) uses getSupabaseAdmin() (service_role), which
-- bypasses RLS cleanly.
