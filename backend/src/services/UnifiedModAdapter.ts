import type { CurseForgeFile, ModrinthVersion } from '../types/mod.types';
import type { CataloguedMod, UnifiedMod } from '../types/unified-mod.types';

/**
 * Converte um resultado do Modrinth para UnifiedMod
 */
export function modrinthToUnified(project: any, version?: ModrinthVersion): UnifiedMod {
  return {
    id: project.project_id || project.id,
    slug: project.slug,
    name: project.title,
    summary: project.description || project.summary || '',
    description: project.body || project.description,
    source: 'modrinth',
    websiteUrl: `https://modrinth.com/mod/${project.slug}`,
    categories: project.categories || [],
    gameVersions: project.game_versions || project.versions || [],
    modLoaders: project.loaders || [],
    downloads: project.downloads || 0,
    followers: project.followers || 0,
    dateCreated: project.published || project.date_created,
    dateModified: project.updated || project.date_modified || new Date().toISOString(),
    latestVersion: version
      ? {
          versionNumber: version.version_number,
          versionName: version.name,
          fileName: version.files[0]?.filename || '',
          fileSize: version.files[0]?.size || 0,
          downloadUrl: version.files[0]?.url || '',
          releaseDate: version.date_published,
          gameVersions: version.game_versions || [],
          modLoaders: version.loaders || [],
        }
      : undefined,
    platformIds: {
      modrinth: project.project_id || project.id,
    },
  };
}

/**
 * Converte um resultado do CurseForge para UnifiedMod
 */
export function curseforgeToUnified(project: any, file?: CurseForgeFile): UnifiedMod {
  return {
    id: project.id,
    slug: project.slug,
    name: project.name,
    summary: project.summary || '',
    description: project.description,
    source: 'curseforge',
    websiteUrl: `https://www.curseforge.com/minecraft/mc-mods/${project.slug}`,
    categories: project.categories?.map((c: any) => c.name) || [],
    gameVersions: project.latestFilesIndexes?.map((f: any) => f.gameVersion) || [],
    modLoaders: project.latestFilesIndexes?.map((f: any) => f.modLoader?.toString()) || [],
    downloads: project.downloadCount || 0,
    dateCreated: project.dateCreated,
    dateModified: project.dateModified || new Date().toISOString(),
    latestVersion: file
      ? {
          versionNumber: file.displayName,
          versionName: file.displayName,
          fileName: file.fileName,
          fileSize: file.fileLength,
          downloadUrl: file.downloadUrl,
          releaseDate: file.fileDate,
          gameVersions: file.gameVersions || [],
          modLoaders: file.modLoaders || [],
        }
      : undefined,
    platformIds: {
      curseforge: project.id,
    },
  };
}

/**
 * Normaliza nome de mod para comparação
 */
export function normalizeModName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Converte UnifiedMod para CataloguedMod
 */
export function unifiedToCatalogued(unified: UnifiedMod): Partial<CataloguedMod> {
  const normalized = normalizeModName(unified.name);

  return {
    normalizedName: normalized,
    displayName: unified.name,
    alternativeNames: [unified.slug, unified.name],
    availability: {
      modrinth: unified.source === 'modrinth',
      curseforge: unified.source === 'curseforge',
    },
    modrinthId: unified.platformIds.modrinth,
    modrinthSlug: unified.source === 'modrinth' ? unified.slug : undefined,
    curseforgeId: unified.platformIds.curseforge,
    curseforgeSlug: unified.source === 'curseforge' ? unified.slug : undefined,
    category: unified.categories[0] || 'mod',
    description: unified.summary,
    minecraftVersions: unified.gameVersions,
    supportedLoaders: unified.modLoaders,
    totalDownloads: unified.downloads || 0,
    popularity: (unified.downloads || 0) + (unified.followers || 0) * 10,
    searchKeywords: generateSearchKeywords(unified.name),
    firstSeen: new Date(),
    lastUpdated: new Date(unified.dateModified),
    lastChecked: new Date(),
  };
}

/**
 * Gera keywords de busca a partir do nome
 */
function generateSearchKeywords(name: string): string[] {
  const keywords = new Set<string>();

  keywords.add(name.toLowerCase());

  keywords.add(normalizeModName(name));

  const words = name.split(/[\s\-_]+/);
  words.forEach((word) => {
    if (word.length > 2) {
      keywords.add(word.toLowerCase());
    }
  });

  if (words.length > 1) {
    const abbreviation = words
      .map((w) => w[0])
      .join('')
      .toLowerCase();
    keywords.add(abbreviation);
  }

  return Array.from(keywords);
}

/**
 * Calcula similaridade entre dois nomes (0-1)
 */
export function calculateSimilarity(name1: string, name2: string): number {
  const n1 = normalizeModName(name1);
  const n2 = normalizeModName(name2);

  if (n1 === n2) return 1.0;

  const distance = levenshteinDistance(n1, n2);
  const maxLength = Math.max(n1.length, n2.length);

  if (maxLength === 0) return 0;

  return 1 - distance / maxLength;
}

/**
 * Calcula distância de Levenshtein entre duas strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}
