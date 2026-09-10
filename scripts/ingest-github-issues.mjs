/**
 * OppHub GitHub Good First Issue Radar Ingestion Script
 * 
 * Queries the official GitHub Search API for open "good first issue" items
 * filtered by the user's watched languages (from Supabase settings or defaults).
 *
 * RATE LIMIT NOTICE:
 * The GitHub Search API enforces a strict rate limit of 30 requests/minute for authenticated
 * requests (and 10 requests/minute for unauthenticated requests) — distinct from the 5,000/hr
 * core REST API quota. Queries MUST be run sequentially with spacing between languages.
 * DO NOT parallelize requests across languages.
 *
 * Usage:
 *   node scripts/ingest-github-issues.mjs [--dry-run] [--limit=50] [--output=src/data/seed-opportunities.json] [--lang=typescript]
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import {
  recordIngestionRun,
  sendIngestionAlertIfNeeded,
  evaluateStatus,
} from './lib/ingestion-telemetry.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_LANGUAGES = ['typescript', 'python', 'go', 'rust'];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if ((key === 'SUPABASE_URL' || key === 'SUPABASE_SECRET_KEY' || key === 'GH_PAT' || key === 'GITHUB_TOKEN') && !process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

// Fetch watched languages from Supabase settings if configured
async function getWatchedLanguages(supabase) {
  if (!supabase) return DEFAULT_LANGUAGES;
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('watched_languages')
      .limit(1)
      .maybeSingle();

    if (!error && data?.watched_languages && data.watched_languages.length > 0) {
      console.log(`📋 Loaded ${data.watched_languages.length} watched languages from Supabase settings: ${data.watched_languages.join(', ')}`);
      return data.watched_languages;
    }
  } catch (err) {
    console.warn('⚠️ Could not fetch watched languages from settings, using defaults:', err.message);
  }
  return DEFAULT_LANGUAGES;
}

// Query GitHub Search API for a single language
async function fetchIssuesForLanguage(language, token, perPage = 25) {
  console.log(`📡 Querying GitHub Search API for language: "${language}"...`);
  
  // Search API query: open issues (not PRs) with "good first issue" label for the specific language
  const q = encodeURIComponent(`label:"good first issue" is:issue state:open language:${language}`);
  const url = `https://api.github.com/search/issues?q=${q}&sort=updated&order=desc&per_page=${perPage}`;

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'OppHub-GoodFirstIssue-Ingest/1.0',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const items = [];

  try {
    const res = await fetch(url, { headers });

    if (res.status === 403 || res.status === 429) {
      const resetHeader = res.headers.get('x-ratelimit-reset');
      const resetTime = resetHeader ? new Date(parseInt(resetHeader, 10) * 1000).toLocaleTimeString() : 'soon';
      console.warn(`⚠️ GitHub Search API rate limit exceeded. Resets at ${resetTime}.`);
      return items;
    }

    if (!res.ok) {
      console.warn(`⚠️ GitHub API error HTTP ${res.status} for ${language}:`, await res.text());
      return items;
    }

    const json = await res.json();
    const issueList = json.items || [];

    for (const issue of issueList) {
      if (!issue.title || !issue.html_url) continue;

      // Extract repo organization/repo from repository_url
      // Format: https://api.github.com/repos/owner/repo
      let repoName = 'Open Source Project';
      if (issue.repository_url) {
        const parts = issue.repository_url.split('/');
        if (parts.length >= 2) {
          repoName = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
        }
      }

      // Collect labels
      const labels = (issue.labels || []).map((l) => (typeof l === 'string' ? l : l.name)).filter(Boolean);

      // Unique hash for opportunity ID
      const id = crypto.createHash('sha256').update(issue.html_url).digest('hex').slice(0, 16);

      // Check comments / assignees
      const hasAssignee = Boolean(issue.assignee || (issue.assignees && issue.assignees.length > 0));

      items.push({
        id: `opp-issue-${id}`,
        source: 'github-search',
        type: 'contribution',
        company: repoName,
        title: issue.title,
        url: issue.html_url,
        location: 'Remote / Async',
        remote: true,
        tech_stack: [language.toLowerCase()],
        stipend: null,
        date_discovered: issue.created_at || new Date().toISOString(),
        deadline: null, // Open-source issues have no deadline
        match_score: null,
        priority_score: null,
        raw_snippet: `${issue.title} on ${repoName} (${language}) - #${issue.number}`,
        status: 'new',
        metadata: {
          platform: 'github',
          language,
          issue_number: issue.number,
          comments_count: issue.comments || 0,
          labels,
          has_assignee: hasAssignee,
          state: issue.state,
          updated_at: issue.updated_at,
        },
      });
    }

    console.log(`  -> Fetched ${items.length} open issues for ${language}.`);
  } catch (err) {
    console.warn(`⚠️ Failed searching GitHub for ${language}:`, err.message);
  }

  return items;
}

// Helper to merge and save with URL deduplication
function saveWithDeduplication(targetPath, newItems) {
  const resolvedPath = path.resolve(process.cwd(), targetPath);
  let existingMap = new Map();
  if (fs.existsSync(resolvedPath)) {
    try {
      const raw = fs.readFileSync(resolvedPath, 'utf8');
      const parsed = JSON.parse(raw);
      for (const item of parsed) {
        existingMap.set(item.url, item);
      }
    } catch {}
  }

  for (const item of newItems) {
    const existing = existingMap.get(item.url);
    existingMap.set(item.url, { ...existing, ...item });
  }

  const merged = Array.from(existingMap.values());
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`💾 Saved ${merged.length} total opportunities to ${targetPath} (${newItems.length} upserted)`);
  return merged.length;
}

async function run() {
  loadLocalEnv();
  const startedAt = new Date().toISOString();
  let supabaseClientInstance = null;
  let collectedCount = 0;
  let runError = null;

  try {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const limitArg = args.find((a) => a.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
    const langArg = args.find((a) => a.startsWith('--lang='));
    const specificLang = langArg ? langArg.split('=')[1] : null;
    const outputArg = args.find((a) => a.startsWith('--output='));
    const outputPath = outputArg ? outputArg.split('=')[1] : null;

    console.log('🚀 OppHub GitHub Good First Issue Radar Starting...');

    // Token from GitHub secret or env var
    const token = process.env.GH_PAT || process.env.GITHUB_TOKEN || null;
    if (!token) {
      console.log('ℹ️ Running unauthenticated. Provide GH_PAT or GITHUB_TOKEN for higher 30 req/min limit.');
    } else {
      console.log('🔑 Authenticated with GitHub token.');
    }

    // Supabase client (if available)
    const supabaseUrl = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    let supabase = null;

    if (supabaseUrl && secretKey && !supabaseUrl.includes('placeholder')) {
      supabase = createClient(supabaseUrl, secretKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: typeof WebSocket !== 'undefined' ? undefined : { transport: class {} },
      });
      supabaseClientInstance = supabase;
    }

    const languages = specificLang ? [specificLang] : await getWatchedLanguages(supabase);
    console.log(`🎯 Searching for open issues across ${languages.length} languages: ${languages.join(', ')}`);

    let allIssues = [];
    const seenUrls = new Set();

    for (let i = 0; i < languages.length; i++) {
      const lang = languages[i];
      const issues = await fetchIssuesForLanguage(lang, token, 20);

      for (const issue of issues) {
        if (!seenUrls.has(issue.url)) {
          seenUrls.add(issue.url);
          allIssues.push(issue);
        }
      }

      // CRITICAL: Respect GitHub Search API rate limit (30 req/min authenticated, 10 req/min unauthenticated)
      if (i < languages.length - 1) {
        console.log('⏳ Politeness pause (2s) between Search API requests...');
        await delay(2000);
      }
    }

    collectedCount = allIssues.length;
    console.log(`✨ Total unique Good First Issues collected: ${collectedCount}`);

    if (limit && allIssues.length > limit) {
      allIssues = allIssues.slice(0, limit);
      console.log(`✂️ Limited to ${limit} items as requested.`);
    }

    if (isDryRun) {
      console.log('\n--- DRY RUN SAMPLE (First 3 Issues) ---');
      console.log(JSON.stringify(allIssues.slice(0, 3), null, 2));
      console.log('Dry run complete. No database writes.');
      return;
    }

    if (outputPath) {
      saveWithDeduplication(outputPath, allIssues);
    }

    if (supabase) {
      console.log(`🔌 Upserting ${allIssues.length} issues into Supabase (${supabaseUrl})...`);
      const batchSize = 50;
      let upsertedCount = 0;

      for (let i = 0; i < allIssues.length; i += batchSize) {
        const batch = allIssues.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('opportunities')
          .upsert(batch, { onConflict: 'url', ignoreDuplicates: false });

        if (error) {
          console.error(`❌ Error upserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        } else {
          upsertedCount += batch.length;
        }
      }
      console.log(`✅ Successfully upserted ${upsertedCount} Good First Issues into Supabase.`);
    } else if (!outputPath) {
      console.log('ℹ️ No Supabase credentials found and no --output specified. Merging with src/data/seed-opportunities.json');
      saveWithDeduplication('src/data/seed-opportunities.json', allIssues);
    }
  } catch (err) {
    runError = err;
    console.error('❌ Critical error during GitHub issues ingestion:', err);
  } finally {
    const status = evaluateStatus('github-issues', collectedCount, runError);
    await recordIngestionRun({
      source: 'github-issues',
      startedAt,
      itemCount: collectedCount,
      status,
      errorMessage: runError?.message || null,
      supabase: supabaseClientInstance,
    });
    await sendIngestionAlertIfNeeded({
      source: 'github-issues',
      itemCount: collectedCount,
      status,
      errorMessage: runError?.message || null,
      supabase: supabaseClientInstance,
    });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(console.error);
}
