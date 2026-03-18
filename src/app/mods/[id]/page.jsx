import { notFound } from 'next/navigation';
import { API_BASE } from '../../../lib/api';
import ModPageClient from './ModPageClient';

/**
 * Dynamic metadata for each mod page – used by search engines and social
 * sharing cards.
 */
export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const res = await fetch(`${API_BASE}/project/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { title: 'Mod Not Found | M2D' };
    const project = await res.json();
    return {
      title: project.title,
      description: project.description,
      openGraph: {
        title: project.title,
        description: project.description,
        images: project.icon_url ? [{ url: project.icon_url }] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: project.title,
        description: project.description,
        images: project.icon_url ? [project.icon_url] : [],
      },
    };
  } catch {
    return { title: 'M2D – Modrinth Mod Downloader' };
  }
}

async function fetchProject(id) {
  const res = await fetch(`${API_BASE}/project/${id}`, {
    next: { revalidate: 300 },
  });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`Failed to fetch project: ${res.status}`);
  return res.json();
}

export default async function ModPage({ params }) {
  const { id } = await params;
  const project = await fetchProject(id);
  return <ModPageClient project={project} />;
}
