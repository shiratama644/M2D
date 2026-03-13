import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import circleAlertIconRaw from '../assets/icons/circle-alert.svg?raw';
import infoIconRaw from '../assets/icons/info.svg?raw';
import xIconRaw from '../assets/icons/x.svg?raw';

export default function CustomDialog() {
  const { dialog, closeDialog } = useApp();
  const okRef = useRef(null);

  useEffect(() => {
    if (dialog) {
      okRef.current?.focus();
    }
  }, [dialog]);

  useEffect(() => {
    if (!dialog) return;
    const handleKey = (e) => {
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

  if (!dialog) return null;

  const isConfirm = dialog.type === 'confirm';

  return (
    <div className="modal-overlay" style={{ zIndex: 200 }}>
      <div className="modal-container dialog-container" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3 className="modal-title">
            {isConfirm
              ? <><Icon svg={infoIconRaw} size={20} style={{ color: 'var(--accent-color)' }} /> Confirm</>
              : <><Icon svg={circleAlertIconRaw} size={20} style={{ color: 'var(--primary-color)' }} /> Notice</>
            }
          </h3>
          <button onClick={() => closeDialog(isConfirm ? false : undefined)} className="btn-close-modal">
            <Icon svg={xIconRaw} size={20} />
          </button>
        </div>
        <div className="modal-body">
          <p className="dialog-message">{dialog.message}</p>
        </div>
        <div className="modal-footer">
          {isConfirm && (
            <button onClick={() => closeDialog(false)} className="btn-secondary">
              Cancel
            </button>
          )}
          <button
            ref={okRef}
            onClick={() => closeDialog(isConfirm ? true : undefined)}
            className="btn-primary dialog-ok-btn"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
