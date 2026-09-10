/**
 * OppHub Ingestion Telemetry & Failure Alerting Module
 * 
 * Provides unified run logging to the Supabase 'ingestion_runs' table
 * and automated Telegram alerts for failed or unexpectedly empty scraping runs.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { sendTelegramMessage, escapeHtml } from '../../src/lib/telegram-core.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimum expected items per source during a healthy run
export const MIN_EXPECTED_ITEMS = {
  simplify: 10,
  hackathons: 5,
  'github-issues': 5,
  watchlist: 1,
};

/**
 * Determines ingestion run status based on item count and error state.
 * @param {string} source
 * @param {number} itemCount
 * @param {Error|null} [error]
 * @returns {'success' | 'failure' | 'empty_unexpected'}
 */
export function evaluateStatus(source, itemCount, error = null) {
  if (error) return 'failure';
  const minExpected = MIN_EXPECTED_ITEMS[source] ?? 1;
  if (itemCount < minExpected) return 'empty_unexpected';
  return 'success';
}

/**
 * Records an ingestion run row in Supabase 'ingestion_runs' table.
 * Gracefully catches missing table errors if migration is pending.
 */
export async function recordIngestionRun({
  source,
  startedAt,
  finishedAt = new Date().toISOString(),
  itemCount = 0,
  status,
  errorMessage = null,
  supabase = null,
}) {
  console.log(`📊 Ingestion Run Telemetry [${source}]: Status=${status}, Items=${itemCount}${errorMessage ? `, Error="${errorMessage}"` : ''}`);

  if (!supabase) {
    return { recorded: false, reason: 'Supabase client not available' };
  }

  try {
    const { data, error } = await supabase
      .from('ingestion_runs')
      .insert({
        source,
        started_at: startedAt,
        finished_at: finishedAt,
        item_count: itemCount,
        status,
        error_message: errorMessage,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn(`  ⚠️ Could not record to 'ingestion_runs' table (${error.message}). Run migration 04_create_ingestion_runs.sql if table is missing.`);
      return { recorded: false, error: error.message };
    }

    return { recorded: true, data };
  } catch (err) {
    console.warn(`  ⚠️ Failed recording ingestion telemetry: ${err.message}`);
    return { recorded: false, error: err.message };
  }
}

/**
 * Dispatches an automated Telegram alert if the run failed or returned unexpectedly low items.
 * Uses Telegram credentials loaded directly from Supabase settings.
 */
export async function sendIngestionAlertIfNeeded({
  source,
  itemCount,
  status,
  errorMessage = null,
  supabase = null,
}) {
  if (status === 'success') {
    return { alerted: false, reason: 'Run succeeded normally' };
  }

  if (!supabase) {
    console.warn('  ⚠️ Cannot send Telegram alert: Supabase client not provided to read settings.');
    return { alerted: false, reason: 'Supabase unavailable' };
  }

  let botToken = null;
  let chatId = null;
  let telegramEnabled = true;

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('notification_prefs, telegram_chat_id')
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      botToken = data.notification_prefs?.telegram_bot_token || null;
      chatId = data.telegram_chat_id || null;
      if (data.notification_prefs?.telegramEnabled !== undefined) {
        telegramEnabled = data.notification_prefs.telegramEnabled;
      }
    }
  } catch (err) {
    console.warn('  ⚠️ Could not query Supabase settings for Telegram credentials:', err.message);
  }

  if (!telegramEnabled) {
    console.log('  ℹ️ Telegram alerts disabled in user settings.');
    return { alerted: false, reason: 'Telegram disabled in settings' };
  }

  if (!botToken || !chatId) {
    console.warn('  ⚠️ Telegram alert skipped: Bot token or chat ID not configured in Supabase settings.');
    return { alerted: false, reason: 'Missing credentials in settings' };
  }

  const minExpected = MIN_EXPECTED_ITEMS[source] ?? 1;
  const statusLabel = status === 'failure' ? 'CRITICAL FAILURE' : 'UNEXPECTEDLY EMPTY / LOW YIELD';
  const icon = status === 'failure' ? '🚨' : '⚠️';

  const alertText = `
${icon} <b>OppHub Ingestion Alert: ${escapeHtml(source.toUpperCase())}</b>

Status: <b>${statusLabel}</b>
Items Collected: <b>${itemCount}</b> (Expected minimum: ${minExpected})
${errorMessage ? `Error Details:\n<code>${escapeHtml(errorMessage.slice(0, 300))}</code>` : 'Warning: Ingestion completed with zero or suspiciously few items.'}

Timestamp: <code>${new Date().toISOString()}</code>
`.trim();

  console.log(`📱 Dispatching Telegram failure alert for source "${source}"...`);
  const result = await sendTelegramMessage(alertText, { botToken, chatId });

  if (result.success) {
    console.log('  ✅ Telegram failure alert sent successfully.');
  } else {
    console.warn('  ❌ Failed to send Telegram alert:', result.error);
  }

  return { alerted: result.success, result };
}
