'use client';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export default function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <label className="toggle-switch">
      <input
        type="checkbox"
        className="toggle-input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="toggle-bg"><div className="toggle-knob" /></div>
    </label>
  );
}
