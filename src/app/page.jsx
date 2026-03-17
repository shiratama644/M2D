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

const DEFAULT_SEARCH = {
  query: '',
  sort: 'relevance',
  filters: {
    loaders: Object.fromEntries(LOADER_OPTIONS.map((o) => [o.value, null])),
    version: '',
  },
};

export default function HomePage() {
  const {
    theme,
    menuOpen, selectedModalOpen,
    depModalOpen, setDepModalOpen,
    settingsOpen,
    dialog,
    addDebugLog,
    addSearchHistory,
    activeModId,
    t,
  } = useApp();

  const isDesktop = useIsDesktop();
  const [searchParams, setSearchParams] = useState(DEFAULT_SEARCH);

  // Mobile detail modal – tracks whether the user explicitly closed it.
  // Comparing prevActiveModId during render (instead of in useEffect) is the
  // React-recommended way to reset derived state when a dependency changes.
  const [mobileDetailClosed, setMobileDetailClosed] = useState(false);
  const [prevActiveModId, setPrevActiveModId] = useState(null);
  if (prevActiveModId !== activeModId) {
    setPrevActiveModId(activeModId);
    if (mobileDetailClosed) setMobileDetailClosed(false);
  }
  const mobileDetailOpen = !isDesktop && !!activeModId && !mobileDetailClosed;
  const closeMobileDetail = () => setMobileDetailClosed(true);

  // Resizable three-column layout
  const { leftWidth, rightWidth, centerWidth, layoutRef, onColResizeStart } = useColumnResize({
    minLeft: 10, maxLeft: 40,
    minRight: 15, maxRight: 50,
  });

  // Download hook (exposes resolveDownloadSettings for dep-check too)
  const { handleDownload, resolveDownloadSettings } = useModDownload(searchParams);

  // Dep-check hook – wires in resolveSettings and result callback
  const [depIssues, setDepIssues] = useState(null);
  const { handleCheckDeps } = useDependencyCheck(searchParams, resolveDownloadSettings, setDepIssues);

  // Apply theme to <body>
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // Prevent scroll when a modal/menu is open
  useEffect(() => {
    const isOpen =
      menuOpen || selectedModalOpen || depModalOpen || settingsOpen || mobileDetailOpen || !!dialog;
    document.body.classList.toggle('modal-open', isOpen);
  }, [menuOpen, selectedModalOpen, depModalOpen, settingsOpen, mobileDetailOpen, dialog]);

  const handleSearch = ({ query, sort, filters }) => {
    setSearchParams({ query, sort, filters });
    addDebugLog('info', `Search: query="${query}" sort=${sort}`);
    if (query?.trim()) addSearchHistory(query.trim());
  };

  const handleLeftPanelFilter = (filters) => {
    setSearchParams((prev) => ({ ...prev, filters }));
  };

  const handleHistorySearch = (query) => {
    setSearchParams((prev) => ({ ...prev, query }));
    addSearchHistory(query);
  };

  return (
    <>
      <Header />
      <SideMenu />

      {isDesktop ? (
        /* ── PC: 3-column resizable layout ── */
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
            <ModList searchParams={searchParams} isDesktop />
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
        /* ── Mobile: single-column layout ── */
        <div className="layout-center">
          <SearchSection onSearch={handleSearch} />
          <ModList searchParams={searchParams} isDesktop={false} />
        </div>
      )}

      {!isDesktop && (
        <ActionBar onCheckDeps={handleCheckDeps} onDownload={handleDownload} />
      )}

      {/* Mobile mod-detail modal */}
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
