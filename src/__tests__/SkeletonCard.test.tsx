import { createElement } from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SkeletonCard from '@/components/mods/SkeletonCard';

describe('SkeletonCard', () => {
  it('renders a hidden placeholder card', () => {
    const { container } = render(createElement(SkeletonCard));
    const card = container.querySelector('.skeleton-card');
    expect(card).toBeTruthy();
    expect(card?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.skeleton-title')).toBeTruthy();
  });
});
