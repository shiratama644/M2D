# M2D プロジェクト索引

**M2D (Modrinth Mod Manager)** — Modrinth から Minecraft の mod / modpack / resource pack / shader を検索・選択・依存関係解析・ZIP ダウンロードする Web アプリ。

- リポジトリ: `shiratama644/M2D`
- パッケージ名: `modrinth-mod-manager` (`package.json` version `0.0.0`)
- ライセンス: `LICENSE`
- パッケージマネージャ: **pnpm 11.4.0**
- 認証: **なし**（Discord / NextAuth / `/account` は削除済み）
- 永続化: **IndexedDB** (`m2d` / store `kv`)。旧 localStorage キーは一度だけ移行

---

## 1. 技術スタック

| 層 | 技術 |
|---|---|
| フレームワーク | Next.js 15 (App Router) + React 19 |
| 言語 | TypeScript 5.9 |
| スタイル | Tailwind CSS 4 + 分割 CSS (`src/styles/*`) |
| 状態 | Zustand (`useAppStore`) |
| 意図 / 取得 | Engine (`src/engine`) — Feature だけがストアへ書く |
| アニメーション | Framer Motion |
| UI primitives | Radix Dialog / Slot, CVA, clsx, tailwind-merge |
| Markdown | react-markdown + rehype-raw + remark-gfm |
| ダウンロード | JSZip + FileSaver |
| アイコン | FontAwesome, Lucide, ローカル SVG |
| テスト | Vitest + jsdom + Testing Library |
| デプロイ | Vercel / Cloudflare Workers (`@opennextjs/cloudflare` + Wrangler) |
| 分析 | `@vercel/speed-insights` |

---

## 2. ルート構成

```
M2D/
├── .env.local.example      # NEXT_PUBLIC_BASE_URL / REVALIDATE_SECRET（任意）
├── .github/workflows/ci.yml
├── docs/                   # デプロイ手順・Engine・ISSUES・本索引
├── public/                 # PWA manifest, SW, アプリアイコン
├── scripts/                # dev.mjs, generate_tree.sh
├── src/                    # アプリケーション本体
├── eslint.config.js
├── next.config.mjs
├── postcss.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── vercel.json
├── pnpm-workspace.yaml
└── package.json
```

### npm scripts

| コマンド | 内容 |
|---|---|
| `pnpm dev` | `scripts/dev.mjs` — PC は Turbopack、Termux/Android は Webpack + cache 無効 |
| `pnpm build` / `start` | Next 本番ビルド / 起動 |
| `pnpm test` / `test:watch` / `test:coverage` | Vitest |
| `pnpm lint` | `next lint` |
| `pnpm tree` | `scripts/generate_tree.sh` → `scripts/tree/tree.txt` |
| `pnpm build:worker` / `deploy` / `preview` | OpenNext Cloudflare |

### 環境変数

| 変数 | 用途 |
|---|---|
| `NEXT_PUBLIC_BASE_URL` | カスタムドメイン（任意、メタデータ） |
| `REVALIDATE_SECRET` | ISR オンデマンド再検証（任意） |
| `UPSTREAM_TIMEOUT_MS` | Modrinth プロキシのタイムアウト（既定 8000ms） |

### Next 設定要点 (`next.config.mjs`)

- SVG を文字列として読む（webpack `asset/source` / turbopack `raw-loader`）
- 画像ホスト: `cdn.modrinth.com`, `*.modrinth.com`
- セキュリティヘッダ: `X-Content-Type-Options`, `X-Frame-Options`, `Permissions-Policy`, HSTS

---

## 3. ルーティング（App Router）

| パス | ファイル | 役割 |
|---|---|---|
| `/` | `src/app/page.tsx` → `HomeClient.tsx` | ホーム。`/?mod=` で選択＋詳細。SSR 初期ヒット |
| `/mods/[id]` | `mods/[id]/page.tsx` + `ModPageClient.tsx` | プロジェクト詳細 + `generateMetadata` |
| `/api/v2/[...path]` | Modrinth v2 プロキシ + メモリキャッシュ + ETag |
| `/api/revalidate` | `POST` — ISR 再検証（シークレット必須） |
| グローバル | `layout.tsx`（`EngineProvider`）、`loading.tsx`, `error.tsx`, `not-found.tsx` |

ログインルートと NextAuth ハンドラは無い。

---

## 4. データフロー

```
Browser ──GET /api/v2/*──► Next Route (memCache / NodeCache)
                              │ miss
                              ▼
                     api.modrinth.com/v2
                              │
Server Components ──► getApiBase() === https://api.modrinth.com/v2 (直叩き)
Client ─────────────► getApiBase() === /api/v2 (同一オリジンプロキシ)
Client UI ──────────► engine.dispatch('catalog.*') ──► catalog Feature ──► API.*
```

`src/lib/api/modrinth.ts` (`API` として再 export)。**クライアントから `API.*` を直接呼ぶのは catalog Feature だけ。**

---

## 5. 状態管理と Engine

Zustand 単一ストア。SSR 安全な初期値 + クライアント `hydrate()`（async）で IndexedDB 復元。

書き込みは Feature 内の `useAppStore.getState()` のみ。画面は `useEngine().emit` / `dispatch`。

Feature 一覧は `src/engine/features/catalog.ts`。実装は `search`, `selection`, `download`, `dependency`, `profiles`, `favorites`, `settings`, `ui`, `catalogApi`, `diagnostics`。

永続キーは `src/lib/helpers.ts`。実体は `src/lib/persist.ts`（メモリ Map + IndexedDB、旧 LS を一度移行）。

---

## 6. 主要ユーザーフロー

1. **検索** — `search.commit` → catalog.search → `ModList` 無限スクロール。
2. **選択** — `selection.*`。Discover タイプごとに独立。
3. **依存解析** — `dependency.check`（HomeClient が bind）。
4. **ダウンロード** — `download.start`。ピンしたバージョンを優先。ZIP は Minecraft へ自動導入しない。
5. **お気に入り / 履歴** — 右パネル（PC）または SideMenu（モバイル）。
6. **プロファイル** — 選択 ID リストを保存 / TXT エクスポート / ZIP からハッシュ照合インポート。端末内 IndexedDB。
7. **詳細** — `/mods/[id]` またはホームの `/?mod=`。

---

## 7. ドキュメント

| パス | 内容 |
|---|---|
| `README.md` | セットアップ・機能 |
| `docs/ENGINE.md` | Engine の使い方 |
| `docs/ENGINE_MIGRATION_PLAN.md` | 移行計画（完了。auth は後で削除） |
| `docs/Vercel_Deployment.md` | Vercel |
| `docs/CFPages_Deployment.md` | Cloudflare Workers / OpenNext |
| `docs/ISSUES.md` | 既知課題（リポジトリ外の大きいギャップのみ） |
| `docs/PROJECT_INDEX.md` | 本ファイル |

---

*更新日: 2026-08-20。*
