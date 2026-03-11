import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ options, value, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedLabel = options.find(o => o.value === value)?.label ?? options[0]?.label ?? '';

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
        <span>{selectedLabel}</span>
        <ChevronDown size={16} className="chevron" />
      </div>
      {open && (
        <div className="custom-select-options">
          {options.map(opt => (
            <div
              key={opt.value}
              className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
