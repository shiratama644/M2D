'use client';

import { motion } from 'framer-motion';
import { cva } from 'class-variance-authority';
import { formatNum, FALLBACK_ICON } from '@/lib/helpers';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import Icon from '@/components/ui/Icon';
import userIconRaw from '@/assets/icons/user.svg';
import downloadIconRaw from '@/assets/icons/download.svg';
import starIconRaw from '@/assets/icons/star.svg';
import type { ModHit } from '@/types/modrinth';

const modCardVariants = cva('mod-card', {
  variants: {
    selected: { true: 'selected', false: '' },
    active: { true: 'active', false: '' },
  },
  defaultVariants: { selected: false, active: false },
});

const favBtnVariants = cva('mod-favorite-btn', {
  variants: {
    favorited: { true: 'favorited', false: '' },
  },
  defaultVariants: { favorited: false },
});

interface ModCardProps {
  mod: ModHit;
  isDesktop: boolean;
}

export default function ModCard({ mod, isDesktop }: ModCardProps) {
  const {
    selectedMods, toggleMod,
    activeModId, setActiveModId,
    favorites, toggleFavorite,
    showCardDescription,
  } = useApp();

  const isSelected = selectedMods.has(mod.project_id);
  const isFavorite = favorites.has(mod.project_id);
  const isActive = activeModId === mod.project_id;

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLInputElement).type === 'checkbox') return;
    setActiveModId(mod.project_id);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    toggleMod(mod.project_id);
  };

  const handleFavoriteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    toggleFavorite(mod.project_id);
  };

  return (
    <motion.div
      className={cn(modCardVariants({ selected: isSelected, active: isActive && isDesktop }))}
      onClick={handleCardClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      layout
      role="listitem"
      aria-label={mod.title}
    >
      <div className="mod-checkbox-wrapper">
        <input
          type="checkbox"
          className="mod-checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          aria-label={`${mod.title} を選択`}
        />
      </div>
      <img
        src={mod.icon_url || FALLBACK_ICON}
        loading="lazy"
        className="mod-icon"
        alt={`${mod.title} icon`}
        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_ICON; }}
      />
      <div className="mod-info">
        <h3 className="mod-title">{mod.title}</h3>
        <div className="mod-meta">
          <span><Icon svg={userIconRaw} size={12} /> {mod.author}</span>
          <span><Icon svg={downloadIconRaw} size={12} /> {formatNum(mod.downloads)}</span>
        </div>
        {showCardDescription && mod.description && (
          <p className="mod-card-summary">{mod.description}</p>
        )}
      </div>
      <button
        className={cn(favBtnVariants({ favorited: isFavorite }))}
        onClick={handleFavoriteClick}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Icon svg={starIconRaw} size={14} />
      </button>
    </motion.div>
  );
}
