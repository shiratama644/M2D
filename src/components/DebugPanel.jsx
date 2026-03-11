import { useRef, useEffect, useState } from 'react';
import { Terminal, Trash2, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function DebugPanel() {
  const { debugMode, debugLogs, clearDebugLogs, addDebugLog } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef(null);
  const logsRef = useRef(null);

  // Override console methods
  useEffect(() => {
    if (!debugMode) return;
    const original = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
    };
    const makeHandler = (level) => (...args) => {
      original[level](...args);
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      addDebugLog(level, msg);
    };
    console.log = makeHandler('log');
    console.error = makeHandler('error');
    console.warn = makeHandler('warn');
    console.info = makeHandler('info');
    return () => {
      console.log = original.log;
      console.error = original.error;
      console.warn = original.warn;
      console.info = original.info;
    };
  }, [debugMode, addDebugLog]);

  // Auto-scroll debug logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [debugLogs]);

  // Draggable FAB
  useEffect(() => {
    const fab = fabRef.current;
    if (!fab) return;

    let isDragging = false, dragMoved = false, startX, startY, initialLeft, initialTop;

    const onStart = (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      isDragging = true; dragMoved = false;
      startX = e.clientX; startY = e.clientY;
      const rect = fab.getBoundingClientRect();
      initialLeft = rect.left; initialTop = rect.top;
      fab.style.transition = 'none';
      fab.setPointerCapture(e.pointerId);
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) dragMoved = true;
      if (dragMoved) {
        const newLeft = Math.max(0, Math.min(initialLeft + dx, window.innerWidth - fab.offsetWidth));
        const newTop = Math.max(0, Math.min(initialTop + dy, window.innerHeight - fab.offsetHeight));
        fab.style.position = 'fixed';
        fab.style.left = newLeft + 'px';
        fab.style.top = newTop + 'px';
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
      }
    };

    const onEnd = (e) => {
      if (!isDragging) return;
      isDragging = false;
      fab.style.transition = 'transform 0.2s';
      fab.releasePointerCapture(e.pointerId);
      if (!dragMoved) setIsOpen(o => !o);
    };

    fab.addEventListener('pointerdown', onStart);
    fab.addEventListener('pointermove', onMove);
    fab.addEventListener('pointerup', onEnd);
    fab.addEventListener('pointercancel', onEnd);
    fab.addEventListener('dragstart', e => e.preventDefault());

    return () => {
      fab.removeEventListener('pointerdown', onStart);
      fab.removeEventListener('pointermove', onMove);
      fab.removeEventListener('pointerup', onEnd);
      fab.removeEventListener('pointercancel', onEnd);
    };
  }, [debugMode]);

  if (!debugMode) return null;

  return (
    <>
      <div ref={fabRef} className="debug-fab">
        <Terminal size={24} style={{ pointerEvents: 'none' }} />
      </div>
      <div className={`debug-panel ${isOpen ? 'open' : ''}`}>
        <div className="debug-header" onClick={() => setIsOpen(o => !o)}>
          <span className="debug-title">
            <Terminal size={12} /> Console
          </span>
          <div className="debug-actions">
            <button
              onClick={e => { e.stopPropagation(); clearDebugLogs(); }}
              title="Clear Console"
            >
              <Trash2 size={16} />
            </button>
            <button><ChevronDown size={16} /></button>
          </div>
        </div>
        <div ref={logsRef} className="debug-logs">
          {debugLogs.map((entry, i) => (
            <div key={i} className={`log-entry log-${entry.level}`}>
              [{entry.time}] {entry.msg}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
