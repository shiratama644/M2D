import { useAppStore } from '@/store/useAppStore';

/** Confirm / alert used by profiles, download, and dependency features. */
export function engineAlert(message: string): Promise<undefined> {
  return useAppStore.getState().showAlert(message);
}

export function engineConfirm(message: string): Promise<boolean> {
  return useAppStore.getState().showConfirm(message);
}
