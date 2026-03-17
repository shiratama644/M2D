# M2D - Modrinth Mod Manager

A powerful and fast tool to search, manage, and download Minecraft mods from Modrinth, rebuilt with Next.js 15 and Tailwind CSS 4.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) 15 (with **React 19**)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Package Manager**: **pnpm**
- **Downloading**: **JSZip** + **FileSaver.js**
- **Icons**: Custom local SVGs (loaded as raw assets)

## Development Setup

1.  **Install dependencies**
    ```bash
    pnpm install
    ```

2.  **Run the development server**
    ```bash
    pnpm dev
    ```
    This project uses a special script that automatically optimizes the development environment for your system:
    - 💻 **On PC (Windows, macOS, Linux):** It launches using **Turbopack**, Next.js's high-speed engine, for the fastest possible development experience.
    - 📱 **On Termux (Android):** It automatically switches to **Webpack** and disables the file system cache to prevent errors common in the Termux environment.

## Other Scripts

#### Building for Production
```bash
# Create an optimized production build
pnpm build

# Run the production server
pnpm start
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
- 🐛 Floating debug console for easy mobile development