# M2D リポジトリ 問題点レポート

> 調査日: 2026-08-20  
> 対象ブランチ: `arena/01a01c18-m2d`  
> 以前のバグ票（クリティカル〜低のコード欠陥）は対応済みのため削除した。以下は残っている **機能ギャップ** と **UI / UX**。

---

## 目次

1. [約束と実装のずれ](#1-約束と実装のずれ)
2. [足りない機能](#2-足りない機能)
3. [フレンドリーでない UI](#3-フレンドリーでない-ui)
4. [アクセシビリティとトーン](#4-アクセシビリティとトーン)
5. [対応優先度](#5-対応優先度)

---

## 1. 約束と実装のずれ

### 1-1. Discord ログインは同期しない

**場所:** `src/app/account/AccountClient.tsx`、`src/store/useAppStore.ts`

Account は *save preferences and sync your mod profiles* と書くが、プロファイル・お気に入り・設定は `localStorage` のみ。ログインしても端末をまたがない。

### 1-2. 日本語 UI が途中まで

**場所:** `src/i18n/translations.ts` に無いハードコード文字列

設定で `ja` にしても英語のままのもの:

- ActionBar: `Clear All` / `Check` / `Download` / `N Selected`
- SideMenu: `My Profiles` とプロファイル操作の `engineAlert` 全文
- 依存モーダル: `Dependency Report`、タブ名、`Add` / `Remove` / `Close`、empty（`All good! 🎉`）
- 空状態: `No mods found.` / `None selected.` / `Loading details...`
- ダウンロード失敗: `Download failed. Could not find compatible versions.`
- Header `aria-label`、Account（`Sign Out` など）

### 1-3. ダウンロードはランチャー連携ではない

ブラウザに ZIP を保存するだけ。Prism / Modrinth App / `.minecraft/mods` へのインストール、インスタンス指定、mrpack 出力はない。依存 Check のあと「直してから DL」の導線も弱い。

---

## 2. 足りない機能

### 2-1. カタログ

Modrinth 検索のみ。CurseForge、作者ページ、コレクション、フォローがない。

### 2-2. バージョン

互換バージョンを1本拾って ZIP にする。バージョン選択 UI、changelog、特定ファイルのピンがない。

### 2-3. 依存

required / optional / conflict のフラット一覧。ネストした依存ツリーがない。理由文（`Selected mod has no compatible version for …`）が英語ハードコード（`src/lib/dependencyAnalysis.ts`）。

### 2-4. プロファイル

名前付き ID リストの local 保存。クラウド、共有 URL、ランチャー形式の export がない。左カラムは `Profiles via ☰` のヒントだけで、実ボタンがない。

### 2-5. アカウント

Discord OAuth と Sign out 以外の中身がない。サーバー保存なし。

### 2-6. 詳細ページ `/mods/[id]`

markdown 表示はあるが、ホームの選択・お気に入り・ダウンロードとほぼつながっていない（`?mod=` がある程度）。

### 2-7. 翻訳

詳細本文を MyMemory で日訳するだけ。レート制限の説明、カード説明の翻訳、言語切替との連動が弱い。

### 2-8. オフライン / PWA

`ServiceWorkerRegistration` はあるが、登録失敗の案内がなく、オフラインで使える保証も薄い。

### 2-9. 空のホーム

infinite scroll のみ。初回の「人気 / おすすめ」がなく、中央が暗い空白になり「壊れた」ように見える。

### 2-10. 部分失敗のフィードバック

ZIP DL は一部失敗しても成功分だけ固めて保存し、失敗 ID の一覧を出さない（ログと全失敗時アラートのみ）。

---

## 3. フレンドリーでない UI

### 3-1. 情報密度と 0 件 ActionBar

左カラムは Discover + Version + Loader の Include/Exclude + カテゴリが同じパターンで続く。選択 0 件でも ActionBar（Check / Download）が大きく鎮座する。無効理由もなく、畳まれない。

### 3-2. Discover とバージョン設定の二重

左の Mods / Resource Packs / Shaders、モバイル Discover、設定の loader / version が別物。「検索フィルタのバージョン」と「ダウンロード用バージョン」の違いが検索バーから見えない。

### 3-3. プロファイルの発見性が低い

ハンバーガー内にプロファイルがある。左の `Profiles via ☰` はヒント文言であり、クリック先ではない。

### 3-4. 空状態が次の一手を示さない

`Select a mod to view details.` / `No mods selected.` だけで、検索する・人気を見る・ZIP を取り込む、といった誘導がない。

### 3-5. アイコンとラベルの不一致

依存解析が盾アイコン + `Check` で、セキュリティ機能に見えやすい。

### 3-6. モバイルで管理 UI が散らばる

詳細はオーバーレイ、履歴・選択・お気に入りはヘッダー、プロファイルはハンバーガー、設定はまた別。同じ「リストを管理する」行為が 4 か所。

### 3-7. 空リストのビジュアル

ダークは整っているが、空の中央パネルは製品というよりデバッグ画面に寄る。依存 empty の絵文字（`All good! 🎉`）と殺風景な Selected がトーン不一致。

---

## 4. アクセシビリティとトーン

### 4-1. 不十分な alt / key

依存リストの `alt="icon"`（`DependencyModal`）。`/mods/[id]` ギャラリーが `key={i}`（ホームの `ModDetail` は `item.url` 済み）。

### 4-2. ダイアログのフォーカス

`engineAlert` / カスタムダイアログと各モーダルでフォーカストラップが一貫していない。失敗メッセージは英語固定。

### 4-3. テスト

Engine Feature と一部 UI はカバー済み。`ModList` / `ModDetail` / `SideMenu` / 認証フロー全体はまだ薄い。

---

## 5. 対応優先度

1. コピーを正直に — 同期しないなら Account からその文言を消す。`ja` なら主要ボタンと alert も `t` 経由。
2. 0 件の ActionBar を小さくする。空ホームに「検索 / 人気」を出す。
3. Profiles を左またはヘッダーの実ボタンにする。
4. DL 後の次アクション — 保存先の説明、部分失敗の一覧。
5. ランチャー連携 / mrpack は別スコープ。
