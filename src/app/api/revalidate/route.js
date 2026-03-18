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
 * Example tags used in this app:
 *   "mods-home"      – homepage mod list
 *   "project-<id>"   – individual mod page
 */
export async function POST(request) {
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
