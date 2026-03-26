'use client';

import { useApp } from '@/context/AppContext';

export default function LoadingOverlay() {
  const { loading } = useApp();
  if (!loading.visible) return null;

  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <p className="loading-text">{loading.text || 'Processing...'}</p>
      {loading.progress && (
        <div className="progress-container">
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${loading.progress.percent}%` }}></div>
          </div>
          <div className="progress-stats">
            <span>{loading.progress.progressText}</span>
            <span>{loading.progress.etaText}</span>
          </div>
        </div>
      )}
    </div>
  );
}
