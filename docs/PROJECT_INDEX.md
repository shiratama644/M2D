# M2D プロジェクト索引

**M2D (Modrinth Mod Manager)** — Modrinth から Minecraft の mod / modpack / resource pack / shader を検索・選択・依存関係解析・ZIP ダウンロードする Web アプリ。

- リポジトリ: `shiratama644/M2D`
- パッケージ名: `modrinth-mod-manager` (`package.json` version `0.0.0`)
- ライセンス: `LICENSE`
- パッケージマネージャ: **pnpm 11.4.0**
- ソースファイル（`.ts`/`.tsx`/`.css`）: `src/` 配下約 100 本 + テスト 9 本（約 2,289 行）
- アセット: `src/assets/icons/` に SVG 多数（UI / カテゴリ / ローダー）

---

## 1. 技術スタック

| 層 | 技術 |
|---|---|
| フレームワーク | Next.js 15 (App Router) + React 19 |
| 言語 | TypeScript 5.9 |
| スタイル | Tailwind CSS 4 + 分割 CSS (`src/styles/*`) |
| 状態 | Zustand (`useAppStore`) |
| 認証 | NextAuth.js v5 (Discord OAuth) |
| アニメーション | Framer Motion |
| UI primitives | Radix Dialog / Slot, CVA, clsx, tailwind-merge |
| Markdown | react-markdown + rehype-raw + remark-gfm |
| ダウンロード | JSZip + FileSaver |
| アイコン | FontAwesome, Lucide, ローカル SVG (`asset/source` / raw-loader) |
| テスト | Vitest + jsdom + Testing Library |
| デプロイ | Vercel / Cloudflare Workers (`@opennextjs/cloudflare` + Wrangler) |
| 分析 | `@vercel/speed-insights` |

---

## 2. ルート構成

```
M2D/
├── .env.local.example      # Discord / AUTH_SECRET / REVALIDATE_SECRET
├── .github/workflows/ci.yml
├── docs/                   # デプロイ手順・スクリーンショット・本索引
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
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | OAuth |
| `AUTH_SECRET` | セッショントークン暗号化 |
| `AUTH_TRUST_HOST` | リバースプロキシ配下 |
| `NEXT_PUBLIC_BASE_URL` | カスタムドメイン（任意） |
| `REVALIDATE_SECRET` | ISR オンデマンド再検証（任意） |
| `UPSTREAM_TIMEOUT_MS` | Modrinth プロキシのタイムアウト（既定 8000ms） |

### Next 設定要点 (`next.config.mjs`)

- SVG を文字列として読む（webpack `asset/source` / turbopack `raw-loader`）
- 画像ホスト: `cdn.modrinth.com`, `*.modrinth.com`, `cdn.discordapp.com`
- セキュリティヘッダ: `X-Content-Type-Options`, `X-Frame-Options`, `Permissions-Policy`, HSTS

---

## 3. ルーティング（App Router）

| パス | ファイル | 役割 |
|---|---|---|
| `/` | `src/app/page.tsx` → `HomeClient.tsx` | ホーム。SSR で初期検索ヒットを渡しクライアント水和 |
| `/mods/[id]` | `mods/[id]/page.tsx` + `ModPageClient.tsx` | プロジェクト詳細 + `generateMetadata` |
| `/account` | `account/page.tsx` + `AccountClient.tsx` | Discord セッション表示 |
| `/api/auth/[...nextauth]` | NextAuth handlers (`GET`/`POST`) |
| `/api/v2/[...path]` | Modrinth v2 プロキシ + メモリキャッシュ + ETag |
| `/api/revalidate` | `POST` — ISR 再検証（シークレット必須） |
| グローバル | `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` |

ルートレイアウト: メタデータ、`SessionProvider`、PWA SW 登録、グローバル CSS。

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
```

`src/lib/api/client.ts`

- `API_BASE`, `getApiBase()`, `ApiError`, `request()`
- クエリ組み立て、4xx 即失敗、429/5xx/ネットワークは指数バックオフ最大 3 リトライ

`src/lib/api/modrinth.ts` (`API` として再 export)

| メソッド | Modrinth エンドポイント |
|---|---|
| `getProject` | `/project/:id` |
| `searchMods` | `/search` |
| `getProjects` | `/projects` |
| `getVersions` | `/project/:id/version` |
| `getVersionsBulk` | `/versions` |
| `getVersionFile` | `/version_file/:sha1`（404 → null） |
| `getGameVersions` | `/tag/game_version` |
| `getCategories` | `/tag/category` |

