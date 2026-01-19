export interface ModrinthProject {
  id: string;
  slug: string;
  project_type: string;
  title: string;
  description: string;
  categories: string[];
  versions: string[];
}

export interface ModrinthVersion {
  id: string;
  project_id: string;
  version_number: string;
  name: string;
  date_published: string;
  files: ModrinthFile[];
}

export interface ModrinthFile {
  hashes: {
    sha1: string;
    sha512: string;
  };
  url: string;
  filename: string;
  primary: boolean;
  size: number;
}

export interface CurseForgeProject {
  id: number;
  name: string;
  slug: string;
  summary: string;
  defaultFileIndex: number;
}

export interface CurseForgeFile {
  id: number;
  displayName: string;
  fileName: string;
  fileLength: number;
  downloadUrl: string;
  fileDate: string;
  gameVersions: string[];
  modLoaders: string[];
}

export interface ModDetails {
  modrinth?: {
    projectId: string;
    slug: string;
    name: string;
    category: "mod" | "datapack" | "resourcepack";
    description: string;
  };
  curseforge?: {
    projectId: number;
    slug: string;
    name: string;
    description: string;
  };
}

export interface UpdateStats {
  checked: number;
  updated: number;
  upToDate: number;
  failed: number;
}

export interface UpdateLog {
  filename: string;
  modName?: string;
  oldVersion?: string;
  newVersion?: string;
  source?: "modrinth" | "curseforge";
  reason?: string;
  timestamp: string;
  status: "success" | "failed" | "skipped";
}
