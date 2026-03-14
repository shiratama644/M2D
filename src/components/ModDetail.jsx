import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApp } from '../context/AppContext';
import { API } from '../utils/api';
import Icon from './Icon';
import externalLinkIconRaw from '../assets/icons/arrow-up-right.svg?raw';
import imageIconRaw from '../assets/icons/images.svg?raw';

const FALLBACK_ICON = 'https://cdn.modrinth.com/assets/unknown_server.png';
const MODRINTH_BASE = 'https://modrinth.com/mod/';

export default function ModDetail() {
  const { activeModId, modDataMap, t } = useApp();
  const [state, setState] = useState({ id: null, detail: null });
  const galleryRef = useRef(null);

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
          <p className="mod-detail-summary">{projectDetail.description}</p>
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
        {projectDetail.body ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ src, alt, ...props }) => (
                <img src={src} alt={alt} loading="lazy" style={{ maxWidth: '100%' }} {...props} />
              ),
              a: ({ href, children, ...props }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
              ),
            }}
          >
            {projectDetail.body}
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
