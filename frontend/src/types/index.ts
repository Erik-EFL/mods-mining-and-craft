export interface Mod {
  name: string;
  slug: string;
  version: string;
  modrinthId?: string;
  curseforgeId?: string;
}

export interface UpdateStats {
  checked: number;
  updated: number;
  upToDate: number;
  failed: number;
}

export interface UpdateLog {
  modName: string;
  status: "updated" | "upToDate" | "failed";
  oldVersion?: string;
  newVersion?: string;
  error?: string;
  timestamp: string;
}

export interface UpdateResponse {
  success: boolean;
  data?: {
    stats: UpdateStats;
    summary: {
      totalChecked: number;
      updated: number;
      upToDate: number;
      failed: number;
    };
    updated: UpdateLog[];
    failed: UpdateLog[];
    zipFile: string;
    zipPath: string;
  };
  error?: string;
  message?: string;
}
