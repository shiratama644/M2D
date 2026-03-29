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

> **更新:** 2026-03-27 — 項目を追加（2-7〜2-8, 3-7〜3-10, 4-7〜4-8）

---

## 1. クリティカル

### 1-1. 環境変数が未設定でもサーバーが起動してしまう

> ✅ **解決済み** — `src/auth.ts` で起動時に環境変数を検証し、未設定の場合に明確なエラーメッセージを投げるよう修正済み。

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

> ✅ **解決済み** — `src/lib/facets.ts` で `.map(([k]) => \`loaders:${k}\`)` に修正し、`NOT loaders:` も同様に修正済み。

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

> ✅ **解決済み** — `src/components/mods/ModDetail.tsx` で `translationAbortRef` による AbortController を導入。`activeModId` 変化時に旧リクエストをキャンセルし状態をリセット。翻訳失敗時は `showAlert` でユーザーに通知するよう修正済み。

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

> ✅ **解決済み** — `src/components/mods/ModDetail.tsx` で `API.getProject(activeModId, controller.signal)` に変更し、`useEffect` のクリーンアップで `controller.abort()` を呼ぶよう修正済み。

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

> ✅ **解決済み** — `src/components/ui/Icon.tsx` で `sanitizeSvg()` 関数を追加し、`<script>` タグを除去するサニタイズ処理を適用済み（`useMemo` でメモ化）。DOMPurify は追加せず、バンドル済み SVG では常に no-op。

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

> ✅ **解決済み** — `src/hooks/useModDownload.ts` で `AbortSignal.timeout(30_000)` を追加、各ファイルを try/catch でラップ、HTTP エラー時に `addDebugLog('warn', ...)` を出力、全件失敗時は `showAlert` でユーザーに通知するよう修正済み。

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

> ✅ **解決済み** — `src/components/mods/ModDetail.tsx` で最大50件の LRU キャッシュを実装。超過時に最も古いエントリを削除するよう修正済み。

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

> ✅ **解決済み** — `src/hooks/useLocalStorage.ts` で `setValue` の依存配列を `[key]` のみとし、`setStoredValue` の関数形式を使って `storedValue` への依存を排除済み。

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

> ✅ **解決済み** — `src/components/layout/SideMenu.tsx` でプロファイル名の長さ上限（100文字）、MOD 数の上限（500個）、MOD ID の形式検証（正規表現）、`decodeURIComponent` の例外処理を追加済み。

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

> ✅ **解決済み** — `src/components/layout/SideMenu.tsx` で `MAX_ZIP_SIZE = 500 * 1024 * 1024`（500 MB）を設定し、超過時に `showAlert` でユーザーに通知してから処理を中断するよう修正済み。

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

### 2-7. ErrorBoundary が存在しない

> ✅ **解決済み** — `src/components/ui/ErrorBoundary.tsx` を新規実装し、`src/app/HomeClient.tsx` で ModList・RightPanel を `<ErrorBoundary>` でラップ済み。フォールバック UI にリトライボタンも追加済み。

**ファイル:** `src/app/HomeClient.tsx`、`src/components/mods/ModList.tsx`、`src/components/mods/ModDetail.tsx`

**問題点:**

- `ModList`・`ModDetail`・`SideMenu` などのコンポーネントで例外が発生した場合、アプリ全体がクラッシュしてホワイトスクリーンになる。
- `src/app/error.tsx` はページレベルのエラーのみ処理しており、コンポーネントレベルのレンダーエラーを補足しない。
- ユーザーに有益なフォールバック UI が表示されない。

**推奨対処:**

`react-error-boundary` などを用いて主要コンポーネントを `ErrorBoundary` でラップする。

```tsx
<ErrorBoundary fallback={<ModListError />}>
  <ModList {...props} />
</ErrorBoundary>
<ErrorBoundary fallback={<ModDetailError />}>
  <ModDetail />
</ErrorBoundary>
```

---

### 2-8. `DebugPanel` のアンマウント後の状態更新

> ✅ **解決済み** — `src/components/debug/DebugPanel.tsx` で `copyTimeoutRef` を追加し、`useEffect` のクリーンアップで `clearTimeout` を呼ぶよう修正済み。クリップボード API の `.catch()` も追加済み（4-7 と合わせて対応）。

**ファイル:** `src/components/debug/DebugPanel.tsx` (行 122–125)

