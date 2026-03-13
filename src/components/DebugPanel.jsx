import { useRef, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import terminalIconRaw from '../assets/icons/terminal-square.svg?raw';
import trashIconRaw from '../assets/icons/trash.svg?raw';
import chevronDownIconRaw from '../assets/icons/chevron-down.svg?raw';
import copyIconRaw from '../assets/icons/copy.svg?raw';

const LEVELS = ['all', 'log', 'info', 'warn', 'error'];
const LEVEL_LABELS = { all: 'All', log: 'Log', info: 'Info', warn: 'Warn', error: 'Err' };
const LEVEL_COLORS = { log: '#cbd5e1', info: '#7dd3fc', warn: '#facc15', error: '#f87171' };

export default function DebugPanel() {
  const { debugMode, debugLogs, clearDebugLogs, addDebugLog } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [filterLevel, setFilterLevel] = useState('all');
  const [copied, setCopied] = useState(false);
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
  }, [debugLogs, filterLevel]);

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

  const copyLogs = () => {
    const text = debugLogs.map(e => `[${e.time}] [${e.level.toUpperCase()}] ${e.msg}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (!debugMode) return null;

  const filteredLogs = filterLevel === 'all' ? debugLogs : debugLogs.filter(e => e.level === filterLevel);

  const counts = debugLogs.reduce((acc, e) => {
    acc[e.level] = (acc[e.level] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div ref={fabRef} className="debug-fab">
        <Icon svg={terminalIconRaw} size={24} style={{ pointerEvents: 'none' }} />
        {debugLogs.length > 0 && (
          <span className="debug-fab-badge">{debugLogs.length > 99 ? '99+' : debugLogs.length}</span>
        )}
      </div>
      <div className={`debug-panel ${isOpen ? 'open' : ''}`}>
        <div className="debug-header" onClick={() => setIsOpen(o => !o)}>
          <span className="debug-title">
            <Icon svg={terminalIconRaw} size={12} /> Console
            <span className="debug-count">({filteredLogs.length}{filterLevel !== 'all' ? ` ${filterLevel}` : ''})</span>
          </span>
          <div className="debug-actions">
            <button
              onClick={e => { e.stopPropagation(); copyLogs(); }}
              title="Copy Logs"
              className="debug-action-btn"
            >
              {copied ? <span style={{ fontSize: '0.625rem', color: '#4ade80' }}>Copied!</span> : <Icon svg={copyIconRaw} size={14} />}
            </button>
            <button
              onClick={e => { e.stopPropagation(); clearDebugLogs(); }}
              title="Clear Console"
              className="debug-action-btn"
            >
              <Icon svg={trashIconRaw} size={14} />
            </button>
            <button className="debug-action-btn"><Icon svg={chevronDownIconRaw} size={14} /></button>
          </div>
        </div>
        <div className="debug-filter-bar" onClick={e => e.stopPropagation()}>
          {LEVELS.map(lvl => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`debug-filter-btn ${filterLevel === lvl ? 'active' : ''}`}
              style={filterLevel === lvl && lvl !== 'all' ? { borderColor: LEVEL_COLORS[lvl], color: LEVEL_COLORS[lvl] } : {}}
            >
              {LEVEL_LABELS[lvl]}
              {lvl !== 'all' && counts[lvl] ? <span className="debug-filter-count">{counts[lvl]}</span> : null}
            </button>
          ))}
        </div>
        <div ref={logsRef} className="debug-logs">
          {filteredLogs.length === 0 ? (
            <div className="debug-empty">No {filterLevel !== 'all' ? filterLevel : ''} logs yet.</div>
          ) : (
            filteredLogs.map((entry, i) => (
              <div key={i} className={`log-entry log-${entry.level}`}>
                <span className="log-time">{entry.time}</span>
                <span className="log-level-badge">{entry.level.toUpperCase()}</span>
                <span className="log-msg">{entry.msg}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
