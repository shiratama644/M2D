# Vercel へのデプロイ手順

Vercel は Next.js の開発元が運営するホスティングサービスで、Next.js プロジェクトを最も簡単にデプロイできます。
無料の Hobby プランで M2D を公開することができます。

## 必要なもの

- GitHub アカウント（リポジトリをフォーク済み、または自分のリポジトリに push 済み）
- Vercel アカウント（無料）: [vercel.com](https://vercel.com/)
- Discord OAuth アプリの認証情報（手順は後述）

---

## 手順 1 — Vercel にリポジトリをインポートする

1. [vercel.com](https://vercel.com/) にアクセスしてサインイン（または無料アカウントを作成）。
2. ダッシュボードで **"Add New… → Project"** をクリック。
3. **"Import Git Repository"** から自分の M2D リポジトリを選択して **"Import"** をクリック。
4. Framework は **Next.js** が自動検出されます。変更不要です。
5. **"Deploy"** を押す前に環境変数を設定してください（手順 2 を先に行ってください）。

---

## 手順 2 — 環境変数を設定する

プロジェクト設定画面の **"Environment Variables"** セクションで、以下の変数をすべて追加します。

| 変数名 | 値 | 備考 |
|---|---|---|
| `DISCORD_CLIENT_ID` | Discord アプリのクライアント ID | 手順 4 を参照 |
| `DISCORD_CLIENT_SECRET` | Discord アプリのクライアントシークレット | 手順 4 を参照 |
| `AUTH_SECRET` | ランダムな 32 バイトの base64 文字列 | `openssl rand -base64 32` で生成 |
| `AUTH_TRUST_HOST` | `true` | Vercel のロードバランサー背後で NextAuth が正常動作するために必須 |
| `NEXT_PUBLIC_BASE_URL` | `https://your-project.vercel.app` | Vercel が発行する URL（デプロイ後に確認可能） |
| `REVALIDATE_SECRET` | ランダムな 32 バイトの base64 文字列 | ISR のオンデマンド再検証を使う場合のみ必要 |

> **ヒント**: `AUTH_SECRET` と `REVALIDATE_SECRET` の生成コマンド:
> ```bash
> openssl rand -base64 32
> ```

---

## 手順 3 — デプロイを実行する

環境変数を設定したら **"Deploy"** ボタンをクリックします。
初回デプロイが完了すると、`https://your-project.vercel.app` のような URL が発行されます。

以降は main ブランチに push するたびに自動的に再デプロイされます。

---

## 手順 4 — Discord OAuth の設定

### Discord アプリケーションを作成する

1. [Discord Developer Portal](https://discord.com/developers/applications) を開いてログイン。
2. **"New Application"** をクリックし、名前（例: `M2D`）を入力して **"Create"**。

### クライアント ID とシークレットを取得する

1. 左サイドバーの **"OAuth2"** を開く。
2. **"Client information"** の **Client ID** をコピー → Vercel の `DISCORD_CLIENT_ID` に設定。
3. **"Reset Secret"** をクリックして **Client Secret** をコピー → Vercel の `DISCORD_CLIENT_SECRET` に設定。

### リダイレクト URI を追加する

1. **"OAuth2"** セクションの **"Redirects"** までスクロール。
2. **"Add Redirect"** をクリックして以下の URL を追加:
   ```
   https://your-project.vercel.app/api/auth/callback/discord
   ```
   （`your-project` はデプロイ後に発行された実際のサブドメインに置き換えてください）
3. **"Save Changes"** をクリック。

### AUTH_SECRET を生成する

```bash
openssl rand -base64 32
```

出力された文字列を Vercel の `AUTH_SECRET` に設定します。

---

## 手順 5 — カスタムドメインを設定する（任意）

1. Vercel プロジェクトの **"Settings → Domains"** を開く。
2. 取得済みのドメインを入力して **"Add"**。
3. 表示された DNS レコードをドメインのレジストラに設定。
4. `NEXT_PUBLIC_BASE_URL` をカスタムドメインの URL に更新。
5. Discord Developer Portal のリダイレクト URI にもカスタムドメインの URL を追加:
   ```
   https://your-domain.com/api/auth/callback/discord
   ```

---

## Vercel 無料プランの主な制限

| 項目 | 無料プラン (Hobby) |
|---|---|
| 帯域幅 | 100 GB / 月 |
| サーバーレス関数の実行時間 | 最大 10 秒（デフォルト）、最大 60 秒まで設定可能 |
| ビルド実行時間 | 45 分 / ビルド |
| チームメンバー | 1 人（個人のみ） |

> 画像の最適化やダウンロード処理を多用する場合は帯域幅の上限に注意してください。  
> サーバーレス関数の実行時間を延長したい場合は、対象のルートファイルに `export const maxDuration = 60;` を追加することで最大 60 秒まで設定できます。  
> より多くのトラフィックや帯域幅が必要な場合は [Cloudflare Pages](./CFPages_Deployment.md) の利用も検討してください。

---

## トラブルシューティング

### ログインが `http://localhost:3000` にリダイレクトされる

`NEXT_PUBLIC_BASE_URL` が正しく設定されていない可能性があります。
Vercel の環境変数を確認し、デプロイ済みの URL（`https://your-project.vercel.app`）が設定されているか確認してください。

### AUTH_TRUST_HOST が必要な理由

Vercel は内部でリクエストをプロキシするため、NextAuth がホスト名を信頼するよう明示的に指示する必要があります。
`vercel.json` にデフォルト値として設定済みですが、Vercel の環境変数でも明示的に `true` に設定することを推奨します。

### デプロイが失敗する

ビルドログを確認してください。多くの場合、環境変数の設定漏れが原因です。
特に `DISCORD_CLIENT_ID`、`DISCORD_CLIENT_SECRET`、`AUTH_SECRET` の 3 つが必須です。
