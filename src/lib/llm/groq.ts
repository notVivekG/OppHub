import { TailorResponse } from '@/types';
import { LlmAdapter, TAILORING_SYSTEM_PROMPT, buildTailoringUserMessage, cleanJsonResponse } from './adapter';

export class GroqAdapter implements LlmAdapter {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
  }

  async generateTailoring(resumeJson: any, jobDescription: string): Promise<TailorResponse> {
    const key = this.apiKey || process.env.GROQ_API_KEY;
    if (!key || key.includes('placeholder') || key === 'your-groq-api-key') {
      throw new Error(
        'GROQ_API_KEY is not configured. Please add your Groq API key to .env.local.'
      );
    }

    const userMessage = buildTailoringUserMessage(resumeJson, jobDescription);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: TAILORING_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(
        errJson.error?.message || `Groq API returned HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Groq API returned an empty response.');
    }

    const cleaned = cleanJsonResponse(content);
    const parsed = JSON.parse(cleaned);

    return {
      matchScore: Math.min(100, Math.max(0, Number(parsed.matchScore) || 50)),
      missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
      suggestedRewrites: Array.isArray(parsed.suggestedRewrites)
        ? parsed.suggestedRewrites.map((r: any) => ({
            originalBullet: String(r.originalBullet || ''),
            suggestedBullet: String(r.suggestedBullet || ''),
            jdKeywordsAddressed: Array.isArray(r.jdKeywordsAddressed) ? r.jdKeywordsAddressed : [],
          }))
        : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
    };
  }
}
