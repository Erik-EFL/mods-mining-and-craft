import { CurseForgeAPI } from '../apis/CurseForgeAPI';
import { ModrinthAPI } from '../apis/ModrinthAPI';
import { CataloguedModModel } from '../database/schemas';
import type { CataloguedMod, CatalogueStats, UnifiedMod } from '../types/unified-mod.types';
import {
  calculateSimilarity,
  curseforgeToUnified,
  modrinthToUnified,
  normalizeModName,
  unifiedToCatalogued,
} from './UnifiedModAdapter';

/**
 * Serviço para gerenciar o catálogo unificado de mods
 */
export class ModCatalogueService {
  constructor(
    private modrinthAPI: ModrinthAPI,
    private curseforgeAPI: CurseForgeAPI,
    private minecraftVersion: string,
    private modLoader: string
  ) {}

  /**
   * Busca um mod no catálogo por nome
   */
  async findInCatalogue(modName: string): Promise<CataloguedMod | null> {
    try {
      const normalized = normalizeModName(modName);

      let mod = await CataloguedModModel.findOne({ normalizedName: normalized });

      if (mod) {
        await CataloguedModModel.updateOne(
          { _id: mod._id },
          {
            $inc: { timesSearched: 1 },
            $set: { lastChecked: new Date() },
          }
        );
        return mod;
      }

      const allMods = await CataloguedModModel.find().limit(1000);
      let bestMatch: CataloguedMod | null = null;
      let bestScore = 0;

      for (const cataloguedMod of allMods) {
        const similarity = calculateSimilarity(modName, cataloguedMod.displayName);

        if (similarity > 0.8 && similarity > bestScore) {
          bestMatch = cataloguedMod;
          bestScore = similarity;
        }
      }

      if (bestMatch) {
        await CataloguedModModel.updateOne(
          { _id: bestMatch._id },
          {
            $inc: { timesSearched: 1 },
            $set: { lastChecked: new Date() },
          }
        );
      }

      return bestMatch;
    } catch (error) {
      console.error('Erro ao buscar no catálogo:', error);
      return null;
    }
  }

  /**
   * Adiciona ou atualiza um mod no catálogo
   */
  async addOrUpdateMod(unified: UnifiedMod): Promise<void> {
    try {
      const catalogued = unifiedToCatalogued(unified);
      const normalized = catalogued.normalizedName!;

      const existing = await CataloguedModModel.findOne({ normalizedName: normalized });

      if (existing) {
        const updates: any = {
          lastUpdated: new Date(),
          lastChecked: new Date(),
          description: catalogued.description,
          minecraftVersions: Array.from(
            new Set([...existing.minecraftVersions, ...(catalogued.minecraftVersions || [])])
          ),
          supportedLoaders: Array.from(
            new Set([...existing.supportedLoaders, ...(catalogued.supportedLoaders || [])])
          ),
        };

        if (unified.source === 'modrinth') {
          updates['availability.modrinth'] = true;
          updates.modrinthId = catalogued.modrinthId;
          updates.modrinthSlug = catalogued.modrinthSlug;
        } else {
          updates['availability.curseforge'] = true;
          updates.curseforgeId = catalogued.curseforgeId;
          updates.curseforgeSlug = catalogued.curseforgeSlug;
        }

        updates.totalDownloads = Math.max(existing.totalDownloads, catalogued.totalDownloads || 0);
        updates.popularity = Math.max(existing.popularity, catalogued.popularity || 0);

        const newAlternatives =
          catalogued.alternativeNames?.filter(
            (name) => !existing.alternativeNames.includes(name)
          ) || [];

        if (newAlternatives.length > 0) {
          updates.$addToSet = { alternativeNames: { $each: newAlternatives } };
        }

        await CataloguedModModel.updateOne({ normalizedName: normalized }, updates);
        console.log(`Mod atualizado no catálogo: ${catalogued.displayName}`);
      } else {
        await CataloguedModModel.create(catalogued);
        console.log(`Novo mod adicionado ao catálogo: ${catalogued.displayName}`);
      }
    } catch (error) {
      console.error('Erro ao adicionar/atualizar mod no catálogo:', error);
    }
  }

