'use client';

import { useApp } from '@/context/AppContext';
import CustomSelect from '@/components/ui/CustomSelect';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import Icon from '@/components/ui/Icon';
import { LOADER_OPTIONS, LOADER_ICON_PATHS } from '@/lib/helpers';
import type { GameVersion } from '@/types/modrinth';

interface SettingsContentProps {
  gameVersions: GameVersion[];
}

export default function SettingsContent({ gameVersions }: SettingsContentProps) {
  const {
    theme, toggleTheme,
    debugMode, toggleDebug,
    advancedConsole, toggleAdvancedConsole,
    fastSearch, toggleFastSearch,
    showCardDescription, toggleShowCardDescription,
    language, toggleLanguage,
    modLoader, updateModLoader,
    modVersion, updateModVersion,
    clearSearchHistory, clearFavorites,
    showConfirm,
    t,
  } = useApp();

  const themeOptions = [
    { value: 'light', label: t.themes.light },
    { value: 'dark',  label: t.themes.dark },
  ];

  const languageOptions = [
    { value: 'en', label: t.languages.en },
    { value: 'ja', label: t.languages.ja },
  ];

  const loaderOptions = [
    { value: '', label: t.loaders.any },
    ...LOADER_OPTIONS.map((o) => ({
      ...o,
      icon: LOADER_ICON_PATHS[o.value]
        ? <Icon svg={LOADER_ICON_PATHS[o.value]} size={16} className="loader-icon-img" />
        : undefined,
    })),
  ];

  const handleClearHistory = async () => {
    if (await showConfirm(t.settings.clearHistory + '?')) clearSearchHistory();
  };

  const handleClearFavorites = async () => {
    if (await showConfirm(t.settings.clearFavorites + '?')) clearFavorites();
  };

  return (
    <>
      <div className="settings-category">
        <h4 className="settings-category-title">{t.settings.categories.mods}</h4>
        <div className="settings-row">
          <div>
            <span className="settings-label">{t.settings.modLoader.label}</span>
            <span className="settings-description">{t.settings.modLoader.description}</span>
          </div>
          <CustomSelect
            className="settings-select"
            options={loaderOptions}
            value={modLoader}
            onChange={updateModLoader}
          />
        </div>
        <div className="settings-row" style={{ marginBottom: 0 }}>
          <div>
            <span className="settings-label">{t.settings.modVersion.label}</span>
            <span className="settings-description">{t.settings.modVersion.description}</span>
          </div>
          <CustomSelect
            className="settings-select"
            options={[
              ...(gameVersions.length > 0
                ? gameVersions.map((v) => ({ value: v.version, label: v.version }))
                : modVersion ? [{ value: modVersion, label: modVersion }] : []),
            ]}
            value={modVersion}
            onChange={updateModVersion}
          />
        </div>
      </div>

      <div className="settings-category">
        <h4 className="settings-category-title">{t.settings.categories.general}</h4>
        <div className="settings-row">
          <div>
            <span className="settings-label">{t.settings.theme.label}</span>
            <span className="settings-description">{t.settings.theme.description}</span>
          </div>
          <CustomSelect
            className="settings-select"
            options={themeOptions}
            value={theme}
            onChange={toggleTheme}
          />
        </div>
        <div className="settings-row">
          <div>
            <span className="settings-label">{t.settings.language.label}</span>
            <span className="settings-description">{t.settings.language.description}</span>
          </div>
          <CustomSelect
            className="settings-select"
            options={languageOptions}
            value={language}
            onChange={toggleLanguage}
          />
        </div>
        <div className="settings-row">
          <div>
            <span className="settings-label">{t.settings.fastSearch.label}</span>
            <span className="settings-description">{t.settings.fastSearch.description}</span>
          </div>
          <ToggleSwitch checked={fastSearch} onChange={toggleFastSearch} />
        </div>
        <div className="settings-row" style={{ marginBottom: 0 }}>
          <div>
            <span className="settings-label">{t.settings.showCardDescription.label}</span>
            <span className="settings-description">{t.settings.showCardDescription.description}</span>
          </div>
          <ToggleSwitch checked={showCardDescription} onChange={toggleShowCardDescription} />
        </div>
      </div>

      <div className="settings-category">
        <h4 className="settings-category-title">{t.settings.categories.data}</h4>
        <div className="settings-row">
          <div>
            <span className="settings-label">{t.settings.clearHistory}</span>
            <span className="settings-description">{t.settings.clearHistoryDesc}</span>
          </div>
          <button onClick={handleClearHistory} className="btn-secondary settings-btn-sm">Clear</button>
        </div>
        <div className="settings-row settings-row-last">
          <div>
            <span className="settings-label">{t.settings.clearFavorites}</span>
            <span className="settings-description">{t.settings.clearFavoritesDesc}</span>
          </div>
          <button onClick={handleClearFavorites} className="btn-secondary settings-btn-sm">Clear</button>
        </div>
      </div>

      <div className="settings-category" style={{ marginBottom: 0 }}>
        <h4 className="settings-category-title">{t.settings.categories.developerMode}</h4>
        <div className="settings-row">
          <div>
            <span className="settings-label">{t.settings.debugMode.label}</span>
            <span className="settings-description">{t.settings.debugMode.description}</span>
          </div>
          <ToggleSwitch checked={debugMode} onChange={toggleDebug} />
        </div>
        <div className="settings-row" style={{ marginBottom: 0 }}>
          <div>
            <span className="settings-label">{t.settings.advancedConsole.label}</span>
            <span className="settings-description">{t.settings.advancedConsole.description}</span>
          </div>
          <ToggleSwitch checked={advancedConsole} onChange={toggleAdvancedConsole} />
        </div>
      </div>
    </>
  );
}
