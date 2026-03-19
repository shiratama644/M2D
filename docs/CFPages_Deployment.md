# Cloudflare Pages へのデプロイ手順

Cloudflare Pages は画像配信やファイルダウンロードを多用するサイトに適したホスティングサービスです。
無料プランでも帯域幅が **無制限**（フェアユースポリシーあり）であり、Vercel と比べて大量のアクセスに対応しやすい利点があります。

## 必要なもの

- GitHub アカウント（リポジトリをフォーク済み、または自分のリポジトリに push 済み）
- Cloudflare アカウント（無料）: [cloudflare.com](https://www.cloudflare.com/)
- Discord OAuth アプリの認証情報（手順は後述）

---

## Cloudflare Pages で Next.js を動かす仕組み

Cloudflare Pages では **`@cloudflare/next-on-pages`** アダプターを使って Next.js アプリを Cloudflare の Workers エッジランタイム上で動かします。
このリポジトリに含まれる `wrangler.toml` および `next.config.mjs` は Cloudflare Pages 向けに設定済みです。

> ⚠️ **非推奨のお知らせ**: `@cloudflare/next-on-pages` は Cloudflare により **非推奨（deprecated）** となりました。  
> 現在 Cloudflare が公式に推奨するアダプターは **[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)** です。  
> OpenNext アダプターは Next.js の **Node.js ランタイム**を Cloudflare Workers 上でネイティブにサポートしており、Edge ランタイムへの制限が不要になります。  
> 新規プロジェクトでは `@opennextjs/cloudflare` の使用を強く推奨します。本ガイドは既存ユーザー向けに `@cloudflare/next-on-pages` の手順を記載していますが、将来的には OpenNext ベースのガイドに移行予定です。

---

## 手順 1 — 依存パッケージを追加する

ローカルで以下を実行してアダプターをインストールします。

```bash
pnpm add -D @cloudflare/next-on-pages wrangler
```

---

## 手順 2 — wrangler.toml を作成する

プロジェクトルートに `wrangler.toml` を作成します。

```toml
name = "m2d"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"
```

> **`nodejs_compat` フラグについて**  
> このプロジェクトの `/api/revalidate` エンドポイントは Node.js の `crypto` モジュール（`timingSafeEqual`）を使用しています。  
> `nodejs_compat` フラグを有効にすることで、Cloudflare Workers 上でも Node.js 互換の API が利用できます。

---

## 手順 3 — 各ルートにエッジランタイムを宣言する

`next.config.mjs` への `experimental.runtime` オプションは Next.js v13.3 以降で削除されました。代わりに、**各ルートファイルに個別に**エッジランタイムを宣言してください。

`@cloudflare/next-on-pages` を使う場合、`runtime = 'nodejs'` のルートはサポートされていません。Edge ランタイムで動作させる必要があるすべてのルートファイル（`app/layout.tsx`、`app/api/.../route.ts` など）の先頭に以下を追加します。

```ts
export const runtime = 'edge';
```

> **注意**: `@cloudflare/next-on-pages` は Node.js ランタイム（`runtime = 'nodejs'`）のルートを**サポートしていません**。  
> `nodejs_compat` フラグにより Node.js 標準ライブラリは利用できますが、ランタイム宣言は `'edge'` にしてください。

---

## 手順 4 — package.json にビルドスクリプトを追加する

`package.json` の `scripts` に以下を追加します。

```json
{
  "scripts": {
    "pages:build": "npx @cloudflare/next-on-pages",
    "preview": "pnpm pages:build && wrangler pages dev"
  }
}
```

---

## 手順 5 — Cloudflare Pages プロジェクトを作成する

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にサインイン。
2. 左メニューの **"Workers & Pages"** を開く。
3. **"Create application"** → **"Pages"** → **"Connect to Git"** を選択。
4. GitHub アカウントと連携して M2D リポジトリを選択し **"Begin setup"** をクリック。

---

## 手順 6 — ビルド設定を構成する

| 設定項目 | 値 |
|---|---|
| **Framework preset** | `Next.js` |
| **Build command** | `npm run pages:build` |
| **Build output directory** | `.vercel/output/static` |
| **Node.js version** | `20` 以上 |

---

## 手順 7 — 環境変数を設定する

**"Environment variables (advanced)"** セクションで以下の変数をすべて追加します。
**"Production"** と **"Preview"** の両方の環境に設定することを推奨します。

| 変数名 | 値 | 備考 |
|---|---|---|
| `DISCORD_CLIENT_ID` | Discord アプリのクライアント ID | 手順 9 を参照 |
| `DISCORD_CLIENT_SECRET` | Discord アプリのクライアントシークレット | 手順 9 を参照 |
| `AUTH_SECRET` | ランダムな 32 バイトの base64 文字列 | `openssl rand -base64 32` で生成 |
| `AUTH_TRUST_HOST` | `true` | Cloudflare のエッジ経由で NextAuth が正常動作するために必須 |
| `NEXT_PUBLIC_BASE_URL` | `https://your-project.pages.dev` | Pages が発行する URL（デプロイ後に確認可能） |
| `REVALIDATE_SECRET` | ランダムな 32 バイトの base64 文字列 | ISR のオンデマンド再検証を使う場合のみ必要 |

> **ヒント**: シークレットの生成コマンド:
> ```bash
> openssl rand -base64 32
> ```

---

## 手順 8 — デプロイを実行する

**"Save and Deploy"** をクリックします。
初回デプロイが完了すると、`https://your-project.pages.dev` のような URL が発行されます。

以降は main ブランチに push するたびに自動的に再デプロイされます。

---

## 手順 9 — Discord OAuth の設定

### Discord アプリケーションを作成する

1. [Discord Developer Portal](https://discord.com/developers/applications) を開いてログイン。
2. **"New Application"** をクリックし、名前（例: `M2D`）を入力して **"Create"**。

### クライアント ID とシークレットを取得する

1. 左サイドバーの **"OAuth2"** を開く。
2. **"Client information"** の **Client ID** をコピー → Cloudflare Pages の `DISCORD_CLIENT_ID` に設定。
3. **"Reset Secret"** をクリックして **Client Secret** をコピー → Cloudflare Pages の `DISCORD_CLIENT_SECRET` に設定。

### リダイレクト URI を追加する

1. **"OAuth2"** セクションの **"Redirects"** までスクロール。
2. **"Add Redirect"** をクリックして以下の URL を追加:
   ```
   https://your-project.pages.dev/api/auth/callback/discord
   ```
   （`your-project` はデプロイ後に発行された実際のサブドメインに置き換えてください）
3. **"Save Changes"** をクリック。

### AUTH_SECRET を生成する

```bash
openssl rand -base64 32
```

出力された文字列を Cloudflare Pages の `AUTH_SECRET` に設定します。

---

## 手順 10 — カスタムドメインを設定する（任意）

1. Cloudflare Pages プロジェクトの **"Custom domains"** タブを開く。
2. **"Set up a custom domain"** をクリックしてドメインを入力。
3. Cloudflare でドメインを管理している場合は DNS が自動設定されます。外部レジストラの場合は表示された CNAME レコードを手動で設定してください。
4. `NEXT_PUBLIC_BASE_URL` をカスタムドメインの URL に更新。
5. Discord Developer Portal のリダイレクト URI にもカスタムドメインの URL を追加:
   ```
   https://your-domain.com/api/auth/callback/discord
   ```

---

## Cloudflare Pages 無料プランの主な特徴

| 項目 | 無料プラン |
|---|---|
| 帯域幅 | **無制限**（フェアユースポリシーあり） |
| リクエスト数 | Workers: 10 万リクエスト / 日 |
| ビルド数 | 500 ビルド / 月 |
| 同時ビルド | 1 |
| カスタムドメイン | 無制限 |

> 画像やModファイルのダウンロードを多用するサイトでは、帯域無制限の Cloudflare Pages が特に有利です。

---

## トラブルシューティング

### ビルドが `next-on-pages` のエラーで失敗する

`@cloudflare/next-on-pages` は Node.js ランタイム（`runtime = 'nodejs'`）のルートをサポートしていません。
各 API ルートファイル（`route.ts`）に以下の行が含まれているか確認してください。

```ts
export const runtime = 'edge';
```

### `timingSafeEqual` がエラーになる

`wrangler.toml` の `compatibility_flags` に `"nodejs_compat"` が設定されているか確認してください。
また、Cloudflare Pages ダッシュボードの **"Settings → Functions → Compatibility flags"** でも同じフラグが有効になっているか確認してください。

### ログインが `http://localhost:3000` にリダイレクトされる

`NEXT_PUBLIC_BASE_URL` が正しく設定されていない可能性があります。
Cloudflare Pages の環境変数を確認し、デプロイ済みの URL（`https://your-project.pages.dev`）が設定されているか確認してください。

### デプロイ後に画像が表示されない

`next.config.mjs` の `images.remotePatterns` に必要なホスト名が含まれているか確認してください。
現在は `cdn.modrinth.com`、`*.modrinth.com`、`cdn.discordapp.com` が許可されています。
