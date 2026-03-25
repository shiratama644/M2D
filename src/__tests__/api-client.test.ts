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
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    mockFetch.mockReset();
  });

  it('calls fetch with correct URL when no params', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'ok' }),
    });

    const result = await request('/project/sodium');

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

  it('throws ApiError on non-ok HTTP response', async () => {
    // 404 is not retryable, so this resolves immediately.
    mockFetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });

    await expect(request('/project/nonexistent')).rejects.toBeInstanceOf(ApiError);
  });

  it('ApiError from failed request has correct status', async () => {
    // 400 Bad Request is not retryable; thrown immediately with the correct status code.
    mockFetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({}) });

    try {
      await request('/search');
      expect.fail('Expected ApiError to be thrown');
    } catch (err) {
      expect((err as ApiError).status).toBe(400);
    }
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

  it('propagates network errors (fetch rejects)', async () => {
    // Use fake timers so the exponential back-off delays are skipped.
    vi.useFakeTimers();
    mockFetch.mockRejectedValue(new TypeError('Network error'));

    try {
      // Attach the rejection handler before advancing timers to avoid
      // "PromiseRejectionHandledWarning" from Node.js.
      let caughtError: unknown;
      const p = request('/project/sodium').catch((e) => { caughtError = e; });

      await vi.runAllTimersAsync();
      await p;

      expect(caughtError).toBeInstanceOf(TypeError);
      expect((caughtError as TypeError).message).toBe('Network error');
    } finally {
      vi.useRealTimers();
    }
  });

  it('retries on 5xx and eventually throws the ApiError', async () => {
    // Use fake timers to skip back-off delays.
    vi.useFakeTimers();
    mockFetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });

    try {
      let caughtError: unknown;
      const p = request('/search').catch((e) => { caughtError = e; });

      await vi.runAllTimersAsync();
      await p;

      // Should have retried MAX_RETRIES (3) times = 4 total fetch calls.
      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(caughtError).toBeInstanceOf(ApiError);
      expect((caughtError as ApiError).status).toBe(503);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not retry on 4xx client errors', async () => {
    // 403 Forbidden is a client error and should not be retried.
    mockFetch.mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });

    await expect(request('/project/secret')).rejects.toBeInstanceOf(ApiError);

    // Exactly one fetch call – no retries.
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
