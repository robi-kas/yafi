import { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign in | YAFI',
  description: 'Sign in to your YAFI trading journal to analyze your trades, manage your strategies, and track your performance.',
  openGraph: {
    title: 'Sign in | YAFI Trading Journal',
    description: 'Securely access your trading data, performance metrics, and journal entries.',
    url: 'https://yafijournal.com/login',
    siteName: 'YAFI Trading Journal',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'YAFI Trading Journal',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Sign in | YAFI Trading Journal',
    description: 'Access your professional trading journal and analytics dashboard.',
    images: ['/logo.png'],
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
