import { NextResponse, type NextRequest } from 'next/server';

const MODRINTH_BASE = 'https://api.modrinth.com/v2';

const UPSTREAM_TIMEOUT_MS = parseInt(process.env.UPSTREAM_TIMEOUT_MS ?? '', 10) || 8_000;

function getRevalidate(pathStr: string): number {
  if (pathStr.startsWith('tag/')) return 3600;
  if (pathStr.startsWith('version_file/')) return 60;
  if (pathStr.includes('/version')) return 300;
  if (pathStr.startsWith('project/')) return 300;
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
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
