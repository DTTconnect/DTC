import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Return a mock client if environment variables are not configured
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not configured')
    // Return a minimal mock client to prevent crashes
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: { message: 'Supabase not configured' } })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                single: async () => ({ data: null, error: null })
              })
            }),
            single: async () => ({ data: null, error: null })
          }),
          order: async () => ({ data: null, error: null }),
          single: async () => ({ data: null, error: null })
        })
      })
    } as any
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set(name, value, options)
          } catch (error) {
            // Handle cookie setting in server components
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          } catch (error) {
            // Handle cookie removal in server components
          }
        },
      },
    }
  )
}
