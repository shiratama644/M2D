# M2D Engine 全面移行 計画書

**状態:** 完了。操作＋取得は Engine 経由。書き込みは Feature のみ。  
ログインは後で削除した。`auth` Feature と `auth.signIn` / `auth.signOut` は無い。  
**前提（クイズ回答）**

- 範囲: **ユーザー操作＋データ取得**
- 書き込み: **コンポーネントはストアを直接書かない。必ずエンジン経由**
- UI: 見た目は維持。配線・診断のための小さな変更は可
- 進め方: 段階的。先に本計画、承認後に実装

---

## 1. ゴール

画面・フックは「入力と表示」だけを担当する。  
**意図（intent）と取得（fetch）はすべて Engine の事件 / コマンド** にする。

```
UI / Hook
  → engine.emit / engine.dispatch
    → Feature（search, selection, catalog, …）
      → Zustand（唯一の書き込み点）
        → UI が購読して描画
```

Zustand は残す。ただし **書き込みは Feature 内の `useAppStore.getState()` のみ**。  
コンポーネントから `addMod` / `toggleFavorite` / `saveProfiles` などを直接呼ばない。

---

## 2. 対象と非対象

### 通す（ユーザー操作）

| 意図 | 事件 / コマンド | 今の呼び出し元 |
|---|---|---|
| 検索確定・フィルタ確定 | `search.commit` | HomeClient, SearchSection, LeftPanel |
| 履歴から復元 | `search.restore` | HistoryTab / HistoryModal |
| 選択 ON/OFF・全解除・置換 | `selection.toggle` / `clear` / `replace` | ModCard, ActionBar, 依存モーダル, お気に入り |
| お気に入り ON/OFF・全消去 | `favorites.toggle` / `clear` | ModCard, FavoritesTab, Settings |
| 詳細を開く | `mods.activate` | ModCard, HomeClient |
| Discover 種別 | `discover.set` | Header / Search |
| テーマ・言語・ローダー等 | `settings.*` | SettingsContent |
| ダウンロード | `download.start`（command） | ActionBar → 既存フックを bind |
| 依存解析 | `dependency.check`（command） | ActionBar → 既存フックを bind |
| プロファイル CRUD / ZIP・TXT | `profiles.*` | SideMenu |
| ログイン / ログアウト | `auth.signIn` / `auth.signOut` | AccountClient |
| ダイアログ結果 | 既存 `showAlert` は Feature から呼ぶ | CustomDialog は表示専用 |

### 通す（データ取得）

| 取得 | コマンド | 今の呼び出し元 |
|---|---|---|
| 検索ヒット | `catalog.search` | ModList |
| プロジェクト詳細 | `catalog.project` | ModDetail |
| 複数プロジェクト | `catalog.projects` | useResolveProjects |
| バージョン一覧 | `catalog.versions` | useModDownload, useDependencyCheck |
| ゲームバージョン | `catalog.gameVersions` | useGameVersions |
| カテゴリ | `catalog.categories` | useCategories |
| ハッシュ→バージョン | `catalog.versionFile` | SideMenu ZIP |

取得結果は Feature が `modDataMap` 等へ書き、必要なら `catalog.ready` を emit する。  
フックは「エンジンに頼んで、ストア/ローカル state を待つ」形に薄くする。

### 通さない（この移行ではやらない）

- 入力中の1文字ごとの `setState`（検索ボックスの未確定入力）
- カラムリサイズ中のマウス座標
- CSS / テーマ属性の DOM 直接操作（`data-theme` は settings Feature が1回書くのは可）
- Zustand の廃止、サーバー API ルートの作り直し
- 実行時の外部プラグイン読込

---

## 3. エンジン側の拡張（実装時）

`EngineEventMap` / `EngineCommandName` を上表どおり増やす。

新しい Feature 案:

| Feature | 責務 |
|---|---|
| `search` | 履歴（既存） |
| `selection` | 選択（既存＋ replace） |
| `favorites` | お気に入り |
| `settings` | テーマ・言語・ローダー・デバッグ等 |
| `catalog` | Modrinth 取得の唯一の出口（`API.*` はここに集約） |
| `download` / `dependency` | command の受け口（実処理はフック bind のまま可） |
| `profiles` | 保存・読込・改名・削除・import |
| `auth` | signIn / signOut |
| `diagnostics` | journal / エラー（既存） |

`catalog` が `API` を包むことで、「データ取得もエンジン経由」を満たす。

### 繰り返し処理はエンジンへ（Go 前から適用）

同じパターンが **2 回以上** 出たら、Feature や画面にコピーせず `src/engine/runtime/` に上げる。

| ランタイム | 用途 | 既に出ている場所 |
|---|---|---|
| `runAbortable` / `isAbortError` | 取得のキャンセル | ModList, ModDetail, useCategories, useGameVersions, useResolveProjects |
| `withLoading` | オーバーレイ＋進捗 | ダウンロード、依存解析、ZIP 取り込み |
| `engineAlert` / `engineConfirm` | 確認・通知 | プロファイル、DL 失敗、依存エラー |

移行中に「また同じ try/finally だ」となったら、その段階で runtime に足してから Feature を書く。

---

## 4. UI の直し方

各コンポーネント:

```ts
// Before
const { toggleMod } = useApp();
onClick={() => toggleMod(id)};

// After
const engine = useEngine();
onClick={() => { void engine.emit('selection.toggle', { id }); }};
```

読み取りは今どおり `useApp()` / `useAppStore`。

小さな UI 変更の例:

- エンジン未 bind のコマンドは journal に失敗が残る（画面は現状どおり無効化しない）
- デバッグコンソールに Feature 一覧を足すかは任意（本計画の必須ではない）

---

## 5. 段階（承認後の実装順）

各段階のあと `pnpm test` を通す。

1. **事件・コマンド型の拡張**と空/薄い Feature 追加（catalog, favorites, settings, auth）
2. **書き込みの移設** — 選択・お気に入り・設定・プロファイル・アクティブ Mod
3. **取得の移設** — `useResolveProjects` / `useGameVersions` / `useCategories` / ModList / ModDetail が catalog コマンドを使う
4. **残りの入口** — SideMenu ZIP/TXT、Account、Settings のクリア系
5. **点検** — コンポーネントからストア書き込みが残っていないか grep。テスト追加。`docs/ENGINE.md` 更新

サイドメニューのプロファイルは、可能なら既存の `profiles.save` / `load` に `rename` / `delete` / `importZip` を足す。

---

## 6. テスト

- 新事件ごとに Feature 単体テスト（ストアがどう変わるか）
- catalog は `API` を mock（既存 modrinth テストと同じ流儀）
- 既存 342 件は維持。壊れたらその段階で直す
- UI テストは「クリック → ストアが変わる」を、必要なら `EngineProvider` で包む

---

## 7. リスクと回避

| リスク | 回避 |
|---|---|
| 事件の二重処理（HomeClient と Feature が両方履歴を書く） | 書き込みは Feature だけ。UI は emit のみ |
| 取得のレース | 既存の AbortController を catalog コマンドに引き継ぐ |
| 循環 import | Feature は `useAppStore.getState()` のみ。フックは engine を呼ぶ |
| 巨大 PR | 段階ごとにコミット。見た目は変えない |

---

## 8. 承認してほしいこと

実装開始前に、次を確認してください。

1. 上の「通す / 通さない」でよいか  
2. 取得は `catalog.*` コマンドにまとめてよいか  
3. 段階 1→5 の順でよいか  
4. この計画で **Go** か、修正してからか  

**Go をもらってから** コードを変更します。
