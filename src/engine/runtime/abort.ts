export function isAbortError(err: unknown): boolean {
  return (err as { name?: string } | null)?.name === 'AbortError';
}

/**
 * Run an async task with an AbortController. The returned `cancel` aborts
 * in-flight work. Repeated across catalog fetches and hook unmounts.
 */
export function runAbortable<T>(
  task: (signal: AbortSignal) => Promise<T>,
): { promise: Promise<T>; cancel: () => void } {
  const controller = new AbortController();
  const promise = task(controller.signal).catch((err: unknown) => {
    if (isAbortError(err)) {
      return Promise.reject(err);
    }
    throw err;
  });
  return {
    promise,
    cancel: () => controller.abort(),
  };
}
