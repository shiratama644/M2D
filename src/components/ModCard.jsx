import { formatNum } from '../utils/helpers';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import userIconRaw from '../assets/icons/user.svg?raw';
import downloadIconRaw from '../assets/icons/download.svg?raw';
import starIconRaw from '../assets/icons/star.svg?raw';

const FALLBACK_ICON = 'https://cdn.modrinth.com/assets/unknown_server.png';

export default function ModCard({ mod, isDesktop }) {
  const { selectedMods, toggleMod, activeModId, setActiveModId, favorites, toggleFavorite } = useApp();
  const isSelected = selectedMods.has(mod.project_id);
  const isFavorite = favorites.has(mod.project_id);
  const isActive = activeModId === mod.project_id;

  const handleCardClick = (e) => {
    if (e.target.type === 'checkbox') return;
    if (isDesktop) {
      setActiveModId(mod.project_id);
    } else {
      toggleMod(mod.project_id);
    }
  };

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    toggleMod(mod.project_id);
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    toggleFavorite(mod.project_id);
  };

  return (
    <div
      className={`mod-card ${isSelected ? 'selected' : ''} ${isActive && isDesktop ? 'active' : ''}`}
      onClick={handleCardClick}
    >
      <div className="mod-checkbox-wrapper">
        <input
          type="checkbox"
          className="mod-checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
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
          <span><Icon svg={userIconRaw} size={12} /> {mod.author}</span>
          <span><Icon svg={downloadIconRaw} size={12} /> {formatNum(mod.downloads)}</span>
        </div>
      </div>
      <button
        className={`mod-favorite-btn ${isFavorite ? 'favorited' : ''}`}
        onClick={handleFavoriteClick}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Icon svg={starIconRaw} size={14} />
      </button>
    </div>
  );
}
