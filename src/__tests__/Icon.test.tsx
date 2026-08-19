import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Icon from '@/components/ui/Icon';

describe('Icon', () => {
  it('renders the svg markup at the requested size', () => {
    const { container } = render(
      <Icon svg={'<svg><circle cx="1" cy="1" r="1"></circle></svg>'} size={18} className="test-icon" />,
    );
    const span = container.querySelector('.inline-icon.test-icon') as HTMLElement;
    expect(span.style.width).toBe('18px');
    expect(span.style.height).toBe('18px');
    expect(span.innerHTML).toContain('<circle');
  });

  it('strips script tags and inline event handlers', () => {
    const dirty =
      '<svg><script>alert(1)</script><circle onclick="evil()" onload="x()"></circle></svg>';
    const { container } = render(<Icon svg={dirty} />);
    expect(container.innerHTML).not.toContain('<script');
    expect(container.innerHTML).not.toContain('onclick');
    expect(container.innerHTML).not.toContain('onload');
    expect(container.innerHTML).toContain('<circle');
  });
});
