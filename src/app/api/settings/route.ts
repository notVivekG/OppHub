import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const DEFAULT_SETTINGS = {
  eligibility_rules: {
    gradYears: [2025, 2026, 2027, 2028],
    degrees: ['Bachelors', 'Masters'],
    requiresSponsorship: false,
    usCitizenOnlyAllowed: true,
    remoteOnly: false,
    preferredLocations: ['Remote', 'San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX'],
    targetRoles: ['Software Engineer', 'Backend', 'Frontend', 'Full Stack', 'AI/ML'],
  },
  notification_prefs: {
    priorityThreshold: 70,
    telegramEnabled: true,
    inAppEnabled: true,
    notifyOnDeadlineDays: 7,
  },
  telegram_chat_id: '',
  watched_languages: ['typescript', 'python', 'go', 'rust'],
};

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('settings').select('*').limit(1).maybeSingle();
      if (!error && data) {
        return NextResponse.json({ settings: data, isDemo: false });
      }
      if (!error && !data) {
        // Connected to Supabase, but settings table has no row yet
        const initial = {
          ...DEFAULT_SETTINGS,
          telegram_chat_id: '',
          notification_prefs: {
            ...DEFAULT_SETTINGS.notification_prefs,
            telegram_bot_token: undefined,
          },
        };
        return NextResponse.json({ settings: initial, isDemo: false });
      }
    } catch (err) {
      console.warn('Could not read from Supabase settings:', err);
    }
  }

  return NextResponse.json({ settings: DEFAULT_SETTINGS, isDemo: true });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    if (supabase) {
      // Upsert settings row
      const { data, error } = await supabase
        .from('settings')
        .upsert({
          id: body.id || '00000000-0000-0000-0000-000000000001',
          eligibility_rules: body.eligibility_rules || DEFAULT_SETTINGS.eligibility_rules,
          notification_prefs: body.notification_prefs || DEFAULT_SETTINGS.notification_prefs,
          telegram_chat_id: body.telegram_chat_id || null,
          watched_languages: body.watched_languages || DEFAULT_SETTINGS.watched_languages,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message, isDemo: false }, { status: 400 });
      }
      return NextResponse.json({ success: true, settings: data, isDemo: false });
    }

    return NextResponse.json({ success: true, isDemo: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, isDemo: false }, { status: 500 });
  }
}
