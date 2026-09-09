import { EligibilityRules, OpportunityType } from '@/types';

export interface ScoringInputs {
  type?: OpportunityType;
  matchScore?: number | null; // 0 - 100
  deadline?: string | null;
  remote?: boolean;
  location?: string | null;
  company?: string;
  title?: string;
  companyInterestScore?: number; // default 50
  eligibilityRules?: EligibilityRules | null;
}

export interface ScoreBreakdown {
  matchComponent: number;
  urgencyComponent: number;
  eligibilityComponent: number;
  locationComponent: number;
  interestComponent: number;
  eligibilityPass: boolean;
  finalScore: number;
  daysToDeadline: number | null;
}

/**
 * Calculates composite priority score according to OppHub specification:
 * priority_score =
 *     0.35 * match_score                        (0-100)
 *   + 0.20 * min(1, 21 / days_to_deadline) * 100 (urgency: caps under 3 weeks)
 *   + 0.15 * eligibility_pass                   (0 or 100)
 *   + 0.15 * location_fit_score                 (0-100)
 *   + 0.15 * company_interest_score             (0-100, default 50)
 */
export function calculatePriorityScore(inputs: ScoringInputs): ScoreBreakdown {
  const {
    type = 'internship',
    matchScore = 75,
    deadline,
    remote = false,
    location = '',
    company = '',
    companyInterestScore = 50,
    eligibilityRules,
  } = inputs;

  // 1. Match Component (0.35 weight)
  const normalizedMatch = Math.min(100, Math.max(0, matchScore ?? 75));
  const matchComponent = 0.35 * normalizedMatch;

  // 2. Urgency Component (0.20 weight)
  let daysToDeadline: number | null = null;
  let urgencyFactor = 0.4; // default baseline when no deadline is set (ongoing)

  // Explicit guard: for open-source contributions with deadline = null,
  // urgency resolves to 0 (neutral — no urgency boost, no crash)
  if (type === 'contribution' && !deadline) {
    urgencyFactor = 0;
  } else if (deadline) {
    const target = new Date(deadline).getTime();
    const now = Date.now();
    const diffDays = Math.max(1, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
    daysToDeadline = diffDays;

    // min(1, 21 / days_to_deadline)
    // If deadline is <= 21 days away, urgency increases up to 1.0 (100%)
    urgencyFactor = Math.min(1, 21 / diffDays);
  }

  const urgencyComponent = 0.20 * urgencyFactor * 100;

  // 3. Eligibility Gate (0.15 weight)
  // Rules like remote-only, graduation year, and sponsorship are meaningful for internships,
  // while contributions bypass remote-only entirely (open-source issues have no location).
  // Hackathons bypass grad-years and visa sponsorship, but STILL check remote-only against their real location/remote data.
  let eligibilityPass = true;
  if (eligibilityRules) {
    if (type === 'contribution') {
      // Contributions bypass remote-only and employment rules
      eligibilityPass = true;
    } else if (type === 'hackathon') {
      // Hackathons enforce remoteOnly if user specified remoteOnly, but bypass grad years and sponsorship
      if (eligibilityRules.remoteOnly && !remote) {
        eligibilityPass = false;
      }
    } else {
      // Internships enforce remoteOnly
      if (eligibilityRules.remoteOnly && !remote) {
        eligibilityPass = false;
      }
    }
  }

  const eligibilityScore = eligibilityPass ? 100 : 0;
  const eligibilityComponent = 0.15 * eligibilityScore;

  // 4. Location Fit Score (0.15 weight)
  let locationFitScore = 50; // default neutral
  if (type === 'contribution' || remote) {
    locationFitScore = 100;
  } else if (eligibilityRules?.preferredLocations && eligibilityRules.preferredLocations.length > 0) {
    const locLower = (location || '').toLowerCase();
    const matchesPreferred = eligibilityRules.preferredLocations.some((pref) =>
      locLower.includes(pref.toLowerCase())
    );
    locationFitScore = matchesPreferred ? 95 : 40;
  }
  const locationComponent = 0.15 * locationFitScore;

  // 5. Company Interest Score (0.15 weight)
  const normalizedInterest = Math.min(100, Math.max(0, companyInterestScore));
  const interestComponent = 0.15 * normalizedInterest;

  // Composite calculation
  const rawFinalScore =
    matchComponent + urgencyComponent + eligibilityComponent + locationComponent + interestComponent;

  // If eligibility_pass is false, clamp score so it never triggers high-priority alerts
  const finalScore = eligibilityPass ? Math.round(rawFinalScore) : Math.min(45, Math.round(rawFinalScore));

  return {
    matchComponent: Math.round(matchComponent * 10) / 10,
    urgencyComponent: Math.round(urgencyComponent * 10) / 10,
    eligibilityComponent: Math.round(eligibilityComponent * 10) / 10,
    locationComponent: Math.round(locationComponent * 10) / 10,
    interestComponent: Math.round(interestComponent * 10) / 10,
    eligibilityPass,
    finalScore,
    daysToDeadline,
  };
}
