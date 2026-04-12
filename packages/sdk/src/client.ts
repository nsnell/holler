import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { warn } from './debug.js'

/**
 * Thin wrapper around @supabase/supabase-js.
 * We keep the anon key client-side — all access is mediated by the RLS
 * policies the CLI installs during `npx @holler/init`.
 */
export function createSupabaseClient(
  url: string,
  anonKey: string,
): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      'Holler: supabaseUrl and supabaseAnonKey are required',
    )
  }
  try {
    return createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: { eventsPerSecond: 5 },
      },
    })
  } catch (err) {
    warn('Failed to create Supabase client', err)
    throw err
  }
}

export type { SupabaseClient }
