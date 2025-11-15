import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'
import type { AuthChangeEvent, Session, User, AuthError } from '@supabase/supabase-js'

export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Return a mock client if environment variables are not configured
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not configured')
    // Return a minimal mock client to prevent crashes with proper typing
    return {
      auth: {
        getUser: async (): Promise<{ data: { user: User | null }; error: AuthError | null }> => ({
          data: { user: null },
          error: null
        }),
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
