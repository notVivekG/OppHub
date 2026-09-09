import { TailorResponse } from '@/types';
import { GeminiAdapter } from './gemini';
import { GroqAdapter } from './groq';

export interface LlmAdapter {
  generateTailoring(resumeJson: any, jobDescription: string): Promise<TailorResponse>;
}

export const TAILORING_SYSTEM_PROMPT = `
You are an expert technical resume tailoring engine for software engineering, AI/ML, and tech opportunities.

CRITICAL HARD REQUIREMENTS (NEVER VIOLATE):
1. FACTUAL INTEGRITY & ZERO HALLUCINATION:
   You must ONLY reword, reorder, or re-emphasize content that ALREADY EXISTS in the supplied resume JSON.
   You must NEVER invent employers, titles, dates, metrics, tools, programming languages, skills, or achievements that are not explicitly documented in the input resume.
2. HANDLING GAPS:
   If the Job Description (JD) requires specific skills, frameworks, degrees, years of experience, or domains that are NOT evidenced anywhere in the candidate's resume, you MUST list them under "gaps".
   Phrased each gap clearly as a requirement for the candidate to address themselves (e.g., "Requires production experience with Kubernetes and Terraform, which is not evidenced in your resume").
   NEVER silently fabricate or assume a skill or bullet to satisfy a JD requirement.
3. SUGGESTED REWRITES:
   For bullets where the candidate ALREADY performed relevant work, provide suggested rewrites that reword or re-emphasize the bullet using JD-relevant terminology, while strictly preserving the truth of what was accomplished.
   Do not modify numbers or metrics unless already stated.
   Each suggested rewrite must map an exact "originalBullet" from the resume to a "suggestedBullet".
4. OUTPUT FORMAT:
   You must return ONLY a valid, raw JSON object matching this TypeScript schema, with no markdown code fences, backticks, or extra commentary:
   {
     "matchScore": number, // 0 to 100 integer representing alignment
     "missingKeywords": string[], // List of important technical keywords in JD missing from resume
     "suggestedRewrites": [
       {
         "originalBullet": string, // exact text of original bullet
         "suggestedBullet": string, // reworded version emphasizing JD terms without fabricating facts
         "jdKeywordsAddressed": string[] // keywords incorporated
       }
     ],
     "gaps": string[] // explicit gaps in experience/skills between JD and resume
   }
`.trim();

export function buildTailoringUserMessage(resumeJson: any, jobDescription: string): string {
  return `
CANDIDATE RESUME (JSON Resume schema):
${JSON.stringify(resumeJson, null, 2)}

TARGET JOB DESCRIPTION:
${jobDescription.trim()}

Analyze the resume against the job description and return the structured tailoring JSON response according to the strict instructions.
`.trim();
}

export function cleanJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  cleaned = cleaned.trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned.trim();
}

export function getLlmAdapter(): LlmAdapter {
  const provider = (
    process.env.LLM_PROVIDER ||
    process.env.AI_PROVIDER ||
    'gemini'
  ).toLowerCase().trim();

  if (provider === 'groq') {
    return new GroqAdapter();
  }

  return new GeminiAdapter();
}
