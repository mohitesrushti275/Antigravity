import { createClient } from '@supabase/supabase-js';

/**
 * Admin Supabase client using the service role key.
 * BYPASSES RLS — use only in server-side code (API routes, cron jobs).
 * NEVER expose this client or key to the browser.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
