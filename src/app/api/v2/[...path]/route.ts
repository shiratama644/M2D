import { NextResponse, type NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { memCache } from '@/app/api/v2/cache';

const MODRINTH_BASE = 'https://api.modrinth.com/v2';

const UPSTREAM_TIMEOUT_MS = parseInt(process.env.UPSTREAM_TIMEOUT_MS ?? '', 10) || 8_000;

/** Modrinth asks third-party clients to identify themselves. */
const USER_AGENT = 'M2D/1.0 (https://github.com/shiratama644/M2D)';

interface CacheEntry {
  data: unknown;
  etag: string;
}

function getCacheTtl(pathStr: string): number {
  if (pathStr.startsWith('tag/')) return 3600;
  if (pathStr.startsWith('version_file/')) return 300;
  if (pathStr.startsWith('project/') && pathStr.includes('/version')) return 300;
  if (pathStr.startsWith('project/')) return 600;
  if (pathStr.startsWith('versions')) return 300;
  if (pathStr === 'search') return 60;
  return 120;
}

function normalizeQueryString(search: string): string {
  if (!search) return '';
  const params = new URLSearchParams(search);
  const qs = new URLSearchParams([...params.entries()].sort()).toString();
  return qs ? `?${qs}` : '';
}

// SHA-1 is used here only for cache identity (not security); it is fast and built-in.
function buildEtag(data: unknown): string {
  return `"${createHash('sha1').update(JSON.stringify(data)).digest('hex').slice(0, 16)}"`;
}

function cacheHeaders(ttl: number): Record<string, string> {
  const swr = Math.floor(ttl * 0.5);
  return {
    'Cache-Control': `public, max-age=${ttl}, stale-while-revalidate=${swr}`,
    Vary: 'Accept-Encoding',
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const pathSegments = (await params).path;
  const pathStr = pathSegments.join('/');
  const search = normalizeQueryString(request.nextUrl.search);
  const upstreamUrl = `${MODRINTH_BASE}/${pathStr}${search}`;
  const cacheKey = upstreamUrl;

  const cached = memCache.get<CacheEntry>(cacheKey);
  if (cached !== undefined) {
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === cached.etag) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: cached.etag, 'X-Cache': 'HIT' },
      });
    }
    const ttl = getCacheTtl(pathStr);
    return NextResponse.json(cached.data, {
      headers: { ETag: cached.etag, 'X-Cache': 'HIT', ...cacheHeaders(ttl) },
    });
  }

  const ttl = getCacheTtl(pathStr);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const res = await fetch(upstreamUrl, {
      next: { revalidate: ttl },
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!res.ok) {
      const body = await res.text();
      return new NextResponse(body, { status: res.status });
    }

    const data = await res.json();
    const etag = buildEtag(data);
    memCache.set<CacheEntry>(cacheKey, { data, etag }, ttl);
    return NextResponse.json(data, {
      headers: { ETag: etag, 'X-Cache': 'MISS', ...cacheHeaders(ttl) },
    });
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') {
      console.error('Modrinth proxy timeout:', upstreamUrl);
      return NextResponse.json(
        { error: 'Upstream request timed out' },
        { status: 504 },
      );
    }
    console.error('Modrinth proxy error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch from Modrinth' },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
