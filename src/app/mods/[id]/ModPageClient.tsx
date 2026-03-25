'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { FALLBACK_ICON } from '@/lib/helpers';
import type { ModProject } from '@/types/modrinth';

const MODRINTH_BASE = 'https://modrinth.com/mod/';

export default function ModPageClient({ project }: { project: ModProject }) {
  const [iconError, setIconError] = useState(false);
  const galleryRef = useRef<HTMLDivElement | null>(null);

  const iconSrc = iconError
    ? FALLBACK_ICON
    : (project.icon_url || FALLBACK_ICON);

  const gallery = project.gallery || [];

  const scrollToGallery = () =>
    galleryRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div style={{ minHeight: '100vh' }}>
      <header className="header">
        <Link
          href="/"
          className="header-back-link"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: 'var(--accent-color)' }}
        >
          ← M2D
        </Link>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {project.title}
        </span>
        <a
          href={`${MODRINTH_BASE}${project.slug || project.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-small green"
        >
          Modrinth ↗
        </a>
      </header>

      <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '1.5rem 1rem' }}>
        <div className="mod-detail">
          <div className="mod-detail-header">
            <Image
              src={iconSrc}
              className="mod-detail-icon"
              alt={`${project.title} icon`}
              width={64}
              height={64}
              onError={() => setIconError(true)}
              unoptimized={!!project.icon_url && !project.icon_url.includes('cdn.modrinth.com')}
            />
            <div className="mod-detail-header-info">
              <h1 className="mod-detail-title">{project.title}</h1>
              <p className="mod-detail-summary">{project.description}</p>
              <div className="mod-detail-actions">
                <Link href={`/?mod=${project.slug || project.id}`} className="btn-small green">
                  Open in M2D
                </Link>
                <a
                  href={`${MODRINTH_BASE}${project.slug || project.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-small"
                >
                  View on Modrinth ↗
                </a>
                {gallery.length > 0 && (
                  <button className="btn-small" onClick={scrollToGallery}>
                    Gallery ({gallery.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mod-detail-body">
            {project.body ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  img: ({ src, alt }) =>
                    typeof src === 'string' ? (
                      <Image
                        src={src}
                        alt={alt || ''}
                        width={0}
                        height={0}
                        sizes="100vw"
                        style={{ width: '100%', height: 'auto' }}
                        loading="lazy"
                        unoptimized
                      />
                    ) : null,
                  a: ({ href, children, ...props }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                      {children}
                    </a>
                  ),
                  iframe: ({ src, title, width: _w, height: _h, ...props }) => (
                    <span className="mod-detail-iframe-wrapper">
                      <iframe
                        src={src}
                        title={title || 'Embedded video'}
                        allowFullScreen
                        loading="lazy"
                        {...props}
                      />
                    </span>
                  ),
                }}
              >
                {project.body}
              </ReactMarkdown>
            ) : (
              <p className="mod-detail-body-empty">No description available.</p>
            )}
          </div>

          {gallery.length > 0 && (
            <div ref={galleryRef} className="mod-detail-gallery">
              <h2 className="mod-detail-gallery-title">Gallery</h2>
              <div className="mod-gallery-grid">
                {gallery.map((item, i) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mod-gallery-item"
                  >
                    <div className="mod-gallery-img-wrapper">
                      <Image
                        src={item.url}
                        alt={item.title || `Screenshot ${i + 1}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        style={{ objectFit: 'cover' }}
                        loading="lazy"
                        unoptimized
                      />
                    </div>
                    {item.title && (
                      <span className="mod-gallery-caption">{item.title}</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
