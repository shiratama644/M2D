import { describe, it, expect, beforeEach } from 'vitest';
import { isAbortError, runAbortable } from '@/engine/runtime/abort';
import { withLoading } from '@/engine/runtime/loading';
import { engineAlert, engineConfirm } from '@/engine/runtime/dialog';
import { useAppStore } from '@/store/useAppStore';

beforeEach(() => {
  useAppStore.getState().hideLoading();
  useAppStore.getState().closeDialog();
});

describe('isAbortError / runAbortable', () => {
  it('detects AbortError', () => {
    expect(isAbortError(Object.assign(new Error('x'), { name: 'AbortError' }))).toBe(true);
    expect(isAbortError(new Error('x'))).toBe(false);
  });

  it('cancels an in-flight task', async () => {
    const { promise, cancel } = runAbortable(
      (signal) =>
        new Promise<string>((_, reject) => {
          signal.addEventListener('abort', () => {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          });
        }),
    );
    cancel();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('withLoading', () => {
  it('shows then hides the overlay even when the task throws', async () => {
    await expect(
      withLoading({ text: 'Working' }, async () => {
        expect(useAppStore.getState().loading.visible).toBe(true);
        expect(useAppStore.getState().loading.text).toBe('Working');
        throw new Error('fail');
      }),
    ).rejects.toThrow('fail');
    expect(useAppStore.getState().loading.visible).toBe(false);
  });
});

describe('engine dialog helpers', () => {
  it('open alert and confirm through the store', async () => {
    const alertP = engineAlert('hi');
    expect(useAppStore.getState().dialog).toEqual({ type: 'alert', message: 'hi' });
    useAppStore.getState().closeDialog();
    await alertP;

    const confirmP = engineConfirm('ok?');
    expect(useAppStore.getState().dialog?.type).toBe('confirm');
    useAppStore.getState().closeDialog(true);
    await expect(confirmP).resolves.toBe(true);
  });
});
