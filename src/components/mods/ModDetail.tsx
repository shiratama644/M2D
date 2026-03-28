'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useApp } from '@/context/AppContext';
import { API } from '@/lib/api';
import Icon from '@/components/ui/Icon';
import { FALLBACK_ICON } from '@/lib/helpers';
import { translateChunk, translateBody } from '@/lib/translate';
import externalLinkIconRaw from '@/assets/icons/arrow-up-right.svg';
import imageIconRaw from '@/assets/icons/images.svg';
import type { ModProject } from '@/types/modrinth';

const MODRINTH_BASE = 'https://modrinth.com/mod/';

interface TranslatedContent {
  id: string | null;
  lang: string | null;
  description: string | null;
  body: string | null;
}

const EMPTY_TRANSLATION: TranslatedContent = { id: null, lang: null, description: null, body: null };

export default function ModDetail() {
  const { activeModId, modDataMap, showAlert, t } = useApp();
  const [state, setState] = useState<{ id: string | null; detail: ModProject | null }>({ id: null, detail: null });
  const [translatedContent, setTranslatedContent] = useState<TranslatedContent>(EMPTY_TRANSLATION);
  const [translating, setTranslating] = useState(false);
  const [iconError, setIconError] = useState<{ id: string | null; errored: boolean }>({ id: null, errored: false });
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const translationCache = useRef<Record<string, TranslatedContent>>({});
  const translationAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort any in-progress translation and reset state when the active mod changes.
    translationAbortRef.current?.abort();
    translationAbortRef.current = null;
    setTranslating(false);
    setTranslatedContent(EMPTY_TRANSLATION);

    if (!activeModId) return;
    const controller = new AbortController();
    API.getProject(activeModId, controller.signal)
      .then((data) => setState({ id: activeModId, detail: data }))
      .catch((err: unknown) => {
        if ((err as { name?: string }).name !== 'AbortError') {
          setState({ id: activeModId, detail: null });
        }
      });
    return () => controller.abort();
  }, [activeModId]);

  const projectDetail = state.id === activeModId ? state.detail : null;
  const loading = activeModId !== null && state.id !== activeModId;

  const handleTranslate = () => {
    if (!projectDetail || !activeModId) return;
    const cacheKey = `${activeModId}:ja`;
    if (translationCache.current[cacheKey]) {
      setTranslatedContent(translationCache.current[cacheKey]);
      return;
    }
    if (translating) return;
    translationAbortRef.current?.abort();
    const controller = new AbortController();
    translationAbortRef.current = controller;
    const modId = activeModId;
    setTranslating(true);
    Promise.all([
      translateChunk(projectDetail.description || '', controller.signal),
      translateBody(projectDetail.body || '', controller.signal),
    ])
      .then(([description, body]) => {
        if (controller.signal.aborted) return;
        const result: TranslatedContent = { id: modId, lang: 'ja', description, body };
        // LRU eviction: keep at most 50 cached translations
        const keys = Object.keys(translationCache.current);
        if (keys.length >= 50) {
          delete translationCache.current[keys[0]];
        }
        translationCache.current[cacheKey] = result;
        setTranslatedContent(result);
        setTranslating(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.error('Translation failed:', err);
        showAlert(t.rightPanel.translateFailed);
        setTranslating(false);
      });
  };

  const handleRevertTranslation = () => {
    setTranslatedContent(EMPTY_TRANSLATION);
  };

  if (!activeModId) {
    return (
      <div className="mod-detail-empty">
        <p>{t.rightPanel.noDescription}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mod-detail-empty">
        <div className="loader-dots" style={{ position: 'relative', width: '5rem', height: '1.25rem' }}>
          <div /><div /><div /><div />
        </div>
      </div>
    );
  }

  if (!projectDetail) return null;

  const mod = modDataMap[activeModId] as { icon_url?: string; title?: string } | undefined;
  const gallery = projectDetail.gallery || [];

  const scrollToGallery = () => galleryRef.current?.scrollIntoView({ behavior: 'smooth' });

  const hasTranslation =
    translatedContent.id === activeModId && translatedContent.body !== null;
  const displayDescription = hasTranslation && translatedContent.description
    ? translatedContent.description
    : projectDetail.description;
  const displayBody = hasTranslation && translatedContent.body
    ? translatedContent.body
    : projectDetail.body;

  const iconSrc = (iconError.id === activeModId && iconError.errored)
    ? FALLBACK_ICON
    : (projectDetail.icon_url || mod?.icon_url || FALLBACK_ICON);

  return (
    <div className="mod-detail">
      <div className="mod-detail-header">
        <Image
          src={iconSrc}
          className="mod-detail-icon"
          alt={`${projectDetail.title || mod?.title || activeModId} icon`}
          width={64}
          height={64}
          onError={() => setIconError({ id: activeModId, errored: true })}
          unoptimized={!iconSrc.includes('cdn.modrinth.com')}
        />
        <div className="mod-detail-header-info">
          <h2 className="mod-detail-title">{projectDetail.title || mod?.title}</h2>
          <p className="mod-detail-summary">{displayDescription}</p>
          <div className="mod-detail-actions">
            <a
              href={`${MODRINTH_BASE}${activeModId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-small green"
            >
              <Icon svg={externalLinkIconRaw} size={12} /> {t.rightPanel.openModrinth}
            </a>
            <Link href={`/mods/${activeModId}`} className="btn-small" target="_blank">
              <Icon svg={externalLinkIconRaw} size={12} /> {t.rightPanel.share}
            </Link>
            {gallery.length > 0 && (
              <button className="btn-small" onClick={scrollToGallery}>
                <Icon svg={imageIconRaw} size={12} /> {t.rightPanel.gallery} ({gallery.length})
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mod-detail-body">
        <div className="mod-detail-translate-bar">
          {hasTranslation ? (
            <button
              className="btn-small"
              onClick={handleRevertTranslation}
            >
              {t.rightPanel.revertTranslation}
            </button>
          ) : (
            <button
              className="btn-small green"
              onClick={handleTranslate}
              disabled={translating}
            >
              {translating ? t.rightPanel.translating : t.rightPanel.translate}
            </button>
          )}
        </div>
        {displayBody ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              img: ({ src, alt }) => typeof src === 'string' ? (
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
                <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
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
            {displayBody}
          </ReactMarkdown>
        ) : (
          <p className="mod-detail-body-empty">No description available.</p>
        )}
      </div>

      {gallery.length > 0 && (
        <div ref={galleryRef} className="mod-detail-gallery">
          <h3 className="mod-detail-gallery-title">
            <Icon svg={imageIconRaw} size={16} /> {t.rightPanel.gallery}
          </h3>
          <div className="mod-gallery-grid">
            {gallery.map((item, i) => (
              <a
                key={item.url}
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
                {item.title && <span className="mod-gallery-caption">{item.title}</span>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
