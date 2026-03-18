'use client';

import { createPortal } from 'react-dom';
import Icon from './Icon';
import xIconRaw from '../../assets/icons/x.svg';

/**
 * Reusable mobile modal wrapper that matches the SettingsModal UI style.
 *
 * Renders via a React Portal at document.body so that ancestor CSS properties
 * such as backdrop-filter (which create a new stacking context) never clip or
 * constrain the modal overlay.
 *
 * Props:
 *   title      – text shown in the modal header
 *   titleIcon  – optional SVG string for the icon beside the title
 *   onClose    – callback invoked when the overlay or close button is clicked
 *   size       – pass "large" for the wider modal-container variant
 *   footer     – optional React node rendered inside modal-footer
 *   children   – content rendered inside modal-body
 */
export default function MobileModal({ title, titleIcon, onClose, size, children, footer }) {
  // Guard for SSR: document is not available on the server.
  // Both callers (SettingsModal, FilterModal) only mount this component when
  // their open-state is true, so this path is never reached during SSR.
  if (typeof document === 'undefined') return null;

  const content = (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`modal-container${size === 'large' ? ' large' : ''}`}>
        <div className="modal-header">
          <h3 className="modal-title">
            {titleIcon && <Icon svg={titleIcon} size={20} />} {title}
          </h3>
          <button onClick={onClose} className="btn-close-modal">
            <Icon svg={xIconRaw} size={20} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
