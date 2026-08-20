import { API } from '@/lib/api';
import { indexProjects } from '@/lib/modDisplay';
import { useAppStore } from '@/store/useAppStore';
import type { Feature } from '../types';

export const catalogFeature: Feature = {
  id: 'catalog',
  label: 'Modrinth catalog',
  mount(engine) {
    const offs = [
      engine.bind('catalog.search', async (p) => {
        const data = await API.searchMods(p.query, p.facets, p.offset, p.limit, p.index, p.signal);
        if (data?.hits?.length) {
          const modMap: Record<string, unknown> = {};
          data.hits.forEach((mod) => {
            modMap[mod.project_id] = mod;
            if (mod.slug) modMap[mod.slug] = mod;
          });
          useAppStore.getState().updateModDataMap(modMap);
        }
        return data;
      }),
      engine.bind('catalog.project', async (p) => {
        const project = await API.getProject(p.id, p.signal);
        const map: Record<string, unknown> = { [project.id]: project };
        if (project.slug) map[project.slug] = project;
        useAppStore.getState().updateModDataMap(map);
        return project;
      }),
      engine.bind('catalog.projects', async (p) => {
        const projects = await API.getProjects(p.ids, p.signal);
        useAppStore.getState().updateModDataMap(indexProjects(projects));
        return projects;
      }),
      engine.bind('catalog.versions', (p) =>
        API.getVersions(p.id, p.loader, p.version, p.signal),
      ),
      engine.bind('catalog.versionsBulk', (p) => API.getVersionsBulk(p.ids, p.signal)),
      engine.bind('catalog.gameVersions', (p) => API.getGameVersions(p.signal)),
      engine.bind('catalog.categories', (p) => API.getCategories(p.signal)),
      engine.bind('catalog.versionFile', (p) => API.getVersionFile(p.hash, p.signal)),
    ];
    return () => offs.forEach((off) => off());
  },
};
