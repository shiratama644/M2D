import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CustomSelect from '@/components/ui/CustomSelect';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('CustomSelect', () => {
  it('shows the selected label', () => {
    render(<CustomSelect options={options} value="b" onChange={() => {}} aria-label="Sort" />);
    expect(screen.getByRole('combobox').textContent).toContain('Beta');
  });

  it('opens on click and selects an option', () => {
    const onChange = vi.fn();
    render(<CustomSelect options={options} value="a" onChange={onChange} aria-label="Sort" />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.click(screen.getByRole('option', { name: 'Gamma' }));
    expect(onChange).toHaveBeenCalledWith('c');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('opens with Enter and moves highlight with arrows', () => {
    const onChange = vi.fn();
    render(<CustomSelect options={options} value="a" onChange={onChange} aria-label="Sort" />);
    const box = screen.getByRole('combobox');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(box.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('closes on Escape and outside click', () => {
    render(<CustomSelect options={options} value="a" onChange={() => {}} aria-label="Sort" />);
    const box = screen.getByRole('combobox');
    fireEvent.click(box);
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(box.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(box);
    fireEvent.click(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
