import { describe, it, expect, vi } from 'vitest';

vi.mock('@/auth', () => ({
  handlers: {
    GET: vi.fn(async () => new Response('get')),
    POST: vi.fn(async () => new Response('post')),
  },
}));

describe('NextAuth route handlers', () => {
  it('re-exports GET and POST from auth handlers', async () => {
    const route = await import('@/app/api/auth/[...nextauth]/route');
    expect(typeof route.GET).toBe('function');
    expect(typeof route.POST).toBe('function');
    const getRes = await route.GET();
    const postRes = await route.POST();
    expect(await getRes.text()).toBe('get');
    expect(await postRes.text()).toBe('post');
  });
});
