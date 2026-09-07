import { calculatePriorityScore } from '../src/lib/scoring.js';

console.log('Testing Priority Scoring Engine...');

// Test 1: High match, urgent deadline (7 days away), remote
const test1 = calculatePriorityScore({
  matchScore: 90,
  deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  remote: true,
  companyInterestScore: 80,
  eligibilityRules: {
    gradYears: [2026],
    degrees: ['Bachelors'],
    requiresSponsorship: false,
    usCitizenOnlyAllowed: true,
    remoteOnly: false,
    preferredLocations: ['Remote'],
    targetRoles: ['Software Engineer']
  }
});

console.log('Test 1 (High match, 7 days to deadline, Remote):', test1);
if (test1.finalScore < 70) throw new Error('Expected test 1 score >= 70, got ' + test1.finalScore);

// Test 2: Ineligible (remote-only requested, but role is on-site)
const test2 = calculatePriorityScore({
  matchScore: 95,
  deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  remote: false,
  eligibilityRules: {
    gradYears: [2026],
    degrees: ['Bachelors'],
    requiresSponsorship: false,
    usCitizenOnlyAllowed: true,
    remoteOnly: true, // Requires remote!
    preferredLocations: ['Remote'],
    targetRoles: ['Software Engineer']
  }
});

console.log('Test 2 (Disqualified by Remote-only requirement):', test2);
if (test2.eligibilityPass !== false || test2.finalScore > 45) {
  throw new Error('Expected test 2 to be disqualified with finalScore <= 45');
}

console.log('All scoring engine tests passed successfully!');