  /**
   * Indexa mods de uma plataforma específica
   */
  async indexPlatformMods(
    platform: 'modrinth' | 'curseforge',
    limit: number = 100
  ): Promise<number> {
    console.log(`\nIndexando mods do ${platform.toUpperCase()}...`);
    let indexed = 0;

    try {
      if (platform === 'modrinth') {
        const results = await this.modrinthAPI.searchMods(
          '',
          this.minecraftVersion,
          this.modLoader
        );

        for (const result of results.slice(0, limit)) {
          const unified = modrinthToUnified(result);
          await this.addOrUpdateMod(unified);
          indexed++;
        }
      } else {
        const results = await this.curseforgeAPI.searchMods(
          '',
          this.minecraftVersion,
          this.modLoader
        );

        for (const result of results.slice(0, limit)) {
          const unified = curseforgeToUnified(result);
          await this.addOrUpdateMod(unified);
          indexed++;
        }
      }

      console.log(`${indexed} mods indexados do ${platform.toUpperCase()}`);
    } catch (error) {
      console.error(`Erro ao indexar mods do ${platform}:`, error);
    }

    return indexed;
  }

  /**
   * Busca e indexa um mod específico nas duas plataformas
   */
  async searchAndIndex(query: string): Promise<CataloguedMod | null> {
    console.log(`\nBuscando e indexando: ${query}`);

    try {
      const modrinthResults = await this.modrinthAPI.searchMods(
        query,
        this.minecraftVersion,
        this.modLoader
      );

      if (modrinthResults.length > 0) {
        const unified = modrinthToUnified(modrinthResults[0]);
        await this.addOrUpdateMod(unified);
      }

      const curseforgeResults = await this.curseforgeAPI.searchMods(
        query,
        this.minecraftVersion,
        this.modLoader
      );

      if (curseforgeResults.length > 0) {
        const unified = curseforgeToUnified(curseforgeResults[0]);
        await this.addOrUpdateMod(unified);
      }

      return await this.findInCatalogue(query);
    } catch (error) {
      console.error('Erro ao buscar e indexar:', error);
      return null;
    }
  }

  /**
   * Obtém estatísticas do catálogo
   */
  async getStats(): Promise<CatalogueStats> {
    try {
      const totalMods = await CataloguedModModel.countDocuments();
      const modrinthOnly = await CataloguedModModel.countDocuments({
        'availability.modrinth': true,
        'availability.curseforge': false,
      });
      const curseforgeOnly = await CataloguedModModel.countDocuments({
        'availability.modrinth': false,
        'availability.curseforge': true,
      });
      const bothPlatforms = await CataloguedModModel.countDocuments({
        'availability.modrinth': true,
        'availability.curseforge': true,
      });

      const categoryStats = await CataloguedModModel.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]);

