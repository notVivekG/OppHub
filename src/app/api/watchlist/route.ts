import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .order('last_checked_at', { ascending: false });

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message, isDemo: false },
          { status: 500 }
        );
      }

      return NextResponse.json({ watchlist: data ?? [], isDemo: false });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || 'Database query error', isDemo: false },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ watchlist: [], isDemo: true });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { data, error } = await supabase
        .from('watchlist')
        .insert({
          label: body.label,
          url: body.url,
          css_selector: body.css_selector || null,
          last_checked_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message, isDemo: false },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, item: data, isDemo: false });
    }

    const fallbackItem = {
      id: body.id || `watch-${Date.now()}`,
      label: body.label,
      url: body.url,
      css_selector: body.css_selector || null,
      last_checked_at: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, item: fallbackItem, isDemo: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server error', isDemo: false },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const supabase = getSupabaseAdmin();

  if (supabase) {
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Target ID is required for deletion', isDemo: false },
        { status: 400 }
      );
    }

    try {
      const { error } = await supabase.from('watchlist').delete().eq('id', id);
      if (error) {
        return NextResponse.json(
          { success: false, error: error.message, isDemo: false },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true, isDemo: false });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || 'Server error', isDemo: false },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, isDemo: true });
}
