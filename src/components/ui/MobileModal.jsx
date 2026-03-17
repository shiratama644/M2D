'use client';

import Icon from './Icon';
import xIconRaw from '../../assets/icons/x.svg';

/**
 * Reusable mobile modal wrapper that matches the SettingsModal UI style.
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
  return (
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
}