プロキシ TTL (`api/v2/[...path]/route.ts`)

| パス | TTL |
|---|---|
| `tag/*` | 3600s |
| `project/*`（バージョン以外） | 600s |
| `project/*/version`, `versions`, `version_file/*` | 300s |
| `search` | 60s |
| その他 | 120s |

User-Agent: `M2D/1.0 (https://github.com/shiratama644/M2D)`  
CORS: Origin が Host と一致する場合のみ許可。

---

## 5. 状態管理 (`src/store/useAppStore.ts`)

Zustand 単一ストア。SSR 安全な初期値 + クライアント `hydrate()` で localStorage 復元。

**永続設定:** theme, debug, fastSearch, showCardDescription, advancedConsole, language, loader, version, discoverType, profiles, favorites, searchHistory, contextHistory

**UI:** メニュー / 各モーダル開閉、`activeModId`、カスタム dialog（alert/confirm Promise）、ローディング + 進捗

**選択:** `selectedMods` は `discoverType` ごとに `selectedModsByType` へ分離

**コンテキスト履歴:** 検索クエリ・ソート・フィルタ・プロジェクトタイプの不変スナップショット（重複抑制・最大 50）

エイリアス: `src/context/AppContext.tsx` が `useApp` / `useAppStore` / `AppProvider` を再 export。

### localStorage キー (`src/lib/helpers.ts`)

`mod_profiles`, `mod_manager_debug`, `mod_manager_theme`, `mod_manager_fast_search`, `mod_manager_language`, `mod_manager_loader`, `mod_manager_version`, `mod_manager_favorites`, `mod_manager_search_history`, `mod_manager_show_card_description`, `mod_manager_advanced_console`, `mod_manager_discover_type`, `mod_manager_context_history`

ラッパ: `src/lib/localStorage.ts` の `ls.get/set/remove`

---

## 6. ライブラリ / ドメインロジック

| ファイル | 内容 |
|---|---|
| `lib/helpers.ts` | `asyncPool`, `formatNum`, ローダー/カテゴリ/環境オプション、フィルタ件数、履歴時刻、定数 |
| `lib/facets.ts` | `buildFacets(filters, projectType)` — Modrinth facet 配列 |
| `lib/versionSelection.ts` | `pickPreferredModVersion` |
| `lib/discoverOptions.ts` | Discover タブ（mod/modpack/resourcepack/shader） |
| `lib/categoryIcons.ts` | カテゴリ名 → SVG パス |
| `lib/translate.ts` | 本文チャンク翻訳 |
| `lib/utils.ts` | `cn()` (clsx + tailwind-merge) |
| `i18n/translations.ts` | `en` / `ja` 辞書、`Translation` 型 |

### 型 (`src/types/modrinth.ts`)

`ModProject`, `ModHit`, `GameVersion`, `ModCategory`, `ModVersion`

`src/types/svg.d.ts` — SVG を string モジュールとして宣言。

---

## 7. Hooks

| Hook | 役割 |
|---|---|
| `useCategories` / `useCategoryGroups` | プロジェクトタイプ別カテゴリ |
| `useGameVersions` | MC バージョン一覧 |
| `useDependencyCheck` | 必須/任意/競合の依存解析（`SearchParams`, `DepIssues`） |
| `useModDownload` | 選択 mod を ZIP 化して保存 |
| `useColumnResize` | 3 カラム幅リサイズ |
| `useIsDesktop` | デスクトップ判定 |
| `useLocalStorage` | 汎用永続 state |
| `useScrollLock` | モーダル時スクロールロック（`__resetScrollLock` はテスト用） |

---

## 8. UI コンポーネント

### レイアウト / 検索 / パネル

| コンポーネント | 役割 |
|---|---|
| `layout/Header` | ヘッダ |
| `layout/SideMenu` | モバイルサイドメニュー |
| `search/SearchSection` | 検索入力・ソート |
| `search/ActionBar` | 依存チェック / ダウンロード |
| `panels/LeftPanel` | フィルタ |
| `panels/RightPanel` | 選択・お気に入り・履歴タブ |
| `panels/SelectedTab` / `FavoritesTab` / `HistoryTab` | 右パネル各タブ |
| `settings/SettingsContent` | テーマ・言語・ローダー等 |
| `debug/DebugPanel` | フローティングデバッグコンソール |
| `pwa/ServiceWorkerRegistration` | `public/sw.js` 登録 |
| `auth/SessionProvider` | NextAuth SessionProvider |

