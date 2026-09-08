import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const getSupabaseAdmin = (): SupabaseClient | null => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
