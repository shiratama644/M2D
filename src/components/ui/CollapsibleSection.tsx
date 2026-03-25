'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import chevronDownRaw from '@/assets/icons/chevron-down.svg';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/** Collapsible filter-panel section with an animated chevron. */
export default function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = `section-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="lp-filter-section">
      <button
        className="lp-filter-title lp-filter-title-toggle"
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
      >
        <span>{title}</span>
        <Icon
          svg={chevronDownRaw}
          size={12}
          className={`lp-filter-chevron${open ? ' open' : ''}`}
        />
      </button>
      {open && (
        <div id={contentId} className="lp-filter-section-body">
          {children}
        </div>
      )}
    </div>
  );
}