```typescript
navigator.clipboard.writeText(text).then(() => {
  setCopied(true);
  setTimeout(() => setCopied(false), 1500); // ❌ コンポーネント破棄後に setCopied が呼ばれる
});
```

**問題点:**

- `setTimeout` の ID を保持していないため、コンポーネントがアンマウントされた後にタイマーが発火して `setCopied(false)` を呼び出す。
- React は「アンマウント済みコンポーネントへの状態更新」として警告を出す。

**推奨対処:**

```typescript
const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => () => {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
}, []);

const copyLogs = () => {
  navigator.clipboard.writeText(text)
    .then(() => {
      setCopied(true);
      timeoutRef.current = setTimeout(() => setCopied(false), 1500);
    })
    .catch(() => { /* 権限エラーなど */ });
};
```

---

## 3. 中 (Medium)

### 3-1. JSON.stringify によるフィルター重複判定の誤り

> ✅ **解決済み** — `src/store/useAppStore.ts` で `stableStringify()` 関数（キーをソートして直列化）を使うよう修正済み。

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

> ✅ **解決済み** — `src/store/useAppStore.ts` で `Set` を使った O(1) 重複チェックに変更済み。

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

> ✅ **解決済み** — `src/app/api/v2/[...path]/route.ts` で `corsHeaders()` 関数を追加し、同一オリジンリクエストのみ `Access-Control-Allow-Origin` を返すよう修正済み。

**ファイル:** `src/app/api/v2/[...path]/route.ts`

**問題点:**

- プロキシエンドポイントに CORS ヘッダーがないため、オリジンの制限が不明確。
- `Content-Security-Policy` ヘッダーも設定されていない。

---

### 3-4. キャッシュ SWR 比率が全エンドポイントで一律 50%

> ✅ **解決済み** — `src/app/api/v2/[...path]/route.ts` で `Math.min(Math.floor(ttl * 0.5), 120)` に変更し、SWR を最大 120 秒に制限済み。

**ファイル:** `src/app/api/v2/[...path]/route.ts` (行 39–45)

```typescript
const swr = Math.floor(ttl * 0.5);
```

**問題点:**

- タグ API（TTL 3600 秒）では `stale-while-revalidate` が 1800 秒となり、最大 30 分間古いデータが返される。
- エンドポイントの性質に合わせた適切な値を設定すべき。

---

### 3-5. `ModList` における不要な再計算

> ✅ **解決済み** — `src/components/mods/ModList.tsx` で `searchParams`・`discoverType`・`updateModDataMap`・`addDebugLog`・`t` をすべて `useRef` 経由でアクセスするよう変更し、`loadMore` の `useCallback` 依存配列を `[]` に。親コンポーネントが同値で再レンダーしても `loadMore` が再生成されなくなった。

**ファイル:** `src/components/mods/ModList.tsx`

**問題点:**

- `loadMore` コールバックが `searchParams` に依存しており、`searchParams` はレンダーごとに新しいオブジェクト参照になるため不要な再計算が発生する。
- `eslint-disable-next-line react-hooks/exhaustive-deps` で警告を強制抑制しており、根本原因が隠蔽されている。

---

### 3-6. `parseInt` の冗長な書き方

> ✅ **解決済み** — `parseInt(process.env.UPSTREAM_TIMEOUT_MS ?? '0', 10) || 8_000` に修正済み。

**ファイル:** `src/app/api/v2/[...path]/route.ts` (行 7)

```typescript
parseInt(process.env.UPSTREAM_TIMEOUT_MS ?? '', 10) || 8_000
```

**問題点:**

- `parseInt('', 10)` は `NaN` を返し、`NaN || 8_000` は偶然正しく動作するが意図が不明確。
- `parseInt(process.env.UPSTREAM_TIMEOUT_MS ?? '0', 10) || 8_000` と書くべき。

---

### 3-7. `SearchSection` / `LeftPanel` のレンダー中状態更新（アンチパターン）

> ✅ **解決済み** — `SearchSection` はすでに `useEffect` を使用。`LeftPanel` の `prevModVersion`/`setPrevModVersion` パターンを `useEffect(() => { setFilters(...); }, [modVersion])` に置き換え済み。

**ファイル:** `src/components/search/SearchSection.tsx` (行 43–55)、`src/components/panels/LeftPanel.tsx` (行 40–44)

