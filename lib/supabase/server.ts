import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 * 
 * This client uses the PUBLISHABLE_KEY for normal authenticated user sessions.
 * This allows the session to be refreshed via cookies without exposing
 * service-role secrets to the browser.
 */
export async function createClient() {
  const cookieStore = await cookies()

  // Use the publishable key for normal authenticated user sessions.
  // The cookie store will proxy auth and refresh sessions automatically.
  // Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  )
}
