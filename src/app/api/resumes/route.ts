import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ResumeVersion } from '@/types';
import { STARTER_RESUMES } from '@/data/starter-resumes';

export { STARTER_RESUMES };

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('resume_versions')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return NextResponse.json({ resumes: data, isDemo: false });
      }
    } catch (err) {
      console.warn('Querying Supabase resume_versions failed:', err);
    }
  }

  // Fallback demo starter resumes
  const demoList: ResumeVersion[] = [
    {
      id: 'demo-res-base',
      label: 'base',
      json_resume: STARTER_RESUMES.base,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'demo-res-backend',
      label: 'backend',
      json_resume: STARTER_RESUMES.backend,
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: 'demo-res-aiml',
      label: 'ai-ml',
      json_resume: STARTER_RESUMES['ai-ml'],
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  return NextResponse.json({ resumes: demoList, isDemo: true });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { label, json_resume } = body;

    if (!label || !json_resume) {
      return NextResponse.json({ success: false, error: 'Label and json_resume are required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data, error } = await supabase
        .from('resume_versions')
        .insert({
          label: label.toLowerCase().trim(),
          json_resume,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, resume: data, isDemo: false });
    }

    // Demo mode
    const fallbackItem: ResumeVersion = {
      id: `res-${Date.now()}`,
      label: label.toLowerCase().trim(),
      json_resume,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, resume: fallbackItem, isDemo: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, label, json_resume } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Resume id is required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (supabase && !id.startsWith('demo-')) {
      const updates: any = { updated_at: new Date().toISOString() };
      if (label) updates.label = label.toLowerCase().trim();
      if (json_resume) updates.json_resume = json_resume;

      const { data, error } = await supabase
        .from('resume_versions')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, resume: data, isDemo: false });
    }

    // Demo mode
    const updatedResume: ResumeVersion = {
      id,
      label: label?.toLowerCase().trim() || 'variant',
      json_resume: json_resume || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, resume: updatedResume, isDemo: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Resume id is required.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (supabase && !id.startsWith('demo-')) {
    const { error } = await supabase.from('resume_versions').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true });
}
