/**
 * Tests for src/app/api/revalidate/route.ts
 *
 * The route accepts POST requests that authorise cache revalidation.
 * We mock `next/cache` so no real Next.js cache operations are performed,
 * and we control `process.env.REVALIDATE_SECRET` via vi.stubEnv.
 *
 * Because `rateLimitStore` is module-level state, every test that should NOT
 * trigger rate-limiting uses a unique `x-real-ip` value so previous requests
 * from other tests never accumulate in the same bucket.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.mock is hoisted before imports by Vitest's module transformer.
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { POST } from '@/app/api/revalidate/route';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_SECRET = 'super-secret-test-value';

let ipCounter = 0;

/**
 * Creates a NextRequest for the revalidate endpoint.
 * Every call generates a unique `x-real-ip` by default to avoid rate-limit
 * state bleed between tests.
 */
function makePost(
  body: Record<string, unknown>,
  overrides: { ip?: string } = {},
): NextRequest {
  const ip = overrides.ip ?? `127.0.0.${(++ipCounter % 254) + 1}-${Date.now()}`;
  return new NextRequest('http://localhost/api/revalidate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'x-real-ip': ip,
    },
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.stubEnv('REVALIDATE_SECRET', TEST_SECRET);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------

describe('POST /api/revalidate – body parsing', () => {
  it('returns 400 when the request body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost/api/revalidate', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json', 'x-real-ip': `1.1.1.${++ipCounter}` },
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

describe('POST /api/revalidate – authentication', () => {
  it('returns 401 when secret is missing from the body', async () => {
    const req = makePost({ tag: 'mods-home' }); // no secret field

    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 401 when secret is wrong', async () => {
    const req = makePost({ secret: 'definitely-wrong', tag: 'mods-home' });

    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 401 when secret is the right length but wrong value', async () => {
    // Ensures the constant-time comparison rejects near-miss secrets.
    const sameLength = 'x'.repeat(TEST_SECRET.length);
    const req = makePost({ secret: sameLength, tag: 'mods-home' });

    const res = await POST(req);

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Payload validation
// ---------------------------------------------------------------------------

describe('POST /api/revalidate – payload validation', () => {
  it('returns 400 when neither tag nor path is provided', async () => {
    const req = makePost({ secret: TEST_SECRET });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('"tag"');
  });

  it('returns 400 for an unknown tag', async () => {
    const req = makePost({ secret: TEST_SECRET, tag: '../../../../etc/passwd' });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Unknown tag');
  });

  it('returns 400 for an unknown path', async () => {
    const req = makePost({ secret: TEST_SECRET, path: '/admin/delete-everything' });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Unknown path');
  });

  it('accepts the special "mods-home" tag', async () => {
    const req = makePost({ secret: TEST_SECRET, tag: 'mods-home' });

    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it('accepts a valid project tag (project-<slug>)', async () => {
    const req = makePost({ secret: TEST_SECRET, tag: 'project-sodium' });

    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it('rejects a project tag with an invalid slug', async () => {
    const req = makePost({ secret: TEST_SECRET, tag: 'project-../../bad' });

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('accepts root path /', async () => {
    const req = makePost({ secret: TEST_SECRET, path: '/' });

    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it('accepts a valid /mods/{slug} path', async () => {
    const req = makePost({ secret: TEST_SECRET, path: '/mods/sodium' });

    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it('rejects a /mods path with a slug containing illegal characters', async () => {
    const req = makePost({ secret: TEST_SECRET, path: '/mods/../secret' });

    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Successful revalidation
// ---------------------------------------------------------------------------

describe('POST /api/revalidate – successful revalidation', () => {
  it('calls revalidateTag and returns it in the response', async () => {
    const req = makePost({ secret: TEST_SECRET, tag: 'mods-home' });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith('mods-home');
    const body = await res.json();
    expect(body.revalidated).toContainEqual({ type: 'tag', value: 'mods-home' });
  });

  it('calls revalidatePath and returns it in the response', async () => {
    const req = makePost({ secret: TEST_SECRET, path: '/' });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith('/');
    const body = await res.json();
    expect(body.revalidated).toContainEqual({ type: 'path', value: '/' });
  });

  it('calls both revalidateTag and revalidatePath when both are provided', async () => {
    const req = makePost({ secret: TEST_SECRET, tag: 'project-sodium', path: '/mods/sodium' });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith('project-sodium');
    expect(revalidatePath).toHaveBeenCalledWith('/mods/sodium');
    const body = await res.json();
    expect(body.revalidated).toHaveLength(2);
  });

  it('does NOT call revalidateTag when only path is provided', async () => {
    const req = makePost({ secret: TEST_SECRET, path: '/' });

    await POST(req);

    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('does NOT call revalidatePath when only tag is provided', async () => {
    const req = makePost({ secret: TEST_SECRET, tag: 'mods-home' });

    await POST(req);

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

describe('POST /api/revalidate – rate limiting', () => {
  it('returns 429 after exceeding the default rate limit for a single IP', async () => {
    // Use a dedicated IP so these requests don't pollute other tests' buckets.
    const stickyIp = `rate-limit-test-ip-${Date.now()}`;
    const RATE_LIMIT_DEFAULT = 10;

    // Exhaust the rate limit (auth will fail, but the IP counter still increments).
    for (let i = 0; i < RATE_LIMIT_DEFAULT; i++) {
      await POST(makePost({ secret: 'bad' }, { ip: stickyIp }));
    }

    // The next request from the same IP should be rate-limited.
    const res = await POST(makePost({ secret: TEST_SECRET, tag: 'mods-home' }, { ip: stickyIp }));

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('does NOT rate-limit requests from different IPs', async () => {
    // Two requests from different IPs should both succeed (or fail for other reasons).
    const res1 = await POST(makePost({ secret: TEST_SECRET, tag: 'mods-home' }, { ip: `diff-ip-a-${Date.now()}` }));
    const res2 = await POST(makePost({ secret: TEST_SECRET, tag: 'mods-home' }, { ip: `diff-ip-b-${Date.now()}` }));

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });
});
