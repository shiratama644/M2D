import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { API_BASE, getApiBase, ApiError, request } from '@/lib/api/client';

// ---------------------------------------------------------------------------
// API_BASE constant
// ---------------------------------------------------------------------------

describe('API_BASE', () => {
  it('is the Modrinth v2 base URL', () => {
    expect(API_BASE).toBe('https://api.modrinth.com/v2');
  });
});

// ---------------------------------------------------------------------------
// getApiBase
// ---------------------------------------------------------------------------

describe('getApiBase', () => {
  it('returns /api/v2 on the client (window defined)', () => {
    // jsdom provides window by default
    expect(typeof window).toBe('object');
    expect(getApiBase()).toBe('/api/v2');
  });

  it('returns the direct Modrinth URL on the server (window undefined)', () => {
    const original = global.window;
    // @ts-expect-error – intentionally deleting window to simulate server env
    delete global.window;
    try {
      expect(getApiBase()).toBe(API_BASE);
    } finally {
      global.window = original;
    }
  });
});

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

describe('ApiError', () => {
  it('sets status and message', () => {
    const err = new ApiError(404, 'Not found');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
  });

  it('has name "ApiError"', () => {
    const err = new ApiError(500, 'Server error');
    expect(err.name).toBe('ApiError');
  });

  it('is an instance of Error', () => {
    const err = new ApiError(400, 'Bad request');
    expect(err).toBeInstanceOf(Error);
  });

  it('is an instance of ApiError', () => {
    const err = new ApiError(401, 'Unauthorized');
    expect(err).toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// request
// ---------------------------------------------------------------------------

describe('request', () => {
  /**
   * A dedicated mock function replaces the global `fetch` for every test
   * in this block. Using vi.stubGlobal ensures the module-level reference
   * is patched; vi.unstubAllGlobals restores it afterwards.
   */
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    // Safety net: ensure real timers are always restored so one test
    // cannot bleed fake-timer state into the next test.
    vi.useRealTimers();
  });

  // ── URL construction tests ────────────────────────────────────────────────

  it('calls fetch with correct URL when no params', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ data: 'ok' }) });

    const result = await request('/project/sodium');

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith('/api/v2/project/sodium', expect.any(Object));
    expect(result).toEqual({ data: 'ok' });
  });

  it('appends query params to the URL', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    await request('/search', { query: 'sodium', limit: 10 });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('query=sodium');
    expect(calledUrl).toContain('limit=10');
  });

  it('JSON-stringifies object param values', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    const facets = [['categories:optimization']];
    await request('/search', { facets });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain(encodeURIComponent(JSON.stringify(facets)));
  });

  it('omits undefined, null, and empty-string params', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    await request('/search', { query: undefined, loader: null, version: '', limit: 5 });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('query');
    expect(calledUrl).not.toContain('loader');
    expect(calledUrl).not.toContain('version');
    expect(calledUrl).toContain('limit=5');
  });

  it('forwards AbortSignal to fetch', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    const controller = new AbortController();
    await request('/project/sodium', {}, controller.signal);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  // ── Non-retryable error tests (no fake timers needed) ─────────────────────

  it('throws ApiError on non-ok HTTP response (4xx)', async () => {
    // 404 is a client error — not retried, exactly one fetch call.
    mockFetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });

    await expect(request('/project/nonexistent')).rejects.toBeInstanceOf(ApiError);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('ApiError preserves the upstream HTTP status code', async () => {
    // 400 Bad Request is not retryable.
    mockFetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({}) });

    await expect(request('/search')).rejects.toMatchObject({ status: 400 });
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('does not retry on 4xx client errors', async () => {
    // 403 Forbidden — client error, no retries.
    mockFetch.mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });

    await expect(request('/project/secret')).rejects.toBeInstanceOf(ApiError);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  // ── Retry / back-off tests ────────────────────────────────────────────────
  //
  // These tests use fake timers so that the exponential back-off delays
  // (500 ms → 1 s → 2 s) are advanced instantly without slowing the suite.
  //
  // Pattern used in every retry test:
  //   1. Attach .catch() immediately after calling request() — before any await —
  //      to prevent a PromiseRejectionHandledWarning from Node.js.
  //   2. Call vi.runAllTimersAsync() to drain all pending setTimeout timers
  //      AND the microtasks they schedule (retries, rejection propagation).
  //   3. Await the .catch()-wrapped promise; it resolves once request() settles.
  //   4. Assert on the captured error and call count.

  describe('retry back-off', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('retries on 503 Service Unavailable and eventually throws ApiError', async () => {
      expect.assertions(3);
      mockFetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });

      let caught: unknown;
      const done = request('/search').catch((e) => { caught = e; });

      await vi.runAllTimersAsync();
      await done;

      // 1 initial attempt + 3 retries = 4 total fetch calls.
      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(caught).toBeInstanceOf(ApiError);
      expect((caught as ApiError).status).toBe(503);
    });

    it('retries on 429 Too Many Requests and eventually throws ApiError', async () => {
      expect.assertions(3);
      mockFetch.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });

      let caught: unknown;
      const done = request('/search').catch((e) => { caught = e; });

      await vi.runAllTimersAsync();
      await done;

      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(caught).toBeInstanceOf(ApiError);
      expect((caught as ApiError).status).toBe(429);
    });

    it('retries on network-level TypeError and eventually rethrows', async () => {
      // mockRejectedValue makes fetch() return Promise.reject(TypeError) on each call.
      // Inside request(), `await fetch(...)` sits inside a try block, so each
      // individual rejection is immediately caught there — never unhandled.
      // The outer .catch() guards against the *final* rejection of request()
      // leaking before runAllTimersAsync() fully settles the promise.
      // This is the standard pattern for all retry tests in this block.
      expect.assertions(3);
      mockFetch.mockRejectedValue(new TypeError('Network error'));

      let caught: unknown;
      const done = request('/project/sodium').catch((e) => { caught = e; });

      await vi.runAllTimersAsync();
      await done;

      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(caught).toBeInstanceOf(TypeError);
      expect((caught as TypeError).message).toBe('Network error');
    });

    it('succeeds on the second attempt after an initial 503', async () => {
      expect.assertions(2);
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
        .mockResolvedValue({ ok: true, json: async () => ({ id: 'sodium' }) });

      const done = request('/project/sodium');

      await vi.runAllTimersAsync();
      const result = await done;

      // First call failed, second succeeded — no more calls.
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ id: 'sodium' });
    });
  });
});
