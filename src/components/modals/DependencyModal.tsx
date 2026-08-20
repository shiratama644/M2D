'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useEngine } from '@/engine/react/EngineProvider';
import { useScrollLock } from '@/hooks/useScrollLock';
import Icon from '@/components/ui/Icon';
import { FALLBACK_ICON } from '@/lib/helpers';
import gitGraphIconRaw from '@/assets/icons/git-graph.svg';
import xIconRaw from '@/assets/icons/x.svg';
import checkCircleIconRaw from '@/assets/icons/check-circle.svg';
import infoIconRaw from '@/assets/icons/info.svg';
import type { DepIssues } from '@/hooks/useDependencyCheck';
import { displayModTitle, lookupMod } from '@/lib/modDisplay';
import { useResolveProjects } from '@/hooks/useResolveProjects';

interface DepModalProps {
  issues: DepIssues;
  onClose: () => void;
}

export default function DependencyModal({ issues, onClose }: DepModalProps) {
  const { selectedMods, modDataMap, t } = useApp();
  const engine = useEngine();
  const [activeTab, setActiveTab] = useState<'required' | 'optional' | 'conflict'>('required');
  const targetIds = [
    ...issues.required,
    ...issues.optional,
    ...issues.conflict,
  ].map((item) => item.targetId);
  useResolveProjects(targetIds);
  useScrollLock();

  if (!issues) return null;

  const list = issues[activeTab] || [];

  const renderEmptyState = () => {
    const msgs: Record<string, string> = {
      required: t.deps.emptyRequired,
      optional: t.deps.emptyOptional,
      conflict: t.deps.emptyConflict,
    };
    return (
      <div className="empty-state">
        <Icon
          svg={activeTab === 'conflict' ? checkCircleIconRaw : infoIconRaw}
          size={40}
          style={{ marginBottom: '0.5rem', opacity: 0.5 }}
        />
        <p>{msgs[activeTab]}</p>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-container large">
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: 'var(--accent-color)' }}>
            <Icon svg={gitGraphIconRaw} size={20} /> {t.deps.title}
          </h3>
          <button onClick={onClose} className="btn-close-modal">
            <Icon svg={xIconRaw} size={20} />
          </button>
        </div>
        <div className="tabs">
          {(['required', 'optional', 'conflict'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-btn ${activeTab === tab ? `active-${tab}` : ''}`}
            >
              {t.deps[tab]}
            </button>
          ))}
        </div>
        <div className="modal-body">
          {list.length === 0 ? renderEmptyState() : (
            <div className="dep-list">
              {Array.from(
                list.reduce((map, item) => {
                  const group = map.get(item.source) ?? [];
                  group.push(item);
                  map.set(item.source, group);
                  return map;
                }, new Map<string, typeof list>()),
              ).map(([source, items]) => (
                <div key={source} className="dep-group">
                  <p className="dep-source">
                    {activeTab === 'conflict' ? t.deps.conflictWith : t.deps.source}{' '}
                    <span>{source}</span>
                  </p>
                  {items.map((item, i) => {
                    const isSelected = selectedMods.has(item.targetId);
                    const targetMod = lookupMod(modDataMap, item.targetId);
                    const targetTitle = displayModTitle(modDataMap, item.targetId, t.mods.unknown);
                    const iconUrl = targetMod?.icon_url || FALLBACK_ICON;
                    let actionBtn: React.ReactNode;
                    if (activeTab === 'conflict') {
                      actionBtn = !isSelected
                        ? <button className="btn-small disabled" disabled>{t.deps.removed}</button>
                        : <button onClick={() => { void engine.emit('selection.remove', { id: item.targetId }); }} className="btn-small red-outline">{t.deps.remove}</button>;
                    } else {
                      actionBtn = isSelected
                        ? <button className="btn-small disabled" disabled>{t.deps.added}</button>
                        : <button onClick={() => { void engine.emit('selection.add', { id: item.targetId }); }} className="btn-small green">{t.deps.add}</button>;
                    }
                    return (
                      <div key={`${item.targetId}-${i}`} className="dep-item">
                        <img
                          src={iconUrl}
                          className="dep-icon"
                          alt=""
                          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_ICON; }}
                        />
                        <div className="dep-info">
                          <p className="dep-target">{targetTitle}</p>
                          {(item.detail ?? item.reason) && <p className="dep-detail">{item.detail ?? item.reason}</p>}
                        </div>
                        <div>{actionBtn}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">{t.deps.close}</button>
        </div>
      </div>
    </div>
  );
}
