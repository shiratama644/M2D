import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from './context/AppContext';
import Header from './components/Header';
import SideMenu from './components/SideMenu';
import SearchSection from './components/SearchSection';
import ModList from './components/ModList';
import ActionBar from './components/ActionBar';
import SettingsModal from './components/SettingsModal';
import DependencyModal from './components/DependencyModal';
import SelectedModal from './components/SelectedModal';
import LoadingOverlay from './components/LoadingOverlay';
import DebugPanel from './components/DebugPanel';
import CustomDialog from './components/CustomDialog';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import ModDetail from './components/ModDetail';
import { API } from './utils/api';
import { asyncPool, CONCURRENCY_LIMIT, LOADER_OPTIONS } from './utils/helpers';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const DEFAULT_SEARCH = {
  query: '',
  sort: 'relevance',
  filters: {
    loaders: Object.fromEntries(LOADER_OPTIONS.map(o => [o.value, null])),
    version: '',
  },
};

// Column resize constraints (percentages)
const MIN_LEFT_WIDTH = 10;
const MAX_LEFT_WIDTH = 40;
const MIN_RIGHT_WIDTH = 15;
const MAX_RIGHT_WIDTH = 50;

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

export default function App() {
  const {
    theme,
    menuOpen, selectedModalOpen,
    selectedMods,
    modDataMap, updateModDataMap,
    showLoading, updateLoading, showProgress, updateProgress, hideLoading,
    depModalOpen, setDepModalOpen,
    settingsOpen,
    dialog,
    showAlert, showConfirm,
    addDebugLog,
    modLoader, modVersion,
    addSearchHistory,
    activeModId,
    t,
  } = useApp();

  const isDesktop = useIsDesktop();
  const [searchParams, setSearchParams] = useState(DEFAULT_SEARCH);
  const [depIssues, setDepIssues] = useState(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Resizable columns state (percentages)
  const [leftWidth, setLeftWidth] = useState(20);
  const [rightWidth, setRightWidth] = useState(30);
  const layoutRef = useRef(null);
  const draggingCol = useRef(null);

  const onColResizeStart = useCallback((which, e) => {
    e.preventDefault();
    draggingCol.current = which;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!draggingCol.current || !layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = (x / rect.width) * 100;

      if (draggingCol.current === 'left') {
        const clamped = Math.min(MAX_LEFT_WIDTH, Math.max(MIN_LEFT_WIDTH, pct));
        setLeftWidth(clamped);
      } else if (draggingCol.current === 'right') {
        const newRight = 100 - pct;
        const clamped = Math.min(MAX_RIGHT_WIDTH, Math.max(MIN_RIGHT_WIDTH, newRight));
        setRightWidth(clamped);
      }
    };
    const onMouseUp = () => {
      if (!draggingCol.current) return;
      draggingCol.current = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Apply theme to body
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // Prevent scroll when modal/menu open
  useEffect(() => {
    const isOpen = menuOpen || selectedModalOpen || depModalOpen || settingsOpen || mobileDetailOpen || !!dialog;
    document.body.classList.toggle('modal-open', isOpen);
  }, [menuOpen, selectedModalOpen, depModalOpen, settingsOpen, mobileDetailOpen, dialog]);

  // Open mobile detail modal when activeModId changes on mobile
  useEffect(() => {
    if (!isDesktop && activeModId) {
      setMobileDetailOpen(true);
    }
  }, [activeModId, isDesktop]);

  const handleSearch = ({ query, sort, filters }) => {
    setSearchParams({ query, sort, filters });
    addDebugLog('info', `Search: query="${query}" sort=${sort}`);
    if (query && query.trim()) addSearchHistory(query.trim());
  };

  const handleLeftPanelFilter = (filters) => {
    setSearchParams(prev => ({ ...prev, filters }));
  };

  const handleHistorySearch = (query) => {
    setSearchParams(prev => ({ ...prev, query }));
    addSearchHistory(query);
  };

  // Derive effective loader/version from filter settings for download
  const getEffectiveDownloadSettings = useCallback(() => {
    const filterLoaders = searchParams.filters?.loaders || {};
    const includedLoaders = Object.entries(filterLoaders)
      .filter(([, v]) => v === 'include')
      .map(([k]) => k);
    const filterVersion = searchParams.filters?.version || '';

    const effectiveLoader = includedLoaders.length === 1 ? includedLoaders[0] : modLoader;
    const effectiveVersion = filterVersion.trim() || modVersion;

    return { effectiveLoader, effectiveVersion };
  }, [searchParams, modLoader, modVersion]);

  // Returns { proceed: boolean, loader: string, version: string }
  const resolveDownloadSettings = useCallback(async () => {
    const { effectiveLoader, effectiveVersion } = getEffectiveDownloadSettings();
    const mismatches = [];
    if (effectiveLoader && modLoader && effectiveLoader !== modLoader) {
      mismatches.push(`Loader: ${t.settings.modLoader.label} = ${modLoader}, ${t.filters.label} = ${effectiveLoader}`);
    }
    if (effectiveVersion && modVersion && effectiveVersion !== modVersion) {
      mismatches.push(`Version: ${t.settings.modVersion.label} = ${modVersion}, ${t.filters.label} = ${effectiveVersion}`);
    }
    if (mismatches.length > 0) {
      const msg = `${t.settings.title} / ${t.filters.label} mismatch:\n${mismatches.join('\n')}\n\nDownload using filter settings?`;
      const useFilter = await showConfirm(msg);
      if (useFilter) {
        return { proceed: true, loader: effectiveLoader, version: effectiveVersion };
      }
      return { proceed: false, loader: modLoader, version: modVersion };
    }
    return { proceed: true, loader: modLoader, version: modVersion };
  }, [getEffectiveDownloadSettings, modLoader, modVersion, showConfirm, t]);

  const handleCheckDeps = async () => {
    if (selectedMods.size === 0) return;

    const settings = await resolveDownloadSettings();
    if (!settings.proceed) return;
    const { loader: useLoader, version: useVersion } = settings;

    addDebugLog('info', `Checking dependencies for ${selectedMods.size} mods...`);
    showLoading('Analyzing Dependencies...');

    const issues = { required: [], optional: [], conflict: [] };
    const missingModIds = new Set();

    try {
      const ids = Array.from(selectedMods);
      let completed = 0;
      const startTime = Date.now();
      showProgress(ids.length);

      const results = await asyncPool(CONCURRENCY_LIMIT, ids, async (pid) => {
        const modName = modDataMap[pid]?.title || pid;
        try {
          const versions = await API.getVersions(pid, useLoader, useVersion);
          addDebugLog('log', `Fetched versions for ${modName} (${versions?.length ?? 0} found)`);
          return versions?.length ? { modName, dependencies: versions[0].dependencies } : null;
        } catch (e) {
          addDebugLog('error', `Failed to fetch versions for ${modName}: ${e}`);
          return null;
        } finally {
          completed++;
          updateProgress(completed, ids.length, startTime);
        }
      });

      const allDeps = [];
      const versionIdsToResolve = new Set();

      results.filter(Boolean).forEach(res => {
        res.dependencies?.forEach(dep => {
          if (dep.project_id) {
            allDeps.push({ source: res.modName, dep });
          } else if (dep.version_id) {
            allDeps.push({ source: res.modName, dep });
            versionIdsToResolve.add(dep.version_id);
          }
        });
      });

      const versionToProjectId = {};
      if (versionIdsToResolve.size > 0) {
        updateLoading('Resolving version IDs...');
        try {
          const vData = await API.getVersionsBulk(Array.from(versionIdsToResolve));
          if (Array.isArray(vData)) {
            vData.forEach(v => { versionToProjectId[v.id] = v.project_id; });
            addDebugLog('log', `Resolved ${vData.length} version IDs to project IDs`);
          }
        } catch (e) {
          addDebugLog('error', `Failed to resolve version IDs: ${e}`);
        }
      }

      allDeps.forEach(({ source, dep }) => {
        const projectId = dep.project_id || versionToProjectId[dep.version_id];
        if (!projectId) {
          if (dep.version_id) addDebugLog('warn', `Could not resolve project ID for version ${dep.version_id} (source: ${source})`);
          return;
        }
        const isSelected = selectedMods.has(projectId);
        if (dep.dependency_type === 'required' && !isSelected) {
          issues.required.push({ source, targetId: projectId });
          missingModIds.add(projectId);
        } else if (dep.dependency_type === 'optional' && !isSelected) {
          issues.optional.push({ source, targetId: projectId });
          missingModIds.add(projectId);
        } else if (dep.dependency_type === 'incompatible' && isSelected) {
          issues.conflict.push({ source, targetId: projectId });
          missingModIds.add(projectId);
        }
      });

      addDebugLog('info', `Dependency check done: required=${issues.required.length}, optional=${issues.optional.length}, conflicts=${issues.conflict.length}`);

      if (missingModIds.size > 0) {
        updateLoading('Resolving names...');
        const idsToFetch = Array.from(missingModIds).filter(id => !modDataMap[id]);
        if (idsToFetch.length > 0) {
          addDebugLog('log', `Resolving ${idsToFetch.length} unknown mod names...`);
          const pData = await API.getProjects(idsToFetch);
          const map = {};
          pData.forEach(p => { map[p.id] = p; });
          updateModDataMap(map);
        }
      }

      hideLoading();
      setDepIssues(issues);
      setDepModalOpen(true);
    } catch (e) {
      hideLoading();
      addDebugLog('error', `Dependency check failed: ${e}`);
      await showAlert('Error checking dependencies.');
      console.error(e);
    }
  };

  const handleDownload = async () => {
    if (selectedMods.size === 0) return;

    const settings = await resolveDownloadSettings();
    if (!settings.proceed) return;
    const { loader: useLoader, version: useVersion } = settings;

    addDebugLog('info', `Starting download for ${selectedMods.size} mods (${useLoader} ${useVersion})...`);
    showLoading('Preparing Download...');

    const zip = new JSZip();
    const ids = Array.from(selectedMods);
    let success = 0, completed = 0;
    const startTime = Date.now();
    showProgress(ids.length);

    await asyncPool(CONCURRENCY_LIMIT, ids, async (pid) => {
      const modName = modDataMap[pid]?.title || pid;
      try {
        const versions = await API.getVersions(pid, useLoader, useVersion);
        if (versions?.length && versions[0].files?.length) {
          const file = versions[0].files.find(f => f.primary) || versions[0].files[0];
          const res = await fetch(file.url);
          if (res.ok) {
            zip.file(file.filename, await res.blob());
            success++;
            addDebugLog('log', `Downloaded: ${file.filename}`);
          } else {
            addDebugLog('warn', `HTTP ${res.status} for ${modName} (${file.filename})`);
          }
        } else {
          addDebugLog('warn', `No compatible version found for ${modName}`);
        }
      } catch (e) {
        addDebugLog('error', `Failed to download ${modName}: ${e}`);
        console.error(`Failed to download ${pid}`, e);
      } finally {
        completed++;
        updateProgress(completed, ids.length, startTime);
        updateLoading(`Downloading... (${Math.round((completed / ids.length) * 100)}%)`);
      }
    });

    if (success > 0) {
      addDebugLog('info', `Compressing ZIP (${success}/${ids.length} mods)...`);
      updateLoading('Compressing ZIP...');
      showProgress();
      const content = await zip.generateAsync({ type: 'blob' }, (meta) => {
        updateLoading(`Compressing ZIP... ${Math.round(meta.percent)}%`);
      });
      const filename = `mods-${useLoader}-${useVersion}-${Date.now()}.zip`;
      saveAs(content, filename);
      addDebugLog('info', `Download complete: ${filename}`);
    } else {
      addDebugLog('error', 'Download failed: no compatible versions found.');
      await showAlert('Download failed. Could not find compatible versions.');
    }
    hideLoading();
  };

  const centerWidth = 100 - leftWidth - rightWidth;

  return (
    <>
      <Header />
      <SideMenu />

      {isDesktop ? (
        /* ── PC 3-column layout with resizable columns ── */
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
            <ModList searchParams={searchParams} isDesktop={true} />
            <div className="pc-action-bar">
              <ActionBar onCheckDeps={handleCheckDeps} onDownload={handleDownload} />
            </div>
          </main>
          <div
            className="pc-column-resizer"
            onMouseDown={(e) => onColResizeStart('right', e)}
          />
          <aside className="pc-right-panel" style={{ width: `${rightWidth}%` }}>
            <RightPanel
              onHistorySearch={handleHistorySearch}
            />
          </aside>
        </div>
      ) : (
        /* ── Mobile layout ── */
        <div className="layout-center">
          <SearchSection onSearch={handleSearch} />
          <ModList searchParams={searchParams} isDesktop={false} />
        </div>
      )}

      {!isDesktop && (
        <ActionBar onCheckDeps={handleCheckDeps} onDownload={handleDownload} />
      )}

      {/* Mobile mod detail modal */}
      {!isDesktop && mobileDetailOpen && activeModId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setMobileDetailOpen(false)}>
          <div className="modal-container large" style={{ maxHeight: '85vh' }}>
            <div className="modal-header">
              <h3 className="modal-title">{t.rightPanel.description}</h3>
              <button onClick={() => setMobileDetailOpen(false)} className="btn-close-modal">✕</button>
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
