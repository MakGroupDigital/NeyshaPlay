import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AppGate } from '@/components/app-gate'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#c3ff00',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://neyshaplay.com'),
  title: {
    default: 'NeyshaPlay - Vidéos Courtes & Créativité',
    template: '%s | NeyshaPlay'
  },
  description: 'Plongez dans un univers de vidéos courtes, créez, partagez et découvrez des contenus captivants. Rejoignez la communauté NeyshaPlay !',
  keywords: ['vidéo', 'création', 'partage', 'musique', 'danse', 'divertissement', 'réseaux sociaux', 'tiktok', 'reels', 'shorts', 'contenu créateur', 'monétisation'],
  authors: [{ name: 'NeyshaPlay' }],
  creator: 'NeyshaPlay',
  publisher: 'NeyshaPlay',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'NeyshaPlay - Vidéos Courtes & Créativité',
    description: 'Créez, partagez et découvrez des contenus vidéo captivants. Monétisez votre créativité.',
    url: 'https://neyshaplay.com',
    siteName: 'NeyshaPlay',
    images: [
      {
        url: 'https://res.cloudinary.com/dy73hzkpm/image/upload/v1763554690/Capture_d_e%CC%81cran_2025-11-19_a%CC%80_13.02.59_dlzkzl.png',
        width: 1200,
        height: 630,
        alt: 'NeyshaPlay - Plateforme de vidéos courtes',
      },
    ],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NeyshaPlay - Vidéos Courtes & Créativité',
    description: 'Créez, partagez et découvrez des contenus vidéo captivants.',
    images: ['https://res.cloudinary.com/dy73hzkpm/image/upload/v1763554690/Capture_d_e%CC%81cran_2025-11-19_a%CC%80_13.02.59_dlzkzl.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'android-chrome-192x192', url: '/android-chrome-192x192.png' },
      { rel: 'android-chrome-512x512', url: '/android-chrome-512x512.png' },
    ],
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NeyshaPlay',
  },
  verification: {
    // Add your verification codes here when available
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="dark h-full bg-background" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased min-h-[100dvh] bg-background text-foreground">
        <AppGate>{children}</AppGate>
        <Toaster />
      </body>
    </html>
  )
}
