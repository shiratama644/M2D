'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/layout/Header';
import SideMenu from '../components/layout/SideMenu';
import SearchSection from '../components/search/SearchSection';
import ActionBar from '../components/search/ActionBar';
import ModList from '../components/mods/ModList';
import ModDetail from '../components/mods/ModDetail';
import LeftPanel from '../components/panels/LeftPanel';
import RightPanel from '../components/panels/RightPanel';
import SettingsModal from '../components/modals/SettingsModal';
import DependencyModal from '../components/modals/DependencyModal';
import SelectedModal from '../components/modals/SelectedModal';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import DebugPanel from '../components/debug/DebugPanel';
import CustomDialog from '../components/ui/CustomDialog';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useColumnResize } from '../hooks/useColumnResize';
import { useModDownload } from '../hooks/useModDownload';
import { useDependencyCheck } from '../hooks/useDependencyCheck';
import { LOADER_OPTIONS } from '../lib/helpers';
import type { ModHit } from '../types/modrinth';
import type { DepIssues, SearchParams } from '../hooks/useDependencyCheck';

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
    dialog,
    addDebugLog,
    addSearchHistory,
    activeModId,
    t,
  } = useApp();

  const isDesktop = useIsDesktop();
  const [searchParams, setSearchParams] = useState<SearchParams>(DEFAULT_SEARCH);

  const [mobileDetailClosed, setMobileDetailClosed] = useState(false);
  const [prevActiveModId, setPrevActiveModId] = useState<string | null>(null);
  if (prevActiveModId !== activeModId) {
    setPrevActiveModId(activeModId);
    if (mobileDetailClosed) setMobileDetailClosed(false);
  }
  const mobileDetailOpen = !isDesktop && !!activeModId && !mobileDetailClosed;
  const closeMobileDetail = () => setMobileDetailClosed(true);

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

  useEffect(() => {
    const isOpen = menuOpen || mobileDetailOpen;
    document.body.classList.toggle('modal-open', isOpen);
  }, [menuOpen, mobileDetailOpen]);

  const handleSearch = ({ query, sort, filters }: SearchParams) => {
    setSearchParams({ query, sort, filters });
    addDebugLog('info', `Search: query="${query}" sort=${sort}`);
    if (query?.trim()) addSearchHistory(query.trim());
  };

  const handleLeftPanelFilter = (filters: SearchParams['filters']) => {
    setSearchParams((prev) => ({ ...prev, filters }));
  };

  const handleHistorySearch = (query: string) => {
    setSearchParams((prev) => ({ ...prev, query }));
    addSearchHistory(query);
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
            <ModList searchParams={searchParams} isDesktop initialMods={initialMods} />
            <div className="pc-action-bar">
              <ActionBar onCheckDeps={handleCheckDeps} onDownload={handleDownload} />
            </div>
          </main>
          <div
            className="pc-column-resizer"
            onMouseDown={(e) => onColResizeStart('right', e)}
          />
          <aside className="pc-right-panel" style={{ width: `${rightWidth}%` }}>
            <RightPanel onHistorySearch={handleHistorySearch} />
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
      <LoadingOverlay />
      {!isDesktop && <DebugPanel />}
      <CustomDialog />
    </>
  );
}
