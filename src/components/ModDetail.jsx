import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useApp } from '../context/AppContext';
import { API } from '../utils/api';
import Icon from './Icon';
import externalLinkIconRaw from '../assets/icons/arrow-up-right.svg?raw';
import imageIconRaw from '../assets/icons/images.svg?raw';

const FALLBACK_ICON = 'https://cdn.modrinth.com/assets/unknown_server.png';
const MODRINTH_BASE = 'https://modrinth.com/mod/';

const TRANSLATE_MAX = 500;
const TRANSLATE_API = 'https://api.mymemory.translated.net/get';

async function translateChunk(text) {
  // Preserve markdown links, image tags, and inline code from being mangled by translation API
  const preserved = [];
  const placeholder = (i) => `__MD${i}__`;
  const safed = text.replace(/!?\[([^\]]*)\]\(([^)]*)\)|`[^`]+`/g, (match) => {
    const idx = preserved.length;
    preserved.push(match);
    return placeholder(idx);
  });
  try {
    const res = await fetch(`${TRANSLATE_API}?q=${encodeURIComponent(safed)}&langpair=en|ja`);
    if (!res.ok) return text;
    const data = await res.json();
    if (data.responseStatus === 200) {
      let result = data.responseData.translatedText;
      preserved.forEach((original, i) => {
        result = result.replace(placeholder(i), original);
      });
      return result;
    }
  } catch {
    // fall through to return original text
  }
  return text;
}

async function translateBody(body) {
  if (!body) return body;
  const parts = body.split(/(\n\n+)/);
  const translated = await Promise.all(
    parts.map(async (part) => {
      if (/^\s*$/.test(part)) return part;
      const trimmed = part.trim();
      if (!trimmed || trimmed.length < 3) return part;
      // Skip code blocks
      if (trimmed.startsWith('```') || trimmed.startsWith('    ')) return part;
      if (trimmed.length <= TRANSLATE_MAX) {
        return translateChunk(trimmed);
      }
      // Split long paragraphs by sentence boundaries (period followed by space + uppercase)
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
    })
  );
  return translated.join('');
}

export default function ModDetail() {
  const { activeModId, modDataMap, t, language } = useApp();
  const [state, setState] = useState({ id: null, detail: null });
  const [translatedContent, setTranslatedContent] = useState({ id: null, lang: null, description: null, body: null });
  const [translating, setTranslating] = useState(false);
  const galleryRef = useRef(null);
  const translationCache = useRef({});

  useEffect(() => {
    if (!activeModId) return;
    let cancelled = false;
    API.getProject(activeModId)
      .then(data => { if (!cancelled) setState({ id: activeModId, detail: data }); })
      .catch(() => { if (!cancelled) setState({ id: activeModId, detail: null }); });
    return () => { cancelled = true; };
  }, [activeModId]);

  const projectDetail = state.id === activeModId ? state.detail : null;
  const loading = activeModId !== null && state.id !== activeModId;

  const translatingRef = useRef(false);

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
    ]).then(([description, body]) => {
      translatingRef.current = false;
      if (modId !== activeModId) return;
      const result = { id: modId, lang: language, description, body };
      translationCache.current[cacheKey] = result;
      setTranslatedContent(result);
      setTranslating(false);
    }).catch((err) => {
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

  const scrollToGallery = () => {
    galleryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const hasTranslation = translatedContent.id === activeModId && translatedContent.lang === language;
  const displayDescription = (hasTranslation && translatedContent.description) ? translatedContent.description : projectDetail.description;
  const displayBody = (hasTranslation && translatedContent.body) ? translatedContent.body : projectDetail.body;

  return (
    <div className="mod-detail">
      {/* Header */}
      <div className="mod-detail-header">
        <img
          src={projectDetail.icon_url || mod.icon_url || FALLBACK_ICON}
          className="mod-detail-icon"
          alt="icon"
          onError={e => { e.target.src = FALLBACK_ICON; }}
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

      {/* Body (Markdown) */}
      <div className="mod-detail-body">
        {language === 'ja' && (
          <div className="mod-detail-translate-bar">
            <button
              className="btn-small green"
              onClick={handleTranslate}
              disabled={translating || hasTranslation}
            >
              {translating ? t.rightPanel.translating : hasTranslation ? t.rightPanel.translated : t.rightPanel.translate}
            </button>
          </div>
        )}
        {displayBody ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              img: ({ src, alt, ...props }) => (
                <img src={src} alt={alt} loading="lazy" style={{ maxWidth: '100%' }} {...props} />
              ),
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
              <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="mod-gallery-item">
                <img
                  src={item.url}
                  alt={item.title || `Screenshot ${i + 1}`}
                  loading="lazy"
                  className="mod-gallery-img"
                />
                {item.title && <span className="mod-gallery-caption">{item.title}</span>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
