import { User, Download } from 'lucide-react';
import { formatNum } from '../utils/helpers';
import { useApp } from '../context/AppContext';

const FALLBACK_ICON = 'https://cdn.modrinth.com/assets/unknown_server.png';

export default function ModCard({ mod }) {
  const { selectedMods, toggleMod } = useApp();
  const isSelected = selectedMods.has(mod.project_id);

  const handleCardClick = (e) => {
    if (e.target.type !== 'checkbox') {
      toggleMod(mod.project_id);
    }
  };

  return (
    <div
      className={`mod-card ${isSelected ? 'selected' : ''}`}
      onClick={handleCardClick}
    >
      <div className="mod-checkbox-wrapper">
        <input
          type="checkbox"
          className="mod-checkbox"
          checked={isSelected}
          onChange={() => toggleMod(mod.project_id)}
        />
      </div>
      <img
        src={mod.icon_url || FALLBACK_ICON}
        loading="lazy"
        className="mod-icon"
        alt="icon"
        onError={e => { e.target.src = FALLBACK_ICON; }}
      />
      <div className="mod-info">
        <h3 className="mod-title">{mod.title}</h3>
        <div className="mod-meta">
          <span><User size={12} /> {mod.author}</span>
          <span><Download size={12} /> {formatNum(mod.downloads)}</span>
        </div>
      </div>
    </div>
  );
}
