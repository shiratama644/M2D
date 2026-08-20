# Cloudflare Workers へのデプロイ手順

Cloudflare Workers は画像配信やファイルダウンロードを多用するサイトに適したホスティングサービスです。
無料プランでも帯域幅が **無制限**（フェアユースポリシーあり）であり、Vercel と比べて大量のアクセスに対応しやすい利点があります。

ログイン機能はありません。設定・プロファイルは各ブラウザの IndexedDB に保存されます。

## 必要なもの

- GitHub アカウント（リポジトリをフォーク済み、または自分のリポジトリに push 済み）
- Cloudflare アカウント（無料）: [cloudflare.com](https://www.cloudflare.com/)

---

## Cloudflare Workers で Next.js を動かす仕組み

Cloudflare Workers では **[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)** アダプターを使って Next.js アプリを Cloudflare Workers 上で動かします。
このアダプターは Next.js の **Node.js ランタイムをネイティブにサポート**しており、各ルートに `export const runtime = 'edge'` を追加する必要はありません。

> **`@opennextjs/cloudflare` について**  
> Cloudflare が現在公式に推奨するアダプターです。旧来の `@cloudflare/next-on-pages` と異なり、Edge ランタイム宣言なしで Next.js の全機能（API Routes、Server Actions、Middleware 等）を利用できます。

---

## 手順 1 — 依存パッケージを追加する

ローカルで以下を実行してアダプターをインストールします（このリポジトリではすでに入っています）。

```bash
pnpm add -D @opennextjs/cloudflare wrangler
```

---

## 手順 2 — wrangler.toml を作成する

プロジェクトルートに `wrangler.toml` があります。内容の例:

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

`package.json` の `scripts` に以下があります。

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

## 手順 5 — 環境変数を設定する（任意）

**"Settings → Variables and Secrets"** セクションで必要なら以下を追加します。

| 変数名 | 値 | 備考 |
|---|---|---|
| `NEXT_PUBLIC_BASE_URL` | `https://your-worker-name.your-account.workers.dev` | メタデータ / OGP の絶対 URL |
| `REVALIDATE_SECRET` | ランダムな 32 バイトの base64 文字列 | ISR のオンデマンド再検証を使う場合のみ |

> **ヒント**: シークレットの生成コマンド:
> ```bash
> openssl rand -base64 32
> ```

または `wrangler.toml` の `[vars]` セクションに非シークレットな変数を記述し、シークレットは `wrangler secret put` で設定できます。

```toml
[vars]
NEXT_PUBLIC_BASE_URL = "https://your-worker-name.your-account.workers.dev"
```

```bash
wrangler secret put REVALIDATE_SECRET
```

---

## 手順 6 — デプロイを実行する

```bash
pnpm deploy
```

または GitHub Actions などの CI/CD で自動デプロイする場合は、`wrangler.toml` と `CLOUDFLARE_API_TOKEN` シークレットを設定してください。

初回デプロイが完了すると、`https://your-worker-name.your-account.workers.dev` のような URL が発行されます。

---

## 手順 7 — カスタムドメインを設定する（任意）

1. Cloudflare Workers プロジェクトの **"Settings → Domains & Routes"** タブを開く。
2. **"Add"** をクリックしてカスタムドメインを入力。
3. Cloudflare でドメインを管理している場合は DNS が自動設定されます。外部レジストラの場合は表示された CNAME レコードを手動で設定してください。
4. `NEXT_PUBLIC_BASE_URL` をカスタムドメインの URL に更新。

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

### OGP の URL が localhost になる

`NEXT_PUBLIC_BASE_URL` が正しく設定されていない可能性があります。
環境変数を確認し、デプロイ済みの URL（例: `https://your-worker-name.your-account.workers.dev`）が設定されているか確認してください。

### デプロイ後に画像が表示されない

`next.config.mjs` の `images.remotePatterns` に必要なホスト名が含まれているか確認してください。
現在は `cdn.modrinth.com` と `*.modrinth.com` が許可されています。
