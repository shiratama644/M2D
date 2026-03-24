'use client';

import { useApp } from '../../context/AppContext';
import MobileModal from '../ui/MobileModal';
import { countActiveFilters } from '../../lib/helpers';
import type { SearchContextEntry } from '../../store/useAppStore';

import historyIconRaw from '../../assets/icons/history.svg';

/** Maps store language keys to BCP-47 locale strings for Intl formatting. */
const LOCALE_MAP: Record<string, string> = { en: 'en-US', ja: 'ja-JP' };

/** Format a Unix timestamp for display in the history list. */
function formatHistoryTime(timestamp: number, locale: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return (
    date.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) +
    ' ' +
    date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
  );
}

interface HistoryModalProps {
  onContextRestore: (entry: SearchContextEntry) => void;
  onClose: () => void;
}

export default function HistoryModal({ onContextRestore, onClose }: HistoryModalProps) {
  const {
    contextHistory, removeContextEntry, clearContextHistory,
    language,
    t,
  } = useApp();

  const projectTypeLabel: Record<string, string> = {
    mod: t.discover.mod,
    modpack: t.discover.modpack,
    resourcepack: t.discover.texture,
    shader: t.discover.shader,
  };

  const handleRestore = (entry: SearchContextEntry) => {
    onContextRestore(entry);
    onClose();
  };

  return (
    <MobileModal
      title={t.rightPanel.history}
      titleIcon={historyIconRaw}
      onClose={onClose}
      size="large"
      footer={
        <button onClick={onClose} className="btn-secondary">{t.settings.close}</button>
      }
    >
      <div className="rp-history">
        <div className="rp-history-header">
          <span />
          <button onClick={clearContextHistory} className="btn-text-sm">{t.history.clear}</button>
        </div>
        {contextHistory.length === 0 ? (
          <div className="rp-empty">{t.history.noHistory}</div>
        ) : (
          <div className="rp-history-list">
            {[...contextHistory].reverse().map((entry) => {
              const filterCount = countActiveFilters(entry.filters);
              return (
                <div key={entry.id} className="rp-history-item">
                  <button
                    className="rp-history-query"
                    onClick={() => handleRestore(entry)}
                    title={t.history.restore}
                  >
                    <span className="rp-history-badge">
                      {projectTypeLabel[entry.projectType] ?? entry.projectType}
                    </span>
                    <span className="rp-history-text">
                      {entry.query || <em>{t.history.emptyQuery}</em>}
                    </span>
                    <span className="rp-history-meta">
                      {filterCount > 0
                        ? t.history.filterCount.replace('%n', String(filterCount))
                        : t.history.noFilters}
                      {' · '}
                      {formatHistoryTime(entry.timestamp, LOCALE_MAP[language] ?? 'en-US')}
                    </span>
                  </button>
                  <button
                    className="rp-history-del"
                    onClick={() => removeContextEntry(entry.id)}
                    title={t.history.deleteEntry}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileModal>
  );
}
