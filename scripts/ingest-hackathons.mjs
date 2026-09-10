/**
 * OppHub Hackathon Ingestion Script
 * 
 * Aggregates live hackathons from multiple platforms (Devpost, MLH, Devfolio, Unstop)
 * adapted directly from the 0xarchit/hackathon-api reference architecture.
 *
 * Normalizes into the unified Supabase 'opportunities' table (type: 'hackathon'),
 * deduplicates by canonical URL and cross-platform fingerprint, and either upserts
 * to Supabase or merges with local seed data.
 *
 * Usage:
 *   node scripts/ingest-hackathons.mjs [--dry-run] [--limit=50] [--output=src/data/seed-opportunities.json]
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import {
  recordIngestionRun,
  sendIngestionAlertIfNeeded,
  evaluateStatus,
} from './lib/ingestion-telemetry.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TECH_KEYWORDS = [
  'python', 'react', 'typescript', 'javascript', 'next.js', 'node', 'golang', 'go',
  'java', 'c++', 'c#', 'rust', 'aws', 'gcp', 'azure', 'docker', 'kubernetes',
  'sql', 'postgres', 'graphql', 'ai', 'ml', 'machine learning', 'pytorch', 'tensorflow',
  'web3', 'blockchain', 'solidity', 'crypto', 'mobile', 'ios', 'android', 'flutter'
];

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractTechStack(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const matched = new Set();
  for (const kw of TECH_KEYWORDS) {
    if (kw.includes('+') || kw.includes('#')) {
      if (lower.includes(kw)) matched.add(kw);
    } else {
      const regex = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
      if (regex.test(lower)) matched.add(kw);
    }
  }
  return Array.from(matched);
}

/**
 * Generates a normalized deduplication key for hackathons across platforms.
 * Combines cleaned lowercased name + rounded-to-day date.
 */
export function generateHackathonDedupeKey(title, dateStr) {
  const cleanTitle = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let cleanDate = 'nodate';
  if (dateStr) {
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      cleanDate = new Date(parsed).toISOString().split('T')[0];
    }
  }

  return `${cleanTitle}::${cleanDate}`;
}

// 1. Fetcher: Devpost
async function fetchDevpost() {
  console.log('📡 Fetching Devpost hackathons...');
  const items = [];
  try {
    const res = await fetch('https://devpost.com/api/hackathons', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`⚠️ Devpost HTTP ${res.status}`);
      return items;
    }

    const json = await res.json();
    const list = json.hackathons || [];

    for (const h of list) {
      if (!h.title || !h.url) continue;

      let loc = 'Online';
      if (typeof h.displayed_location === 'string') {
        loc = h.displayed_location;
      } else if (h.displayed_location && typeof h.displayed_location.location === 'string') {
        loc = h.displayed_location.location;
      }

      const isRemote = loc.toLowerCase().includes('online');

      // Registration/Submission deadline parsing
      let deadline = null;
      if (h.submission_period_dates) {
        const parts = h.submission_period_dates.split('-');
        const endStr = parts[parts.length - 1].trim();
        const parsed = Date.parse(endStr);
        if (!isNaN(parsed)) {
          deadline = new Date(parsed).toISOString();
        }
      }

      const id = crypto.createHash('sha256').update(h.url).digest('hex').slice(0, 16);
      const tech = extractTechStack(`${h.title} ${h.themes ? h.themes.join(' ') : ''}`);
      const cleanPrize = h.prize_amount ? h.prize_amount.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : null;
      const dedupeKey = generateHackathonDedupeKey(h.title, deadline);

      items.push({
        id: `opp-hack-devpost-${id}`,
        source: 'hackathon-api',
        type: 'hackathon',
        company: 'Devpost',
        title: h.title,
        url: h.url,
        location: loc || 'Online',
        remote: isRemote,
        tech_stack: tech,
        stipend: cleanPrize ? `Prizes: ${cleanPrize}` : null,
        date_discovered: new Date().toISOString(),
        deadline: deadline,
        match_score: null,
        priority_score: null,
        raw_snippet: `${h.title} on Devpost (${loc})`,
        status: 'new',
        metadata: {
          platform: 'devpost',
          prize_pool: cleanPrize,
          mode: isRemote ? 'online' : 'offline',
          submission_period: h.submission_period_dates || null,
          dedupe_key: dedupeKey,
        }
      });
    }
  } catch (err) {
    console.warn('⚠️ Failed fetching Devpost:', err.message);
  }
  console.log(`  -> Fetched ${items.length} hackathons from Devpost.`);
  return items;
}

