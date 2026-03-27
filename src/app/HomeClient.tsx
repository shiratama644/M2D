'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Header from '@/components/layout/Header';
import SideMenu from '@/components/layout/SideMenu';
import SearchSection from '@/components/search/SearchSection';
import ActionBar from '@/components/search/ActionBar';
import ModList from '@/components/mods/ModList';
import ModDetail from '@/components/mods/ModDetail';
import LeftPanel from '@/components/panels/LeftPanel';
import RightPanel from '@/components/panels/RightPanel';
import SettingsModal from '@/components/modals/SettingsModal';
import DependencyModal from '@/components/modals/DependencyModal';
import SelectedModal from '@/components/modals/SelectedModal';
import HistoryModal from '@/components/modals/HistoryModal';
import FavoritesModal from '@/components/modals/FavoritesModal';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import DebugPanel from '@/components/debug/DebugPanel';
import CustomDialog from '@/components/ui/CustomDialog';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useColumnResize } from '@/hooks/useColumnResize';
import { useModDownload } from '@/hooks/useModDownload';
import { useDependencyCheck } from '@/hooks/useDependencyCheck';
import { useScrollLock } from '@/hooks/useScrollLock';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { LOADER_OPTIONS } from '@/lib/helpers';
import type { ModHit } from '@/types/modrinth';
import type { DepIssues, SearchParams } from '@/hooks/useDependencyCheck';
import type { SearchContextEntry } from '@/store/useAppStore';

const DEFAULT_SEARCH: SearchParams = {
  query: '',
  sort: 'relevance',
  filters: {
    loaders: Object.fromEntries(LOADER_OPTIONS.map((o) => [o.value, null])),
    version: '',
  },
};

export default function HomeClient({ initialMods }: { initialMods: ModHit[] | null }) {
  const {
    theme,
    menuOpen,
    selectedModalOpen,
    depModalOpen,
    setDepModalOpen,
    settingsOpen,
    historyModalOpen,
    setHistoryModalOpen,
    favoritesModalOpen,
    setFavoritesModalOpen,
    dialog,
    addDebugLog,
    addSearchHistory,
    activeModId,
    setActiveModId,
    discoverType,
    setDiscoverType,
    addContextHistory,
    t,
  } = useApp();

  const isDesktop = useIsDesktop();
  const [searchParams, setSearchParams] = useState<SearchParams>(DEFAULT_SEARCH);

  const mobileDetailOpen = !isDesktop && !!activeModId;
  const closeMobileDetail = () => setActiveModId(null);

  const { leftWidth, rightWidth, centerWidth, layoutRef, onColResizeStart } = useColumnResize({
    minLeft: 10, maxLeft: 40,
    minRight: 15, maxRight: 50,
  });

  const { handleDownload, resolveDownloadSettings } = useModDownload(searchParams);

  const [depIssues, setDepIssues] = useState<DepIssues | null>(null);
  const { handleCheckDeps } = useDependencyCheck(searchParams, resolveDownloadSettings, setDepIssues);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useScrollLock(menuOpen || mobileDetailOpen);

  const handleSearch = ({ query, sort, filters }: SearchParams) => {
    setSearchParams({ query, sort, filters });
    addDebugLog('info', `Search: query="${query}" sort=${sort}`);
    if (query?.trim()) addSearchHistory(query.trim());
    // Write a committed search context snapshot (dedup handled in store).
    addContextHistory({ query, sort, filters, projectType: discoverType });
  };

  const handleLeftPanelFilter = (filters: SearchParams['filters']) => {
    const next = { ...searchParams, filters };
    setSearchParams(next);
    // Filter change is a committed action — record a snapshot.
    addContextHistory({ query: next.query, sort: next.sort, filters: next.filters, projectType: discoverType });
  };

  // Constraint 3: restoring from history is a full overwrite — no partial merges.
  const handleContextRestore = (entry: SearchContextEntry) => {
    setSearchParams({ query: entry.query, sort: entry.sort, filters: entry.filters });
    setDiscoverType(entry.projectType);
  };

  return (
    <>
      <Header />
      <SideMenu />

      {isDesktop ? (
        <div ref={layoutRef} className="pc-layout">
          <aside className="pc-left-panel" style={{ width: `${leftWidth}%` }}>
            <LeftPanel onFilterChange={handleLeftPanelFilter} />
          </aside>
          <div
            className="pc-column-resizer"
            onMouseDown={(e) => onColResizeStart('left', e)}
          />
          <main className="pc-center-panel" style={{ width: `${centerWidth}%` }}>
            <SearchSection onSearch={handleSearch} />
            <ErrorBoundary fallback={<div className="mod-detail-empty"><p>Failed to load mod list.</p></div>}>
              <ModList searchParams={searchParams} isDesktop initialMods={initialMods} />
            </ErrorBoundary>
            <div className="pc-action-bar">
              <ActionBar onCheckDeps={handleCheckDeps} onDownload={handleDownload} />
            </div>
          </main>
          <div
            className="pc-column-resizer"
            onMouseDown={(e) => onColResizeStart('right', e)}
          />
          <aside className="pc-right-panel" style={{ width: `${rightWidth}%` }}>
            <ErrorBoundary fallback={<div className="mod-detail-empty"><p>Failed to load details.</p></div>}>
              <RightPanel onContextRestore={handleContextRestore} />
            </ErrorBoundary>
          </aside>
        </div>
      ) : (
        <div className="layout-center">
          <SearchSection onSearch={handleSearch} />
          <ModList searchParams={searchParams} isDesktop={false} initialMods={initialMods} />
        </div>
      )}

      {!isDesktop && (
        <ActionBar onCheckDeps={handleCheckDeps} onDownload={handleDownload} />
      )}

      {mobileDetailOpen && activeModId && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && closeMobileDetail()}
        >
          <div className="modal-container large" style={{ maxHeight: '85vh' }}>
            <div className="modal-header">
              <h3 className="modal-title">{t.rightPanel.description}</h3>
              <button onClick={closeMobileDetail} className="btn-close-modal">✕</button>
            </div>
            <div className="modal-body">
              <ModDetail />
            </div>
          </div>
        </div>
      )}

      <SettingsModal />
      {depModalOpen && depIssues && (
        <DependencyModal issues={depIssues} onClose={() => setDepModalOpen(false)} />
      )}
      <SelectedModal />
      {historyModalOpen && (
        <HistoryModal
          onContextRestore={handleContextRestore}
          onClose={() => setHistoryModalOpen(false)}
        />
      )}
      {favoritesModalOpen && (
        <FavoritesModal onClose={() => setFavoritesModalOpen(false)} />
      )}
      <LoadingOverlay />
      {!isDesktop && <DebugPanel />}
      <CustomDialog />
    </>
  );
}
