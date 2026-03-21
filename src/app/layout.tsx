import './globals.css';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { AppProvider } from '../context/AppContext';
import SessionProvider from '../components/auth/SessionProvider';
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  ),
  title: {
    default: 'M2D – Modrinth Mod Downloader',
    template: '%s | M2D',
  },
  description: 'Search, filter, and download Minecraft mods from Modrinth.',
  openGraph: {
    siteName: 'M2D',
    type: 'website',
    title: 'M2D – Modrinth Mod Downloader',
    description: 'Search, filter, and download Minecraft mods from Modrinth.',
  },
  twitter: {
    card: 'summary',
    title: 'M2D – Modrinth Mod Downloader',
    description: 'Search, filter, and download Minecraft mods from Modrinth.',
  },
};

const themeScript = `(function(){try{var t=localStorage.getItem('mod_manager_theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The nonce is set by src/middleware.ts for each request and forwarded via
  // the x-nonce request header. It enables the inline theme script to execute
  // under the nonce-based Content-Security-Policy without needing 'unsafe-inline'.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.modrinth.com" />
        <link rel="dns-prefetch" href="https://cdn.modrinth.com" />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SessionProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </SessionProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}