// 2. Fetcher: Devfolio
async function fetchDevfolio() {
  console.log('📡 Fetching Devfolio hackathons...');
  const items = [];
  try {
    const res = await fetch('https://devfolio.co/hackathons', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      console.warn(`⚠️ Devfolio HTTP ${res.status}`);
      return items;
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const nextDataScript = $('script#__NEXT_DATA__').html();

    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const queries = nextData?.props?.pageProps?.dehydratedState?.queries || [];
        for (const q of queries) {
          const openHacks = q?.state?.data?.open_hackathons || [];
          for (const h of openHacks) {
            if (!h.name || !h.slug) continue;
            const eventUrl = `https://${h.slug}.devfolio.co`;
            const isRemote = h.is_online || false;
            const loc = isRemote ? 'Online' : (h.location || 'In-Person');
            const deadline = h.ends_at ? new Date(h.ends_at).toISOString() : null;

            const id = crypto.createHash('sha256').update(eventUrl).digest('hex').slice(0, 16);
            const tech = extractTechStack(`${h.name} ${loc}`);
            const dedupeKey = generateHackathonDedupeKey(h.name, deadline || h.starts_at);

            items.push({
              id: `opp-hack-devfolio-${id}`,
              source: 'hackathon-api',
              type: 'hackathon',
              company: 'Devfolio',
              title: h.name,
              url: eventUrl,
              location: loc,
              remote: isRemote,
              tech_stack: tech,
              stipend: null,
              date_discovered: new Date().toISOString(),
              deadline: deadline,
              match_score: null,
              priority_score: null,
              raw_snippet: `${h.name} on Devfolio (${loc})`,
              status: 'new',
              metadata: {
                platform: 'devfolio',
                mode: isRemote ? 'online' : 'offline',
                start_date: h.starts_at || null,
                end_date: h.ends_at || null,
                dedupe_key: dedupeKey,
              }
            });
          }
        }
      } catch (parseErr) {
        console.warn('Devfolio NEXT_DATA parse error:', parseErr.message);
      }
    }
  } catch (err) {
    console.warn('⚠️ Failed fetching Devfolio:', err.message);
  }
  console.log(`  -> Fetched ${items.length} hackathons from Devfolio.`);
  return items;
}

// 3. Fetcher: Major League Hacking (MLH)
async function fetchMLH() {
  console.log('📡 Fetching MLH hackathons...');
  const items = [];
  const currentYear = new Date().getFullYear();
  // MLH schedules are organized by season (named after concluding year, e.g. 2026)
  const seasonsToTry = [currentYear, currentYear + 1, currentYear - 1];

  for (const season of seasonsToTry) {
    const url = `https://mlh.io/seasons/${season}/events`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!res.ok) {
        console.warn(`⚠️ MLH HTTP ${res.status} for season ${season}`);
        continue;
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      // MLH redesigned markup uses schema.org Event cards
      const eventCards = $('[itemtype="https://schema.org/Event"]');
      if (eventCards.length === 0) {
        continue;
      }

      eventCards.each((_, elem) => {
        const $el = $(elem);
        const title = $el.find('h4').first().text().trim() || $el.find('h3').first().text().trim();
        let rawLink = $el.find('meta[itemprop="url"]').attr('content') || $el.attr('href') || '';
        const attendanceMode = $el.find('meta[itemprop="eventAttendanceMode"]').attr('content') || '';
        const startDate = $el.find('meta[itemprop="startDate"]').attr('content') || null;
        const endDate = $el.find('meta[itemprop="endDate"]').attr('content') || null;
        const locName = $el.find('[itemprop="location"] [itemprop="name"]').text().trim();

        if (!title || !rawLink) return;

        const canonicalUrl = rawLink.startsWith('http') ? rawLink : `https://mlh.io${rawLink}`;
        const isRemote = attendanceMode.includes('OnlineEventAttendanceMode') ||
                         locName.toLowerCase().includes('digital') ||
                         locName.toLowerCase().includes('online') ||
                         locName.toLowerCase().includes('everywhere');

        const location = isRemote ? 'Online' : (locName || 'In-Person');
        const id = crypto.createHash('sha256').update(canonicalUrl).digest('hex').slice(0, 16);
        const dedupeKey = generateHackathonDedupeKey(title, endDate || startDate);

        items.push({
          id: `opp-hack-mlh-${id}`,
          source: 'hackathon-api',
          type: 'hackathon',
          company: 'Major League Hacking (MLH)',
          title,
          url: canonicalUrl,
          location,
          remote: isRemote,
          tech_stack: extractTechStack(`${title} ${location}`),
          stipend: null,
          date_discovered: new Date().toISOString(),
          deadline: endDate || startDate || null,
          match_score: null,
          priority_score: null,
          raw_snippet: `${title} - MLH (${location})`,
          status: 'new',
          metadata: {
            platform: 'mlh',
            mode: isRemote ? 'online' : 'offline',
            season,
            start_date: startDate,
            end_date: endDate,
            dedupe_key: dedupeKey,
          }
        });
      });

      if (items.length > 0) {
        break; // Successfully extracted events from active season
      }
    } catch (err) {
      console.warn(`⚠️ Error fetching MLH season ${season}:`, err.message);
    }
  }

  if (items.length === 0) {
    console.warn('⚠️ MLH source unavailable: 0 events extracted from MLH schedule pages.');
  } else {
    console.log(`  -> Fetched ${items.length} hackathons from MLH.`);
  }

  return items;
}

