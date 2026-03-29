'use client';

import { CSSProperties, useMemo } from 'react';

interface IconProps {
  svg: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Strip <script> elements and inline event-handler attributes from an SVG
 * string as a defence-in-depth measure against XSS.
 *
 * Uses the browser DOM API (document.createElement) to parse and clean the
 * SVG so that no regex edge-cases are left open.  Falls back to the original
 * string during SSR — safe because every SVG passed to this component is a
 * bundled asset imported at build time (webpack asset/source).
 */
function sanitizeSvg(svg: string): string {
  if (typeof document === 'undefined') return svg;
  const tmp = document.createElement('div');
  tmp.innerHTML = svg;
  tmp.querySelectorAll('script').forEach((el) => el.remove());
  tmp.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes)
      .filter((a) => /^on/i.test(a.name))
      .forEach((a) => el.removeAttribute(a.name));
  });
  return tmp.innerHTML;
}

// All SVGs are imported from local assets as raw strings (Next.js webpack asset/source).
export default function Icon({ svg, size = 24, className = '', style = {} }: IconProps) {
  // suppressHydrationWarning: SSR returns raw string, client returns sanitised string.
  // For bundled assets these are always identical so there is no real mismatch.
  const safeSvg = useMemo(() => sanitizeSvg(svg), [svg]);
  return (
    <span
      className={`inline-icon ${className}`}
      style={{ display: 'inline-flex', width: size, height: size, flexShrink: 0, ...style }}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safeSvg }}
      suppressHydrationWarning
    />
  );
}
