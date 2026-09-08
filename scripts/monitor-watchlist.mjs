/**
 * OppHub Lightweight Watchlist Change Monitor
 * 
 * Inspired by changedetection.io, reimplemented free-tier-native for GitHub Actions.
 * Fetches watchlist URLs, extracts targeted or full text, computes SHA-256 hash,
 * compares against previous hash, and triggers notifications on detected changes.
 *
 * Usage:
 *   node scripts/monitor-watchlist.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// Default starter watchlist for tech & research internships
const DEFAULT_WATCHLIST = [
  {
    id: 'watch-1',
    label: 'NASA OSTEM Internship Portal',
    url: 'https://intern.nasa.gov',
    css_selector: null,
    last_content_hash: null,
  },
  {
    id: 'watch-2',
    label: 'Palantir Early Career Careers',
    url: 'https://www.palantir.com/careers/early-talent/',
    css_selector: null,
    last_content_hash: null,
  },
  {
    id: 'watch-3',
    label: 'OpenAI University Programs',
    url: 'https://openai.com/careers/search/',
    css_selector: null,
    last_content_hash: null,
  }
];

function hashText(text) {
  return crypto.createHash('sha256').update(text.trim()).digest('hex');
}

function cleanHtmlToText(html, selector) {
  const $ = cheerio.load(html);
  // Remove scripts, styles, noscript
  $('script, style, noscript, svg, iframe').remove();

  let targetText = '';
  if (selector && $(selector).length > 0) {
    targetText = $(selector).text();
  } else if ($('main').length > 0) {
    targetText = $('main').text();
  } else if ($('body').length > 0) {
    targetText = $('body').text();
  } else {
    targetText = $.text();
  }

  // Normalize whitespace
  return targetText.replace(/\s+/g, ' ').trim();
}

async function sendTelegramAlert(text, config = {}) {
  const token = config.token;
  const chatId = config.chatId;
  if (!token || !chatId || token.includes('placeholder')) {
    console.log('  ℹ️ Telegram alert skipped: Bot Token or Chat ID not found in Supabase settings.');
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    const json = await res.json();
    if (json.ok) {
      console.log('  📱 Telegram alert dispatched successfully.');
    } else {
      console.warn('  ⚠️ Telegram API response:', json.description);
    }
  } catch (err) {
    console.warn('  ⚠️ Telegram dispatch error:', err.message);
  }
}

async function run() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  console.log('🔍 OppHub Watchlist Monitor Starting...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  let supabase = null;
  let watchlist = [...DEFAULT_WATCHLIST];
  let telegramConfig = {
    token: null,
    chatId: null,
  };

  if (supabaseUrl && secretKey && !supabaseUrl.includes('placeholder')) {
    supabase = createClient(supabaseUrl, secretKey);

    // 1. Load Watchlist targets from Supabase
    const { data, error } = await supabase.from('watchlist').select('*');
    if (!error && data && data.length > 0) {
      watchlist = data;
      console.log(`📋 Loaded ${watchlist.length} targets from Supabase watchlist table.`);
    } else {
      console.log(`📋 Supabase watchlist table is empty. Monitoring default starter targets.`);
    }

    // 2. Load Telegram credentials exclusively from Supabase settings table
    try {
      const { data: settingsData } = await supabase.from('settings').select('*').limit(1).single();
      if (settingsData) {
        if (settingsData.telegram_chat_id) {
          telegramConfig.chatId = settingsData.telegram_chat_id;
          console.log(`📱 Loaded Telegram Chat ID from Supabase settings table.`);
        }
        if (settingsData.notification_prefs?.telegram_bot_token) {
          telegramConfig.token = settingsData.notification_prefs.telegram_bot_token;
          console.log(`🤖 Loaded Telegram Bot Token from Supabase settings table.`);
        }
      }
    } catch (err) {
      console.warn('  ⚠️ Note: Could not fetch settings table for Telegram credentials:', err.message);
    }
  } else {
    console.log(`💡 No Supabase credentials. Running in local fallback mode.`);
  }

  let changesDetected = 0;

  for (const item of watchlist) {
    console.log(`\n🌐 Checking: ${item.label} (${item.url})`);
    try {
      const res = await fetch(item.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OppHub-Monitor/1.0',
        },
        redirect: 'follow',
      });

      if (!res.ok) {
        console.warn(`  ⚠️ HTTP ${res.status} returned for ${item.url}`);
        continue;
      }

      const html = await res.text();
      const text = cleanHtmlToText(html, item.css_selector);
      const newHash = hashText(text);

      console.log(`  📊 Extracted ${text.length} characters of normalized text. Hash: ${newHash.slice(0, 10)}...`);

      if (!item.last_content_hash) {
        console.log(`  🆕 First check — establishing baseline hash.`);
        if (supabase && !isDryRun) {
          await supabase
            .from('watchlist')
            .update({ last_content_hash: newHash, last_checked_at: new Date().toISOString() })
            .eq('id', item.id);
        }
      } else if (item.last_content_hash !== newHash) {
        console.log(`  🚨 CHANGE DETECTED! Previous hash: ${item.last_content_hash.slice(0, 10)} -> New: ${newHash.slice(0, 10)}`);
        changesDetected++;

        const notifTitle = `Watchlist Alert: ${item.label} Changed`;
        const notifBody = `New content detected on ${item.label}. Review page for updated openings or deadlines.`;

        if (supabase && !isDryRun) {
          // Update hash in watchlist
          await supabase
            .from('watchlist')
            .update({ last_content_hash: newHash, last_checked_at: new Date().toISOString() })
            .eq('id', item.id);

          // Insert notification
          await supabase.from('notifications').insert({
            type: 'watchlist_change',
            title: notifTitle,
            body: notifBody,
            related_id: item.id,
            read: false,
          });
        }

        // Send Telegram alert
        await sendTelegramAlert(`
🔔 <b>OppHub Watchlist Alert</b>

Changes detected on: <b>${item.label}</b>
URL: ${item.url}

<i>Check the page for newly opened internship listings or updated application deadlines.</i>
        `.trim(), telegramConfig);
      } else {
        console.log(`  ✓ No changes detected. Content hash unchanged.`);
        if (supabase && !isDryRun) {
          await supabase
            .from('watchlist')
            .update({ last_checked_at: new Date().toISOString() })
            .eq('id', item.id);
        }
      }
    } catch (err) {
      console.error(`  ❌ Error checking ${item.url}:`, err.message);
    }
  }

  console.log(`\n✨ Watchlist monitoring completed. ${changesDetected} changes detected across ${watchlist.length} pages.`);
}

run().catch(console.error);
