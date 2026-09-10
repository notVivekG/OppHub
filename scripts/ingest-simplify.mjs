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
import {
  recordIngestionRun,
  sendIngestionAlertIfNeeded,
  evaluateStatus,
} from './lib/ingestion-telemetry.mjs';

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
  const now = new Date();
  const lower = ageStr.toLowerCase().trim();

  const match = lower.match(/^(\d+)\s*([dhwm])$/);
  if (match) {
    const val = parseInt(match[1], 10);
    const unit = match[2];
    if (unit === 'h') now.setHours(now.getHours() - val);
    else if (unit === 'd') now.setDate(now.getDate() - val);
    else if (unit === 'w') now.setDate(now.getDate() - val * 7);
    else if (unit === 'm') now.setMonth(now.getMonth() - val);
    return now.toISOString();
  }

  const parsed = Date.parse(ageStr);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }
  return new Date().toISOString();
}

function parseHtmlTables(content) {
  const $ = cheerio.load(content);
  const rows = [];
  let currentCompany = '';

  $('table').each((tableIdx, table) => {
    $(table).find('tbody tr').each((rowIdx, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 4) return;

      let companyCell = $(tds[0]).text().trim();
      let roleCell = $(tds[1]).text().trim();
      let locationCell = $(tds[2]).text().trim();
      let appCell = $(tds[3]);
      let ageCell = tds.length > 4 ? $(tds[4]).text().trim() : '';

      if (companyCell.includes('↳') || companyCell === '') {
        // Continuation row
      } else {
        currentCompany = companyCell.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
      }

      let applyLink = '';
      const anchor = appCell.find('a[href]');
      if (anchor.length > 0) {
        applyLink = anchor.first().attr('href') || '';
      }

      if (!applyLink || applyLink === '#' || applyLink.startsWith('javascript:')) {
        return;
      }

      const isRemote = locationCell.toLowerCase().includes('remote');
      const cleanRole = roleCell.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
      const techStack = extractTechStack(`${cleanRole} ${locationCell}`);
      const id = crypto.createHash('sha256').update(applyLink).digest('hex').slice(0, 16);

      rows.push({
        id: `opp-simp-${id}`,
        source: 'simplify',
        type: 'internship',
        company: currentCompany || 'Unknown Company',
        title: cleanRole || 'Software Engineering Intern',
        url: applyLink,
        location: locationCell || (isRemote ? 'Remote' : 'Various Locations'),
        remote: isRemote,
        tech_stack: techStack,
        stipend: null,
        date_discovered: parseAgeToDate(ageCell),
        deadline: null,
        match_score: null,
        priority_score: null,
        raw_snippet: `${currentCompany} - ${cleanRole} (${locationCell})`,
        status: 'new'
      });
    });
  });

  return rows;
}

function parseMarkdownPipeTables(content) {
  const lines = content.split('\n');
  const rows = [];
  let currentCompany = '';
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) {
      inTable = false;
      continue;
    }

    if (line.includes('---')) {
      inTable = true;
      continue;
    }

    if (!inTable) continue;

    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length < 4) continue;

    let companyCell = cells[0];
    let roleCell = cells[1];
    let locationCell = cells[2];
    let appCell = cells[3];
    let ageCell = cells.length > 4 ? cells[4] : '';

    if (companyCell.includes('↳') || companyCell === '') {
      // Continuation row
    } else {
      const match = companyCell.match(/\[([^\]]+)\]/);
      currentCompany = match ? match[1].trim() : companyCell.replace(/\*\*([^*]+)\*\*/g, '$1').trim();
    }

    let applyLink = '';
    const linkMatch = appCell.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      applyLink = linkMatch[2].trim();
    } else {
      const hrefMatch = appCell.match(/href=["']([^"']+)["']/);
      if (hrefMatch) {
        applyLink = hrefMatch[1].trim();
      }
    }

    if (!applyLink || applyLink === '#' || applyLink.startsWith('javascript:')) {
      continue;
    }

    const isRemote = locationCell.toLowerCase().includes('remote');
    const cleanRole = roleCell.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
    const techStack = extractTechStack(`${cleanRole} ${locationCell}`);
    const id = crypto.createHash('sha256').update(applyLink).digest('hex').slice(0, 16);

    rows.push({
      id: `opp-simp-${id}`,
      source: 'simplify',
      type: 'internship',
      company: currentCompany || 'Unknown Company',
      title: cleanRole || 'Software Engineering Intern',
      url: applyLink,
      location: locationCell || (isRemote ? 'Remote' : 'Various Locations'),
      remote: isRemote,
      tech_stack: techStack,
      stipend: null,
      date_discovered: parseAgeToDate(ageCell),
      deadline: null,
      match_score: null,
      priority_score: null,
      raw_snippet: `${currentCompany} - ${cleanRole} (${locationCell})`,
      status: 'new'
    });
  }

  return rows;
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

    collectedCount = allOpportunities.length;
    console.log(`✨ Total unique opportunities collected: ${collectedCount}`);

    if (limit && allOpportunities.length > limit) {
      allOpportunities = allOpportunities.slice(0, limit);
      console.log(`✂️ Limited to ${limit} items as requested.`);
    }

    if (isDryRun) {
      console.log('\n--- DRY RUN SAMPLE (First 3) ---');
      console.log(JSON.stringify(allOpportunities.slice(0, 3), null, 2));
      console.log('Dry run complete. No database writes.');
      return;
    }

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
      console.log(`💾 Saved ${merged.length} opportunities to ${targetPath} (${newItems.length} upserted, 0 duplicates)`);
      return merged.length;
    }

    if (outputPath) {
      saveWithDeduplication(outputPath, allOpportunities);
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!isDryRun && supabaseUrl && secretKey && !supabaseUrl.includes('placeholder')) {
      console.log(`🔌 Connecting to Supabase (${supabaseUrl})...`);
      const supabase = createClient(supabaseUrl, secretKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: typeof WebSocket !== 'undefined' ? undefined : { transport: class {} },
      });
      supabaseClientInstance = supabase;

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
  } catch (err) {
    runError = err;
    console.error('❌ Critical error during SimplifyJobs ingestion:', err);
  } finally {
    const status = evaluateStatus('simplify', collectedCount, runError);
    await recordIngestionRun({
      source: 'simplify',
      startedAt,
      itemCount: collectedCount,
      status,
      errorMessage: runError?.message || null,
      supabase: supabaseClientInstance,
    });
    await sendIngestionAlertIfNeeded({
      source: 'simplify',
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
