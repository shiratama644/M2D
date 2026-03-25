/**
 * Tests for src/app/api/v2/[...path]/route.ts
 *
 * The proxy route proxies requests to the Modrinth API.
 * We mock global `fetch` to avoid real network calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/v2/[...path]/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();

function makeRequest(url: string, headers?: Record<string, string>): NextRequest {
  return new NextRequest(url, { headers });
}

function makeParams(path: string[]): { params: Promise<{ path: string[] }> } {
  return { params: Promise.resolve({ path }) };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('proxy route GET handler', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // ── Success path ──────────────────────────────────────────────────────────

  it('returns 200 and JSON body on a successful upstream response', async () => {
    const data = { hits: [], total_hits: 0 };
    mockFetch.mockResolvedValue({ ok: true, json: async () => data });

    const req = makeRequest('http://localhost/api/v2/search');
    const res = await GET(req, makeParams(['search']));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(data);
  });

  it('constructs the correct Modrinth upstream URL from path segments', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    const req = makeRequest('http://localhost/api/v2/project/sodium');
    await GET(req, makeParams(['project', 'sodium']));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.modrinth.com/v2/project/sodium'),
      expect.any(Object),
    );
  });

  it('appends query parameters to the upstream URL', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    const req = makeRequest('http://localhost/api/v2/search?query=sodium&limit=12');
    await GET(req, makeParams(['search']));

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('query=sodium');
    expect(calledUrl).toContain('limit=12');
  });

  it('sends the M2D User-Agent header', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    const req = makeRequest('http://localhost/api/v2/search');
    await GET(req, makeParams(['search']));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'User-Agent': expect.stringContaining('M2D') }),
      }),
    );
  });

  // ── Query string normalisation ────────────────────────────────────────────

  it('sorts query parameters alphabetically for cache-key normalisation', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    // 'z' before 'a' in the original request
    const req = makeRequest('http://localhost/api/v2/search?z=last&a=first');
    await GET(req, makeParams(['search']));

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    const qsStart = calledUrl.indexOf('?');
    const qs = calledUrl.slice(qsStart + 1);
    expect(qs.indexOf('a=first')).toBeLessThan(qs.indexOf('z=last'));
  });

  it('omits the query string when no parameters are present', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    const req = makeRequest('http://localhost/api/v2/project/sodium');
    await GET(req, makeParams(['project', 'sodium']));

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('?');
  });

  // ── Revalidate TTL per path ───────────────────────────────────────────────

  it('uses 3600s revalidate for tag/* paths', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    const req = makeRequest('http://localhost/api/v2/tag/game_version');
    await GET(req, makeParams(['tag', 'game_version']));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ next: expect.objectContaining({ revalidate: 3600 }) }),
    );
  });

  it('uses 60s revalidate for the search path', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    const req = makeRequest('http://localhost/api/v2/search');
    await GET(req, makeParams(['search']));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ next: expect.objectContaining({ revalidate: 60 }) }),
    );
  });

  it('uses 300s revalidate for project/* paths', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    const req = makeRequest('http://localhost/api/v2/project/sodium');
    await GET(req, makeParams(['project', 'sodium']));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ next: expect.objectContaining({ revalidate: 300 }) }),
    );
  });

  it('uses 60s revalidate for version_file/* paths', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    const req = makeRequest('http://localhost/api/v2/version_file/abc');
    await GET(req, makeParams(['version_file', 'abc']));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ next: expect.objectContaining({ revalidate: 60 }) }),
    );
  });

  // ── Non-ok upstream responses ─────────────────────────────────────────────

  it('forwards the upstream HTTP status when the response is not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, text: async () => 'Not found' });

    const req = makeRequest('http://localhost/api/v2/project/nonexistent');
    const res = await GET(req, makeParams(['project', 'nonexistent']));

    expect(res.status).toBe(404);
  });

  it('forwards a 500 upstream error status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, text: async () => 'Server error' });

    const req = makeRequest('http://localhost/api/v2/search');
    const res = await GET(req, makeParams(['search']));

    expect(res.status).toBe(500);
  });

  // ── Timeout (AbortError) ──────────────────────────────────────────────────

  it('returns 504 when the upstream request times out', async () => {
    vi.useFakeTimers();
    const abortErr = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
    mockFetch.mockRejectedValue(abortErr);

    const req = makeRequest('http://localhost/api/v2/search');
    let res: Response;

    // Attach the handler before advancing timers so the promise is not unhandled.
    const pending = GET(req, makeParams(['search'])).then((r) => { res = r; });
    await vi.runAllTimersAsync();
    await pending;

    expect(res!.status).toBe(504);
    const body = await res!.json();
    expect(body).toHaveProperty('error');
  });

  // ── Generic network errors ────────────────────────────────────────────────

  it('returns 502 on a generic network error', async () => {
    mockFetch.mockRejectedValue(new Error('Connection refused'));

    const req = makeRequest('http://localhost/api/v2/search');
    const res = await GET(req, makeParams(['search']));

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});
