import { useAppStore } from '@/store/useAppStore';

export interface WithLoadingOptions {
  text: string;
  progressTotal?: number;
}

/**
 * Shared overlay wrapper used by download, dependency check, and ZIP import.
 */
export async function withLoading<T>(
  options: WithLoadingOptions,
  task: (api: {
    update: (text: string) => void;
    progress: (current: number, total: number, startTime: number) => void;
  }) => Promise<T>,
): Promise<T> {
  const store = useAppStore.getState();
  store.showLoading(options.text);
  if (options.progressTotal !== undefined) {
    store.showProgress(options.progressTotal);
  }
  try {
    return await task({
      update: (text) => useAppStore.getState().updateLoading(text),
      progress: (current, total, startTime) =>
        useAppStore.getState().updateProgress(current, total, startTime),
    });
  } finally {
    useAppStore.getState().hideLoading();
  }
}
