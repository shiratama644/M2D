# M2D - Modrinth Mod Manager

A powerful and fast tool to search, manage, and download Minecraft mods from Modrinth, built with Next.js 15 and Tailwind CSS 4.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) 15 (with **React 19**)
- **Language**: **TypeScript**
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Animations**: **Framer Motion**
- **UI Primitives**: **Radix UI**
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Persistence**: **IndexedDB** (this device only)
- **Package Manager**: **pnpm**
- **Downloading**: **JSZip** + **FileSaver.js**
- **Markdown Rendering**: **react-markdown** + **rehype-raw** + **remark-gfm**
- **Icons**: **FontAwesome** + **Lucide React** + Custom local SVGs (loaded as raw assets)
- **Testing**: **Vitest** (jsdom environment)

## Development Setup

### 1. Install dependencies
```bash
pnpm install
```

### 2. Configure environment variables

Copy the example file and fill in your credentials:
```bash
cp .env.local.example .env.local
```

Then edit `.env.local` if you need optional values:
```
# Optional: set when deploying to a custom domain
# NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Optional: required only if using on-demand ISR cache revalidation
# REVALIDATE_SECRET=your_revalidate_secret_here
```

### 3. Run the development server
```bash
pnpm dev
```
This project uses a special script that automatically optimizes the development environment for your system:
- 💻 **On PC (Windows, macOS, Linux):** It launches using **Turbopack**, Next.js's high-speed engine, for the fastest possible development experience.
- 📱 **On Termux (Android):** It automatically switches to **Webpack** and disables the file system cache to prevent errors common in the Termux environment.

## Deployment

デプロイ先ごとの詳細な手順は以下のガイドを参照してください。

- 📄 **[Vercel へのデプロイ](./docs/Vercel_Deployment.md)**  
  Next.js との親和性が高く、最も手軽にデプロイできます。

- 📄 **[Cloudflare Workers へのデプロイ](./docs/CFPages_Deployment.md)**  
  帯域幅が無制限（フェアユースポリシーあり）で、画像やファイルダウンロードを多用するサイトに適しています。`@opennextjs/cloudflare` を使用します。

## Other Scripts

#### Testing
```bash
# Run tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

#### Building for Production
```bash
# Create an optimized production build
pnpm build

# Run the production server
pnpm start
```

#### Linting
```bash
pnpm lint
```

#### Cloudflare Workers
```bash
# Build for Cloudflare Workers
pnpm build:worker

# Build and deploy to Cloudflare Workers
pnpm deploy

# Build and preview locally with Wrangler
pnpm preview
```

#### Generating Directory Tree
To get an overview of the project structure, you can generate a `tree.txt` file.
```bash
pnpm tree
```
This command will create/update a file at `scripts/tree/tree.txt`, excluding large folders like `node_modules` and `.next`.

## Features

- 🔍 Search Modrinth mods with loader, version, category, and environment filters
- 📦 Browse by project type: mods, modpacks, resource packs, and shaders
- ♾️ Infinite scroll mod list
- ✅ Multi-mod selection with checkboxes
- 💾 Profile save/load/export (TXT) and import from mod ZIP
- 🔗 Dependency analysis (required/optional/conflict)
- 📥 Download selected mods as ZIP
- 🌙 Dark/Light theme toggle
- 🌐 Multi-language support (English / Japanese)
- ⭐ Favorites — bookmark mods for quick access
- 🕒 Search history with one-click re-search
- 📖 Mod detail page with full markdown description and gallery
- 🃏 Toggleable mod card descriptions
- 💾 Preferences and profiles stored in IndexedDB on this device
- 🐛 Floating debug console for easy mobile development
- 🚀 SSR + ISR — server-side rendering with incremental static regeneration for fast initial loads