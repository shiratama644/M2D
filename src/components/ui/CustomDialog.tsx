'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { useScrollLock } from '@/hooks/useScrollLock';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/Icon';
import circleAlertIconRaw from '@/assets/icons/circle-alert.svg';
import infoIconRaw from '@/assets/icons/info.svg';
import xIconRaw from '@/assets/icons/x.svg';

export default function CustomDialog() {
  const { dialog, closeDialog, t } = useApp();
  const okRef = useRef<HTMLButtonElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  useScrollLock(!!dialog);

  useEffect(() => {
    if (dialog) okRef.current?.focus();
  }, [dialog]);

  useEffect(() => {
    if (!dialog) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && boxRef.current) {
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
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        closeDialog(dialog.type === 'confirm' ? true : undefined);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDialog(dialog.type === 'confirm' ? false : undefined);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dialog, closeDialog]);

  const isConfirm = dialog?.type === 'confirm';

  return (
    <AnimatePresence>
      {dialog && (
        <motion.div
          className="modal-overlay"
          style={{ zIndex: 200 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            ref={boxRef}
            className="modal-container dialog-container"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {isConfirm ? (
                  <><Icon svg={infoIconRaw} size={20} style={{ color: 'var(--accent-color)' }} /> {t.dialog.confirm}</>
                ) : (
                  <><Icon svg={circleAlertIconRaw} size={20} style={{ color: 'var(--primary-color)' }} /> {t.dialog.notice}</>
                )}
              </h3>
              <button
                onClick={() => closeDialog(isConfirm ? false : undefined)}
                className="btn-close-modal"
              >
                <Icon svg={xIconRaw} size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="dialog-message">{dialog.message}</p>
            </div>
            <div className="modal-footer">
              {isConfirm && (
                <Button variant="secondary" onClick={() => closeDialog(false)}>
                  {t.dialog.cancel}
                </Button>
              )}
              <Button
                ref={okRef}
                onClick={() => closeDialog(isConfirm ? true : undefined)}
                className="dialog-ok-btn"
              >
                {t.dialog.ok}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
