import { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import chevronDownIconRaw from '../assets/icons/chevron-down.svg?raw';

export default function CustomSelect({ options, value, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedOption = options.find(o => o.value === value) ?? options[0];
  const selectedLabel = selectedOption?.label ?? '';

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className={`custom-select-wrapper ${open ? 'open' : ''} ${className}`}>
      <div className="custom-select-display input-large" onClick={() => setOpen(o => !o)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          {selectedOption?.icon}
          {selectedLabel}
        </span>
        <Icon svg={chevronDownIconRaw} size={16} className="chevron" />
      </div>
      {open && (
        <div className="custom-select-options">
          {options.map(opt => (
            <div
              key={opt.value}
              className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
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
