import { Metadata } from 'next'
import { LoginForm } from './login-form'

// Crawlers fetching yafijournal.com aren't signed in and are redirected here,
// so this page carries the main brand preview (image from app/opengraph-image.png).
export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to YAFI Journal: your trading journal and performance analytics.',
  openGraph: {
    title: 'YAFI Journal | Trading Journal & Performance Analytics',
    description:
      'A trading journal for serious traders: log every trade, track your P&L, win rate and R, and build discipline with performance analytics.',
    url: '/login',
    siteName: 'YAFI Journal',
    type: 'website',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'YAFI Journal: trading journal and performance analytics' }],
  },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/logo-mark.png" alt="YAFI logo" width={48} height={48} className="mb-4 size-12" />
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to YAFI</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your trading journal and performance analytics</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <LoginForm message={message} />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">Secured by Supabase Auth</p>
      </div>
    </div>
  )
}
