export interface ModProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  icon_url: string | null;
  gallery: Array<{ url: string; title?: string }>;
  categories?: string[];
  client_side?: string;
  server_side?: string;
  project_type?: string;
  downloads?: number;
  followers?: number;
  updated?: string;
  published?: string;
  license?: { id: string; name: string; url?: string } | null;
  versions?: string[];
  loaders?: string[];
  [key: string]: unknown;
}

export interface ModHit {
  project_id: string;
  title: string;
  description: string;
  icon_url: string | null;
  author: string;
  downloads: number;
  follows?: number;
  categories?: string[];
  display_categories?: string[];
  project_type?: string;
  slug?: string;
  date_created?: string;
  date_modified?: string;
  [key: string]: unknown;
}

export interface GameVersion {
  version: string;
  version_type: string;
  date?: string;
  major?: boolean;
}

export interface ModCategory {
  icon: string;
  name: string;
  project_type: string;
  header: string;
}

export interface ModVersion {
  id: string;
  project_id: string;
  name: string;
  version_number: string;
  files: Array<{
    url: string;
    filename: string;
    primary: boolean;
    size: number;
    hashes?: { sha1?: string; sha512?: string };
  }>;
  dependencies: Array<{
    project_id: string | null;
    version_id: string | null;
    dependency_type: 'required' | 'optional' | 'incompatible' | 'embedded';
  }>;
  game_versions: string[];
  loaders: string[];
  date_published: string;
}
