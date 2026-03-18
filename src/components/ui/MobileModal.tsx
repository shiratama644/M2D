'use client';

import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import xIconRaw from '../../assets/icons/x.svg';

interface MobileModalProps {
  title: string;
  titleIcon?: string;
  onClose: () => void;
  size?: 'large' | undefined;
  footer?: ReactNode;
  children: ReactNode;
}

export default function MobileModal({ title, titleIcon, onClose, size, children, footer }: MobileModalProps) {
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
