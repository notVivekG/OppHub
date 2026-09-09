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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_LANGUAGES = ['typescript', 'python', 'go', 'rust'];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    'User-Agent': 'OppHub-Issue-Radar/1.0',
    'Accept': 'application/vnd.github.v3+json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, { headers });

    // Check rate limit headers
    const remaining = res.headers.get('x-ratelimit-remaining');
    const limit = res.headers.get('x-ratelimit-limit');
    const reset = res.headers.get('x-ratelimit-reset');

    if (remaining !== null) {
      console.log(`  -> Search API quota: ${remaining}/${limit} requests remaining (resets at ${new Date(Number(reset) * 1000).toLocaleTimeString()})`);
    }

    if (res.status === 403 || res.status === 429) {
      console.warn(`⚠️ GitHub Search API rate limit reached (HTTP ${res.status}).`);
      return [];
    }

    if (!res.ok) {
      console.warn(`⚠️ GitHub Search API returned HTTP ${res.status} for language: ${language}`);
      return [];
    }

    const data = await res.json();
    const items = data.items || [];
    console.log(`  -> Found ${items.length} open issues for ${language}.`);

    const results = [];
    for (const item of items) {
      // Extract owner/repo from repository_url: https://api.github.com/repos/owner/repo
      let repoFullName = 'Unknown Repository';
      if (item.repository_url) {
        const parts = item.repository_url.split('/repos/');
        if (parts.length > 1) {
          repoFullName = parts[1];
        }
      }

      // Collect labels
      const labelNames = (item.labels || [])
        .map((l) => (typeof l === 'string' ? l : l.name))
        .filter(Boolean);

      const id = crypto.createHash('sha256').update(item.html_url).digest('hex').slice(0, 16);

      // Tech stack combines the search language + any relevant label keywords
      const techStack = Array.from(
        new Set([language.toLowerCase(), ...labelNames.map((l) => l.toLowerCase()).slice(0, 3)])
      );

      results.push({
        id: `opp-issue-${id}`,
        source: 'github-search',
        type: 'contribution',
        company: repoFullName, // Repo full name: owner/repo
        title: item.title,
        url: item.html_url,
        location: 'Remote',
        remote: true,
        tech_stack: techStack,
        stipend: null,
        date_discovered: item.created_at || new Date().toISOString(),
        deadline: null, // Open source issues do not have application deadlines
        match_score: null,
        priority_score: null,
        raw_snippet: `${repoFullName} #${item.number}: ${item.title}`,
        status: 'new',
        metadata: {
          issue_number: item.number,
          repo_full_name: repoFullName,
          labels: labelNames,
          comments_count: item.comments || 0,
          author: item.user?.login || null,
          github_updated_at: item.updated_at || null,
        }
      });
    }

    return results;
  } catch (err) {
    console.error(`❌ Error fetching issues for ${language}:`, err.message);
    return [];
  }
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

    // Rate-limit spacer: 2-second pause between sequential language queries to respect Search API
    if (i < languages.length - 1) {
      console.log('⏳ Politeness pause (2s) between Search API requests...');
      await delay(2000);
    }
  }

  console.log(`✨ Total unique Good First Issues collected: ${allIssues.length}`);

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
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(console.error);
}
