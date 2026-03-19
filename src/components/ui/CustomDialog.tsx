'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { useScrollLock } from '../../hooks/useScrollLock';
import { Button } from './button';
import Icon from './Icon';
import circleAlertIconRaw from '../../assets/icons/circle-alert.svg';
import infoIconRaw from '../../assets/icons/info.svg';
import xIconRaw from '../../assets/icons/x.svg';

export default function CustomDialog() {
  const { dialog, closeDialog } = useApp();
  const okRef = useRef<HTMLButtonElement | null>(null);
  useScrollLock(!!dialog);

  useEffect(() => {
    if (dialog) okRef.current?.focus();
  }, [dialog]);

  useEffect(() => {
    if (!dialog) return;
    const handleKey = (e: KeyboardEvent) => {
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
                  <><Icon svg={infoIconRaw} size={20} style={{ color: 'var(--accent-color)' }} /> Confirm</>
                ) : (
                  <><Icon svg={circleAlertIconRaw} size={20} style={{ color: 'var(--primary-color)' }} /> Notice</>
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
                  Cancel
                </Button>
              )}
              <Button
                ref={okRef}
                onClick={() => closeDialog(isConfirm ? true : undefined)}
                className="dialog-ok-btn"
              >
                OK
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
