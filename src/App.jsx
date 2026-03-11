import { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import ThreeBackground from './components/ThreeBackground';
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
import { API } from './utils/api';
import { asyncPool, CONCURRENCY_LIMIT } from './utils/helpers';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const DEFAULT_SEARCH = { query: '', loader: 'fabric', version: '1.21.1' };

export default function App() {
  const {
    theme,
    menuOpen, selectedModalOpen,
    selectedMods,
    modDataMap, updateModDataMap,
    showLoading, updateLoading, showProgress, updateProgress, hideLoading,
    depModalOpen, setDepModalOpen,
    showAlert,
    addDebugLog,
  } = useApp();

  const [searchParams, setSearchParams] = useState(DEFAULT_SEARCH);
  const [depIssues, setDepIssues] = useState(null);
  const [currentLoader, setCurrentLoader] = useState('fabric');
  const [currentVersion, setCurrentVersion] = useState('1.21.1');

  // Apply theme to body
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // Prevent scroll when modal/menu open
  useEffect(() => {
    const isOpen = menuOpen || selectedModalOpen || depModalOpen;
    document.body.classList.toggle('modal-open', isOpen);
  }, [menuOpen, selectedModalOpen, depModalOpen]);

  const handleSearch = ({ query, loader, version }) => {
    setCurrentLoader(loader);
    setCurrentVersion(version);
    setSearchParams({ query, loader, version });
    addDebugLog('info', `Search: query="${query}" loader=${loader} version=${version}`);
  };

  const handleCheckDeps = async () => {
    if (selectedMods.size === 0) return;
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
          const versions = await API.getVersions(pid, currentLoader, currentVersion);
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

      results.filter(Boolean).forEach(res => {
        res.dependencies?.forEach(dep => {
          if (!dep.project_id) return;
          const isSelected = selectedMods.has(dep.project_id);
          if (dep.dependency_type === 'required' && !isSelected) {
            issues.required.push({ source: res.modName, targetId: dep.project_id });
            missingModIds.add(dep.project_id);
          } else if (dep.dependency_type === 'optional' && !isSelected) {
            issues.optional.push({ source: res.modName, targetId: dep.project_id });
            missingModIds.add(dep.project_id);
          } else if (dep.dependency_type === 'incompatible' && isSelected) {
            issues.conflict.push({ source: res.modName, targetId: dep.project_id });
            missingModIds.add(dep.project_id);
          }
        });
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
    addDebugLog('info', `Starting download for ${selectedMods.size} mods (${currentLoader} ${currentVersion})...`);
    showLoading('Preparing Download...');

    const zip = new JSZip();
    const ids = Array.from(selectedMods);
    let success = 0, completed = 0;
    const startTime = Date.now();
    showProgress(ids.length);

    await asyncPool(CONCURRENCY_LIMIT, ids, async (pid) => {
      const modName = modDataMap[pid]?.title || pid;
      try {
        const versions = await API.getVersions(pid, currentLoader, currentVersion);
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
      const filename = `mods-${currentLoader}-${currentVersion}-${Date.now()}.zip`;
      saveAs(content, filename);
      addDebugLog('info', `Download complete: ${filename}`);
    } else {
      addDebugLog('error', 'Download failed: no compatible versions found.');
      await showAlert('Download failed. Could not find compatible versions.');
    }
    hideLoading();
  };

  return (
    <>
      <ThreeBackground />
      <Header />
      <SideMenu />
      <SearchSection onSearch={handleSearch} />
      <ModList searchParams={searchParams} />
      <ActionBar onCheckDeps={handleCheckDeps} onDownload={handleDownload} />
      <SettingsModal />
      {depModalOpen && depIssues && (
        <DependencyModal issues={depIssues} onClose={() => setDepModalOpen(false)} />
      )}
      <SelectedModal />
      <LoadingOverlay />
      <DebugPanel />
      <CustomDialog />
    </>
  );
}
