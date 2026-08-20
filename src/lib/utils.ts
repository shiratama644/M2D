import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for merging Tailwind CSS class names.
 * Combines clsx (conditional classes) with tailwind-merge (deduplication).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Replace `%name` tokens in a translation string. */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/%([a-zA-Z]+)/g, (match, key: string) =>
    vars[key] === undefined ? match : String(vars[key]),
  );
}
