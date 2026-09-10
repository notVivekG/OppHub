/**
 * OppHub Core Telegram Messaging Helper
 * Pure JavaScript ES module compatible with both Next.js and Node CLI scripts.
 */

export function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sends a message via Telegram Bot API.
 * @param {string} text - HTML formatted message text
 * @param {{ botToken?: string | null, chatId?: string | null }} [config]
 * @returns {Promise<{ success: boolean, messageId?: number, error?: string, statusCode?: number, retryAfter?: number }>}
 */
export async function sendTelegramMessage(text, config) {
  const token = config?.botToken;
  const chatId = config?.chatId;

  if (!token || !chatId || token.includes('placeholder') || chatId.includes('placeholder')) {
    return {
      success: false,
      statusCode: 400,
      error: 'Telegram Bot Token or Chat ID not configured.',
    };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      const headerRetry = response.headers.get('retry-after');
      const paramRetry = data.parameters?.retry_after;
      const retryAfter =
        typeof paramRetry === 'number'
          ? paramRetry
          : headerRetry
          ? parseInt(headerRetry, 10)
          : undefined;

      return {
        success: false,
        statusCode: response.status || data.error_code || 400,
        error: data.description || 'Failed to send Telegram message.',
        retryAfter: retryAfter && !isNaN(retryAfter) ? retryAfter : undefined,
      };
    }

    return {
      success: true,
      statusCode: response.status || 200,
      messageId: data.result?.message_id,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      error: err.message || 'Network error while contacting Telegram API.',
    };
  }
}

/**
 * Formats a high-priority opportunity alert for Telegram
 * @param {any} opp
 * @param {number} priorityScore
 * @returns {string}
 */
export function formatOpportunityTelegramMessage(opp, priorityScore) {
  const typeTag = opp.type === 'internship' ? '💼 INTERNSHIP' : opp.type === 'hackathon' ? '🏆 HACKATHON' : '⭐ GOOD FIRST ISSUE';
  const remoteTag = opp.remote ? '🌐 <b>Remote</b>' : `📍 <i>${opp.location || 'Multiple Locations'}</i>`;
  const deadlineText = opp.deadline
    ? `⏰ Deadline: <b>${new Date(opp.deadline).toLocaleDateString()}</b>`
    : '⏰ Deadline: Ongoing';

  return `
🎯 <b>OppHub High-Priority Alert</b> (${priorityScore}/100)

${typeTag}: <b>${escapeHtml(opp.company)}</b>
<b>${escapeHtml(opp.title)}</b>

${remoteTag}
${deadlineText}
${opp.stipend ? `💰 ${escapeHtml(opp.stipend)}` : ''}

${opp.tech_stack && opp.tech_stack.length > 0 ? `🛠 <i>${opp.tech_stack.slice(0, 5).join(', ')}</i>` : ''}

🔗 <a href="${opp.url}">View & Apply Here</a>
`.trim();
}
