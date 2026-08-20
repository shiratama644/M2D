# M2D Engine

M2D 専用の機能バスです。検索・選択・ダウンロード・依存解析・プロファイル・取得をイベントとコマンドで一括管理します。

## 追加の手順

1. `src/engine/features/<id>.ts` に `Feature` を書く。
2. `src/engine/features/catalog.ts` の配列に 1 行追加する。
3. 新しい事件が要れば `src/engine/types.ts` の `EngineEventMap` にキーを足す。

```ts
export const myFeature: Feature = {
  id: 'my-feature',
  label: 'My feature',
  dependsOn: ['search'],
  mount(engine) {
    return engine.on('search.commit', (payload) => {
      // ...
    }, { priority: 10 });
  },
};
```

`dependsOn` がある Feature は依存先のあとで mount されます。`engine.setEnabled(id, false)` で一時停止できます。

画面は `useEngine().emit` / `dispatch` だけ。Zustand への書き込みは Feature 内の `useAppStore.getState()` のみ。`API.*` は catalog Feature だけが呼ぶ。

## イベントとコマンド

| 名前 | 種類 | 役割 |
|---|---|---|
| `search.commit` | event | 検索確定。履歴を書く |
| `search.restore` | event | 履歴復元の通知 |
| `search.history.clear` | event | 検索・コンテキスト履歴を全消去 |
| `search.history.remove` | event | コンテキスト履歴の1件削除 |
| `selection.clear` / `toggle` / `add` / `remove` / `replace` | event | 選択操作 |
| `favorites.toggle` / `clear` | event | お気に入り |
| `mods.activate` | event | 詳細に出す Mod |
| `discover.set` | event | Discover 種別 |
| `settings.theme` / `language` / `loader` / `version` / `flag` | event | 設定 |
| `ui.open` / `ui.close` | event | メニュー・モーダル |
| `download.start` | command | ZIP ダウンロード（UI が `bind`） |
| `dependency.check` | command | 依存解析（UI が `bind`） |
| `profiles.save` / `load` / `delete` / `rename` / `import` | event | プロファイル |
| `auth.signIn` / `auth.signOut` | event | 認証 |
| `catalog.search` / `project` / `projects` / `versions` / `versionsBulk` / `gameVersions` / `categories` / `versionFile` | command | Modrinth 取得（catalog Feature） |
| `engine.error` | event | ハンドラ例外（他ハンドラは止まらない） |

コマンドは `engine.dispatch(name, payload)`。payload は必須（`signal` などを渡す）。`HomeClient` が download / dependency を `engine.bind` します。

## 診断

`engine.status()` で Feature の有効/マウント状態、`engine.recentJournal()` で直近の事件ログを取れます。

## 繰り返し処理（runtime）

同じパターンが 2 回出たら Feature や画面にコピーせず `src/engine/runtime/` に上げる。

- `runAbortable` / `isAbortError` — キャンセル可能な取得
- `withLoading` — ローディングオーバーレイ
- `engineAlert` / `engineConfirm` — ダイアログ
