// Root layout for the Herräng Companion. The design system here is the
// camp's daily poster, not a generic app shell.

import type { Metadata, Viewport } from 'next';
import { Archivo_Black, Inter } from 'next/font/google';
import './globals.css';

const display = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-hg-display',
});

const body = Inter({
  subsets: ['latin'],
  variable: '--font-hg-body',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://herrang.stockholmswing.com'),
  title: 'Herräng Companion',
  description:
    'What is happening today in Herräng — your track’s classes, tonight’s DJs, shows and jams. At a glance, on a phone, possibly at 2am.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: '/icon-180.png',
  },
  // A tool for people physically at the camp; not for search engines.
  robots: { index: false, follow: false },
  openGraph: {
    siteName: 'Herräng Companion',
    locale: 'en',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Herräng',
  },
};

export const viewport: Viewport = {
  themeColor: '#141414',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Decide the ground before first paint. Auto rule: night 20:00–08:00,
            manual override in localStorage wins. Mirrors src/lib/herrang/time.ts. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var p=localStorage.getItem('herrang.theme.v1');var h=new Date().getHours();var n=p==='\"night\"'||(p!=='\"day\"'&&(h>=20||h<8));document.documentElement.setAttribute('data-hg',n?'night':'day')}catch(e){document.documentElement.setAttribute('data-hg','day')}})()",
          }}
        />
      </head>
      <body className="hg-body">{children}</body>
    </html>
  );
}
