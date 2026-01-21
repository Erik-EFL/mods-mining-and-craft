import { Document } from 'mongoose';

/**
 * Interface unificada para representar mods de Modrinth e CurseForge
 * Formato padronizado independente da fonte
 */

export interface UnifiedMod {
  // Identificação
  id: string | number;
  slug: string;
  name: string;

  // Descrição
  summary: string;
  description?: string;

  // Origem
  source: 'modrinth' | 'curseforge';

  // URLs
  websiteUrl: string;
  downloadUrl?: string;

  // Metadados
  categories: string[];
  gameVersions: string[];
  modLoaders: string[];

  // Estatísticas
  downloads?: number;
  followers?: number;
  dateCreated?: string;
  dateModified: string;

  // Versão mais recente
  latestVersion?: {
    versionNumber: string;
    versionName: string;
    fileName: string;
    fileSize: number;
    downloadUrl: string;
    releaseDate: string;
    gameVersions: string[];
    modLoaders: string[];
  };

  // IDs nas plataformas (para cross-reference)
  platformIds: {
    modrinth?: string;
    curseforge?: number;
  };
}

/**
 * Resposta de busca unificada
 */
export interface UnifiedSearchResponse {
  mods: UnifiedMod[];
  total: number;
  source: 'modrinth' | 'curseforge' | 'both';
  query: string;
  filters: {
    minecraftVersion: string;
    modLoader: string;
  };
}

/**
 * Entrada na tabela de mods catalogados
 */
export interface CataloguedMod extends Document {
  // Nome normalizado (chave)
  normalizedName: string;

  // Nomes reais
  displayName: string;
  alternativeNames: string[];

  // Disponibilidade
  availability: {
    modrinth: boolean;
    curseforge: boolean;
  };

  // IDs nas plataformas
  modrinthId?: string;
  modrinthSlug?: string;
  curseforgeId?: number;
  curseforgeSlug?: string;

  // Metadados
  category: string;
  description: string;

  // Versões suportadas
  minecraftVersions: string[];
  supportedLoaders: string[];

  // Estatísticas agregadas
  totalDownloads: number;
  popularity: number;

  // Timestamps
  firstSeen: Date;
  lastUpdated: Date;
  lastChecked: Date;

  // Informações de busca
  searchKeywords: string[];
  commonMisspellings: string[];

  // Metadados de aprendizado
  searchSuccessRate: number;
  timesSearched: number;
  timesFound: number;
  timesFailed: number;
}

/**
 * Estatísticas do catálogo
 */
export interface CatalogueStats {
  totalMods: number;
  modrinthOnly: number;
  curseforgeOnly: number;
  bothPlatforms: number;

  byCategory: Record<string, number>;
  byMinecraftVersion: Record<string, number>;
  byModLoader: Record<string, number>;

  lastUpdate: Date;
  totalSearches: number;
  averageSuccessRate: number;
}
