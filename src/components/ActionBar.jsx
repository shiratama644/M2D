import { ShieldCheck, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function ActionBar({ onCheckDeps, onDownload }) {
  const { selectedMods, clearMods, setSelectedModalOpen } = useApp();
  const count = selectedMods.size;

  return (
    <div className={`action-bar ${count > 0 ? 'visible' : ''}`}>
      <div className="action-bar-top">
        <button onClick={() => setSelectedModalOpen(true)} className="selected-count-btn">
          <span className="selected-badge">{count} Selected</span>
          <span className="view-list-text">View List</span>
        </button>
        <button onClick={clearMods} className="btn-clear">Clear All</button>
      </div>
      <div className="action-buttons">
        <button onClick={onCheckDeps} className="btn-action btn-check">
          <ShieldCheck size={16} /> Check
        </button>
        <button onClick={onDownload} className="btn-action btn-download">
          <Download size={16} /> Download
        </button>
      </div>
    </div>
  );
}