      const versionStats = await CataloguedModModel.aggregate([
        { $unwind: '$minecraftVersions' },
        { $group: { _id: '$minecraftVersions', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]);

      const loaderStats = await CataloguedModModel.aggregate([
        { $unwind: '$supportedLoaders' },
        { $group: { _id: '$supportedLoaders', count: { $sum: 1 } } },
      ]);

      const searchStats = await CataloguedModModel.aggregate([
        {
          $group: {
            _id: null,
            totalSearches: { $sum: '$timesSearched' },
            totalFound: { $sum: '$timesFound' },
          },
        },
      ]);

      const byCategory: Record<string, number> = {};
      categoryStats.forEach((stat) => {
        byCategory[stat._id || 'unknown'] = stat.count;
      });

      const byMinecraftVersion: Record<string, number> = {};
      versionStats.forEach((stat) => {
        byMinecraftVersion[stat._id] = stat.count;
      });

      const byModLoader: Record<string, number> = {};
      loaderStats.forEach((stat) => {
        byModLoader[stat._id] = stat.count;
      });

      const totalSearches = searchStats[0]?.totalSearches || 0;
      const totalFound = searchStats[0]?.totalFound || 0;

      return {
        totalMods,
        modrinthOnly,
        curseforgeOnly,
        bothPlatforms,
        byCategory,
        byMinecraftVersion,
        byModLoader,
        lastUpdate: new Date(),
        totalSearches,
        averageSuccessRate: totalSearches > 0 ? (totalFound / totalSearches) * 100 : 0,
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }

  /**
   * Registra sucesso de busca
   */
  async recordSearchSuccess(modName: string): Promise<void> {
    try {
      const normalized = normalizeModName(modName);
      await CataloguedModModel.updateOne(
        { normalizedName: normalized },
        {
          $inc: { timesFound: 1 },
          $set: { lastChecked: new Date() },
        }
      );

      const mod = await CataloguedModModel.findOne({ normalizedName: normalized });
      if (mod && mod.timesSearched > 0) {
        const successRate = (mod.timesFound / mod.timesSearched) * 100;
        await CataloguedModModel.updateOne(
          { normalizedName: normalized },
          { $set: { searchSuccessRate: successRate } }
        );
      }
    } catch (error) {
      console.error('Erro ao registrar sucesso:', error);
    }
  }

  /**
   * Registra falha de busca
   */
  async recordSearchFailure(modName: string): Promise<void> {
    try {
      const normalized = normalizeModName(modName);
      await CataloguedModModel.updateOne(
        { normalizedName: normalized },
        {
          $inc: { timesFailed: 1 },
          $set: { lastChecked: new Date() },
        },
        { upsert: true }
      );

      const mod = await CataloguedModModel.findOne({ normalizedName: normalized });
      if (mod && mod.timesSearched > 0) {
        const successRate = (mod.timesFound / mod.timesSearched) * 100;
        await CataloguedModModel.updateOne(
          { normalizedName: normalized },
          { $set: { searchSuccessRate: successRate } }
        );
      }
    } catch (error) {
      console.error('Erro ao registrar falha:', error);
    }
  }

  /**
   * Lista mods do catálogo com filtros
   */
  async listMods(filters?: {
    minecraftVersion?: string;
    modLoader?: string;
    platform?: 'modrinth' | 'curseforge' | 'both';
    category?: string;
    limit?: number;
    sort?: 'popularity' | 'downloads' | 'name' | 'recent';
  }): Promise<CataloguedMod[]> {
    try {
      const query: any = {};

      if (filters?.minecraftVersion) {
        query.minecraftVersions = filters.minecraftVersion;
      }

      if (filters?.modLoader) {
        query.supportedLoaders = filters.modLoader;
      }

      if (filters?.platform) {
        if (filters.platform === 'modrinth') {
          query['availability.modrinth'] = true;
        } else if (filters.platform === 'curseforge') {
          query['availability.curseforge'] = true;
        } else if (filters.platform === 'both') {
          query['availability.modrinth'] = true;
          query['availability.curseforge'] = true;
        }
      }

      if (filters?.category) {
        query.category = filters.category;
      }

      let sortOption: any = { popularity: -1 };

      if (filters?.sort === 'downloads') {
        sortOption = { totalDownloads: -1 };
      } else if (filters?.sort === 'name') {
        sortOption = { displayName: 1 };
      } else if (filters?.sort === 'recent') {
        sortOption = { lastUpdated: -1 };
      }

      return await CataloguedModModel.find(query)
        .sort(sortOption)
        .limit(filters?.limit || 100);
    } catch (error) {
      console.error('Erro ao listar mods:', error);
      return [];
    }
  }
}
