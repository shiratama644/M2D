# Cloudflare Workers へのデプロイ手順

Cloudflare Workers は画像配信やファイルダウンロードを多用するサイトに適したホスティングサービスです。
無料プランでも帯域幅が **無制限**（フェアユースポリシーあり）であり、Vercel と比べて大量のアクセスに対応しやすい利点があります。

## 必要なもの

- GitHub アカウント（リポジトリをフォーク済み、または自分のリポジトリに push 済み）
- Cloudflare アカウント（無料）: [cloudflare.com](https://www.cloudflare.com/)
- Discord OAuth アプリの認証情報（手順は後述）

---

## Cloudflare Workers で Next.js を動かす仕組み

Cloudflare Workers では **[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)** アダプターを使って Next.js アプリを Cloudflare Workers 上で動かします。
このアダプターは Next.js の **Node.js ランタイムをネイティブにサポート**しており、各ルートに `export const runtime = 'edge'` を追加する必要はありません。

> **`@opennextjs/cloudflare` について**  
> Cloudflare が現在公式に推奨するアダプターです。旧来の `@cloudflare/next-on-pages` と異なり、Edge ランタイム宣言なしで Next.js の全機能（API Routes、Server Actions、Middleware 等）を利用できます。

---

## 手順 1 — 依存パッケージを追加する

ローカルで以下を実行してアダプターをインストールします。

```bash
pnpm add -D @opennextjs/cloudflare wrangler
```

---

## 手順 2 — wrangler.toml を作成する

プロジェクトルートに `wrangler.toml` を作成します。

```toml
name = "m2d"
main = ".open-next/worker.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat", "global_fetch_strictly_public"]

[assets]
directory = ".open-next/assets"
binding = "ASSETS"
```

> **互換性フラグについて**  
> `nodejs_compat`: Node.js 互換 API（`crypto`、`stream` 等）を Cloudflare Workers 上で利用するために必要です。  
> `global_fetch_strictly_public`: fetch API のセキュリティポリシーを強化するために推奨されます。

---

## 手順 3 — package.json にビルドスクリプトを追加する

`package.json` の `scripts` に以下を追加します。

```json
{
  "scripts": {
    "build:worker": "npx opennextjs-cloudflare build",
    "deploy": "npx opennextjs-cloudflare build && wrangler deploy",
    "preview": "npx opennextjs-cloudflare build && wrangler dev"
  }
}
```

---

## 手順 4 — Cloudflare Workers プロジェクトを作成する

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にサインイン。
2. 左メニューの **"Workers & Pages"** を開く。
3. **"Create"** → **"Workers"** → **"Create Worker"** を選択。
4. Worker の名前（例: `m2d`）を入力して **"Deploy"** をクリック。

---

## 手順 5 — 環境変数を設定する

**"Settings → Variables and Secrets"** セクションで以下の変数をすべて追加します。

| 変数名 | 値 | 備考 |
|---|---|---|
| `DISCORD_CLIENT_ID` | Discord アプリのクライアント ID | 手順 7 を参照 |
| `DISCORD_CLIENT_SECRET` | Discord アプリのクライアントシークレット | 手順 7 を参照 |
| `AUTH_SECRET` | ランダムな 32 バイトの base64 文字列 | `openssl rand -base64 32` で生成 |
| `AUTH_TRUST_HOST` | `true` | Cloudflare 経由で NextAuth が正常動作するために必須 |
| `NEXT_PUBLIC_BASE_URL` | `https://your-worker-name.your-account.workers.dev` | Workers が発行する URL（デプロイ後に確認可能） |
| `REVALIDATE_SECRET` | ランダムな 32 バイトの base64 文字列 | ISR のオンデマンド再検証を使う場合のみ必要 |

> **ヒント**: シークレットの生成コマンド:
> ```bash
> openssl rand -base64 32
> ```

または `wrangler.toml` の `[vars]` セクションに非シークレットな変数を記述し、シークレットは `wrangler secret put` コマンドで設定することもできます。

```toml
[vars]
AUTH_TRUST_HOST = "true"
NEXT_PUBLIC_BASE_URL = "https://your-worker-name.your-account.workers.dev"
```

```bash
wrangler secret put DISCORD_CLIENT_SECRET
wrangler secret put AUTH_SECRET
wrangler secret put REVALIDATE_SECRET
```

---

## 手順 6 — デプロイを実行する

以下のコマンドでビルドしてデプロイします。

```bash
pnpm deploy
```

または GitHub Actions などの CI/CD で自動デプロイする場合は、`wrangler.toml` と `CLOUDFLARE_API_TOKEN` シークレットを設定してください。

初回デプロイが完了すると、`https://your-worker-name.your-account.workers.dev` のような URL が発行されます。

---

## 手順 7 — Discord OAuth の設定

### Discord アプリケーションを作成する

1. [Discord Developer Portal](https://discord.com/developers/applications) を開いてログイン。
2. **"New Application"** をクリックし、名前（例: `M2D`）を入力して **"Create"**。

### クライアント ID とシークレットを取得する

1. 左サイドバーの **"OAuth2"** を開く。
2. **"Client information"** の **Client ID** をコピー → `DISCORD_CLIENT_ID` に設定。
3. **"Reset Secret"** をクリックして **Client Secret** をコピー → `DISCORD_CLIENT_SECRET` に設定。

### リダイレクト URI を追加する

1. **"OAuth2"** セクションの **"Redirects"** までスクロール。
2. **"Add Redirect"** をクリックして以下の URL を追加:
   ```
   https://your-worker-name.your-account.workers.dev/api/auth/callback/discord
   ```
   （`your-worker-name.your-account.workers.dev` はデプロイ後に発行された実際の URL に置き換えてください）
3. **"Save Changes"** をクリック。

### AUTH_SECRET を生成する

```bash
openssl rand -base64 32
```

出力された文字列を `AUTH_SECRET` に設定します。

---

## 手順 8 — カスタムドメインを設定する（任意）

1. Cloudflare Workers プロジェクトの **"Settings → Domains & Routes"** タブを開く。
2. **"Add"** をクリックしてカスタムドメインを入力。
3. Cloudflare でドメインを管理している場合は DNS が自動設定されます。外部レジストラの場合は表示された CNAME レコードを手動で設定してください。
4. `NEXT_PUBLIC_BASE_URL` をカスタムドメインの URL に更新。
5. Discord Developer Portal のリダイレクト URI にもカスタムドメインの URL を追加:
   ```
   https://your-domain.com/api/auth/callback/discord
   ```

---

## Cloudflare Workers 無料プランの主な特徴

| 項目 | 無料プラン |
|---|---|
| 帯域幅 | **無制限**（フェアユースポリシーあり） |
| リクエスト数 | 10 万リクエスト / 日 |
| CPU 時間 | 10ms / リクエスト |
| カスタムドメイン | 無制限 |

> 画像やModファイルのダウンロードを多用するサイトでは、帯域無制限の Cloudflare Workers が特に有利です。

---

## トラブルシューティング

### ビルドが失敗する

`@opennextjs/cloudflare` が正しくインストールされているか確認してください。

```bash
pnpm add -D @opennextjs/cloudflare wrangler
```

また、`wrangler.toml` の `main` と `[assets]` の設定が正しいか確認してください。

### ログインが `http://localhost:3000` にリダイレクトされる

`NEXT_PUBLIC_BASE_URL` が正しく設定されていない可能性があります。
環境変数を確認し、デプロイ済みの URL（例: `https://your-worker-name.your-account.workers.dev`）が設定されているか確認してください。

### デプロイ後に画像が表示されない

`next.config.mjs` の `images.remotePatterns` に必要なホスト名が含まれているか確認してください。
現在は `cdn.modrinth.com`、`*.modrinth.com`、`cdn.discordapp.com` が許可されています。

### `AUTH_TRUST_HOST` を設定していないのに認証が失敗する

Cloudflare Workers 経由でリクエストが転送されるため、NextAuth がホストを信頼するよう `AUTH_TRUST_HOST=true` を設定してください。
