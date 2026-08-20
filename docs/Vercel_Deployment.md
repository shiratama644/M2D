# Vercel へのデプロイ手順

Vercel は Next.js の開発元が運営するホスティングサービスで、Next.js プロジェクトを最も簡単にデプロイできます。
無料の Hobby プランで M2D を公開することができます。

ログイン機能はありません。設定・プロファイルは各ブラウザの IndexedDB に保存されます。

## 必要なもの

- GitHub アカウント（リポジトリをフォーク済み、または自分のリポジトリに push 済み）
- Vercel アカウント（無料）: [vercel.com](https://vercel.com/)

---

## 手順 1 — Vercel にリポジトリをインポートする

1. [vercel.com](https://vercel.com/) にアクセスしてサインイン（または無料アカウントを作成）。
2. ダッシュボードで **"Add New… → Project"** をクリック。
3. **"Import Git Repository"** から自分の M2D リポジトリを選択して **"Import"** をクリック。
4. Framework は **Next.js** が自動検出されます。変更不要です。
5. 必要なら手順 2 の環境変数を入れてから **"Deploy"** を押します。必須の秘密はありません。

---

## 手順 2 — 環境変数を設定する（任意）

プロジェクト設定画面の **"Environment Variables"** セクションで、必要なら次を追加します。

| 変数名 | 値 | 備考 |
|---|---|---|
| `NEXT_PUBLIC_BASE_URL` | `https://your-project.vercel.app` | メタデータ / OGP の絶対 URL。デプロイ後の公開 URL |
| `REVALIDATE_SECRET` | ランダムな 32 バイトの base64 文字列 | ISR のオンデマンド再検証（`/api/revalidate`）を使う場合のみ |

> **ヒント**: `REVALIDATE_SECRET` の生成コマンド:
> ```bash
> openssl rand -base64 32
> ```

---

## 手順 3 — デプロイを実行する

**"Deploy"** ボタンをクリックします。
初回デプロイが完了すると、`https://your-project.vercel.app` のような URL が発行されます。

以降は main ブランチに push するたびに自動的に再デプロイされます。

---

## 手順 4 — カスタムドメインを設定する（任意）

1. Vercel プロジェクトの **"Settings → Domains"** を開く。
2. 取得済みのドメインを入力して **"Add"**。
3. 表示された DNS レコードをドメインのレジストラに設定。
4. `NEXT_PUBLIC_BASE_URL` をカスタムドメインの URL に更新。

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
> より多くのトラフィックや帯域幅が必要な場合は [Cloudflare Workers](./CFPages_Deployment.md) の利用も検討してください。

---

## トラブルシューティング

### OGP の URL が localhost になる

`NEXT_PUBLIC_BASE_URL` が正しく設定されていない可能性があります。
Vercel の環境変数を確認し、デプロイ済みの URL（`https://your-project.vercel.app`）が設定されているか確認してください。

### デプロイが失敗する

ビルドログを確認してください。依存のインストール失敗やテスト以外のビルドエラーが原因のことが多いです。OAuth 用の環境変数は不要です。
