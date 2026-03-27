# M2D リポジトリ 問題点レポート

> 調査日: 2026-03-27  
> 対象ブランチ: `main`

---

## 目次

1. [クリティカル](#1-クリティカル)
2. [高 (High)](#2-高-high)
3. [中 (Medium)](#3-中-medium)
4. [低 (Low)](#4-低-low)
5. [まとめ](#5-まとめ)

---

## 1. クリティカル

### 1-1. 環境変数が未設定でもサーバーが起動してしまう

**ファイル:** `src/auth.ts` (行 17–18)

```typescript
clientId: process.env.DISCORD_CLIENT_ID!,
clientSecret: process.env.DISCORD_CLIENT_SECRET!,
```

**問題点:**

- TypeScript の非 null 断言 (`!`) を使っているだけで、実行時に値が検証されない。
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` が未設定のまま本番デプロイすると、NextAuth が不明瞭なエラーで認証ルートをクラッシュさせる。
- エラーメッセージが「Missing env var」ではなく内部エラーになるため、原因の特定が困難。

**推奨対処:**

起動時に即座に検証して、有益なエラーメッセージを投げる。

```typescript
const clientId = process.env.DISCORD_CLIENT_ID;
const clientSecret = process.env.DISCORD_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  throw new Error(
    'Missing required env vars: DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET'
  );
}
```

---

### 1-2. ローダーフィルターが誤ったファセットフィールドを使っている（動作バグ）

**ファイル:** `src/lib/facets.ts` (行 13–20)

```typescript
// ❌ 誤り: categories:fabric になってしまう
.map(([k]) => `categories:${k}`)
// ✅ 正しい: loaders:fabric であるべき
.map(([k]) => `loaders:${k}`)
```

**問題点:**

- Forge / Fabric / Quilt などのローダーフィルターを選択しても、Modrinth API には `loaders:fabric` ではなく `categories:fabric` というクエリが送られる。
- Modrinth の `categories` フィールドは別概念のため、ローダーフィルターが**完全に無視**される。
- ユーザーが「Fabric のみ表示」と設定しても効果がないため、UI と動作が乖離している。

**推奨対処:**

`loaders` エントリのマッピング処理を `loaders:${k}` に修正し、`NOT categories:` の部分も `NOT loaders:` に変更する。

---

### 1-3. 翻訳処理のレースコンディション

**ファイル:** `src/components/mods/ModDetail.tsx` (行 51–78)

**問題点:**

- MOD-A の翻訳リクエスト中に MOD-B に切り替えた場合、翻訳完了後に MOD-A の結果が MOD-B の表示内容を上書きする恐れがある。
- `AbortController` が使われておらず、古いリクエストをキャンセルする手段がない。
- 翻訳失敗時にエラーがコンソールにのみ出力され、ユーザーへの通知がない。

**推奨対処:**

```typescript
const translationAbortRef = useRef<AbortController | null>(null);

const handleTranslate = () => {
  translationAbortRef.current?.abort();
  const controller = new AbortController();
  translationAbortRef.current = controller;

  Promise.all([translateChunk(..., controller.signal), translateBody(..., controller.signal)])
    .then(([description, body]) => {
      if (controller.signal.aborted) return;
      // ... 状態更新
    })
    .catch((err) => {
      if (controller.signal.aborted) return;
      showAlert(`翻訳に失敗しました: ${err}`);
    });
};
```

---

### 1-4. プロジェクト取得のレースコンディション

**ファイル:** `src/components/mods/ModDetail.tsx` (行 39–46)

```typescript
let cancelled = false;
API.getProject(activeModId)
  .then((data) => { if (!cancelled) setState(...); })
```

**問題点:**

- `cancelled` フラグは描画を抑制するが、HTTP リクエスト自体はキャンセルされない。
- `activeModId` が A → B → A と素早く変化した場合、古いリクエストの結果が最新の状態を上書きする可能性がある。
- `API.getProject` は `AbortSignal` をサポートしているにもかかわらず利用されていない。

**推奨対処:**

```typescript
useEffect(() => {
  if (!activeModId) return;
  const controller = new AbortController();
  API.getProject(activeModId, controller.signal)
    .then((data) => setState({ id: activeModId, detail: data }))
    .catch((err) => {
      if (err?.name !== 'AbortError') setState({ id: activeModId, detail: null });
    });
  return () => controller.abort();
}, [activeModId]);
```

---

## 2. 高 (High)

### 2-1. `dangerouslySetInnerHTML` による XSS リスク

**ファイル:** `src/components/ui/Icon.tsx` (行 14–22)

```typescript
<span dangerouslySetInnerHTML={{ __html: svg }} />
```

**問題点:**

- 現在はバンドル済みアセットのみが渡されているが、コンポーネントは任意の文字列を `svg` プロパティとして受け取れる。
- 将来的に外部ソースの SVG 文字列が渡された場合、スクリプト注入（XSS）攻撃が成立する。
- React は `dangerouslySetInnerHTML` の内容をサニタイズしない。

**推奨対処:**

SVG の文字列を渡すのではなく、インポートしたコンポーネントとして扱うか、DOMPurify でサニタイズする。

---

### 2-2. ダウンロード処理のエラーハンドリング不備

**ファイル:** `src/hooks/useModDownload.ts` (行 90–92)

```typescript
const res = await fetch(file.url);
if (res.ok) {
  zip.file(file.filename, await res.blob()); // blob() が失敗しても catch されない
}
```

**問題点:**

- `res.blob()` が例外を投げた場合に catch されず、Promise が unhandled rejection になる。
- フェッチタイムアウトが設定されていないため、応答の遅いサーバーに対してハングアップする可能性がある。
- ダウンロードが部分的に失敗してもユーザーへの通知がない（ZIP が不完全なまま保存される）。

**推奨対処:**

```typescript
try {
  const res = await fetch(file.url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) { addDebugLog('warn', `HTTP ${res.status}`); return; }
  zip.file(file.filename, await res.blob());
} catch (e) {
  addDebugLog('error', `Failed: ${e}`);
}
```

---

### 2-3. 翻訳キャッシュのメモリリーク

**ファイル:** `src/components/mods/ModDetail.tsx` (行 36)

```typescript
const translationCache = useRef<Record<string, TranslatedContent>>({});
```

**問題点:**

- キャッシュにサイズ制限がなく、視聴した MOD の翻訳データが永遠に蓄積される。
- 多数の MOD を閲覧するとメモリを圧迫し、ブラウザのパフォーマンスが低下する。

**推奨対処:**

最大エントリ数（例: 50 件）を設け、超過した場合に最も古いエントリを削除する LRU 方式にする。

---

### 2-4. `useLocalStorage` の `useCallback` 依存配列バグ

**ファイル:** `src/hooks/useLocalStorage.ts` (行 35–51)

```typescript
}, [key, storedValue]); // ← storedValue への依存が古い値を参照させる
```

**問題点:**

- `storedValue` が依存配列に入っているため、値が変わるたびにコールバックが再生成される。
- 子コンポーネントに関数参照を渡した場合、古い値のクロージャを持つ古いコールバックが残る。

**推奨対処:**

`setStoredValue` の関数形式を使って `storedValue` への依存を排除する。

```typescript
const setValue = useCallback((value: T | ((prev: T) => T)) => {
  setStoredValue((prev) => {
    const next = value instanceof Function ? value(prev) : value;
    // localStorage に保存 ...
    return next;
  });
}, [key]);
```

---

### 2-5. プロファイルインポートの入力バリデーション不足

**ファイル:** `src/components/layout/SideMenu.tsx` (行 107–111)

```typescript
const parts = atob((ev.target?.result as string).trim()).split(':');
if (parts.length < 3 || parts[0] !== 'MMPROF1') throw new Error('Invalid Signature');
const profile = {
  name: decodeURIComponent(parts[1]) + ' (Imported)',
  mods: parts[2] ? parts[2].split(',') : [],
  ...
};
```

**問題点:**

- `decodeURIComponent` は不正な URI エンコード文字列で例外を投げるが、上位の catch がなければクラッシュする。
- インポートされた MOD ID のフォーマット検証がなく、任意の文字列が格納される。
- MOD 数の上限チェックがないため、大量エントリで状態が肥大化する。
- プロファイル名の長さ制限がない。

---

### 2-6. ZIP ファイルサイズの未チェック

**ファイル:** `src/components/layout/SideMenu.tsx` (行 140)

```typescript
const loadedZip = await zip.loadAsync(file);
```

**問題点:**

- ファイルサイズを事前確認せずにメモリへ展開するため、巨大な ZIP（例: 1 GB 以上）でブラウザがクラッシュする可能性がある。
- 展開中の進捗表示もない。

**推奨対処:**

```typescript
const MAX_SIZE = 500 * 1024 * 1024; // 500 MB
if (file.size > MAX_SIZE) {
  await showAlert('ファイルサイズが大きすぎます（上限 500 MB）');
  return;
}
```

---

## 3. 中 (Medium)

### 3-1. JSON.stringify によるフィルター重複判定の誤り

**ファイル:** `src/store/useAppStore.ts` (行 474–484)

```typescript
JSON.stringify(last.filters) === JSON.stringify(entry.filters)
```

**問題点:**

- オブジェクトのキー順序が異なると（例: `{a:1,b:2}` vs `{b:2,a:1}`）、同一フィルターでも異なると判定される。
- コンテキスト履歴に重複エントリが追加される場合がある。

**推奨対処:**

キーをソートしてから比較するか、再帰的な等値比較関数を使う。

---

### 3-2. 検索履歴追加の非効率なアルゴリズム

**ファイル:** `src/store/useAppStore.ts` (行 447–455)

```typescript
const filtered = state.searchHistory.filter((q) => q !== query.trim());
```

**問題点:**

- 履歴追加のたびに O(n) の線形探索を実行している。
- `Set` を使えば O(1) で重複チェックできる。

**推奨対処:**

```typescript
const set = new Set(state.searchHistory);
set.delete(queryTrimmed);
const next = [queryTrimmed, ...set].slice(0, MAX_SEARCH_HISTORY);
```

---

### 3-3. API プロキシに CORS / CSP ヘッダーが設定されていない

**ファイル:** `src/app/api/v2/[...path]/route.ts`

**問題点:**

- プロキシエンドポイントに CORS ヘッダーがないため、オリジンの制限が不明確。
- `Content-Security-Policy` ヘッダーも設定されていない。

---

### 3-4. キャッシュ SWR 比率が全エンドポイントで一律 50%

**ファイル:** `src/app/api/v2/[...path]/route.ts` (行 39–45)

```typescript
const swr = Math.floor(ttl * 0.5);
```

**問題点:**

- タグ API（TTL 3600 秒）では `stale-while-revalidate` が 1800 秒となり、最大 30 分間古いデータが返される。
- エンドポイントの性質に合わせた適切な値を設定すべき。

---

### 3-5. `ModList` における不要な再計算

**ファイル:** `src/components/mods/ModList.tsx`

**問題点:**

- `loadMore` コールバックが `searchParams` に依存しており、`searchParams` はレンダーごとに新しいオブジェクト参照になるため不要な再計算が発生する。
- `eslint-disable-next-line react-hooks/exhaustive-deps` で警告を強制抑制しており、根本原因が隠蔽されている。

---

### 3-6. `parseInt` の冗長な書き方

**ファイル:** `src/app/api/v2/[...path]/route.ts` (行 7)

```typescript
parseInt(process.env.UPSTREAM_TIMEOUT_MS ?? '', 10) || 8_000
```

**問題点:**

- `parseInt('', 10)` は `NaN` を返し、`NaN || 8_000` は偶然正しく動作するが意図が不明確。
- `parseInt(process.env.UPSTREAM_TIMEOUT_MS ?? '0', 10) || 8_000` と書くべき。

---

## 4. 低 (Low)

### 4-1. プロファイル名の重複チェックがない

**ファイル:** `src/components/layout/SideMenu.tsx`

同名のプロファイルを複数作成できてしまう。保存前に重複チェックを追加すべき。

```typescript
if (profiles.some(p => p.name === name)) {
  await showAlert('同名のプロファイルが既に存在します');
  return;
}
```

---

### 4-2. ギャラリーの React キーに配列インデックスを使用

**ファイル:** `src/components/mods/ModDetail.tsx`

```typescript
{gallery.map((item, i) => (<a key={i} ...
```

配列インデックスをキーとして使うと、ギャラリーの順序変更時に React が誤った差分計算を行う。`item.url` など一意な値を使うべき。

---

### 4-3. 画像の alt 属性が不適切

**ファイル:** `src/components/mods/ModDetail.tsx`

```typescript
alt="icon"  // ❌ 汎用的すぎる
alt={`${projectDetail.title} icon`}  // ✅ 推奨
```

スクリーンリーダー向けに具体的な説明を設定すべき。

---

### 4-4. `filter(Boolean)` 後の冗長な null チェック

**ファイル:** `src/hooks/useDependencyCheck.ts`

```typescript
results.filter(Boolean).forEach((res) => {
  if (!res) return; // filter(Boolean) で null は除去済みなので不要
```

デッドコード。削除してよい。

---

### 4-5. `hydrate` の ESLint 抑制コメントに理由がない

**ファイル:** `src/context/AppContext.tsx`

```typescript
useEffect(() => {
  hydrate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

なぜ依存配列を意図的に空にしているか説明するコメントがなく、他の開発者が意図を誤解する恐れがある。

---

### 4-6. テストカバレッジの不足

現在のテストは以下 8 モジュールのみをカバーしている:

| テストファイル | 対象モジュール |
|---|---|
| `api-client.test.ts` | `src/lib/api/client.ts` |
| `helpers.test.ts` | `src/lib/helpers.ts` |
| `useAppStore.test.ts` | `src/store/useAppStore.ts` |
| `modrinth.test.ts` | Modrinth API 関連 |
| `proxy-route.test.ts` | `src/app/api/v2/[...path]/route.ts` |
| `revalidate-route.test.ts` | ISR revalidate |
| `utils.test.ts` | ユーティリティ関数 |
| `facets.test.ts` | `src/lib/facets.ts` |

**カバーされていない主な領域:**

- すべての React コンポーネント（`ModDetail`, `ModList`, `SideMenu` 等）
- カスタムフック（`useModDownload`, `useDependencyCheck`, `useLocalStorage` 等）
- エラーバウンダリ（存在する場合）
- 認証フロー（`src/auth.ts`）

---

## 5. まとめ

| 重大度 | 件数 | 主な問題 |
|--------|------|----------|
| 🔴 クリティカル | 4 | 環境変数未検証、ローダーフィルターバグ、翻訳・取得のレースコンディション |
| 🟠 高 | 6 | XSS リスク、エラーハンドリング欠如、メモリリーク、入力バリデーション不足 |
| 🟡 中 | 6 | CORS 未設定、パフォーマンス問題、キャッシュ設定の問題 |
| 🟢 低 | 6 | アクセシビリティ、デッドコード、テスト不足 |
| **合計** | **22** | |

### 対応優先度

**今すぐ対応（デプロイブロッカー）:**

1. `src/lib/facets.ts` — ローダーファセット名バグ修正（`categories:` → `loaders:`）
2. `src/auth.ts` — 環境変数の起動時バリデーション追加

**次のスプリント:**

3. `src/components/mods/ModDetail.tsx` — `AbortController` を使ったレースコンディション修正
4. `src/hooks/useModDownload.ts` — エラーハンドリングとタイムアウト追加
5. `src/components/layout/SideMenu.tsx` — ZIP サイズ上限とプロファイルインポートバリデーション

**コード品質改善:**

6. `useLocalStorage` の `useCallback` 修正
7. テストカバレッジの拡充（特にフックとコンポーネント）
8. CORS / CSP ヘッダーの追加
