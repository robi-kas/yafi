import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from 'next-themes'
import './globals.css'
import { DashboardProvider } from '@/context/dashboard-context'

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const SITE_NAME = 'YAFI Journal'
const SITE_DESCRIPTION =
  'A trading journal for serious traders: log every trade, track your P&L, win rate and R, and build discipline with performance analytics.'

// Used for link previews (WhatsApp, Telegram, X, Facebook, LinkedIn...). The
// preview image comes from app/opengraph-image.png and app/twitter-image.png.
export const metadata: Metadata = {
  metadataBase: new URL('https://yafijournal.com'),
  title: {
    default: 'YAFI Journal | Trading Journal & Performance Analytics',
    template: '%s | YAFI Journal',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: 'YAFI Journal | Trading Journal & Performance Analytics',
    description: SITE_DESCRIPTION,
    url: '/',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YAFI Journal | Trading Journal & Performance Analytics',
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#09090a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground min-h-screen`}>
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
