import './globals.css';
import { AppProvider } from '../context/AppContext';

export const metadata = {
  title: 'M2D – Modrinth Mod Downloader',
  description: 'Search, filter, and download Minecraft mods from Modrinth.',
};

// Blocking script: applies the saved theme before first paint to prevent flash.
const themeScript = `(function(){try{var t=localStorage.getItem('mod_manager_theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
