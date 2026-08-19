import { createElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ToggleSwitch from '@/components/ui/ToggleSwitch';

describe('ToggleSwitch', () => {
  it('reflects the checked prop', () => {
    const { rerender } = render(createElement(ToggleSwitch, { checked: false, onChange: () => {} }));
    const input = screen.getByRole('checkbox') as HTMLInputElement;
    expect(input.checked).toBe(false);
    rerender(createElement(ToggleSwitch, { checked: true, onChange: () => {} }));
    expect(input.checked).toBe(true);
  });

  it('calls onChange with the next boolean', () => {
    const onChange = vi.fn();
    render(createElement(ToggleSwitch, { checked: false, onChange }));
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
