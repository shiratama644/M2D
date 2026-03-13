const API_BASE = 'https://api.modrinth.com/v2';
// Setting User-Agent in browser requests causes CORS errors, so leaving headers empty
const HEADERS = {};

async function request(endpoint, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.append(k, typeof v === 'object' ? JSON.stringify(v) : v);
    }
  });
  const res = await fetch(url.toString(), { headers: HEADERS });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export const API = {
  searchMods: (query, facets, offset, limit, index) =>
    request('/search', { query, facets, offset, limit, index }),
  getProjects: (ids) => request('/projects', { ids }),
  getVersions: (id, loader, version) => {
    const loaders = loader ? [loader] : undefined;
    const game_versions = version ? [version] : undefined;
    return request(`/project/${id}/version`, { loaders, game_versions });
  },
  getVersionFile: (hash) =>
    fetch(`${API_BASE}/version_file/${hash}?algorithm=sha1`, { headers: HEADERS }).then(r => {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`API Error: ${r.status}`);
      return r.json();
    }),
  getGameVersions: () => request('/tag/game_version'),
  getCategories: () => request('/tag/category'),
};

export const API_BASE_URL = API_BASE;
