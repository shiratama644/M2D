import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { STORAGE_KEY, DEBUG_KEY, THEME_KEY, FAST_SEARCH_KEY, LANGUAGE_KEY } from '../utils/helpers';
import translations from '../i18n/translations';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  const [debugMode, setDebugMode] = useState(() => localStorage.getItem(DEBUG_KEY) === 'true');
  const [fastSearch, setFastSearch] = useState(() => localStorage.getItem(FAST_SEARCH_KEY) === 'true');
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_KEY) || 'en');
  const [menuOpen, setMenuOpen] = useState(false);
  const [profiles, setProfiles] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  });
  const [selectedMods, setSelectedMods] = useState(new Set());
  const [modDataMap, setModDataMap] = useState({});

  // Loading state
  const [loading, setLoading] = useState({ visible: false, text: '', progress: null });

  // Modals
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [depModalOpen, setDepModalOpen] = useState(false);
  const [selectedModalOpen, setSelectedModalOpen] = useState(false);

  // Custom dialog
  const [dialog, setDialog] = useState(null);
  const dialogResolverRef = useRef(null);

  const showAlert = useCallback((message) => {
    return new Promise((resolve) => {
      dialogResolverRef.current = resolve;
      setDialog({ type: 'alert', message });
    });
  }, []);

  const showConfirm = useCallback((message) => {
    return new Promise((resolve) => {
      dialogResolverRef.current = resolve;
      setDialog({ type: 'confirm', message });
    });
  }, []);

  const closeDialog = useCallback((result) => {
    const resolver = dialogResolverRef.current;
    dialogResolverRef.current = null;
    setDialog(null);
    if (resolver) resolver(result);
  }, []);

  // Debug logs
  const [debugLogs, setDebugLogs] = useState([]);
  const debugLogsRef = useRef([]);

  const toggleTheme = useCallback((value) => {
    setTheme(value);
    localStorage.setItem(THEME_KEY, value);
  }, []);

  const toggleDebug = useCallback((enabled) => {
    setDebugMode(enabled);
    localStorage.setItem(DEBUG_KEY, enabled);
  }, []);

  const toggleFastSearch = useCallback((enabled) => {
    setFastSearch(enabled);
    localStorage.setItem(FAST_SEARCH_KEY, enabled);
  }, []);

  const toggleLanguage = useCallback((lang) => {
    setLanguage(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
  }, []);

  const addDebugLog = useCallback((level, msg) => {
    const entry = {
      level,
      msg,
      time: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
    };
    debugLogsRef.current = [...debugLogsRef.current.slice(-499), entry];
    setDebugLogs([...debugLogsRef.current]);
  }, []);

  const clearDebugLogs = useCallback(() => {
    debugLogsRef.current = [];
    setDebugLogs([]);
  }, []);

  const showLoading = useCallback((text) => {
    setLoading({ visible: true, text, progress: null });
  }, []);

  const updateLoading = useCallback((text) => {
    setLoading(prev => ({ ...prev, text }));
  }, []);

  const showProgress = useCallback((total) => {
    setLoading(prev => ({
      ...prev,
      progress: { current: 0, total, percent: 0, progressText: total !== undefined ? `0 / ${total}` : '', etaText: 'ETA: Calculating...' }
    }));
  }, []);

  const updateProgress = useCallback((current, total, startTime) => {
    const percent = (current / total) * 100;
    let etaText = '';
    if (current > 0 && startTime) {
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = current / elapsed;
      const remaining = total - current;
      const eta = Math.ceil(remaining / speed);
      etaText = `ETA: ${eta > 60 ? `${Math.floor(eta / 60)}m ${eta % 60}s` : `${eta}s`}`;
    }
    setLoading(prev => ({
      ...prev,
      progress: { current, total, percent, progressText: `${current} / ${total}`, etaText }
    }));
  }, []);

  const hideLoading = useCallback(() => {
    setLoading({ visible: false, text: '', progress: null });
  }, []);

  const saveProfiles = useCallback((newProfiles) => {
    setProfiles(newProfiles);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfiles));
  }, []);

  const toggleMod = useCallback((id) => {
    setSelectedMods(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearMods = useCallback(() => setSelectedMods(new Set()), []);

  const addMod = useCallback((id) => {
    setSelectedMods(prev => new Set([...prev, id]));
  }, []);

  const removeMod = useCallback((id) => {
    setSelectedMods(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const updateModDataMap = useCallback((updates) => {
    setModDataMap(prev => ({ ...prev, ...updates }));
  }, []);

  const replaceSelectedMods = useCallback((modsArray) => {
    setSelectedMods(new Set(modsArray));
  }, []);

  const value = {
    theme, toggleTheme,
    debugMode, toggleDebug,
    fastSearch, toggleFastSearch,
    language, toggleLanguage,
    t: translations[language],
    menuOpen, setMenuOpen,
    profiles, saveProfiles,
    selectedMods, toggleMod, clearMods, addMod, removeMod, replaceSelectedMods,
    modDataMap, updateModDataMap,
    loading, showLoading, updateLoading, showProgress, updateProgress, hideLoading,
    settingsOpen, setSettingsOpen,
    depModalOpen, setDepModalOpen,
    selectedModalOpen, setSelectedModalOpen,
    debugLogs, addDebugLog, clearDebugLogs,
    dialog, showAlert, showConfirm, closeDialog,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => useContext(AppContext);
