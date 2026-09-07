import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { botToken, chatId } = body;

    const message = `
🤖 <b>OppHub Telegram Bot Connected!</b>

Your Telegram alert channel is now operational. You will receive high-priority internship alerts, approaching deadline reminders, and watchlist change updates here.

⚡ <i>Sent from OppHub Settings Test</i>
    `.trim();

    const result = await sendTelegramMessage(message, { botToken, chatId });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
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
