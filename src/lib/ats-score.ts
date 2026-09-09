/**
 * OppHub Client-Side ATS Resume Checker
 * 
 * Ported directly from hugounoclaw/ats-checker (MIT License).
 * See THIRD_PARTY_NOTICES.md for full attribution and license notice.
 * Pure client-side TypeScript — runs deterministically with zero network calls.
 */

import { AtsAnalysisResult, AtsCategoryScore, AtsKeywordAnalysis, JsonResume } from '@/types';

export const ACTION_VERBS = [
  'led', 'managed', 'developed', 'designed', 'implemented', 'created', 'built',
  'launched', 'increased', 'reduced', 'improved', 'optimized', 'delivered',
  'achieved', 'drove', 'spearheaded', 'coordinated', 'executed', 'established',
  'generated', 'negotiated', 'streamlined', 'automated', 'analyzed', 'architected',
  'scaled', 'mentored', 'directed', 'oversaw', 'produced', 'accelerated',
  'transformed', 'initiated', 'founded', 'restructured', 'consolidated',
  'pioneered', 'orchestrated', 'facilitated', 'resolved', 'engineered',
  'deployed', 'migrated', 'integrated', 'forecasted', 'budgeted', 'audited',
  'secured', 'expanded', 'boosted', 'grew', 'exceeded', 'surpassed', 'owned',
  'shipped', 'redesigned'
];

export const STOP_WORDS = new Set(
  'a an the and or of to in for with on at by from as is are be we our you your they their this that will can role job work team years experience strong ability skills using etc must have has had who which what when into across over per plus more most all any new other than then them it its'.split(/\s+/)
);

/**
 * Tokenizes text preserving technical terms like node.js, full-stack, c++, c#
 */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z+#.\-]{1,}/g) || [])
    .map((w) => w.replace(/[.\-]+$/, ''))
    .filter(Boolean);
}

/**
 * Converts structured JSON Resume into plain text representation for ATS checking
 */
export function jsonResumeToPlainText(resume: JsonResume): string {
  if (!resume) return '';

  const parts: string[] = [];

  // Basics
  if (resume.basics) {
    const { name, label, email, phone, location, summary, profiles } = resume.basics;
    const headerLines: string[] = [];
    if (name) headerLines.push(name);
    if (label) headerLines.push(label);
    const contact: string[] = [];
    if (email) contact.push(email);
    if (phone) contact.push(phone);
    if (location?.city || location?.region) {
      contact.push([location.city, location.region].filter(Boolean).join(', '));
    }
    if (contact.length > 0) headerLines.push(contact.join(' | '));
    if (profiles && profiles.length > 0) {
      headerLines.push(profiles.map((p) => p.url || p.username).filter(Boolean).join(' | '));
    }
    if (summary) {
      headerLines.push('');
      headerLines.push('Professional Summary');
      headerLines.push(summary);
    }
    parts.push(headerLines.join('\n'));
  }

  // Experience
  if (resume.work && resume.work.length > 0) {
    parts.push('\nWork Experience\n');
    for (const job of resume.work) {
      const dates = [job.startDate, job.endDate || 'Present'].filter(Boolean).join(' - ');
      parts.push(`${job.position || 'Software Engineer'} at ${job.name || 'Company'} (${dates})`);
      if (job.summary) parts.push(job.summary);
      if (job.highlights && job.highlights.length > 0) {
        for (const bullet of job.highlights) {
          parts.push(`- ${bullet}`);
        }
      }
      parts.push('');
    }
  }

  // Education
  if (resume.education && resume.education.length > 0) {
    parts.push('\nEducation\n');
    for (const edu of resume.education) {
      const dates = [edu.startDate, edu.endDate].filter(Boolean).join(' - ');
      parts.push(`${edu.studyType || 'Degree'} in ${edu.area || 'Field'}, ${edu.institution || 'University'} (${dates})`);
      if (edu.score) parts.push(`GPA: ${edu.score}`);
      if (edu.courses && edu.courses.length > 0) {
        parts.push(`Relevant Coursework: ${edu.courses.join(', ')}`);
      }
      parts.push('');
    }
  }

  // Skills
  if (resume.skills && resume.skills.length > 0) {
    parts.push('\nSkills\n');
    for (const skill of resume.skills) {
      const kw = skill.keywords?.join(', ') || '';
      parts.push(`${skill.name || 'Technical'}: ${kw}`);
    }
  }

  // Projects
  if (resume.projects && resume.projects.length > 0) {
    parts.push('\nProjects\n');
    for (const proj of resume.projects) {
      parts.push(`${proj.name || 'Project'}${proj.url ? ` (${proj.url})` : ''}`);
      if (proj.description) parts.push(proj.description);
      if (proj.highlights && proj.highlights.length > 0) {
        for (const bullet of proj.highlights) {
          parts.push(`- ${bullet}`);
        }
      }
      if (proj.keywords && proj.keywords.length > 0) {
        parts.push(`Tech stack: ${proj.keywords.join(', ')}`);
      }
      parts.push('');
    }
  }

  return parts.join('\n').trim();
}

