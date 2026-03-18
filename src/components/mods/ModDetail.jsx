'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useApp } from '../../context/AppContext';
import { API } from '../../lib/api';
import Icon from '../ui/Icon';
import { FALLBACK_ICON } from '../../lib/helpers';
import externalLinkIconRaw from '../../assets/icons/arrow-up-right.svg';
import imageIconRaw from '../../assets/icons/images.svg';

const MODRINTH_BASE = 'https://modrinth.com/mod/';
const TRANSLATE_MAX = 500;
const TRANSLATE_API = 'https://api.mymemory.translated.net/get';

// ---------------------------------------------------------------------------
// Translation helpers
// ---------------------------------------------------------------------------

async function translateChunk(text) {
  // Preserve markdown/HTML syntax from being mangled by the translation API.
  // Unicode Private Use Area chars act as opaque delimiters.
  const preserved = [];
  const placeholder = (i) => `\uE000${i}\uE001`;
  const protect = (match) => {
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
  processed = processed.replace(/~~/g, protect);
  processed = processed.replace(/https?:\/\/[^\s<>)\]]+/g, protect);

  try {
    const res = await fetch(`${TRANSLATE_API}?q=${encodeURIComponent(processed)}&langpair=en|ja`);
    if (!res.ok) return text;
    const data = await res.json();
    if (data.responseStatus === 200) {
      let result = data.responseData.translatedText;
      preserved.forEach((original, i) => {
        result = result.split(placeholder(i)).join(original);
      });
      return result;
    }
  } catch {
    // fall through
  }
  return text;
}

async function translateBody(body) {
  if (!body) return body;

  const codeBlocks = [];
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

      const chunks = [];
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ModDetail() {
  const { activeModId, modDataMap, t, language } = useApp();
  const [state, setState] = useState({ id: null, detail: null });
  const [translatedContent, setTranslatedContent] = useState({
    id: null, lang: null, description: null, body: null,
  });
  const [translating, setTranslating] = useState(false);
  const [iconError, setIconError] = useState({ id: null, errored: false });
  const galleryRef = useRef(null);
  const translationCache = useRef({});
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
    const cacheKey = `${activeModId}:${language}`;
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
        const result = { id: modId, lang: language, description, body };
        translationCache.current[cacheKey] = result;
        setTranslatedContent(result);
        setTranslating(false);
      })
      .catch((err) => {
        translatingRef.current = false;
        console.error('Translation failed:', err);
        setTranslating(false);
      });
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

  const mod = modDataMap[activeModId] || {};
  const gallery = projectDetail.gallery || [];

  const scrollToGallery = () => galleryRef.current?.scrollIntoView({ behavior: 'smooth' });

  const hasTranslation =
    translatedContent.id === activeModId && translatedContent.lang === language;
  const displayDescription = hasTranslation && translatedContent.description
    ? translatedContent.description
    : projectDetail.description;
  const displayBody = hasTranslation && translatedContent.body
    ? translatedContent.body
    : projectDetail.body;

  // Use FALLBACK_ICON if the icon for the current mod failed to load.
  // iconError tracks { id, errored } so the error auto-resets when the mod changes.
  const iconSrc = (iconError.id === activeModId && iconError.errored)
    ? FALLBACK_ICON
    : (projectDetail.icon_url || mod.icon_url || FALLBACK_ICON);

  return (
    <div className="mod-detail">
      {/* Header */}
      <div className="mod-detail-header">
        <Image
          src={iconSrc}
          className="mod-detail-icon"
          alt="icon"
          width={64}
          height={64}
          onError={() => setIconError({ id: activeModId, errored: true })}
        />
        <div className="mod-detail-header-info">
          <h2 className="mod-detail-title">{projectDetail.title || mod.title}</h2>
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
            {gallery.length > 0 && (
              <button className="btn-small" onClick={scrollToGallery}>
                <Icon svg={imageIconRaw} size={12} /> {t.rightPanel.gallery} ({gallery.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mod-detail-body">
        {language === 'ja' && (
          <div className="mod-detail-translate-bar">
            <button
              className="btn-small green"
              onClick={handleTranslate}
              disabled={translating || hasTranslation}
            >
              {translating
                ? t.rightPanel.translating
                : hasTranslation
                  ? t.rightPanel.translated
                  : t.rightPanel.translate}
            </button>
          </div>
        )}
        {displayBody ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              img: ({ src, alt }) => src ? (
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
            }}
          >
            {displayBody}
          </ReactMarkdown>
        ) : (
          <p className="mod-detail-body-empty">No description available.</p>
        )}
      </div>

      {/* Gallery */}
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
