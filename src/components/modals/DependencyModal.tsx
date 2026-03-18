'use client';

import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Icon from '../ui/Icon';
import { FALLBACK_ICON } from '../../lib/helpers';
import gitGraphIconRaw from '../../assets/icons/git-graph.svg';
import xIconRaw from '../../assets/icons/x.svg';
import checkCircleIconRaw from '../../assets/icons/check-circle.svg';
import infoIconRaw from '../../assets/icons/info.svg';
import type { DepIssues } from '../../hooks/useDependencyCheck';

interface DepModalProps {
  issues: DepIssues;
  onClose: () => void;
}

export default function DependencyModal({ issues, onClose }: DepModalProps) {
  const { selectedMods, addMod, removeMod, modDataMap } = useApp();
  const [activeTab, setActiveTab] = useState<'required' | 'optional' | 'conflict'>('required');

  if (!issues) return null;

  const list = issues[activeTab] || [];

  const renderEmptyState = () => {
    const msgs: Record<string, string> = {
      required: 'All good! 🎉',
      optional: 'No optional deps.',
      conflict: 'No conflicts! ✅',
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
            <Icon svg={gitGraphIconRaw} size={20} /> Dependency Report
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
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className="modal-body">
          {list.length === 0 ? renderEmptyState() : (
            <div className="dep-list">
              {list.map((item, i) => {
                const isSelected = selectedMods.has(item.targetId);
                const targetMod = modDataMap[item.targetId] as { title?: string; icon_url?: string } | undefined;
                const targetTitle = targetMod?.title || item.targetId;
                const iconUrl = targetMod?.icon_url || FALLBACK_ICON;

                let actionBtn: React.ReactNode;
                if (activeTab === 'conflict') {
                  actionBtn = !isSelected
                    ? <button className="btn-small disabled" disabled>Removed</button>
                    : <button onClick={() => removeMod(item.targetId)} className="btn-small red-outline">Remove</button>;
                } else {
                  actionBtn = isSelected
                    ? <button className="btn-small disabled" disabled>Added</button>
                    : <button onClick={() => addMod(item.targetId)} className="btn-small green">Add</button>;
                }

                return (
                  <div key={i} className="dep-item">
                    <img
                      src={iconUrl}
                      className="dep-icon"
                      alt="icon"
                      onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_ICON; }}
                    />
                    <div className="dep-info">
                      <p className="dep-source">
                        {activeTab === 'conflict' ? 'Conflict w/' : 'Source:'}{' '}
                        <span>{item.source}</span>
                      </p>
                      <p className="dep-target">{targetTitle}</p>
                    </div>
                    <div>{actionBtn}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}
