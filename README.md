# M2D - Modrinth Mod Manager

A powerful and fast tool to search, manage, and download Minecraft mods from Modrinth, built with Next.js 15 and Tailwind CSS 4.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) 15 (with **React 19**)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Authentication**: [NextAuth.js v5](https://authjs.dev/) (Discord OAuth)
- **Package Manager**: **pnpm**
- **Downloading**: **JSZip** + **FileSaver.js**
- **Markdown Rendering**: **react-markdown** + **rehype-raw** + **remark-gfm**
- **Icons**: **FontAwesome** + Custom local SVGs (loaded as raw assets)

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

Then edit `.env.local`:
```
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
AUTH_SECRET=your_nextauth_secret_here

# Optional: set when deploying to a custom domain
# NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

See [**How to get Discord OAuth credentials**](#how-to-get-discord-oauth-credentials) below for step-by-step instructions.

### 3. Run the development server
```bash
pnpm dev
```
This project uses a special script that automatically optimizes the development environment for your system:
- 💻 **On PC (Windows, macOS, Linux):** It launches using **Turbopack**, Next.js's high-speed engine, for the fastest possible development experience.
- 📱 **On Termux (Android):** It automatically switches to **Webpack** and disables the file system cache to prevent errors common in the Termux environment.

## Deployment

### Vercel (recommended)

Vercel has first-class Next.js support and is the easiest way to deploy M2D for free.

#### 1. Import the repository

1. Go to [vercel.com](https://vercel.com/) and sign in (or sign up for a free account).
2. Click **"Add New… → Project"** and import your GitHub repository.
3. Vercel will automatically detect Next.js — no framework settings need to be changed.

#### 2. Configure environment variables

In the Vercel project settings, add the following **Environment Variables**:

| Variable | Value | Notes |
|---|---|---|
| `DISCORD_CLIENT_ID` | your Discord app client ID | |
| `DISCORD_CLIENT_SECRET` | your Discord app client secret | |
| `AUTH_SECRET` | random 32-byte base64 string | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` | required for Vercel |
| `NEXT_PUBLIC_BASE_URL` | `https://your-project.vercel.app` | your deployment URL |
| `REVALIDATE_SECRET` | random 32-byte base64 string | only if you use on-demand ISR |

#### 3. Update the Discord redirect URI

In the [Discord Developer Portal](https://discord.com/developers/applications), add the production redirect URI:
```
https://your-project.vercel.app/api/auth/callback/discord
```

#### 4. Deploy

Click **"Deploy"**. Subsequent pushes to the main branch will redeploy automatically.

---

### Cloudflare Pages (alternative)

Cloudflare Pages also supports Next.js through their build system.

#### 1. Create a new Pages project

1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages**.
2. Click **"Create application → Pages → Connect to Git"** and import your repository.

#### 2. Configure the build settings

| Setting | Value |
|---|---|
| **Framework preset** | Next.js |
| **Build command** | `pnpm build` |
| **Build output directory** | `.next` |
| **Node.js version** | `20` (or later) |

#### 3. Configure environment variables

Add the same variables as the Vercel table above, replacing the base URL with your Pages URL:
```
NEXT_PUBLIC_BASE_URL=https://your-project.pages.dev
```

#### 4. Update the Discord redirect URI

Add the production redirect URI in the Discord Developer Portal:
```
https://your-project.pages.dev/api/auth/callback/discord
```

---

## How to get Discord OAuth credentials

M2D uses Discord OAuth for user login. Follow these steps to obtain the required credentials:

### Step 1 — Create a Discord Application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and log in.
2. Click **"New Application"**, give it a name (e.g. `M2D`), and click **"Create"**.

### Step 2 — Get the Client ID and Client Secret

1. In your application's dashboard, open the **"OAuth2"** section from the left sidebar.
2. Under **"Client information"**, copy the **Client ID** → paste it as `DISCORD_CLIENT_ID` in `.env.local`.
3. Click **"Reset Secret"** (or **"Copy"** if already shown), copy the **Client Secret** → paste it as `DISCORD_CLIENT_SECRET` in `.env.local`.

### Step 3 — Add a Redirect URI

1. Still in the **"OAuth2"** section, scroll down to **"Redirects"**.
2. Click **"Add Redirect"** and enter the following URL:
   - **Development:** `http://localhost:3000/api/auth/callback/discord`
   - **Production:** `https://your-domain.com/api/auth/callback/discord`
3. Click **"Save Changes"**.

### Step 4 — Generate AUTH_SECRET

`AUTH_SECRET` is a random secret used to encrypt session tokens. Generate one with:
```bash
openssl rand -base64 32
```
Paste the output as `AUTH_SECRET` in `.env.local`.

## Other Scripts

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

#### Generating Directory Tree
To get an overview of the project structure, you can generate a `tree.txt` file.
```bash
pnpm tree
```
This command will create/update a file at `scripts/tree/tree.txt`, excluding large folders like `node_modules` and `.next`.

## Features

- 🔍 Search Modrinth mods with loader & version filters
- ♾️ Infinite scroll mod list
- ✅ Multi-mod selection with checkboxes
- 💾 Profile save/load/export (TXT) and import from mod ZIP
- 🔗 Dependency analysis (required/optional/conflict)
- 📦 Download selected mods as ZIP
- 🌙 Dark/Light theme toggle
- 🌐 Multi-language support (English / Japanese)
- ⭐ Favorites — bookmark mods for quick access
- 🕒 Search history with one-click re-search
- 📖 Mod detail page with full markdown description and gallery
- 🔐 Discord login via OAuth (NextAuth v5) — sync preferences across devices
- 🐛 Floating debug console for easy mobile development
- 🚀 SSR + ISR — server-side rendering with incremental static regeneration for fast initial loads