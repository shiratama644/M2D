/**
 * SSR-safe localStorage helpers.
 * All operations are no-ops on the server to avoid SSR / client mismatches.
 */
export const ls = {
  get: (key: string): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem(key) : null,

  set: (key: string, value: string): void => {
    if (typeof window !== 'undefined') localStorage.setItem(key, value);
  },

  remove: (key: string): void => {
    if (typeof window !== 'undefined') localStorage.removeItem(key);
  },
};
