/**
 * OppHub Hackathon Ingestion Script
 * 
 * Aggregates live hackathons from multiple platforms (Devpost, MLH, Devfolio, Unstop)
 * adapted directly from the 0xarchit/hackathon-api reference architecture.
 *
 * Normalizes into the unified Supabase 'opportunities' table (type: 'hackathon'),
 * deduplicates by canonical URL, and either upserts to Supabase or merges with local seed data.
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
        // e.g. "Sep 15 - Oct 20, 2026" or "Oct 20, 2026"
        const parts = h.submission_period_dates.split('-');
        const endStr = parts[parts.length - 1].trim();
        const parsed = Date.parse(endStr);
        if (!isNaN(parsed)) {
          deadline = new Date(parsed).toISOString();
        }
      }

      const id = crypto.createHash('sha256').update(h.url).digest('hex').slice(0, 16);
      const tech = extractTechStack(`${h.title} ${h.themes ? h.themes.join(' ') : ''}`);

      // Clean prize amount HTML tags
      const cleanPrize = h.prize_amount ? h.prize_amount.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : null;

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
  try {
    const currentYear = new Date().getFullYear();
    const season = new Date().getMonth() >= 6 ? currentYear + 1 : currentYear;
    const url = `https://mlh.io/seasons/${season}/events`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      console.warn(`⚠️ MLH HTTP ${res.status}`);
      return items;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    $('.event-wrapper').each((_, elem) => {
      const title = $(elem).find('.event-name').text().trim();
      const link = $(elem).find('a.event-link').attr('href') || '';
      const location = $(elem).find('.event-location').text().trim();
      const dateStr = $(elem).find('.event-date').text().trim();

      if (!title || !link) return;

      const isRemote = location.toLowerCase().includes('global') ||
                       location.toLowerCase().includes('digital') ||
                       location.toLowerCase().includes('online') ||
                       title.toLowerCase().includes('online');

      // Canonical event URL
      const canonicalUrl = link.startsWith('http') ? link : `https://mlh.io${link}`;
      const id = crypto.createHash('sha256').update(canonicalUrl).digest('hex').slice(0, 16);

      items.push({
        id: `opp-hack-mlh-${id}`,
        source: 'hackathon-api',
        type: 'hackathon',
        company: 'Major League Hacking (MLH)',
        title: title,
        url: canonicalUrl,
        location: location || (isRemote ? 'Online' : 'TBA'),
        remote: isRemote,
        tech_stack: extractTechStack(`${title} ${location}`),
        stipend: null,
        date_discovered: new Date().toISOString(),
        deadline: null, // MLH event dates are usually ranges
        match_score: null,
        priority_score: null,
        raw_snippet: `${title} - MLH (${location}, ${dateStr})`,
        status: 'new',
        metadata: {
          platform: 'mlh',
          mode: isRemote ? 'online' : 'offline',
          event_dates: dateStr || null,
        }
      });
    });
  } catch (err) {
    console.warn('⚠️ Failed fetching MLH:', err.message);
  }
  console.log(`  -> Fetched ${items.length} hackathons from MLH.`);
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
        }
      });
    }
  } catch (err) {
    console.warn('⚠️ Failed fetching Unstop:', err.message);
  }
  console.log(`  -> Fetched ${items.length} hackathons from Unstop.`);
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
  let deduplicated = [];

  for (const item of allFetched) {
    if (!seenUrls.has(item.url)) {
      seenUrls.add(item.url);
      deduplicated.push(item);
    }
  }

  console.log(`✨ Total unique hackathons collected across platforms: ${deduplicated.length}`);

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

    const batchSize = 50;
    let upsertedCount = 0;

    for (let i = 0; i < deduplicated.length; i += batchSize) {
      const batch = deduplicated.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('opportunities')
        .upsert(batch, { onConflict: 'url', ignoreDuplicates: false });

      if (error) {
        console.error(`❌ Error upserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      } else {
        upsertedCount += batch.length;
      }
    }
    console.log(`✅ Successfully upserted ${upsertedCount} hackathons into Supabase.`);
  } else if (!outputPath) {
    console.log('ℹ️ No Supabase credentials found and no --output specified. Merging with src/data/seed-opportunities.json');
    saveWithDeduplication('src/data/seed-opportunities.json', deduplicated);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(console.error);
}
