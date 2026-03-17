import './globals.css';
import { AppProvider } from '../context/AppContext';

export const metadata = {
  title: 'M2D – Modrinth Mod Downloader',
  description: 'Search, filter, and download Minecraft mods from Modrinth.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
