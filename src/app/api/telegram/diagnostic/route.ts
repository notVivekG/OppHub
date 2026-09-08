import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

function maskId(id: string | number | null | undefined): string {
  if (!id) return '(not provided)';
  const str = String(id);
  if (str.length <= 4) return '***';
  return str.slice(0, 3) + '***' + str.slice(-3);
}

async function resolveCredentials(request: NextRequest) {
  let botToken: string | undefined;
  let chatId: string | undefined;
  let botTokenSource = 'not found';
  let chatIdSource = 'not found';

  // 1. Check request body if present
  try {
    const body = await request.json();
    if (body.botToken) {
      botToken = body.botToken;
      botTokenSource = 'request body';
    }
    if (body.chatId) {
      chatId = body.chatId;
      chatIdSource = 'request body';
    }
  } catch {
    // No body or empty body - proceed to fallbacks
  }

  // 2. Check Supabase settings table
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
          if (!botToken && settingsData.notification_prefs?.telegram_bot_token) {
            botToken = settingsData.notification_prefs.telegram_bot_token;
            botTokenSource = 'Supabase settings table';
          }
          if (!chatId && settingsData.telegram_chat_id) {
            chatId = settingsData.telegram_chat_id;
            chatIdSource = 'Supabase settings table';
          }
        }
      } catch (dbErr: any) {
        console.warn('[Diagnostic] Could not query Supabase settings:', dbErr.message);
      }
    }
  }

  // 3. Check environment variables
  if (!botToken && process.env.TELEGRAM_BOT_TOKEN) {
    botToken = process.env.TELEGRAM_BOT_TOKEN;
    botTokenSource = 'environment variable (TELEGRAM_BOT_TOKEN)';
  }
  if (!chatId && process.env.TELEGRAM_CHAT_ID) {
    chatId = process.env.TELEGRAM_CHAT_ID;
    chatIdSource = 'environment variable (TELEGRAM_CHAT_ID)';
  }

  return { botToken, chatId, botTokenSource, chatIdSource };
}

async function runDiagnostic(request: NextRequest) {
  const { botToken, chatId, botTokenSource, chatIdSource } = await resolveCredentials(request);

  const result: {
    timestamp: string;
    bot_status: 'BOT VALID' | 'BOT TOKEN INVALID';
    chat_status: 'CHAT VALID' | 'CHAT INVALID/INACCESSIBLE';
    chat_type_classification: string;
    bot?: {
      ok: boolean;
      id?: number;
      username?: string;
      can_join_groups?: boolean;
      can_read_all_group_messages?: boolean;
      supports_inline_queries?: boolean;
    };
    chat?: {
      ok: boolean;
      type?: string;
      username?: string | null;
      title?: string | null;
      first_name?: string | null;
      masked_id: string;
    };
    sources: {
      bot_token: string;
      chat_id: string;
    };
    errors?: {
      bot_error?: string;
      chat_error?: string;
    };
  } = {
    timestamp: new Date().toISOString(),
    bot_status: 'BOT TOKEN INVALID',
    chat_status: 'CHAT INVALID/INACCESSIBLE',
    chat_type_classification: 'unknown',
    sources: {
      bot_token: botTokenSource,
      chat_id: chatIdSource,
    },
  };

  // 1. Verify Bot using getMe (read-only, never sendMessage)
  if (!botToken || botToken.includes('placeholder')) {
    result.bot_status = 'BOT TOKEN INVALID';
    result.errors = { ...result.errors, bot_error: 'Bot token not configured or contains placeholder' };
  } else {
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const meData = await meRes.json().catch(() => ({ ok: false, description: 'Invalid JSON from Telegram' }));

      if (meRes.ok && meData.ok && meData.result) {
        result.bot_status = 'BOT VALID';
        result.bot = {
          ok: true,
          id: meData.result.id,
          username: meData.result.username,
          can_join_groups: meData.result.can_join_groups,
          can_read_all_group_messages: meData.result.can_read_all_group_messages,
          supports_inline_queries: meData.result.supports_inline_queries,
        };
      } else {
        result.bot_status = 'BOT TOKEN INVALID';
        result.errors = { ...result.errors, bot_error: meData.description || `HTTP ${meRes.status}` };
      }
    } catch (err: any) {
      result.bot_status = 'BOT TOKEN INVALID';
      result.errors = { ...result.errors, bot_error: err.message || 'Network error contacting Telegram getMe' };
    }
  }

  // 2. Verify Chat using getChat (read-only, never sendMessage)
  if (!chatId || chatId.includes('placeholder')) {
    result.chat_status = 'CHAT INVALID/INACCESSIBLE';
    result.errors = { ...result.errors, chat_error: 'Chat ID not configured or contains placeholder' };
  } else if (result.bot_status !== 'BOT VALID') {
    result.chat_status = 'CHAT INVALID/INACCESSIBLE';
    result.errors = { ...result.errors, chat_error: 'Cannot verify chat because bot token is invalid' };
  } else {
    try {
      const chatRes = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`);
      const chatData = await chatRes.json().catch(() => ({ ok: false, description: 'Invalid JSON from Telegram' }));

      if (chatRes.ok && chatData.ok && chatData.result) {
        result.chat_status = 'CHAT VALID';
        const type = chatData.result.type; // 'private' | 'group' | 'supergroup' | 'channel'
        result.chat_type_classification =
          type === 'private'
            ? 'private user chat'
            : type === 'group'
            ? 'group'
            : type === 'supergroup'
            ? 'supergroup'
            : type === 'channel'
            ? 'channel'
            : type || 'unknown';

        result.chat = {
          ok: true,
          type: chatData.result.type,
          username: chatData.result.username || null,
          title: chatData.result.title || null,
          first_name: chatData.result.first_name || null,
          masked_id: maskId(chatId),
        };
      } else {
        result.chat_status = 'CHAT INVALID/INACCESSIBLE';
        result.errors = { ...result.errors, chat_error: chatData.description || `HTTP ${chatRes.status}` };
      }
    } catch (err: any) {
      result.chat_status = 'CHAT INVALID/INACCESSIBLE';
      result.errors = { ...result.errors, chat_error: err.message || 'Network error contacting Telegram getChat' };
    }
  }

  return NextResponse.json(result, { status: 200 });
}

export async function POST(request: NextRequest) {
  return runDiagnostic(request);
}

export async function GET(request: NextRequest) {
  return runDiagnostic(request);
}
