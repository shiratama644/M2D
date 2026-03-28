'use client';

import { useState, useRef, useCallback, useEffect, RefObject } from 'react';

export interface ColumnResizeConstraints {
  minLeft: number;
  maxLeft: number;
  minRight: number;
  maxRight: number;
  initialLeft?: number;
  initialRight?: number;
}

export interface ColumnResizeResult {
  leftWidth: number;
  rightWidth: number;
  centerWidth: number;
  layoutRef: RefObject<HTMLDivElement | null>;
  onColResizeStart: (which: 'left' | 'right', e: React.MouseEvent) => void;
}

/**
 * Manages resizable three-column layout widths (percentages).
 */
export function useColumnResize({
  minLeft,
  maxLeft,
  minRight,
  maxRight,
  initialLeft = 20,
  initialRight = 30,
}: ColumnResizeConstraints): ColumnResizeResult {
  const [leftWidth, setLeftWidth] = useState(initialLeft);
  const [rightWidth, setRightWidth] = useState(initialRight);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const draggingCol = useRef<'left' | 'right' | null>(null);
  const layoutRectRef = useRef<DOMRect | null>(null);

  const onColResizeStart = useCallback((which: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    draggingCol.current = which;
    // Cache the layout rect once on drag start to avoid repeated getBoundingClientRect
    // calls (which force layout reflow) on every mousemove event.
    layoutRectRef.current = layoutRef.current?.getBoundingClientRect() ?? null;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingCol.current || !layoutRectRef.current) return;
      const rect = layoutRectRef.current;
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
      layoutRectRef.current = null;
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
