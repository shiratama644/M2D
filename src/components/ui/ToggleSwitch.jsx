'use client';

/**
 * Controlled toggle switch input.
 *
 * Props:
 *   checked  – boolean value
 *   onChange – callback receiving the new boolean value
 */
export default function ToggleSwitch({ checked, onChange }) {
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