/**
 * Analyzes resume plain text against standard ATS heuristics and an optional Job Description
 */
export function analyzeResumeAts(resumeText: string, jobDescription?: string | null): AtsAnalysisResult {
  const text = (resumeText || '').trim();
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wc = words.length;
  const categories: AtsCategoryScore[] = [];

  // 1. Contact info (max 15)
  const hasEmail = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i.test(text);
  const hasPhone = /(\+?\d[\d\s().\-]{7,}\d)/.test(text);
  const c1 = (hasEmail ? 9 : 0) + (hasPhone ? 6 : 0);
  categories.push({
    key: 'Contact Info',
    score: c1,
    max: 15,
    tips: [
      !hasEmail && { priority: 'hi' as const, text: 'No email detected. Ensure a standard plain-text email is near the top.' },
      !hasPhone && { priority: 'me' as const, text: 'No phone number detected. Add a standard contact phone number.' },
    ].filter(Boolean) as AtsCategoryScore['tips'],
  });

  // 2. Standard sections (max 20)
  const sec = {
    Experience: /(work experience|professional experience|employment|experience)/i.test(text),
    Education: /education/i.test(text),
    Skills: /(skills|technical skills|core competencies)/i.test(text),
  };
  const c2 = (sec.Experience ? 8 : 0) + (sec.Education ? 6 : 0) + (sec.Skills ? 6 : 0);
  categories.push({
    key: 'Standard Sections',
    score: c2,
    max: 20,
    tips: [
      !sec.Experience && { priority: 'hi' as const, text: 'Add an "Experience" or "Work Experience" heading — ATS relies on standard section headings.' },
      !sec.Education && { priority: 'me' as const, text: 'Add an "Education" section heading.' },
      !sec.Skills && { priority: 'me' as const, text: 'Add a "Skills" section so applicant tracking systems can easily index hard skills.' },
    ].filter(Boolean) as AtsCategoryScore['tips'],
  });

  // 3. Parse-friendly formatting (max 15)
  const tabCols = (text.match(/\t/g) || []).length + (text.match(/ {3,}\S+ {3,}\S/g) || []).length;
  const weird = (text.match(/[^\x00-\x7F]/g) || []).length;
  let c3 = 15;
  if (tabCols > 6) c3 -= 7;
  else if (tabCols > 2) c3 -= 3;
  if (weird > 25) c3 -= 6;
  else if (weird > 10) c3 -= 3;
  c3 = Math.max(0, c3);
  categories.push({
    key: 'Formatting & Layout',
    score: c3,
    max: 15,
    tips: [
      tabCols > 2 && { priority: 'hi' as const, text: 'Multi-column or heavy tab formatting detected. Use a single-column layout to prevent ATS text scrambling.' },
      weird > 10 && { priority: 'me' as const, text: 'Non-standard symbols detected. Replace fancy icons or glyphs with standard hyphens or bullet points.' },
    ].filter(Boolean) as AtsCategoryScore['tips'],
  });

  // 4. Action verbs (max 15)
  const tks = tokenize(lower);
  const setTk = new Set(tks);
  const matchedActions = ACTION_VERBS.filter((v) => setTk.has(v));
  const av = matchedActions.length;
  const c4 = Math.min(15, Math.round((av / 8) * 15));
  categories.push({
    key: 'Action Verbs',
    score: c4,
    max: 15,
    tips: [
      av < 8 && {
        priority: 'me' as const,
        text: `Found ${av} strong action verbs. Aim for 8+ distinct verbs (e.g. Led, Engineered, Optimized, Architected) at the start of bullets.`,
      },
    ].filter(Boolean) as AtsCategoryScore['tips'],
  });

  // 5. Quantified impact (max 15)
  const nums = (text.match(/(\$\s?\d|\d+\s?%|\b\d{2,}\b)/g) || []).length;
  const c5 = Math.min(15, Math.round((nums / 8) * 15));
  categories.push({
    key: 'Quantified Impact',
    score: c5,
    max: 15,
    tips: [
      nums < 6 && {
        priority: 'hi' as const,
        text: `Found ${nums} quantified metrics. Incorporate metrics (%, $, latency improvements, users served) to demonstrate impact.`,
      },
    ].filter(Boolean) as AtsCategoryScore['tips'],
  });

  // 6. Length & word count (max 10)
  let c6 = 10;
  let lenTip = null;
  if (wc < 200) {
    c6 = 3;
    lenTip = { priority: 'me' as const, text: `Resume is short (${wc} words). Aim for 400–800 words for early career software roles.` };
  } else if (wc < 400) {
    c6 = 7;
    lenTip = { priority: 'lo' as const, text: `Resume is slightly brief (${wc} words). Adding 2–3 measurable project bullets will bolster depth.` };
  } else if (wc > 1100) {
    c6 = 6;
    lenTip = { priority: 'lo' as const, text: `Resume is long (${wc} words). Consider condensing to keep it within 1–2 pages.` };
  }
  categories.push({
    key: 'Length & Brevity',
    score: c6,
    max: 10,
    tips: [lenTip].filter(Boolean) as AtsCategoryScore['tips'],
  });

  // 7. Dates present (max 10)
  const dates = (
    text.match(
      /((19|20)\d{2})|(\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4})|(\d{1,2}\/\d{4})/gi
    ) || []
  ).length;
  const c7 = dates >= 2 ? 10 : dates === 1 ? 5 : 0;
  categories.push({
    key: 'Timeline & Dates',
    score: c7,
    max: 10,
    tips: [
      dates < 2 && {
        priority: 'me' as const,
        text: 'Add standard employment and education dates (e.g., "May 2024 - Aug 2024") so ATS can build your experience timeline.',
      },
    ].filter(Boolean) as AtsCategoryScore['tips'],
  });

  const totalScore = categories.reduce((sum, cat) => sum + cat.score, 0);

  // Keyword density & matching vs Job Description
  let keywordAnalysis: AtsKeywordAnalysis | null = null;
  if (jobDescription && jobDescription.trim().length > 30) {
    const jdTokens = tokenize(jobDescription).filter(
      (w) => w.length > 2 && !STOP_WORDS.has(w)
    );
    const freq: Record<string, number> = {};
    for (const w of jdTokens) {
      freq[w] = (freq[w] || 0) + 1;
    }

    let candidates = [...new Set(jdTokens)].filter((w) => freq[w] >= 1);
    candidates = candidates.filter((w) => freq[w] >= 2 || w.length >= 5);
    candidates = candidates.sort((a, b) => freq[b] - freq[a]).slice(0, 30);

    const hit = candidates.filter((w) => setTk.has(w));
    const miss = candidates.filter((w) => !setTk.has(w));
    const pct = candidates.length ? Math.round((hit.length / candidates.length) * 100) : 0;

    keywordAnalysis = { pct, hit, miss };
  }

  return {
    totalScore,
    categories,
    keywordAnalysis,
    wordCount: wc,
    actionVerbsFound: matchedActions,
    quantifiedCount: nums,
  };
}
