import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          opportunity:opportunities(*)
        `)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        return NextResponse.json({ applications: data, isDemo: false });
      }
    } catch (err) {
      console.warn('Failed to query Supabase applications:', err);
    }
  }

  return NextResponse.json({ applications: [], isDemo: true });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    if (supabase) {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('applications')
        .insert({
          opportunity_id: body.opportunity_id,
          resume_version_id: body.resume_version_id || null,
          status: body.status || 'applied',
          date_applied: body.date_applied || now,
          status_changed_at: now,
          follow_up_date: body.follow_up_date || null,
          recruiter_contact: body.recruiter_contact || null,
          notes: body.notes || null,
        })
        .select(`*, opportunity:opportunities(*)`)
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, application: data, isDemo: false });
    }

    // In demo mode, client manages via localStorage
    return NextResponse.json({ success: true, application: body, isDemo: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const supabase = getSupabaseAdmin();

    if (supabase && id) {
      const updatePayload: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      if (updates.status) {
        updatePayload.status_changed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('applications')
        .update(updatePayload)
        .eq('id', id)
        .select(`*, opportunity:opportunities(*)`)
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, application: data, isDemo: false });
    }

    return NextResponse.json({ success: true, application: body, isDemo: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const supabase = getSupabaseAdmin();

  if (supabase && id) {
    const { error } = await supabase.from('applications').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true });
}
