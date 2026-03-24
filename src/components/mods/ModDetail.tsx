'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useApp } from '../../context/AppContext';
import { API } from '../../lib/api';
import Icon from '../ui/Icon';
import { FALLBACK_ICON } from '../../lib/helpers';
import externalLinkIconRaw from '../../assets/icons/arrow-up-right.svg';
import imageIconRaw from '../../assets/icons/images.svg';
import type { ModProject } from '../../types/modrinth';

const MODRINTH_BASE = 'https://modrinth.com/mod/';
const TRANSLATE_MAX = 500;
const TRANSLATE_API = 'https://api.mymemory.translated.net/get';

async function translateChunk(text: string): Promise<string> {
  const preserved: string[] = [];
  // Generate a per-call random 8-hex-digit nonce so that the placeholder
  // is unique to this invocation and cannot collide with real content
  // even if the mod description happens to contain the MDPH prefix.
  // The nonce survives the MyMemory API round-trip because it consists
  // only of uppercase hex digits (A-F, 0-9) with no special characters.
  const nonce = Math.floor(Math.random() * 0x100000000).toString(16).toUpperCase().padStart(8, '0');
  const placeholder = (i: number) => `MDPH${nonce}${String(i).padStart(4, '0')}MDPH`;
  const protect = (match: string) => {
    const idx = preserved.length;
    preserved.push(match);
    return placeholder(idx);
  };

  let processed = text;
  processed = processed.replace(/<!--[\s\S]*?-->/g, protect);
  processed = processed.replace(/\[!?\[([^\]]*)\]\(([^)]*)\)\]\(([^)]*)\)/g, protect);
  processed = processed.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, protect);
  processed = processed.replace(/\[([^\]]*)\]\(([^)]*)\)/g, protect);
  processed = processed.replace(/`[^`]+`/g, protect);
  processed = processed.replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^>]*)?\/?>/g, protect);
  processed = processed.replace(/&(?:[a-zA-Z]+|#\d+|#x[a-fA-F0-9]+);/g, protect);
  processed = processed.replace(/^#{1,6}\s/gm, protect);
  processed = processed.replace(/^(?:\s*>)+\s?/gm, protect);
  processed = processed.replace(/^\s*[-*+]\s/gm, protect);
  processed = processed.replace(/^\s*\d+\.\s/gm, protect);
  processed = processed.replace(/^[-*_]{3,}\s*$/gm, protect);
  processed = processed.replace(/\*\*|__/g, protect);
  processed = processed.replace(/_(?=\S)(.+?)(?<=\S)_/g, protect);
  processed = processed.replace(/~~/g, protect);
  processed = processed.replace(/https?:\/\/[^\s<>)\]]+/g, protect);

  try {
    const res = await fetch(`${TRANSLATE_API}?q=${encodeURIComponent(processed)}&langpair=en|ja`);
    if (!res.ok) return text;
    const data = await res.json();
    if (data.responseStatus === 200) {
      let result = data.responseData.translatedText as string;
      // Process in reverse order to avoid partial replacements.
      for (let i = preserved.length - 1; i >= 0; i--) {
        result = result.split(placeholder(i)).join(preserved[i]);
      }
      return result;
    }
  } catch {
    // fall through
  }
  return text;
}

async function translateBody(body: string): Promise<string> {
  if (!body) return body;

  const codeBlocks: string[] = [];
  const CODE_PH = '\uE010';
  let processed = body.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, (match) => {
    const idx = codeBlocks.length;
    codeBlocks.push(match);
    return `${CODE_PH}${idx}${CODE_PH}`;
  });

  const parts = processed.split(/(\n\n+)/);
  const translated = await Promise.all(
    parts.map(async (part) => {
      if (/^\s*$/.test(part)) return part;
      const trimmed = part.trim();
      if (!trimmed || trimmed.length < 3) return part;
      if (trimmed.includes(CODE_PH)) return part;
      if (trimmed.startsWith('```') || trimmed.startsWith('~~~') || trimmed.startsWith('    ')) return part;
      if (trimmed.length <= TRANSLATE_MAX) return translateChunk(trimmed);

      const chunks: string[] = [];
      let current = '';
      const sentences = trimmed.split(/(?<=\.)\s+(?=[A-Z])/);
      for (const sentence of sentences) {
        const candidate = current ? current + ' ' + sentence : sentence;
        if (candidate.length > TRANSLATE_MAX && current) {
          chunks.push(current);
          current = sentence;
        } else {
          current = candidate;
        }
      }
      if (current) chunks.push(current);
      const results = await Promise.all(chunks.map(translateChunk));
      return results.join(' ');
    }),
  );

  let result = translated.join('');
  codeBlocks.forEach((block, i) => {
    result = result.split(`${CODE_PH}${i}${CODE_PH}`).join(block);
  });
  return result;
}

interface TranslatedContent {
  id: string | null;
  lang: string | null;
  description: string | null;
  body: string | null;
}

const EMPTY_TRANSLATION: TranslatedContent = { id: null, lang: null, description: null, body: null };

export default function ModDetail() {
  const { activeModId, modDataMap, t } = useApp();
  const [state, setState] = useState<{ id: string | null; detail: ModProject | null }>({ id: null, detail: null });
  const [translatedContent, setTranslatedContent] = useState<TranslatedContent>(EMPTY_TRANSLATION);
  const [translating, setTranslating] = useState(false);
  const [iconError, setIconError] = useState<{ id: string | null; errored: boolean }>({ id: null, errored: false });
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const translationCache = useRef<Record<string, TranslatedContent>>({});
  const translatingRef = useRef(false);

  useEffect(() => {
    if (!activeModId) return;
    let cancelled = false;
    API.getProject(activeModId)
      .then((data) => { if (!cancelled) setState({ id: activeModId, detail: data }); })
      .catch(() => { if (!cancelled) setState({ id: activeModId, detail: null }); });
    return () => { cancelled = true; };
  }, [activeModId]);

  const projectDetail = state.id === activeModId ? state.detail : null;
  const loading = activeModId !== null && state.id !== activeModId;

  const handleTranslate = () => {
    if (!projectDetail || !activeModId || translatingRef.current) return;
    const cacheKey = `${activeModId}:ja`;
    if (translationCache.current[cacheKey]) {
      setTranslatedContent(translationCache.current[cacheKey]);
      return;
    }
    const modId = activeModId;
    translatingRef.current = true;
    setTranslating(true);
    Promise.all([
      translateChunk(projectDetail.description || ''),
      translateBody(projectDetail.body || ''),
    ])
      .then(([description, body]) => {
        translatingRef.current = false;
        if (modId !== activeModId) return;
        const result: TranslatedContent = { id: modId, lang: 'ja', description, body };
        translationCache.current[cacheKey] = result;
        setTranslatedContent(result);
        setTranslating(false);
      })
      .catch((err: unknown) => {
        translatingRef.current = false;
        console.error('Translation failed:', err);
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
          alt="icon"
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
                {item.title && <span className="mod-gallery-caption">{item.title}</span>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