```typescript
const [prevModVersion, setPrevModVersion] = useState(modVersion);
if (prevModVersion !== modVersion) { // ❌ レンダー関数の本体で setState を呼んでいる
  setPrevModVersion(modVersion);
  setFilters((prev) => ({ ...prev, version: modVersion || '' }));
}
```

**問題点:**

- React のレンダー関数本体で `setState` を呼び出すアンチパターン。
- 1 レンダーサイクル内に複数の状態更新が発生し、不要な再レンダーを引き起こす。
- エッジケースでは無限ループになる可能性がある。
- 同じパターンが `SearchSection` と `LeftPanel` の 2 か所に重複している。

**推奨対処:**

```typescript
useEffect(() => {
  setFilters((prev) => ({ ...prev, version: modVersion || '' }));
}, [modVersion]);

useEffect(() => {
  const newLoaders = Object.fromEntries(getLoaderOptions(discoverType).map((o) => [o.value, null]));
  setFilters((prev) => ({ ...prev, categories: {}, loaders: newLoaders }));
}, [discoverType]);
```

---

### 3-8. `useColumnResize` のレイアウトスラッシング

> ✅ **解決済み** — `src/hooks/useColumnResize.ts` で `layoutRectRef` を導入し、`onColResizeStart`（mousedown 相当）時に一度だけ `getBoundingClientRect()` を取得してキャッシュ。`mousemove` ではキャッシュ済みの値を使用するよう修正済み。

**ファイル:** `src/hooks/useColumnResize.ts` (行 46–65)

```typescript
const onMouseMove = (e: MouseEvent) => {
  if (!draggingCol.current || !layoutRef.current) return;
  const rect = layoutRef.current.getBoundingClientRect(); // ❌ mousemove のたびに呼ばれる（毎秒 100 回以上）
  const pct = ((e.clientX - rect.left) / rect.width) * 100;
  // ... 状態更新 → 再レンダー → 再計算 のサイクル
};
```

**問題点:**

- `getBoundingClientRect()` はドラッグ中の `mousemove` イベントのたびに（毎秒最大 100 回以上）呼ばれる。
- レイアウト情報の再計算（強制リフロー）と再レンダーが連鎖し、スクロールがカクつく。

**推奨対処:**

`mousedown` 時に一度だけ rect を取得してキャッシュし、`mousemove` ではキャッシュ済みの値を使う。

```typescript
const layoutRectRef = useRef<DOMRect | null>(null);

const onMouseDown = () => {
  layoutRectRef.current = layoutRef.current?.getBoundingClientRect() ?? null;
};

const onMouseMove = (e: MouseEvent) => {
  if (!draggingCol.current || !layoutRectRef.current) return;
  const rect = layoutRectRef.current; // キャッシュ済みの値を使用
  const pct = ((e.clientX - rect.left) / rect.width) * 100;
};
```

---

### 3-9. `useGameVersions` / `useCategories` の AbortSignal 未使用

> ✅ **解決済み** — `src/hooks/useGameVersions.ts` と `src/hooks/useCategories.ts` で `AbortController` を追加し、アンマウント時にリクエストをキャンセル。`addDebugLog` を `useRef` でラップして依存配列から除外済み。

**ファイル:** `src/hooks/useGameVersions.ts` (行 17–24)、`src/hooks/useCategories.ts` (行 62–70)

```typescript
useEffect(() => {
  API.getGameVersions()
    .then((versions) => {
      setGameVersions(versions.filter(...)); // ❌ アンマウント後に setState が呼ばれる可能性
    })
    .catch((e: unknown) => addDebugLog('warn', `...`));
}, [addDebugLog]); // ❌ addDebugLog が再生成されると不要なリフェッチが発生
```

**問題点:**

- `AbortController` が使われていないため、コンポーネントがアンマウントされてもリクエストが完了し、`setState` が呼ばれる。
- `addDebugLog` が依存配列に含まれているため、コールバックが再生成されるたびにリフェッチが走る。

**推奨対処:**

```typescript
useEffect(() => {
  const controller = new AbortController();
  API.getGameVersions(controller.signal)
    .then((versions) => {
      if (!controller.signal.aborted) setGameVersions(versions.filter(...));
    })
    .catch((e) => {
      if ((e as { name?: string }).name !== 'AbortError') addDebugLog('warn', `...`);
    });
  return () => controller.abort();
}, []); // addDebugLog を依存から除去（初回のみ実行）
```

