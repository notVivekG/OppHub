import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getLlmAdapter } from '@/lib/llm/adapter';
import { STARTER_RESUMES } from '@/data/starter-resumes';
import { JsonResume } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resumeVariantId, resumeJson, jobDescription } = body;

    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 20) {
      return NextResponse.json(
        { success: false, error: 'A job description of at least 20 characters is required.' },
        { status: 400 }
      );
    }

    let targetResume: JsonResume | null = resumeJson || null;

    // If only ID was supplied, look up resume
    if (!targetResume && resumeVariantId) {
      const supabase = getSupabaseAdmin();
      if (supabase && !resumeVariantId.startsWith('demo-')) {
        const { data, error } = await supabase
          .from('resume_versions')
          .select('json_resume')
          .eq('id', resumeVariantId)
          .single();

        if (!error && data?.json_resume) {
          targetResume = data.json_resume as JsonResume;
        }
      }

      // If still not found and matches demo ID
      if (!targetResume) {
        if (resumeVariantId.includes('backend')) {
          targetResume = STARTER_RESUMES.backend;
        } else if (resumeVariantId.includes('aiml') || resumeVariantId.includes('ai-ml')) {
          targetResume = STARTER_RESUMES['ai-ml'];
        } else {
          targetResume = STARTER_RESUMES.base;
        }
      }
    }

    if (!targetResume) {
      return NextResponse.json(
        { success: false, error: 'Resume variant content could not be found.' },
        { status: 404 }
      );
    }

    const adapter = getLlmAdapter();
    const result = await adapter.generateTailoring(targetResume, jobDescription);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('AI Tailoring failed:', err.message);
    const isRateLimit = err.message?.toLowerCase().includes('429') || err.message?.toLowerCase().includes('quota');
    const statusCode = isRateLimit ? 429 : 500;

    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to generate tailored resume suggestions.',
        retryAfter: isRateLimit ? 15 : undefined,
      },
      { status: statusCode }
    );
  }
}
