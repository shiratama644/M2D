import { NextResponse } from 'next/server';

const MODRINTH_BASE = 'https://api.modrinth.com/v2';

/** Upstream request timeout in milliseconds. */
const UPSTREAM_TIMEOUT_MS = 8_000;

/**
 * Determine an appropriate ISR revalidation window (in seconds) for each
 * Modrinth endpoint so that Next.js caches the upstream responses on the
 * server.  Multiple browser clients that request the same data within the
 * revalidation window share a single Modrinth API call.
 */
function getRevalidate(pathStr) {
  if (pathStr.startsWith('tag/')) return 3600;         // Tags rarely change
  if (pathStr.startsWith('version_file/')) return 60;  // Short TTL – hash is stable but allow eventual refresh
  if (pathStr.includes('/version')) return 300;         // Project versions
  if (pathStr.startsWith('project/')) return 300;       // Project details
  if (pathStr.startsWith('versions')) return 300;       // Bulk version fetch
  if (pathStr === 'search') return 60;                  // Search results
  return 120;
}

/**
 * Normalise a query string so that parameter order never affects the cache
 * key.  Sorting the entries alphabetically means ?b=2&a=1 and ?a=1&b=2
 * resolve to the same upstream URL and share the same Next.js fetch-cache
 * entry, preventing unnecessary cache-key explosion on the search endpoint.
 */
function normalizeQueryString(search) {
  if (!search) return '';
  const params = new URLSearchParams(search);
  const sorted = new URLSearchParams([...params.entries()].sort());
  return `?${sorted.toString()}`;
}

export async function GET(request, { params }) {
  const pathSegments = (await params).path;
  const pathStr = pathSegments.join('/');
  const search = normalizeQueryString(request.nextUrl.search);
  const upstreamUrl = `${MODRINTH_BASE}/${pathStr}${search}`;

  const revalidate = getRevalidate(pathStr);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const res = await fetch(upstreamUrl, {
      next: { revalidate },
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      return new NextResponse(body, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
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