---

### 3-10. `useDependencyCheck` の AbortSignal 未使用

> ✅ **解決済み** — `src/hooks/useDependencyCheck.ts` で `depAbortRef` による `AbortController` を導入。フックアンマウント時と新規チェック開始時に旧リクエストをキャンセルし、`API.getVersions()` にも `signal` を渡すよう修正済み。

**ファイル:** `src/hooks/useDependencyCheck.ts` (行 71–87)

```typescript
const versions = await API.getVersions(pid, useLoader, useVersion); // ❌ signal 未使用
```

**問題点:**

- 依存関係チェックの実行中にユーザーがモーダルを閉じても、全てのリクエストが完走し続ける。
- `API.getVersions()` は `AbortSignal` 引数に対応しているにもかかわらず利用されていない。

**推奨対処:**

依存関係チェック開始時に `AbortController` を生成し、モーダルクローズ時に `controller.abort()` を呼ぶ。

---

## 4. 低 (Low)

### 4-1. プロファイル名の重複チェックがない

> ✅ **解決済み** — `src/components/layout/SideMenu.tsx` の `saveProfile` で `profiles.some(p => p.name === name)` チェックを追加済み。

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

> ✅ **解決済み** — `src/components/mods/ModDetail.tsx` で `key={item.url}` に変更済み。

**ファイル:** `src/components/mods/ModDetail.tsx`

```typescript
{gallery.map((item, i) => (<a key={i} ...
```

配列インデックスをキーとして使うと、ギャラリーの順序変更時に React が誤った差分計算を行う。`item.url` など一意な値を使うべき。

---

### 4-3. 画像の alt 属性が不適切

> ✅ **解決済み** — `src/components/mods/ModDetail.tsx` でギャラリー画像に `alt={item.title || \`Screenshot ${i + 1}\`}` を設定済み。

**ファイル:** `src/components/mods/ModDetail.tsx`

```typescript
alt="icon"  // ❌ 汎用的すぎる
alt={`${projectDetail.title} icon`}  // ✅ 推奨
```

スクリーンリーダー向けに具体的な説明を設定すべき。

---

### 4-4. `filter(Boolean)` 後の冗長な null チェック

> ✅ **解決済み** — `src/hooks/useDependencyCheck.ts` で `filter(Boolean)` を型述語 `filter((res): res is NonNullable<typeof res> => res !== null)` に変更し、不要な null チェックなしで型安全に処理するよう修正済み。

**ファイル:** `src/hooks/useDependencyCheck.ts`

```typescript
results.filter(Boolean).forEach((res) => {
  if (!res) return; // filter(Boolean) で null は除去済みなので不要
```

デッドコード。削除してよい。

---

### 4-5. `hydrate` の ESLint 抑制コメントに理由がない

> ✅ **解決済み** — `src/context/AppContext.tsx` の `eslint-disable` に「`hydrate()` はマウント時に一度だけ実行するため意図的に依存配列を空にしている」旨のコメントを追加済み。

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

### 4-7. `DebugPanel` のクリップボード API エラーハンドリング不備

> ✅ **解決済み** — `src/components/debug/DebugPanel.tsx` で `.catch(err => console.error(...))` を追加済み（2-8 と合わせて対応）。

**ファイル:** `src/components/debug/DebugPanel.tsx` (行 122–125)

```typescript
navigator.clipboard.writeText(text).then(() => {
  setCopied(true);
  // ...
}); // ❌ .catch() がない
```

**問題点:**

- `navigator.clipboard.writeText` はブラウザの権限が拒否された場合など、例外を投げる。
- `.catch()` がないため、Unhandled Promise Rejection となる。
- ユーザーはコピー失敗を知らされない。

**推奨対処:**

```typescript
navigator.clipboard.writeText(text)
  .then(() => { setCopied(true); timeoutRef.current = setTimeout(() => setCopied(false), 1500); })
  .catch(() => { /* 失敗した場合のフォールバック（例: execCommand） */ });
```

---

### 4-8. `translate.ts` の翻訳失敗フィードバック不足

> ✅ **解決済み** — `src/components/mods/ModDetail.tsx` で翻訳失敗時に `showAlert(t.rightPanel.translateFailed)` を呼ぶよう修正済み。`src/i18n/translations.ts` に `translateFailed` キーを英語・日本語で追加済み。`src/lib/translate.ts` では `AbortError` を再スローして呼び出し元がキャンセルを正しく検出できるよう修正済み。

