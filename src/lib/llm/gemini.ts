import { GoogleGenAI } from '@google/genai';
import { TailorResponse } from '@/types';
import { LlmAdapter, TAILORING_SYSTEM_PROMPT, buildTailoringUserMessage, cleanJsonResponse } from './adapter';

export class GeminiAdapter implements LlmAdapter {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  }

  async generateTailoring(resumeJson: any, jobDescription: string): Promise<TailorResponse> {
    const key = this.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key || key.includes('placeholder') || key === 'your-gemini-api-key') {
      throw new Error(
        'GEMINI_API_KEY is not configured. Please add your free-tier Gemini API key to .env.local.'
      );
    }

    const ai = new GoogleGenAI({ apiKey: key });
    const userMessage = buildTailoringUserMessage(resumeJson, jobDescription);

    const interaction = await ai.interactions.create({
      model: 'gemini-3.6-flash',
      input: userMessage,
      system_instruction: TAILORING_SYSTEM_PROMPT,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: {
          type: 'object',
          properties: {
            matchScore: { type: 'integer' },
            missingKeywords: {
              type: 'array',
              items: { type: 'string' },
            },
            suggestedRewrites: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  originalBullet: { type: 'string' },
                  suggestedBullet: { type: 'string' },
                  jdKeywordsAddressed: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
                required: ['originalBullet', 'suggestedBullet', 'jdKeywordsAddressed'],
              },
            },
            gaps: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['matchScore', 'missingKeywords', 'suggestedRewrites', 'gaps'],
        },
      },
    });

    let responseText = interaction.output_text || '';
    if (!responseText && interaction.steps) {
      for (const step of interaction.steps) {
        if (step.type === 'model_output' && Array.isArray((step as any).content)) {
          for (const item of (step as any).content) {
            if (item.type === 'text' && item.text) {
              responseText += item.text;
            }
          }
        }
      }
    }

    if (!responseText) {
      throw new Error('Gemini Interactions API returned an empty response.');
    }

    const cleaned = cleanJsonResponse(responseText);
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
