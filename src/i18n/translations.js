const translations = {
  en: {
    settings: {
      title: 'Settings',
      theme: { label: 'Theme', description: 'Select light or dark theme' },
      fastSearch: { label: 'Fast Search', description: 'Auto-search 500ms after input (search button hidden)' },
      debugMode: { label: 'Debug Mode', description: 'Show floating developer console' },
      language: { label: 'Language', description: 'Select display language' },
      close: 'Close',
    },
    search: {
      loader: 'Loader',
      version: 'Version',
      placeholder: 'Search mods...',
    },
    themes: { light: 'Light', dark: 'Dark' },
    languages: { en: 'English', ja: '日本語' },
    loaders: { any: 'Any' },
  },
  ja: {
    settings: {
      title: '設定',
      theme: { label: 'テーマ', description: 'ライト/ダークテーマを選択' },
      fastSearch: { label: '高速検索', description: '入力後500msで自動検索（検索ボタン非表示）' },
      debugMode: { label: 'デバッグモード', description: 'フローティングデベロッパーコンソールを表示' },
      language: { label: '言語', description: '表示言語を選択' },
      close: '閉じる',
    },
    search: {
      loader: 'Loader',
      version: 'バージョン',
      placeholder: 'Modを検索...',
    },
    themes: { light: 'ライト', dark: 'ダーク' },
    languages: { en: 'English', ja: '日本語' },
    loaders: { any: 'すべて' },
  },
};

export default translations;