// 4. Fetcher: Unstop
async function fetchUnstop() {
  console.log('📡 Fetching Unstop hackathons...');
  const items = [];
  try {
    const url = 'https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&page=1&per_page=100&oppstatus=open';
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`⚠️ Unstop HTTP ${res.status}`);
      return items;
    }

    const json = await res.json();
    const list = json?.data?.data || [];

    for (const h of list) {
      if (!h.title || !h.seo_url) continue;

      const eventUrl = h.seo_url.startsWith('http') ? h.seo_url : `https://unstop.com${h.seo_url}`;
      const loc = h.location || 'Online';
      const isRemote = loc.toLowerCase().includes('online');

      let deadline = null;
      if (h.end_date) {
        const parsed = Date.parse(h.end_date);
        if (!isNaN(parsed)) {
          deadline = new Date(parsed).toISOString();
        }
      }

      const id = crypto.createHash('sha256').update(eventUrl).digest('hex').slice(0, 16);
      const dedupeKey = generateHackathonDedupeKey(h.title, deadline || h.start_date);

      items.push({
        id: `opp-hack-unstop-${id}`,
        source: 'hackathon-api',
        type: 'hackathon',
        company: 'Unstop',
        title: h.title,
        url: eventUrl,
        location: loc,
        remote: isRemote,
        tech_stack: extractTechStack(h.title),
        stipend: null,
        date_discovered: new Date().toISOString(),
        deadline: deadline,
        match_score: null,
        priority_score: null,
        raw_snippet: `${h.title} on Unstop (${loc})`,
        status: 'new',
        metadata: {
          platform: 'unstop',
          mode: isRemote ? 'online' : 'offline',
          start_date: h.start_date || null,
          end_date: h.end_date || null,
          dedupe_key: dedupeKey,
        }
      });
    }
  } catch (err) {
    console.warn('⚠️ Failed fetching Unstop:', err.message);
  }
  console.log(`  -> Fetched ${items.length} hackathons from Unstop.`);
  return items;
}

