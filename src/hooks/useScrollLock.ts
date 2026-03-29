import { useEffect } from 'react';

let lockCount = 0;

export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    lockCount++;
    if (lockCount === 1) {
      document.body.classList.add('modal-open');
    }
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.classList.remove('modal-open');
      }
    };
  }, [active]);
}

/**
 * Reset the module-level lock counter to zero and remove the `modal-open` class.
 * Intended for use in test teardown to prevent state leaking between test cases.
 */
export function __resetScrollLock() {
  lockCount = 0;
  if (typeof document !== 'undefined') {
    document.body.classList.remove('modal-open');
  }
}
