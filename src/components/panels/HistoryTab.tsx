'use client';

import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { countActiveFilters, LOCALE_MAP, formatHistoryTime } from '@/lib/helpers';
import type { SearchContextEntry } from '@/store/useAppStore';

interface HistoryTabProps {
  onContextRestore: (entry: SearchContextEntry) => void;
}

export default function HistoryTab({ onContextRestore }: HistoryTabProps) {
  const {
    contextHistory,
    removeContextEntry,
    clearContextHistory,
    language,
    t,
  } = useApp();

  const locale = LOCALE_MAP[language] ?? 'en-US';

  const projectTypeLabel: Record<string, string> = {
    mod: t.discover.mod,
    modpack: t.discover.modpack,
    resourcepack: t.discover.texture,
    shader: t.discover.shader,
  };

  const reversedHistory = useMemo(() => [...contextHistory].reverse(), [contextHistory]);

  return (
    <div className="rp-history">
      <div className="rp-history-header">
        <span>{t.rightPanel.history}</span>
        <button onClick={clearContextHistory} className="btn-text-sm">{t.history.clear}</button>
      </div>
      {contextHistory.length === 0 ? (
        <div className="rp-empty">{t.history.noHistory}</div>
      ) : (
        <div className="rp-history-list">
          {reversedHistory.map((entry) => {
            const filterCount = countActiveFilters(entry.filters);
            return (
              <div key={entry.id} className="rp-history-item">
                <button
                  className="rp-history-query"
                  onClick={() => onContextRestore(entry)}
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
                    {formatHistoryTime(entry.timestamp, locale)}
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
  );
}
