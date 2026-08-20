import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CollapsibleSection from '@/components/ui/CollapsibleSection';

describe('CollapsibleSection', () => {
  it('shows children when open by default', () => {
    render(
      <CollapsibleSection title="Loaders">
        <p>body</p>
      </CollapsibleSection>,
    );
    expect(screen.getByText('body')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Loaders/ }).getAttribute('aria-expanded')).toBe('true');
  });

  it('hides children after the title is toggled', () => {
    render(
      <CollapsibleSection title="Loaders" defaultOpen={false}>
        <p>body</p>
      </CollapsibleSection>,
    );
    expect(screen.queryByText('body')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Loaders/ }));
    expect(screen.getByText('body')).toBeTruthy();
  });
});