**ファイル:** `src/lib/translate.ts` (行 46–61)

```typescript
if (data.responseStatus === 200) {
  // ... 翻訳結果を返す
}
// 200 以外の場合は元のテキストを返す（サイレント）
return text;
```

**問題点:**

- MyMemory API が 200 以外のステータスを返した場合（レート制限 429 など）、サイレントに元テキストが返され、翻訳ボタンを押しても何も変化しないように見える。
- ユーザーは翻訳が失敗したのか、元から日本語対応していないのか判断できない。

**推奨対処:**

失敗ステータスをデバッグログに残し、呼び出し元でユーザーへの通知（`showAlert` など）を表示する。

---

### 2-9. `HomeClient` と `useScrollLock` の `modal-open` クラス競合

> ✅ **解決済み** — `src/app/HomeClient.tsx` で `classList` を直接操作する `useEffect` を削除し、`useScrollLock(menuOpen || mobileDetailOpen)` に一本化済み。

**ファイル:** `src/app/HomeClient.tsx` (行 81–85)、`src/hooks/useScrollLock.ts`

```typescript
// HomeClient — menuOpen/mobileDetailOpen の変化ごとに classList を直接操作
useEffect(() => {
  const isOpen = menuOpen || mobileDetailOpen;
  document.body.classList.toggle('modal-open', isOpen); // ❌ useScrollLock と独立して動作
}, [menuOpen, mobileDetailOpen]);
```

**問題点:**

- `HomeClient` は `menuOpen` / `mobileDetailOpen` を監視して `document.body.classList` を直接操作する。
- 一方、`CustomDialog`・`DependencyModal`・`MobileModal` などは `useScrollLock` フックを使い、モジュールレベルの `lockCount` で同じクラスを管理する。
- 例えば、`CustomDialog`（useScrollLock）が開いている状態でサイドメニューが閉じると、HomeClient のエフェクトが `classList.toggle('modal-open', false)` を実行してクラスを削除してしまう。その結果、ダイアログが表示中にもかかわらずスクロールが再有効化される。

**推奨対処:**

`HomeClient` 側の `classList` 直接操作を削除し、`useScrollLock` に一本化する。

```typescript
// HomeClient の useEffect を削除し、代わりに：
useScrollLock(menuOpen || mobileDetailOpen);
```

---

## 3. 中 (Medium) — 追加分

### 3-11. アプリ全体のセキュリティヘッダーが未設定

**ファイル:** `next.config.mjs`

**問題点:**

- `next.config.mjs` の `headers()` 関数が定義されておらず、全レスポンスに以下のヘッダーが付与されない。
  - `X-Content-Type-Options: nosniff` — MIME スニッフィング防止
  - `X-Frame-Options: SAMEORIGIN` — クリックジャッキング防止
  - `Strict-Transport-Security` — HTTPS 強制（本番環境）
  - `Permissions-Policy` — 不要なブラウザ機能の無効化
- 既存の 3-3（プロキシルートの CORS/CSP 欠如）とは別に、アプリ全体としてヘッダーが設定されていない。

**推奨対処:**

```javascript
// next.config.mjs
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ],
    },
  ];
},
```

---

### 3-12. `rateLimitStore` の IP エントリが永続する（メモリリーク）

**ファイル:** `src/app/api/revalidate/route.ts` (行 10–18)

```typescript
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitStore.get(ip) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= RATE_LIMIT_MAX) return true;
  timestamps.push(now);
  rateLimitStore.set(ip, timestamps); // ❌ 空になっても IP キーは削除されない
  return false;
}
```

**問題点:**

- 古いタイムスタンプは 1 分のウィンドウ外として都度フィルタリングされるが、IP アドレスのキー自体は Map から削除されない。
- サーバーが長時間稼働すると、アクセスした全ユニーク IP が Map に積み上がり続ける。
- サーバーレス環境（Cloudflare Workers / Vercel）では各インスタンスが短命なため影響は小さいが、常駐プロセスでは問題になる。

**推奨対処:**

```typescript
if (timestamps.length === 0) {
  rateLimitStore.delete(ip);
} else {
  rateLimitStore.set(ip, timestamps);
}
```

---

### 3-13. `ModDetail` の `API.getProject()` に AbortSignal を渡していない

