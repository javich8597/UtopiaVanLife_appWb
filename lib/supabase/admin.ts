import { createClient } from '@supabase/supabase-js'

/**
 * Returns a privileged Supabase client that bypasses Row-Level Security (RLS)
 * using the SUPABASE_SERVICE_ROLE_KEY.
 * Falls back to ANON_KEY if service role key is not configured in development.
 */
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aqqqjklnjhbyrischyti.supabase.co'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export const supabaseAdmin = getSupabaseAdmin()