// Helper to merge and save with URL and fingerprint deduplication
function saveWithDeduplication(targetPath, newItems) {
  const resolvedPath = path.resolve(process.cwd(), targetPath);
  let existingUrlMap = new Map();
  let existingKeyMap = new Map();

  if (fs.existsSync(resolvedPath)) {
    try {
      const raw = fs.readFileSync(resolvedPath, 'utf8');
      const parsed = JSON.parse(raw);
      for (const item of parsed) {
        existingUrlMap.set(item.url, item);
        const key = item.metadata?.dedupe_key;
        if (key) existingKeyMap.set(key, item.url);
      }
    } catch {}
  }

  let skippedFingerprints = 0;
  for (const item of newItems) {
    const key = item.metadata?.dedupe_key;
    const existingUrlForKey = key ? existingKeyMap.get(key) : null;

    if (existingUrlForKey && existingUrlForKey !== item.url) {
      // Different URL, but matches existing fingerprint -> skip secondary duplicate
      skippedFingerprints++;
      continue;
    }

    const existing = existingUrlMap.get(item.url);
    existingUrlMap.set(item.url, { ...existing, ...item });
    if (key) existingKeyMap.set(key, item.url);
  }

  const merged = Array.from(existingUrlMap.values());
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`💾 Saved ${merged.length} total opportunities to ${targetPath} (${newItems.length - skippedFingerprints} upserted, ${skippedFingerprints} cross-platform duplicates skipped)`);
  return merged.length;
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
        if ((key === 'SUPABASE_URL' || key === 'SUPABASE_SECRET_KEY') && !process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
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
    const outputArg = args.find((a) => a.startsWith('--output='));
    const outputPath = outputArg ? outputArg.split('=')[1] : null;

    console.log('🚀 OppHub Multi-Platform Hackathon Ingestion Starting...');

    // Fetch all platforms concurrently
    const [devpostItems, devfolioItems, mlhItems, unstopItems] = await Promise.all([
      fetchDevpost(),
      fetchDevfolio(),
      fetchMLH(),
      fetchUnstop(),
    ]);

    const allFetched = [...devpostItems, ...devfolioItems, ...mlhItems, ...unstopItems];
    const seenUrls = new Set();
    const seenKeys = new Set();
    let deduplicated = [];

    for (const item of allFetched) {
      const key = item.metadata?.dedupe_key;
      if (seenUrls.has(item.url)) continue;
      if (key && seenKeys.has(key)) {
        console.log(`  ↪ Skipping in-memory cross-platform duplicate: "${item.title}" (${item.company})`);
        continue;
      }
      seenUrls.add(item.url);
      if (key) seenKeys.add(key);
      deduplicated.push(item);
    }

    collectedCount = deduplicated.length;
    console.log(`✨ Total unique hackathons collected across platforms: ${collectedCount}`);

    if (limit && deduplicated.length > limit) {
      deduplicated = deduplicated.slice(0, limit);
      console.log(`✂️ Limited to ${limit} items as requested.`);
    }

    if (isDryRun) {
      console.log('\n--- DRY RUN SAMPLE (First 3 Hackathons) ---');
      console.log(JSON.stringify(deduplicated.slice(0, 3), null, 2));
      console.log('Dry run complete. No database writes.');
      return;
    }

    if (outputPath) {
      saveWithDeduplication(outputPath, deduplicated);
    }

    // Upsert to Supabase if credentials present
    const supabaseUrl = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (supabaseUrl && secretKey && !supabaseUrl.includes('placeholder')) {
      console.log(`🔌 Connecting to Supabase (${supabaseUrl})...`);
      const supabase = createClient(supabaseUrl, secretKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: typeof WebSocket !== 'undefined' ? undefined : { transport: class {} },
      });
      supabaseClientInstance = supabase;

      // Secondary dedupe against existing Supabase records
      const existingKeys = new Set();
      const existingUrls = new Set();
      try {
        const { data: existingOpps } = await supabase
          .from('opportunities')
          .select('url, metadata')
          .eq('type', 'hackathon');

        if (existingOpps) {
          for (const row of existingOpps) {
            existingUrls.add(row.url);
            if (row.metadata?.dedupe_key) {
              existingKeys.add(row.metadata.dedupe_key);
            }
          }
        }
      } catch (err) {
        console.warn('  ⚠️ Could not fetch existing hackathon dedupe keys:', err.message);
      }

      const toUpsert = [];
      for (const item of deduplicated) {
        const key = item.metadata?.dedupe_key;
        if (!existingUrls.has(item.url) && key && existingKeys.has(key)) {
          console.log(`  ↪ Skipping Supabase insert (cross-platform duplicate of existing DB item): "${item.title}"`);
          continue;
        }
        toUpsert.push(item);
      }

      const batchSize = 50;
      let upsertedCount = 0;

      for (let i = 0; i < toUpsert.length; i += batchSize) {
        const batch = toUpsert.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('opportunities')
          .upsert(batch, { onConflict: 'url', ignoreDuplicates: false });

        if (error) {
          console.error(`❌ Error upserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        } else {
          upsertedCount += batch.length;
        }
      }
      console.log(`✅ Successfully upserted ${upsertedCount} hackathons into Supabase (${deduplicated.length - toUpsert.length} cross-platform duplicates skipped).`);
    } else if (!outputPath) {
      console.log('ℹ️ No Supabase credentials found and no --output specified. Merging with src/data/seed-opportunities.json');
      saveWithDeduplication('src/data/seed-opportunities.json', deduplicated);
    }
  } catch (err) {
    runError = err;
    console.error('❌ Critical error during hackathon ingestion:', err);
  } finally {
    // Record telemetry run and alert on failure/unexpectedly low yield
    const status = evaluateStatus('hackathons', collectedCount, runError);
    await recordIngestionRun({
      source: 'hackathons',
      startedAt,
      itemCount: collectedCount,
      status,
      errorMessage: runError?.message || null,
      supabase: supabaseClientInstance,
    });
    await sendIngestionAlertIfNeeded({
      source: 'hackathons',
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
