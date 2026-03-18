import { revalidatePath, revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

/**
 * On-demand ISR endpoint.
 *
 * POST /api/revalidate
 * Body (JSON): { secret: string, tag?: string, path?: string }
 *
 * At least one of `tag` or `path` must be provided.
 * Authenticates via the REVALIDATE_SECRET environment variable.
 *
 * Allowed tags:  "mods-home" | "project-<slug>"
 * Allowed paths: "/" | "/mods/<slug>"
 */

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, per-IP sliding window)
// ---------------------------------------------------------------------------

/** Maximum revalidation requests allowed per IP within the window. */
const RATE_LIMIT_MAX = Number(process.env.REVALIDATE_RATE_LIMIT) || 10;
/** Sliding-window duration in milliseconds. */
const RATE_LIMIT_WINDOW_MS = 60_000;

/** Map<ip, timestamp[]> – request timestamps within the current window. */
const rateLimitStore = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitStore.get(ip) ?? []).filter(
    (t) => t > windowStart,
  );
  if (timestamps.length >= RATE_LIMIT_MAX) return true;
  timestamps.push(now);
  rateLimitStore.set(ip, timestamps);
  return false;
}

// ---------------------------------------------------------------------------
// Scope validation
// ---------------------------------------------------------------------------

/**
 * Slug format accepted by Modrinth:
 *   - 3–64 characters
 *   - Alphanumeric, hyphens, and underscores
 *   - Must not start or end with a hyphen
 *
 * Anchored first/last char to [a-zA-Z0-9_] avoids the need for a lookbehind.
 */
const SLUG_RE = /^[a-zA-Z0-9_][a-zA-Z0-9_-]{1,62}[a-zA-Z0-9_]$/;

function isAllowedTag(tag) {
  if (typeof tag !== 'string') return false;
  if (tag === 'mods-home') return true;
  if (tag.startsWith('project-') && SLUG_RE.test(tag.slice('project-'.length)))
    return true;
  return false;
}

function isAllowedPath(path) {
  if (typeof path !== 'string') return false;
  if (path === '/') return true;
  const modMatch = path.match(/^\/mods\/([^/]+)$/);
  if (modMatch && SLUG_RE.test(modMatch[1])) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request) {
  // ---------------------------------------------------------------------------
  // IP extraction for rate limiting.
  //
  // Prefer x-real-ip (set by a trusted reverse proxy such as Nginx; the client
  // cannot inject it).  Fall back to the LAST entry in x-forwarded-for, which
  // is appended by the nearest trusted proxy and is harder for a client to
  // spoof than the first/leftmost entry.  Clamp to 45 chars (max IPv6 length)
  // so the map key can never be an arbitrarily large string.
  // ---------------------------------------------------------------------------
  const xRealIp = request.headers.get('x-real-ip');
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const rawIp =
    xRealIp?.trim() ||
    xForwardedFor?.split(',').at(-1)?.trim() ||
    'unknown';
  const ip = rawIp.slice(0, 45);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const secret = process.env.REVALIDATE_SECRET;
  const provided = typeof body.secret === 'string' ? body.secret : '';

  // Use constant-time comparison to prevent timing-based secret inference.
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

  // Validate that only known tags/paths can be purged.
  if (tag !== undefined && !isAllowedTag(tag)) {
    return NextResponse.json(
      { error: `Unknown tag: ${tag}` },
      { status: 400 },
    );
  }
  if (path !== undefined && !isAllowedPath(path)) {
    return NextResponse.json(
      { error: `Unknown path: ${path}` },
      { status: 400 },
    );
  }

  const revalidated = [];

  if (tag) {
    revalidateTag(tag);
    revalidated.push({ type: 'tag', value: tag });
  }

  if (path) {
    revalidatePath(path);
    revalidated.push({ type: 'path', value: path });
  }

  return NextResponse.json({ revalidated });
}
