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
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 shadow-2xl dark:border-gray-800 dark:bg-gray-950/50 backdrop-blur-xl transition-all">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-8 text-center dark:border-gray-800 dark:bg-gray-900/80 sm:px-16">
          <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Welcome Back
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sign in to access your trading dashboard
          </p>
        </div>
        
        <LoginForm message={searchParams?.message} />
        
        <div className="bg-gray-50 px-4 py-4 border-t border-gray-100 dark:bg-gray-900/30 dark:border-gray-800/50 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Secure connection via Supabase Auth
          </p>
        </div>
      </div>
    </div>
  )
}
