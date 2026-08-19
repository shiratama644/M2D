import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const nextAuth = vi.fn((config: unknown) => ({
  handlers: { GET: vi.fn(), POST: vi.fn() },
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  config,
}));

vi.mock('next-auth', () => ({
  default: (config: unknown) => nextAuth(config),
}));

vi.mock('next-auth/providers/discord', () => ({
  default: (opts: unknown) => ({ id: 'discord', options: opts }),
}));

describe('auth module', () => {
  beforeEach(() => {
    vi.resetModules();
    nextAuth.mockClear();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when Discord credentials are missing outside the build phase', async () => {
    vi.stubEnv('NEXT_PHASE', '');
    vi.stubEnv('DISCORD_CLIENT_ID', '');
    vi.stubEnv('DISCORD_CLIENT_SECRET', '');
    await expect(import('@/auth')).rejects.toThrow(/Missing required environment variables/);
  });

  it('skips the env check during the production build phase', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.stubEnv('DISCORD_CLIENT_ID', '');
    vi.stubEnv('DISCORD_CLIENT_SECRET', '');
    await expect(import('@/auth')).resolves.toBeTruthy();
  });

  it('configures Discord OAuth and maps session / jwt callbacks', async () => {
    vi.stubEnv('DISCORD_CLIENT_ID', 'id-1');
    vi.stubEnv('DISCORD_CLIENT_SECRET', 'secret-1');
    vi.stubEnv('NEXT_PHASE', '');

    const mod = await import('@/auth');
    expect(mod.handlers).toBeTruthy();
    expect(mod.signIn).toBeTruthy();
    expect(nextAuth).toHaveBeenCalledOnce();

    const config = nextAuth.mock.calls[0][0] as {
      pages: { signIn: string };
      callbacks: {
        session: (args: { session: { user: Record<string, unknown> }; token: Record<string, unknown> }) => {
          user: Record<string, unknown>;
        };
        jwt: (args: {
          token: Record<string, unknown>;
          account?: { provider?: string };
          profile?: { id?: string };
        }) => Record<string, unknown>;
      };
    };

    expect(config.pages.signIn).toBe('/account');

    const session = config.callbacks.session({
      session: { user: { name: 'Ada' } },
      token: { sub: 'user-1', discordId: 'd-99' },
    });
    expect(session.user.id).toBe('user-1');
    expect(session.user.discordId).toBe('d-99');

    const token = config.callbacks.jwt({
      token: {},
      account: { provider: 'discord' },
      profile: { id: 'd-99' },
    });
    expect(token.discordId).toBe('d-99');

    const untouched = config.callbacks.jwt({ token: { keep: true } });
    expect(untouched).toEqual({ keep: true });
  });
});
