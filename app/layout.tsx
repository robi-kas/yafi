import React from "react"
import type { Metadata, Viewport } from 'next'
import { Outfit, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from 'next-themes'
import './globals.css'
import { DashboardProvider } from '@/context/dashboard-context'

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: 'YAFI | Trading Journal & Performance Analytics',
  description: 'Professional trading journal platform for serious traders. Track trades, analyze performance, and improve discipline.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#050505',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground min-h-screen`}>
        <script dangerouslySetInnerHTML={{
          __html: '(function(){function c(e){var n=e.filename||"";if(n.indexOf("chrome-extension://")===0||n.indexOf("moz-extension://")===0||n.indexOf("safari-extension://")===0){e.preventDefault();e.stopImmediatePropagation();return false}}function d(e){var r=e.reason||{},s=r.stack||"",m=r.message||"";if(s.indexOf("chrome-extension://")!==-1||s.indexOf("moz-extension://")!==-1||s.indexOf("safari-extension://")!==-1||m.indexOf("MetaMask")!==-1||m.indexOf("ethereum")!==-1){e.preventDefault();e.stopImmediatePropagation()}}window.addEventListener("error",c,true);window.addEventListener("unhandledrejection",d,true)})();'
        }} />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <DashboardProvider>
            {children}
          </DashboardProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