> ✅ **解決済み** — `src/components/mods/ModDetail.tsx` で `AbortController` を使用し、`API.getProject(activeModId, controller.signal)` に変更。`useEffect` のクリーンアップで `controller.abort()` を呼ぶよう修正済み（1-4 と合わせて対応）。

**ファイル:** `src/components/mods/ModDetail.tsx` (行 38–42)

```typescript
useEffect(() => {
  if (!activeModId) return;
  let cancelled = false;
  API.getProject(activeModId)  // ❌ AbortSignal を渡していない
    .then((data) => { if (!cancelled) setState(...); })
    .catch(() => { if (!cancelled) setState(...); });
  return () => { cancelled = true; };
}, [activeModId]);
```

**問題点:**

- `cancelled` フラグはコンポーネント側の状態更新を防ぐが、フライト中の fetch リクエスト自体はキャンセルされない。
- `activeModId` が短時間に複数回変化した場合（例: 素早い連続クリック）、完了しない fetch が並行して走り続ける。
- 3-4 で指摘した `useGameVersions` / `useCategories` / `useDependencyCheck` と同一のパターン。

**推奨対処:**

```typescript
useEffect(() => {
  if (!activeModId) return;
  const controller = new AbortController();
  API.getProject(activeModId, controller.signal)
    .then((data) => setState({ id: activeModId, detail: data }))
    .catch((err) => {
      if ((err as { name?: string }).name !== 'AbortError')
        setState({ id: activeModId, detail: null });
    });
  return () => controller.abort();
}, [activeModId]);
```

---

## 4. 低 (Low) — 追加分

### 4-9. `SideMenu` の `profileMsg` タイマーリーク

> ✅ **解決済み** — `src/components/layout/SideMenu.tsx` で `profileMsgTimerRef` を追加し、`useEffect` のクリーンアップで `clearTimeout` を呼ぶよう修正済み。

**ファイル:** `src/components/layout/SideMenu.tsx` (行 55–56)

```typescript
setProfileMsg('Saved!');
setTimeout(() => setProfileMsg(''), 2000); // ❌ タイマー ID を保持せず、クリーンアップなし
```

**問題点:**

- 2-8（`DebugPanel` のタイマーリーク）と同一パターン。
- コンポーネントがアンマウントされた後にタイマーが発火して `setProfileMsg` が呼ばれる。
- `useRef` でタイマー ID を保持し、`useEffect` のクリーンアップで `clearTimeout` すべき。

---

### 4-10. `commitRename` に重複チェックがない

> ✅ **解決済み** — `src/components/layout/SideMenu.tsx` の `commitRename` で `profiles.some((p, i) => i !== index && p.name === newName)` チェックを追加済み。

**ファイル:** `src/components/layout/SideMenu.tsx` (行 81–89)

```typescript
const commitRename = (index: number) => {
  const newName = renameValue.trim();
  if (!newName) { setRenamingIndex(null); return; }
  const newProfiles = profiles.map((p, i) => (i === index ? { ...p, name: newName } : p));
  saveProfiles(newProfiles); // ❌ 重複チェックなし
  ...
};
```

**問題点:**

- 4-1（プロファイル保存時の重複チェックなし）と同一パターン。
- リネーム先の名前が既存プロファイルと重複していても保存できてしまう。
- `saveProfile` 関数も重複チェックがないため、新規保存・リネームの両方で同名プロファイルが生まれる。

---

### 4-11. `CustomSelect` のキーボードアクセシビリティ欠如

> ✅ **解決済み** — `src/components/ui/CustomSelect.tsx` に `role="combobox"`・`aria-haspopup="listbox"`・`aria-expanded`・`aria-activedescendant`・`aria-controls` を追加。`tabIndex={0}` で Tab フォーカス可能に。`onKeyDown` で `Enter`/`Space`（開く・選択）、`ArrowDown`/`ArrowUp`（ハイライト移動）、`Escape`（閉じる）を実装。オプション側には `role="listbox"` / `role="option"` / `aria-selected` を付与。`aria-label` prop も追加済み。

**ファイル:** `src/components/ui/CustomSelect.tsx`

**問題点:**

