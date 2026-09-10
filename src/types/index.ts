export type OpportunityType = 'internship' | 'hackathon' | 'contribution';
export type OpportunityStatus = 'new' | 'seen' | 'dismissed';

export interface Opportunity {
  id: string;
  source: string;
  type: OpportunityType;
  company: string;
  title: string;
  url: string;
  location: string | null;
  remote: boolean;
  tech_stack: string[];
  stipend?: string | null;
  date_discovered: string;
  deadline?: string | null;
  match_score?: number | null;
  priority_score?: number | null;
  raw_snippet?: string | null;
  status: OpportunityStatus;
  metadata?: Record<string, any> | null;
  is_expired?: boolean;
}

export type ApplicationStatus =
  | 'wishlist'
  | 'applied'
  | 'oa'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

export interface Application {
  id: string;
  opportunity_id: string;
  resume_version_id?: string | null;
  status: ApplicationStatus;
  date_applied?: string | null;
  follow_up_date?: string | null;
  recruiter_contact?: string | null;
  notes?: string | null;
  result?: string | null;
  status_changed_at?: string | null;
  updated_at: string;
  opportunity?: Opportunity;
}

export interface JsonResumeBasics {
  name?: string;
  label?: string;
  email?: string;
  phone?: string;
  url?: string;
  summary?: string;
  location?: {
    city?: string;
    region?: string;
    countryCode?: string;
  };
  profiles?: {
    network?: string;
    username?: string;
    url?: string;
  }[];
}

export interface JsonResumeWork {
  name?: string;
  position?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
}

export interface JsonResumeEducation {
  institution?: string;
  url?: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  score?: string;
  courses?: string[];
}

export interface JsonResumeSkill {
  name?: string;
  level?: string;
  keywords?: string[];
}

export interface JsonResumeProject {
  name?: string;
  description?: string;
  highlights?: string[];
  keywords?: string[];
  startDate?: string;
  endDate?: string;
  url?: string;
}

export interface JsonResume {
  basics?: JsonResumeBasics;
  work?: JsonResumeWork[];
  education?: JsonResumeEducation[];
  skills?: JsonResumeSkill[];
  projects?: JsonResumeProject[];
  [key: string]: any;
}

export interface ResumeVersion {
  id: string;
  label: string; // 'base', 'backend', 'ai-ml'
  json_resume: JsonResume;
  created_at: string;
  updated_at: string;
}

export interface AtsTip {
  priority: 'hi' | 'me' | 'lo';
  text: string;
}

export interface AtsCategoryScore {
  key: string;
  score: number;
  max: number;
  tips: AtsTip[];
}

export interface AtsKeywordAnalysis {
  pct: number;
  hit: string[];
  miss: string[];
}

export interface AtsAnalysisResult {
  totalScore: number;
  categories: AtsCategoryScore[];
  keywordAnalysis: AtsKeywordAnalysis | null;
  wordCount: number;
  actionVerbsFound: string[];
  quantifiedCount: number;
}

export interface SuggestedRewrite {
  originalBullet: string;
  suggestedBullet: string;
  jdKeywordsAddressed: string[];
}

export interface TailorResponse {
  matchScore: number;
  missingKeywords: string[];
  suggestedRewrites: SuggestedRewrite[];
  gaps: string[];
}

export interface WatchlistItem {
  id: string;
  url: string;
  label: string;
  css_selector?: string | null;
  last_content_hash?: string | null;
  last_checked_at: string;
}

export type NotificationType =
  | 'new_opportunity'
  | 'deadline_soon'
  | 'watchlist_change'
  | 'follow_up_due';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  related_id?: string | null;
  read: boolean;
  created_at: string;
}

export interface EligibilityRules {
  gradYears: number[];
  degrees: string[];
  requiresSponsorship: boolean;
  usCitizenOnlyAllowed: boolean;
  remoteOnly: boolean;
  preferredLocations: string[];
  targetRoles: string[];
}

export interface NotificationPrefs {
  priorityThreshold: number;
  telegramEnabled: boolean;
  inAppEnabled: boolean;
  notifyOnDeadlineDays: number;
}

export interface Settings {
  id: string;
  eligibility_rules: EligibilityRules;
  notification_prefs: NotificationPrefs;
  telegram_chat_id?: string | null;
  watched_languages: string[];
}
