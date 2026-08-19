# M2D Engine

M2D 専用の機能バスです。検索・選択・ダウンロード・依存解析・プロファイルをイベントで一括管理し、新機能は `src/engine/features/` に足します。

## 追加の手順

1. `src/engine/features/<id>.ts` を作る。
2. `Feature` を export する。
3. `src/engine/features/catalog.ts` の配列に 1 行追加する。

```ts
import type { Feature } from '../types';

export const myFeature: Feature = {
  id: 'my-feature',
  label: 'My feature',
  mount(engine) {
    return engine.on('search.commit', (payload) => {
      // ...
    });
  },
};
```

新しいイベントが必要なら `src/engine/types.ts` の `EngineEventMap` にキーを足します。

## 既存イベント

| イベント | 役割 |
|---|---|
| `search.commit` | 検索確定。履歴スナップショットを書く |
| `search.restore` | 履歴から復元したことを通知 |
| `selection.clear` | 選択を空にする |
| `download.start` | UI が ZIP ダウンロードを開始 |
| `dependency.check` | UI が依存解析を開始 |
| `profiles.save` / `profiles.load` | プロファイル保存・読込 |

ダウンロードと依存解析の実処理は React フック側に残しています。`HomeClient` がマウント時にこれらのイベントへハンドラを接続します。
