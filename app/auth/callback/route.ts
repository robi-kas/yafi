import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Landing page for Supabase email links (email change confirmation, password
// recovery). Exchanges the one-time code for a session, then continues.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/settings'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/settings'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL(`/login?message=${encodeURIComponent(error.message)}`, url.origin))
    }
  }
  const dest = new URL(safeNext, url.origin)
  const errDesc = url.searchParams.get('error_description')
  dest.searchParams.set('auth', errDesc ? 'error' : 'confirmed')
  if (errDesc) dest.searchParams.set('message', errDesc)
  return NextResponse.redirect(dest)
}
