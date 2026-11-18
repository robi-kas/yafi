import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Returns the signed-in Supabase user's id, or null when there is no valid
 * session. Uses getUser() (verified against Supabase Auth), never the
 * unverified session cookie alone.
 */
export async function getUserId(): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    console.error('Supabase env vars missing: refusing all API access')
    return null
  }
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user.id
}

export function unauthorized() {
  return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
}