- `CustomSelect` コンポーネントにキーボードナビゲーション（`Enter`・`ArrowUp`・`ArrowDown`・`Escape`）が実装されていない。
- `role="combobox"` / `aria-expanded` / `aria-activedescendant` などの WAI-ARIA 属性が付与されていない。
- キーボードのみで操作するユーザーやスクリーンリーダーユーザーはソート・フィルターを変更できない。
- アプリ全体で `CustomSelect` が多用されているため影響範囲が広い。

---

### 4-12. `useScrollLock` のモジュールレベル変数 `lockCount`

> ✅ **解決済み** — `src/hooks/useScrollLock.ts` に `__resetScrollLock()` 関数を追加エクスポート。テストの teardown で呼ぶことで `lockCount` を 0 にリセットし、`modal-open` クラスも除去できる。本番コードへの影響なし。

**ファイル:** `src/hooks/useScrollLock.ts` (行 3)

```typescript
let lockCount = 0; // ❌ モジュールスコープ — テスト間・HMR で状態が残留する
```

**問題点:**

- `lockCount` はモジュールレベルで宣言されているため、テスト間でリセットされず状態が漏れる。
- 開発時のホットリロード（HMR）でも `lockCount` がリセットされないため、`modal-open` クラスが残り続けるケースがある。
- 本番環境への影響は限定的だが、テストの信頼性に影響する。

---

### 4-13. `modDataMap` のサイズ上限がない

> ✅ **解決済み** — `src/store/useAppStore.ts` の `updateModDataMap` で最大 500 件を上限とし、超過時に古いエントリを削除するよう修正済み。

**ファイル:** `src/store/useAppStore.ts` (行 420–422)

```typescript
updateModDataMap: (updates) => {
  set((state) => ({ modDataMap: { ...state.modDataMap, ...updates } })); // ❌ 無制限に蓄積
},
```

**問題点:**

- 2-3（翻訳キャッシュのメモリリーク）と同一パターン。
- 閲覧した mod の数だけエントリが増え続け、長時間のセッションでメモリを圧迫する。
- `modDataMap` は `localStorage` に保存されないため、ページリロードでクリアされるが、SPA として長時間使用する場合は問題になりうる。

**推奨対処:**

LRU ポリシーを実装するか、エントリ数の上限（例: 500）を設け、超えたら古いものから削除する。

---

### 4-14. `HistoryTab` / `HistoryModal` の毎レンダーでの配列コピー

> ✅ **解決済み** — `HistoryTab.tsx` および `HistoryModal.tsx` で `useMemo` による `reversedHistory` を定義し、JSX 内で使用するよう修正済み。

**ファイル:** `src/components/panels/HistoryTab.tsx` (行 40)、`src/components/modals/HistoryModal.tsx` (行 71)

```typescript
{[...contextHistory].reverse().map((entry) => { // ❌ 毎レンダーでスプレッド+reverse
```

**問題点:**

- レンダーごとに `[...contextHistory]` で新配列を生成し、さらに `.reverse()` でインプレース変更する。
- `contextHistory` が長い（最大 50 件）場合でも毎回配列コピーが発生する。
- `useMemo` でメモ化するか、ストア側でエントリを降順で管理することで回避できる。

**推奨対処:**

```typescript
const reversedHistory = useMemo(
  () => [...contextHistory].reverse(),
  [contextHistory],
);
```

---

### 4-15. `ModList` の `t` 変数シャドーイング

> ✅ **解決済み** — `src/components/mods/ModList.tsx` の `useEffect` 内で `const timerId = setTimeout(...)` に改名し、翻訳オブジェクト `t` のシャドーイングを解消済み。

**ファイル:** `src/components/mods/ModList.tsx` (行 23 および 124)

```typescript
// 行 23: 翻訳オブジェクト
const { updateModDataMap, addDebugLog, discoverType, t } = useApp();

// 行 124: useEffect 内で同名の変数を再宣言
const t = setTimeout(() => loadMore(), 0); // ❌ 翻訳 t をシャドーイング
```

**問題点:**

- `useEffect` ブロック内で `const t = setTimeout(...)` が宣言されており、外側の翻訳オブジェクト `t` をシャドーイングする。
- 現在は `t.modList.fetchError` が `loadMore` の `useCallback` 内で参照されるため、実際のバグにはなっていない。
- ただし、将来的に同 `useEffect` 内で翻訳 `t` を使うコードが追加された場合、サイレントバグが発生する。
- 変数名を `timerId` 等に変更すれば即座に解消できる。

---

## 5. まとめ

