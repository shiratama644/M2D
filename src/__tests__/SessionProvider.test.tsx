import { createElement, type ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SessionProvider from '@/components/auth/SessionProvider';

vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: ReactNode }) =>
    createElement('div', { 'data-testid': 'next-auth-session' }, children),
}));

describe('SessionProvider', () => {
  it('wraps children with the NextAuth session provider', () => {
    render(createElement(SessionProvider, null, createElement('span', null, 'child')));
    expect(screen.getByTestId('next-auth-session')).toBeTruthy();
    expect(screen.getByText('child')).toBeTruthy();
  });
});
