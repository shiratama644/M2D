import { API_BASE } from '../lib/api';
import HomeClient from './HomeClient';

/**
 * Fetch the default mod list (most-downloaded mods, no filters) on the server.
 * Returns the array of hits, or null if the fetch fails (causing the client
 * to fall back to its own fetch).
 */
async function fetchInitialMods() {
  try {
    const url = new URL(`${API_BASE}/search`);
    url.searchParams.set('facets', JSON.stringify([['project_type:mod']]));
    url.searchParams.set('index', 'downloads');
    url.searchParams.set('limit', '12');
    const res = await fetch(url.toString(), { next: { revalidate: 300, tags: ['mods-home'] } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.hits ?? [];
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const initialMods = await fetchInitialMods();
  return <HomeClient initialMods={initialMods} />;
}
