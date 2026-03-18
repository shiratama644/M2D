import './globals.css';
import type { Metadata } from 'next';
import { AppProvider } from '../context/AppContext';
import SessionProvider from '../components/auth/SessionProvider';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SessionProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
