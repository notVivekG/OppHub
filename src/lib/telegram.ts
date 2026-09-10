import type { Opportunity } from '@/types';
import {
  sendTelegramMessage as sendCoreTelegramMessage,
  formatOpportunityTelegramMessage as formatCoreOpportunityTelegramMessage,
  escapeHtml as coreEscapeHtml,
} from './telegram-core.mjs';

export interface TelegramConfig {
  botToken?: string | null;
  chatId?: string | null;
}

export interface TelegramResponse {
  success: boolean;
  messageId?: number;
  error?: string;
  statusCode?: number;
  retryAfter?: number;
}

export async function sendTelegramMessage(
  text: string,
  config?: TelegramConfig
): Promise<TelegramResponse> {
  return sendCoreTelegramMessage(text, config);
}

/**
 * Formats a high-priority opportunity alert for Telegram
 */
export function formatOpportunityTelegramMessage(
  opp: Opportunity,
  priorityScore: number
): string {
  return formatCoreOpportunityTelegramMessage(opp, priorityScore);
}

export function escapeHtml(text?: string | null): string {
  return coreEscapeHtml(text);
}
