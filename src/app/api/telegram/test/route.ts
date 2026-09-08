import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    let { botToken, chatId } = body;

    // If credentials are not provided in request body, attempt to read from Supabase settings
    if (!botToken || !chatId) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          const { data: settingsData } = await supabase
            .from('settings')
            .select('*')
            .limit(1)
            .maybeSingle();

          if (settingsData) {
            if (!chatId && settingsData.telegram_chat_id) {
              chatId = settingsData.telegram_chat_id;
            }
            if (!botToken && settingsData.notification_prefs?.telegram_bot_token) {
              botToken = settingsData.notification_prefs.telegram_bot_token;
            }
          }
        } catch (dbErr) {
          console.warn('Could not read Telegram credentials from Supabase settings:', dbErr);
        }
      }
    }

    // Fall back to environment variables if still missing
    botToken = botToken || process.env.TELEGRAM_BOT_TOKEN;
    chatId = chatId || process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId || botToken.includes('placeholder') || chatId.includes('placeholder')) {
      return NextResponse.json(
        { success: false, error: 'Telegram Bot Token or Chat ID not configured. Enter them above or save in Settings.' },
        { status: 400 }
      );
    }

    const message = `
🤖 <b>OppHub Telegram Bot Connected!</b>

Your Telegram alert channel is now operational. You will receive high-priority internship alerts, approaching deadline reminders, and watchlist change updates here.

⚡ <i>Sent from OppHub Settings Test</i>
    `.trim();

    const result = await sendTelegramMessage(message, { botToken, chatId });

    if (!result.success) {
      const isRateLimit =
        result.statusCode === 429 ||
        result.error?.toLowerCase().includes('too many requests');

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          retryAfter: isRateLimit ? (result.retryAfter ?? 8) : undefined,
        },
        { status: isRateLimit ? 429 : result.statusCode || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test message delivered to Telegram!',
      messageId: result.messageId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}
