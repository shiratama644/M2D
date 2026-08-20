'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useScrollLock } from '@/hooks/useScrollLock';
import Icon from '@/components/ui/Icon';
import xIconRaw from '@/assets/icons/x.svg';

interface MobileModalProps {
  title: string;
  titleIcon?: string;
  onClose: () => void;
  size?: 'large' | undefined;
  footer?: ReactNode;
  children: ReactNode;
}

export default function MobileModal({ title, titleIcon, onClose, size, children, footer }: MobileModalProps) {
  useScrollLock();
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !boxRef.current) return;
      const focusable = [...boxRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )].filter((el) => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const content = (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          ref={boxRef}
          className={cn('modal-container', size === 'large' && 'large')}
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
