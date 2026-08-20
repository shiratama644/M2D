# M2D Engine

M2D 専用の機能バスです。検索・選択・ダウンロード・依存解析・プロファイルをイベントとコマンドで一括管理します。

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

## イベントとコマンド

| 名前 | 種類 | 役割 |
|---|---|---|
| `search.commit` | event | 検索確定。履歴を書く |
| `search.restore` | event | 履歴復元の通知 |
| `selection.clear` / `selection.toggle` | event | 選択操作 |
| `download.start` | command | ZIP ダウンロード（UI が `bind`） |
| `dependency.check` | command | 依存解析（UI が `bind`） |
| `profiles.save` / `profiles.load` | event | プロファイル |
| `engine.error` | event | ハンドラ例外（他ハンドラは止まらない） |

コマンドは `engine.dispatch('download.start')`。`HomeClient` がフックを `engine.bind` します。

## 診断

`engine.status()` で Feature の有効/マウント状態、`engine.recentJournal()` で直近の事件ログを取れます。

## 繰り返し処理（runtime）

同じパターンが 2 回出たら Feature や画面にコピーせず `src/engine/runtime/` に上げる。

- `runAbortable` / `isAbortError` — キャンセル可能な取得
- `withLoading` — ローディングオーバーレイ
- `engineAlert` / `engineConfirm` — ダイアログ

