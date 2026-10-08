import { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign In | YAFU',
  description: 'Sign in to your YAFU trading journal dashboard to analyze your trades, manage your strategies, and track your performance.',
  openGraph: {
    title: 'Sign In | YAFU Trading Journal',
    description: 'Securely access your trading data, performance metrics, and journal entries.',
    url: 'https://yafi-eo544x85w-roberakassayech-2544s-projects.vercel.app/login', // Use your actual domain here later
    siteName: 'YAFU Trading Journal',
    images: [
      {
        url: '/logo.png', // Assuming you have a logo.png in public folder
        width: 800,
        height: 600,
        alt: 'YAFU Trading Journal',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign In | YAFU Trading Journal',
    description: 'Access your professional trading journal and analytics dashboard.',
    images: ['/logo.png'],
  },
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border shadow-2xl bg-card text-card-foreground transition-all">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-border px-4 py-8 text-center sm:px-16">
          <h3 className="text-2xl font-bold tracking-tight">
            Welcome Back
          </h3>
          <p className="text-sm text-muted-foreground">
            Sign in to access your trading dashboard
          </p>
        </div>
        
        <LoginForm message={searchParams?.message} />
        
        <div className="bg-muted/50 px-4 py-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Secure connection via Supabase Auth
          </p>
        </div>
      </div>
    </div>
  )
}
