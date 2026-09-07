import { Opportunity } from '@/types';

export interface TelegramConfig {
  botToken?: string | null;
  chatId?: string | null;
}

export interface TelegramResponse {
  success: boolean;
  messageId?: number;
  error?: string;
}

export async function sendTelegramMessage(
  text: string,
  config?: TelegramConfig
): Promise<TelegramResponse> {
  const token = config?.botToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = config?.chatId || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token.includes('placeholder') || chatId.includes('placeholder')) {
    return {
      success: false,
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
      return {
        success: false,
        error: data.description || 'Failed to send Telegram message.',
      };
    }

    return {
      success: true,
      messageId: data.result?.message_id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error while contacting Telegram API.',
    };
  }
}

/**
 * Formats a high-priority opportunity alert for Telegram
 */
export function formatOpportunityTelegramMessage(
  opp: Opportunity,
  priorityScore: number
): string {
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

function escapeHtml(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
