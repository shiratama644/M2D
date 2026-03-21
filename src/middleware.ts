import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Use 16 random bytes (128 bits) via the Web Crypto API for the nonce.
  // This is cryptographically secure and sufficient for CSP nonces.
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = Buffer.from(nonceBytes).toString('base64');

  // 'strict-dynamic' lets scripts loaded by the nonced bootstrap scripts
  // also execute, which is required for Next.js App Router chunk loading.
  // The explicit domain is kept as a CSP Level 2 fallback for older browsers
  // that do not honour 'strict-dynamic'.
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://va.vercel-scripts.com`,
    // 'unsafe-inline' for styles is required because Framer Motion and
    // Tailwind utility classes apply inline style attributes at runtime.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://cdn.modrinth.com https://*.modrinth.com https://cdn.discordapp.com",
    "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com",
    "font-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');

  // Forward the nonce to the layout via a request header so it can be
  // applied to inline <script> tags (e.g. the theme initialisation script).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: [
    {
      // Apply to all routes except static assets and Next.js internals.
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