### Mods

| コンポーネント | 役割 |
|---|---|
| `ModList` | 無限スクロール一覧 |
| `ModCard` / `SkeletonCard` | カード / スケルトン |
| `ModDetail` | 詳細（Markdown・ギャラリー） |

### モーダル

`FilterModal`, `SettingsModal`, `DependencyModal`, `SelectedModal`, `FavoritesModal`, `HistoryModal`

### UI primitives

`Button`, `dialog` (Radix), `CustomDialog`, `CustomSelect`, `ToggleSwitch`, `FilterRow`, `Icon`, `LoadingOverlay`, `MobileModal`, `CollapsibleSection`, `ErrorBoundary`

---

## 9. 認証

`src/auth.ts` — NextAuth Discord プロバイダ。`handlers`, `auth`, `signIn`, `signOut` を export。  
ルート: `src/app/api/auth/[...nextauth]/route.ts`

---

## 10. スタイル

| ファイル | 対象 |
|---|---|
| `app/globals.css`, `src/index.css` | エントリ |
| `styles/variables.css` | CSS 変数（テーマ） |
| `styles/base.css` | ベース |
| `styles/layout.css` | 3 カラム / ヘッダ |
| `styles/cards.css` | Mod カード |
| `styles/panels.css` | 左右パネル |
| `styles/modals.css` | モーダル |
| `styles/filters.css` / `forms.css` | フィルタ・フォーム |
| `styles/settings.css` / `account.css` | 設定・アカウント |
| `styles/animations.css` | アニメーション |
| `styles/debug.css` | デバッグパネル |

---

## 11. テスト (`src/__tests__/`)

| ファイル | 対象 |
|---|---|
| `api-client.test.ts` | `getApiBase`, `ApiError`, `request` リトライ |
| `modrinth.test.ts` | API ラッパ |
| `proxy-route.test.ts` | `/api/v2` プロキシ |
| `revalidate-route.test.ts` | ISR revalidate |
| `facets.test.ts` | facet 組み立て |
| `helpers.test.ts` | helpers 一式 |
| `utils.test.ts` | `cn` |
| `versionSelection.test.ts` | バージョン選択 |
| `useAppStore.test.ts` | Zustand ストア |

CI: `.github/workflows/ci.yml` — push/PR で Node 22 + `pnpm test:coverage`

---

## 12. 公開アセット / PWA

- `public/manifest.json`, `public/sw.js`
- `public/icons/` — favicon, Windows Store サイズ、Apple iconset
- `src/assets/icons/` — UI SVG
- `src/assets/icons/tags/categories/` — カテゴリアイコン
- `src/assets/icons/tags/loaders/` — Fabric / Forge / NeoForge / Quilt 等

---

## 13. 主要ユーザーフロー

1. **検索** — `SearchSection` → `buildFacets` → `API.searchMods` → `ModList` 無限スクロール。`addContextHistory` でスナップショット保存。
2. **選択** — `toggleMod`。Discover タイプごとに独立。
3. **依存解析** — `useDependencyCheck` → `DependencyModal`（required / optional / incompatible）。
4. **ダウンロード** — `useModDownload` がバージョン解決 → ファイル取得 → JSZip → FileSaver。
5. **お気に入り / 履歴** — 右パネルまたはモーダル。履歴クリックでコンテキスト復元。
6. **プロファイル** — 選択 ID リストを保存 / TXT エクスポート / ZIP からハッシュ照合インポート。
7. **詳細ページ** — `/mods/[id]` SSR + Markdown body。
8. **アカウント** — Discord ログイン（設定同期はストア + localStorage が中心）。

---

## 14. ドキュメント

| パス | 内容 |
|---|---|
| `README.md` | セットアップ・機能・OAuth 手順 |
| `docs/Vercel_Deployment.md` | Vercel |
| `docs/CFPages_Deployment.md` | Cloudflare Workers / OpenNext |
| `docs/ISSUES.md` | 既知課題 |
| `docs/PROJECT_INDEX.md` | 本ファイル |

---

*生成日: 2026-08-19。ソースツリーと export 一覧から作成。*
