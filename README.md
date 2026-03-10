# M2D - Modrinth Mod Manager

Minecraft Mod Downloader - rebuilt with React, Vite, and TailwindCSS v4.

## Tech Stack

- **Node.js** + **pnpm**
- **React 19** (UI framework)
- **Vite** (bundler)
- **TailwindCSS v4.2** (with `@tailwindcss/vite` plugin)
- **Three.js** (animated background)
- **JSZip** + **FileSaver.js** (ZIP download/import)
- **Lucide React** (icons)

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Features

- 🔍 Search Modrinth mods with loader & version filters
- ♾️ Infinite scroll mod list
- ✅ Multi-mod selection with checkboxes
- 💾 Profile save/load/export (TXT) and import from mod ZIP
- 🔗 Dependency analysis (required/optional/conflict)
- 📦 Download selected mods as ZIP
- 🌙 Dark/Light theme toggle
- 🐛 Floating debug console
