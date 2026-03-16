'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Manages resizable three-column layout widths (percentages).
 *
 * @param {object} constraints
 * @param {number} constraints.minLeft  - Minimum left column width (%)
 * @param {number} constraints.maxLeft  - Maximum left column width (%)
 * @param {number} constraints.minRight - Minimum right column width (%)
 * @param {number} constraints.maxRight - Maximum right column width (%)
 * @param {number} [initialLeft=20]     - Initial left column width (%)
 * @param {number} [initialRight=30]    - Initial right column width (%)
 *
 * @returns {{
 *   leftWidth: number,
 *   rightWidth: number,
 *   centerWidth: number,
 *   layoutRef: React.RefObject,
 *   onColResizeStart: (which: 'left'|'right', e: MouseEvent) => void
 * }}
 */
export function useColumnResize({
  minLeft,
  maxLeft,
  minRight,
  maxRight,
  initialLeft = 20,
  initialRight = 30,
}) {
  const [leftWidth, setLeftWidth] = useState(initialLeft);
  const [rightWidth, setRightWidth] = useState(initialRight);
  const layoutRef = useRef(null);
  const draggingCol = useRef(null);

  const onColResizeStart = useCallback((which, e) => {
    e.preventDefault();
    draggingCol.current = which;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!draggingCol.current || !layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;

      if (draggingCol.current === 'left') {
        setLeftWidth(Math.min(maxLeft, Math.max(minLeft, pct)));
      } else if (draggingCol.current === 'right') {
        setRightWidth(Math.min(maxRight, Math.max(minRight, 100 - pct)));
      }
    };

    const onMouseUp = () => {
      if (!draggingCol.current) return;
      draggingCol.current = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [minLeft, maxLeft, minRight, maxRight]);

  return {
    leftWidth,
    rightWidth,
    centerWidth: 100 - leftWidth - rightWidth,
    layoutRef,
    onColResizeStart,
  };
}
