-- OppHub Initial Supabase Schema
-- Phase 1 - 4 Comprehensive Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Opportunities Table
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL DEFAULT 'simplify', -- 'simplify', 'hackathon-api', 'github-search', 'manual', etc.
  type TEXT NOT NULL CHECK (type IN ('internship', 'hackathon', 'contribution')),
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  location TEXT,
  remote BOOLEAN DEFAULT false,
  tech_stack TEXT[] DEFAULT ARRAY[]::TEXT[],
  stipend TEXT,
  date_discovered TIMESTAMPTZ DEFAULT NOW(),
  deadline TIMESTAMPTZ,
  match_score FLOAT, -- 0 to 100 calculated against user profile/resume
  priority_score FLOAT, -- composite ranking score
  raw_snippet TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'seen', 'dismissed'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON opportunities(type);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_remote ON opportunities(remote);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON opportunities(deadline);
CREATE INDEX IF NOT EXISTS idx_opportunities_priority ON opportunities(priority_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_opportunities_discovered ON opportunities(date_discovered DESC);

-- 2. Resume Versions Table
CREATE TABLE IF NOT EXISTS resume_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT NOT NULL, -- e.g. 'base', 'backend', 'ai-ml', 'fullstack'
  json_resume JSONB NOT NULL, -- JSON Resume standard schema
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Applications Pipeline Table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  resume_version_id UUID REFERENCES resume_versions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'wishlist' CHECK (
    status IN ('wishlist', 'applied', 'oa', 'interview', 'offer', 'rejected', 'withdrawn')
  ),
  date_applied TIMESTAMPTZ,
  follow_up_date TIMESTAMPTZ,
  recruiter_contact TEXT,
  notes TEXT,
  result TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_opp_id ON applications(opportunity_id);

-- 4. Watchlist (Lightweight change detection)
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  label TEXT NOT NULL,
  css_selector TEXT,
  last_content_hash TEXT,
  last_checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (
    type IN ('new_opportunity', 'deadline_soon', 'watchlist_change', 'follow_up_due')
  ),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  related_id UUID,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 6. Settings (Single-user configuration)
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  eligibility_rules JSONB DEFAULT '{
    "gradYears": [2025, 2026, 2027, 2028],
    "degrees": ["Bachelors", "Masters"],
    "requiresSponsorship": false,
    "usCitizenOnlyAllowed": true,
    "remoteOnly": false,
    "preferredLocations": ["Remote", "New York, NY", "San Francisco, CA", "Seattle, WA", "Austin, TX"],
    "targetRoles": ["Software Engineer", "Backend", "Frontend", "Full Stack", "AI/ML", "Data Engineer"]
  }'::JSONB,
  notification_prefs JSONB DEFAULT '{
    "priorityThreshold": 70,
    "telegramEnabled": true,
    "inAppEnabled": true,
    "notifyOnDeadlineDays": 3
  }'::JSONB,
  telegram_chat_id TEXT,
  watched_languages TEXT[] DEFAULT ARRAY['typescript', 'python', 'go', 'rust']::TEXT[]
);

-- Realtime Publication enablement
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE opportunities;
