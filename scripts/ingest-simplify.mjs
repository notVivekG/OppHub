/**
 * OppHub SimplifyJobs Ingestion Script
 * 
 * Fetches the live SimplifyJobs summer internships README, parses HTML and markdown tables,
 * resolves continuation rows ('↳'), extracts job details, deduplicates by URL,
 * and either upserts into Supabase or writes to local seed JSON.
 *
 * Usage:
 *   node scripts/ingest-simplify.mjs [--dry-run] [--limit=50] [--output=src/data/seed-opportunities.json]
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target README sources
const SOURCES = [
  'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md',
  'https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/README.md',
];

// Tech stack keywords for heuristic extraction from role title / description
const TECH_KEYWORDS = [
  'python', 'react', 'typescript', 'javascript', 'next.js', 'node', 'golang', 'go',
  'java', 'c++', 'c#', 'rust', 'aws', 'gcp', 'azure', 'docker', 'kubernetes',
  'sql', 'postgres', 'graphql', 'ai', 'ml', 'machine learning', 'pytorch', 'tensorflow',
  'data', 'backend', 'frontend', 'full stack', 'ios', 'swift', 'android', 'kotlin'
];

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractTechStack(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const matched = new Set();
  for (const kw of TECH_KEYWORDS) {
    // If keyword has symbols like c++, c#, check word inclusion directly or with escaped regex
    if (kw.includes('+') || kw.includes('#')) {
      if (lower.includes(kw)) {
        matched.add(kw);
      }
    } else {
      const regex = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
      if (regex.test(lower)) {
        matched.add(kw);
      }
    }
  }
  return Array.from(matched);
}

function parseAgeToDate(ageStr) {
  if (!ageStr) return new Date().toISOString();
  const cleaned = ageStr.trim().toLowerCase();
  const match = cleaned.match(/^(\d+)([dhwmy])$/);
  if (!match) return new Date().toISOString();

  const num = parseInt(match[1], 10);
  const unit = match[2];
  const date = new Date();

  if (unit === 'd') {
    date.setDate(date.getDate() - num);
  } else if (unit === 'h') {
    date.setHours(date.getHours() - num);
  } else if (unit === 'w') {
    date.setDate(date.getDate() - num * 7);
  } else if (unit === 'm') {
    date.setMonth(date.getMonth() - num);
  } else if (unit === 'y') {
    date.setFullYear(date.getFullYear() - num);
  }

  return date.toISOString();
}

export function parseHtmlTables(content) {
  const $ = cheerio.load(content);
  const results = [];
  let currentCompany = 'Unknown';

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 4) return;

    // Col 0: Company
    const companyCell = $(cells[0]);
    const companyText = companyCell.text().replace(/\s+/g, ' ').trim();
    if (companyText && !companyText.includes('↳') && companyText !== '') {
      currentCompany = companyText;
    }

    // Col 1: Role
    const roleCell = $(cells[1]);
    const roleText = roleCell.text().replace(/\s+/g, ' ').trim();

    // Col 2: Location
    const locationCell = $(cells[2]);
    // Replace <br> with commas
    locationCell.find('br').replaceWith(', ');
    const locationText = locationCell.text().replace(/\s+/g, ' ').trim();

    // Col 3: Application links
    const appCell = $(cells[3]);
    let applicationUrl = '';

    // Find the first external application link
    appCell.find('a').each((_, a) => {
      const href = $(a).attr('href');
      if (href && href.startsWith('http')) {
        // Prefer direct company ATS link if available, otherwise take simplify link
        if (!applicationUrl || (!applicationUrl.includes('myworkdayjobs') && !applicationUrl.includes('greenhouse') && !applicationUrl.includes('lever') && (href.includes('myworkdayjobs') || href.includes('greenhouse') || href.includes('lever')))) {
          applicationUrl = href;
        }
      }
    });

    // Col 4: Age
    const ageCell = cells.length >= 5 ? $(cells[4]) : null;
    const ageText = ageCell ? ageCell.text().trim() : '0d';

    if (!roleText || !applicationUrl) return;

    // Check remote
    const locLower = locationText.toLowerCase();
    const roleLower = roleText.toLowerCase();
    const isRemote = locLower.includes('remote') || roleLower.includes('remote');

    // Extract tech stack
    const techStack = extractTechStack(`${roleText} ${locationText}`);

    const id = crypto.createHash('sha256').update(applicationUrl).digest('hex').slice(0, 16);

    results.push({
      id: `opp-${id}`,
      source: 'simplify',
      type: 'internship',
      company: currentCompany,
      title: roleText,
      url: applicationUrl,
      location: locationText || 'Multiple Locations',
      remote: isRemote,
      tech_stack: techStack,
      stipend: null,
      date_discovered: parseAgeToDate(ageText),
      deadline: null,
      match_score: null,
      priority_score: null,
      raw_snippet: `${currentCompany} - ${roleText} (${locationText})`,
      status: 'new'
    });
  });

  return results;
}

export function parseMarkdownPipeTables(content) {
  const lines = content.split('\n');
  const results = [];
  let currentCompany = 'Unknown';
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      if (cells.length >= 4) {
        // Skip header or divider line
        if (cells[0].toLowerCase().includes('company') || cells[0].includes('---')) {
          inTable = true;
          continue;
        }

        if (inTable) {
          const compCell = cells[0];
          const roleCell = cells[1];
          const locCell = cells[2];
          const appCell = cells[3];
          const ageCell = cells[4] || '0d';

          if (!compCell.includes('↳') && compCell.length > 0) {
            // strip markdown link [Name](url) -> Name
            const compClean = compCell.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_]/g, '').trim();
            if (compClean) currentCompany = compClean;
          }

          const roleClean = roleCell.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_]/g, '').trim();
          const locClean = locCell.replace(/<br\s*\/?>/gi, ', ').replace(/[*_]/g, '').trim();

          // Extract link from markdown or HTML
          let link = '';
          const mdLinkMatch = appCell.match(/\[(?:Apply|Simplify)\]\((https?:\/\/[^\s)]+)\)/i);
          const hrefMatch = appCell.match(/href=["'](https?:\/\/[^"']+)["']/i);
          if (hrefMatch) {
            link = hrefMatch[1];
          } else if (mdLinkMatch) {
            link = mdLinkMatch[1];
          }

          if (roleClean && link) {
            const isRemote = locClean.toLowerCase().includes('remote') || roleClean.toLowerCase().includes('remote');
            const id = crypto.createHash('sha256').update(link).digest('hex').slice(0, 16);
            results.push({
              id: `opp-${id}`,
              source: 'simplify',
              type: 'internship',
              company: currentCompany,
              title: roleClean,
              url: link,
              location: locClean || 'Multiple Locations',
              remote: isRemote,
              tech_stack: extractTechStack(`${roleClean} ${locClean}`),
              stipend: null,
              date_discovered: parseAgeToDate(ageCell),
              deadline: null,
              match_score: null,
              priority_score: null,
              raw_snippet: `${currentCompany} - ${roleClean} (${locClean})`,
              status: 'new'
            });
          }
        }
      }
    } else {
      if (inTable && trimmed.startsWith('#')) {
        inTable = false;
      }
    }
  }

  return results;
}

async function run() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
  const outputArg = args.find(a => a.startsWith('--output='));
  const outputPath = outputArg ? outputArg.split('=')[1] : null;

  console.log('🚀 OppHub SimplifyJobs Ingestion Starting...');

  let allOpportunities = [];
  const seenUrls = new Set();

  for (const url of SOURCES) {
    try {
      console.log(`📡 Fetching: ${url}`);
      const res = await fetch(url, { headers: { 'User-Agent': 'OppHub-Opportunity-Ingestor/1.0' } });
      if (!res.ok) {
        console.warn(`⚠️ HTTP ${res.status} fetching ${url}`);
        continue;
      }

      const content = await res.text();
      console.log(`📄 Fetched ${content.length} bytes. Parsing content...`);

      const htmlParsed = parseHtmlTables(content);
      console.log(`  -> Extracted ${htmlParsed.length} roles from HTML tables.`);

      const mdParsed = parseMarkdownPipeTables(content);
      console.log(`  -> Extracted ${mdParsed.length} roles from Markdown tables.`);

      const combined = [...htmlParsed, ...mdParsed];
      for (const item of combined) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          allOpportunities.push(item);
        }
      }
    } catch (err) {
      console.error(`❌ Error parsing ${url}:`, err.message);
    }
  }

  console.log(`✨ Total unique opportunities collected: ${allOpportunities.length}`);

  if (limit && allOpportunities.length > limit) {
    allOpportunities = allOpportunities.slice(0, limit);
    console.log(`✂️ Limited to ${limit} items as requested.`);
  }

  // If dry-run
  if (isDryRun) {
    console.log('\n--- DRY RUN SAMPLE (First 3) ---');
    console.log(JSON.stringify(allOpportunities.slice(0, 3), null, 2));
    console.log('Dry run complete. No database writes.');
  }

  // Helper to merge and save to file with URL deduplication (matching Supabase onConflict: 'url')
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

    // Upsert new items
    for (const item of newItems) {
      const existing = existingMap.get(item.url);
      existingMap.set(item.url, { ...existing, ...item });
    }

    const merged = Array.from(existingMap.values());
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, JSON.stringify(merged, null, 2), 'utf8');
    console.log(`💾 Saved ${merged.length} opportunities to ${targetPath} (${newItems.length} upserted, 0 duplicates)`);
    return merged.length;
  }

  // Save to file if output specified
  if (outputPath) {
    saveWithDeduplication(outputPath, allOpportunities);
  }

  // Upsert to Supabase if credentials available and not dry-run
  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!isDryRun && supabaseUrl && secretKey && !supabaseUrl.includes('placeholder')) {
    console.log(`🔌 Connecting to Supabase (${supabaseUrl})...`);
    const supabase = createClient(supabaseUrl, secretKey);

    // Upsert in batches of 50
    const batchSize = 50;
    let upsertedCount = 0;

    for (let i = 0; i < allOpportunities.length; i += batchSize) {
      const batch = allOpportunities.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('opportunities')
        .upsert(batch, { onConflict: 'url', ignoreDuplicates: false });

      if (error) {
        console.error(`❌ Error upserting batch ${i / batchSize + 1}:`, error.message);
      } else {
        upsertedCount += batch.length;
      }
    }
    console.log(`✅ Successfully upserted ${upsertedCount} opportunities into Supabase.`);
  } else if (!isDryRun && !outputPath) {
    console.log('ℹ️ No Supabase credentials found and no --output specified. Merging with src/data/seed-opportunities.json');
    saveWithDeduplication('src/data/seed-opportunities.json', allOpportunities);
  }
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(console.error);
}
