import { NextResponse } from 'next/server';

const MODRINTH_BASE = 'https://api.modrinth.com/v2';

/**
 * Determine an appropriate ISR revalidation window (in seconds) for each
 * Modrinth endpoint so that Next.js caches the upstream responses on the
 * server.  Multiple browser clients that request the same data within the
 * revalidation window share a single Modrinth API call.
 */
function getRevalidate(pathStr) {
  if (pathStr.startsWith('tag/')) return 3600;          // Tags rarely change
  if (pathStr.startsWith('version_file/')) return false; // Hash lookup – always fresh
  if (pathStr.includes('/version')) return 300;          // Project versions
  if (pathStr.startsWith('project/')) return 300;        // Project details
  if (pathStr.startsWith('versions')) return 300;        // Bulk version fetch
  if (pathStr === 'search') return 60;                   // Search results
  return 120;
}

export async function GET(request, { params }) {
  const pathSegments = (await params).path;
  const pathStr = pathSegments.join('/');
  const search = request.nextUrl.search;
  const upstreamUrl = `${MODRINTH_BASE}/${pathStr}${search}`;

  const revalidate = getRevalidate(pathStr);
  const fetchOptions = revalidate === false ? {} : { next: { revalidate } };

  try {
    const res = await fetch(upstreamUrl, fetchOptions);

    if (!res.ok) {
      const body = await res.text();
      return new NextResponse(body, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Modrinth proxy error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch from Modrinth' },
      { status: 502 },
    );
  }
}
