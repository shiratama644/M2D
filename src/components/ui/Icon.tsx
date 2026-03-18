'use client';

import { CSSProperties } from 'react';

interface IconProps {
  svg: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

// All SVGs are imported from local assets as raw strings (Next.js webpack asset/source).
// dangerouslySetInnerHTML is safe here because every SVG comes from our own bundled assets.
export default function Icon({ svg, size = 24, className = '', style = {} }: IconProps) {
  return (
    <span
      className={`inline-icon ${className}`}
      style={{ display: 'inline-flex', width: size, height: size, flexShrink: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
