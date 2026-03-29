'use client';

import { useState, useRef, useEffect, useId, ReactNode, KeyboardEvent } from 'react';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import chevronDownIconRaw from '@/assets/icons/chevron-down.svg';

interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Accessible label (aria-label) for the combobox trigger button. */
  'aria-label'?: string;
}

export default function CustomSelect({ options, value, onChange, className = '', 'aria-label': ariaLabel }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const getOptionId = (index: number) => `${uid}-option-${index}`;

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : options[0];
  const selectedLabel = selectedOption?.label ?? '';

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Scroll highlighted option into view
  useEffect(() => {
    if (!open || highlightedIndex < 0 || !listboxRef.current) return;
    const optionEl = listboxRef.current.children[highlightedIndex] as HTMLElement | undefined;
    optionEl?.scrollIntoView({ block: 'nearest' });
  }, [open, highlightedIndex]);

  const openList = (startIndex?: number) => {
    setOpen(true);
    setHighlightedIndex(startIndex ?? (selectedIndex >= 0 ? selectedIndex : 0));
  };

  const closeList = () => {
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const selectOption = (index: number) => {
    onChange(options[index].value);
    closeList();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open && highlightedIndex >= 0) {
          selectOption(highlightedIndex);
        } else {
          openList();
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          openList(Math.min((selectedIndex >= 0 ? selectedIndex : -1) + 1, options.length - 1));
        } else {
          setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) {
          openList(Math.max((selectedIndex >= 0 ? selectedIndex : options.length) - 1, 0));
        } else {
          setHighlightedIndex((i) => Math.max(i - 1, 0));
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeList();
        break;
    }
  };

  return (
    <div ref={wrapperRef} className={`custom-select-wrapper ${open ? 'open' : ''} ${className}`}>
      <div
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && highlightedIndex >= 0 ? getOptionId(highlightedIndex) : undefined}
        aria-label={ariaLabel}
        tabIndex={0}
        className="custom-select-display input-large"
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={handleKeyDown}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          {selectedOption?.icon}
          {selectedLabel}
        </span>
        <Icon svg={chevronDownIconRaw} size={16} className="chevron" />
      </div>
      {open && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          className="custom-select-options"
          aria-label={ariaLabel}
        >
          {options.map((opt, index) => (
            <div
              key={opt.value}
              id={getOptionId(index)}
              role="option"
              aria-selected={opt.value === value}
              className={cn(
                'custom-select-option',
                opt.value === value && 'selected',
                highlightedIndex === index && 'highlighted',
              )}
              onClick={() => selectOption(index)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {opt.icon ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  {opt.icon}
                  {opt.label}
                </span>
              ) : opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
