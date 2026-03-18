import { revalidatePath, revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';

const RATE_LIMIT_MAX = Number(process.env.REVALIDATE_RATE_LIMIT) || 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

const rateLimitStore = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitStore.get(ip) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= RATE_LIMIT_MAX) return true;
  timestamps.push(now);
  rateLimitStore.set(ip, timestamps);
  return false;
}

const SLUG_RE = /^[a-zA-Z0-9_][a-zA-Z0-9_-]{1,62}[a-zA-Z0-9_]$/;

function isAllowedTag(tag: unknown): boolean {
  if (typeof tag !== 'string') return false;
  if (tag === 'mods-home') return true;
  if (tag.startsWith('project-') && SLUG_RE.test(tag.slice('project-'.length))) return true;
  return false;
}

function isAllowedPath(path: unknown): boolean {
  if (typeof path !== 'string') return false;
  if (path === '/') return true;
  const modMatch = path.match(/^\/mods\/([^/]+)$/);
  if (modMatch && SLUG_RE.test(modMatch[1])) return true;
  return false;
}

export async function POST(request: NextRequest) {
  const xRealIp = request.headers.get('x-real-ip');
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const rawIp =
    xRealIp?.trim() ||
    xForwardedFor?.split(',').at(-1)?.trim() ||
    'unknown';
  const ip = rawIp.slice(0, 45);

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const secret = process.env.REVALIDATE_SECRET;
  const provided = typeof body.secret === 'string' ? body.secret : '';

  const secretValid =
    secret &&
    provided.length === secret.length &&
    timingSafeEqual(Buffer.from(provided), Buffer.from(secret));

  if (!secretValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tag, path } = body;
  if (!tag && !path) {
    return NextResponse.json(
      { error: 'Provide at least one of "tag" or "path"' },
      { status: 400 },
    );
  }

  if (tag !== undefined && !isAllowedTag(tag)) {
    return NextResponse.json({ error: `Unknown tag: ${String(tag)}` }, { status: 400 });
  }
  if (path !== undefined && !isAllowedPath(path)) {
    return NextResponse.json({ error: `Unknown path: ${String(path)}` }, { status: 400 });
  }

  const revalidated: Array<{ type: string; value: string }> = [];

  if (tag && typeof tag === 'string') {
    revalidateTag(tag);
    revalidated.push({ type: 'tag', value: tag });
  }

  if (path && typeof path === 'string') {
    revalidatePath(path);
    revalidated.push({ type: 'path', value: path });
  }

  return NextResponse.json({ revalidated });
}
