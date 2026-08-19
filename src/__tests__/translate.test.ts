import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { translateBody, translateChunk } from '@/lib/translate';

describe('translateChunk', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('returns the original text when the HTTP response is not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({}) });
    await expect(translateChunk('Hello world')).resolves.toBe('Hello world');
  });

  it('returns the original text when responseStatus is not 200', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ responseStatus: 429, responseData: { translatedText: 'x' } }),
    });
    await expect(translateChunk('Hello world')).resolves.toBe('Hello world');
  });

  it('restores protected markdown after a successful translation', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      const q = new URL(url).searchParams.get('q') ?? '';
      return {
        ok: true,
        json: async () => ({
          responseStatus: 200,
          responseData: { translatedText: `JA ${q}` },
        }),
      };
    });

    const result = await translateChunk('See [docs](https://example.com) now');
    expect(result).toContain('[docs](https://example.com)');
    expect(result.startsWith('JA ')).toBe(true);
  });

  it('rethrows AbortError', async () => {
    mockFetch.mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    await expect(translateChunk('Hello')).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('returns the original text on network errors that are not abort', async () => {
    mockFetch.mockRejectedValue(new TypeError('offline'));
    await expect(translateChunk('Hello')).resolves.toBe('Hello');
  });

  it('forwards the abort signal to fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ responseStatus: 200, responseData: { translatedText: 'x' } }),
    });
    const controller = new AbortController();
    await translateChunk('Hello', controller.signal);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});

describe('translateBody', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        responseStatus: 200,
        responseData: { translatedText: '訳文' },
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('returns empty input unchanged', async () => {
    await expect(translateBody('')).resolves.toBe('');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not translate fenced code blocks', async () => {
    const body = 'Intro paragraph here.\n\n```\nconst x = 1;\n```\n\nMore text here.';
    const result = await translateBody(body);
    expect(result).toContain('```\nconst x = 1;\n```');
    expect(result).toContain('訳文');
  });

  it('skips very short parts', async () => {
    const result = await translateBody('ab');
    expect(result).toBe('ab');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