| 重大度 | 件数 | 解決済み | 未対応 | 主な問題 |
|--------|------|----------|--------|----------|
| 🔴 クリティカル | 4 | **4** | 0 | 環境変数未検証、ローダーフィルターバグ、翻訳・取得のレースコンディション |
| 🟠 高 | 9 | **9** | 0 | 全対応済み |
| 🟡 中 | 13 | **13** | 0 | 全対応済み |
| 🟢 低 | 15 | **14** | 1 | **未対応: テスト不足（4-6）** |
| **合計** | **41** | **40** | **1** | |

### 対応優先度

**✅ 対応済み（デプロイブロッカー）:**

1. ~~`src/lib/facets.ts` — ローダーファセット名バグ修正（`categories:` → `loaders:`）~~ ✅
2. ~~`src/auth.ts` — 環境変数の起動時バリデーション追加~~ ✅

**✅ 対応済み（次のスプリント）:**

3. ~~`src/components/mods/ModDetail.tsx` — `AbortController` を使ったレースコンディション修正~~ ✅
4. ~~`src/hooks/useModDownload.ts` — エラーハンドリングとタイムアウト追加~~ ✅
5. ~~`src/components/layout/SideMenu.tsx` — ZIP サイズ上限とプロファイルインポートバリデーション~~ ✅
6. ~~`src/app/HomeClient.tsx` 等 — `ErrorBoundary` の追加（2-7）~~ ✅
7. ~~`src/components/debug/DebugPanel.tsx` — タイマーリークとクリップボードエラー修正（2-8, 4-7）~~ ✅
8. ~~`src/app/HomeClient.tsx` — `useScrollLock` に一本化して modal-open 競合を解消（2-9）~~ ✅
9. ~~`next.config.mjs` — セキュリティヘッダーの追加（3-11）~~ ✅
10. ~~`useLocalStorage` の `useCallback` 修正~~ ✅
11. ~~`SearchSection` / `LeftPanel` のレンダー中状態更新を `useEffect` に移行（3-7）~~ ✅
12. ~~`useColumnResize` のレイアウトスラッシング修正（3-8）~~ ✅
13. ~~`useGameVersions` / `useCategories` / `useDependencyCheck` に `AbortController` 追加（3-9, 3-10）~~ ✅
    - ~~`ModDetail` の `API.getProject()` に AbortSignal 追加（3-13）~~ ✅
14. ~~`src/store/useAppStore.ts` — `stableStringify` による重複判定修正（3-1）、`Set` による履歴効率化（3-2）~~ ✅
15. ~~`src/app/api/v2/[...path]/route.ts` — CORS ヘッダー追加（3-3）、SWR 上限設定（3-4）、parseInt 修正（3-6）~~ ✅
16. ~~`rateLimitStore` の IP エントリ削除（3-12）~~ ✅
17. ~~`src/components/layout/SideMenu.tsx` — プロファイル重複チェック（4-1, 4-10）、タイマーリーク修正（4-9）~~ ✅
18. ~~`src/components/mods/ModDetail.tsx` — ギャラリーキー修正（4-2）、alt 属性改善（4-3）~~ ✅
19. ~~`src/hooks/useDependencyCheck.ts` — filter 型述語修正（4-4）~~ ✅
20. ~~`src/context/AppContext.tsx` — ESLint 抑制コメントに理由追加（4-5）~~ ✅
21. ~~`src/store/useAppStore.ts` — `modDataMap` 上限追加（4-13）~~ ✅
22. ~~`HistoryTab.tsx` / `HistoryModal.tsx` — `useMemo` で配列コピー最適化（4-14）~~ ✅
23. ~~`src/components/mods/ModList.tsx` — `t` 変数シャドーイング修正（4-15）~~ ✅
24. ~~`src/components/ui/Icon.tsx` — SVG 文字列サニタイズ追加（2-1）~~ ✅
25. ~~`src/components/mods/ModList.tsx` — `loadMore` を refs で安定化（3-5）~~ ✅
26. ~~`src/components/ui/CustomSelect.tsx` — キーボードナビゲーション・ARIA 属性追加（4-11）~~ ✅
27. ~~`src/hooks/useScrollLock.ts` — `__resetScrollLock()` エクスポート追加（4-12）~~ ✅

**未対応（大規模作業のため別セッション）:**

- テストカバレッジの拡充（4-6）: React コンポーネント・カスタムフック・認証フローのテスト追加
