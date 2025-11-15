import { createBrowserClient } from '@supabase/ssr'
import type { AuthChangeEvent, Session, UserResponse, SupabaseClient } from '@supabase/supabase-js'

export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Return a mock client if environment variables are not configured
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not configured')
    // Return a minimal mock client to prevent crashes with proper typing
    return {
      auth: {
        getUser: async () => ({
          data: { user: null },
          error: null
        } as unknown as UserResponse),
        onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => ({
          data: {
            subscription: {
              unsubscribe: () => {}
            }
          }
        })
      }
    } as unknown as SupabaseClient
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}
