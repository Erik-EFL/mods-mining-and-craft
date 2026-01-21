import { SearchPattern, Statistics, TrainingSession, UpdateLog } from '../database/schemas';
import type { UpdateLog as IUpdateLogType, UpdateStats } from '../types/mod.types';

/**
 * Serviço para persistência de dados em MongoDB
 */
export class DatabaseService {
  /**
   * Salva logs de atualização no MongoDB
   */
  static async saveUpdateLog(
    stats: UpdateStats,
    updatedMods: IUpdateLogType[],
    failedMods: IUpdateLogType[]
  ): Promise<string> {
    try {
      const log = new UpdateLog({
        timestamp: new Date(),
        date: new Date().toLocaleString('pt-BR'),
        stats,
        updated: updatedMods,
        failed: failedMods,
      });

      const savedLog = await log.save();
      console.log(`Log salvo no MongoDB: ${savedLog._id}`);
      return savedLog._id.toString();
    } catch (error) {
      console.error('Erro ao salvar log no MongoDB:', error);
      throw error;
    }
  }

  /**
   * Salva sessão de treinamento no MongoDB
   */
  static async saveTrainingSession(
    failedModsCount: number,
    newModsAdded: number,
    patternsUpdated: number,
    totalSuggestions: number,
    learnedPatterns: Record<string, string[]>,
    failedMods: Array<{ filename: string; normalizedName: string; variations: string[] }>
  ): Promise<string> {
    try {
      const session = new TrainingSession({
        timestamp: new Date(),
        failedModsCount,
        newModsAdded,
        patternsUpdated,
        totalSuggestions,
        learnedPatterns: new Map(Object.entries(learnedPatterns)),
        failedMods,
      });

      const savedSession = await session.save();
      console.log(`Sessão de treinamento salva no MongoDB: ${savedSession._id}`);
      return savedSession._id.toString();
    } catch (error) {
      console.error('Erro ao salvar sessão de treinamento:', error);
      throw error;
    }
  }

  /**
   * Atualiza padrões de busca no MongoDB
   */
  static async updateSearchPatterns(learnedPatterns: Record<string, string[]>): Promise<void> {
    try {
      for (const [modName, variations] of Object.entries(learnedPatterns)) {
        await SearchPattern.findOneAndUpdate(
          { modName },
          {
            modName,
            normalizedName: modName,
            variations,
            lastUpdated: new Date(),
            source: 'learned',
          },
          { upsert: true, new: true }
        );
      }
      console.log(`${Object.keys(learnedPatterns).length} padrões atualizados no MongoDB`);
    } catch (error) {
      console.error('Erro ao atualizar padrões de busca:', error);
      throw error;
    }
  }

  /**
   * Obtém todos os padrões de busca do MongoDB
   */
  static async getAllSearchPatterns(): Promise<any[]> {
    try {
      const patterns = await SearchPattern.find();
      return patterns;
    } catch (error) {
      console.error('Erro ao obter padrões de busca:', error);
      throw error;
    }
  }

  /**
   * Obtém padrão específico por nome
   */
  static async getSearchPattern(modName: string): Promise<any> {
    try {
      const pattern = await SearchPattern.findOne({ modName });
      return pattern;
    } catch (error) {
      console.error('Erro ao obter padrão:', error);
      return null;
    }
  }

  /**
   * Obtém estatísticas do dia
   */
  static async getDailyStatistics(): Promise<any> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = await UpdateLog.aggregate([
        {
          $match: {
            timestamp: { $gte: today },
          },
        },
        {
          $group: {
            _id: null,
            totalChecked: { $sum: '$stats.checked' },
            totalUpdated: { $sum: '$stats.updated' },
            totalFailed: { $sum: '$stats.failed' },
            totalUpToDate: { $sum: '$stats.upToDate' },
          },
        },
      ]);

      return stats[0] || { totalChecked: 0, totalUpdated: 0, totalFailed: 0, totalUpToDate: 0 };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }

  /**
   * Obtém histórico de falhas
   */
  static async getFailureHistory(limit: number = 50): Promise<any> {
    try {
      const logs = await UpdateLog.find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .select('timestamp failed stats.failed');

      return logs;
    } catch (error) {
      console.error('Erro ao obter histórico de falhas:', error);
      throw error;
    }
  }

  /**
   * Obtém padrões mais usados
   */
  static async getMostUsedPatterns(limit: number = 20): Promise<any> {
    try {
      const patterns = await SearchPattern.find()
        .sort({ timesUsed: -1, successCount: -1 })
        .limit(limit);

      return patterns;
    } catch (error) {
      console.error('Erro ao obter padrões mais usados:', error);
      throw error;
    }
  }

  /**
   * Obtém histórico de treinamento
   */
  static async getTrainingHistory(limit: number = 20): Promise<any> {
    try {
      const sessions = await TrainingSession.find().sort({ timestamp: -1 }).limit(limit);

      return sessions;
    } catch (error) {
      console.error('Erro ao obter histórico de treinamento:', error);
      throw error;
    }
  }

  /**
   * Incrementa contador de uso de padrão
   */
  static async incrementPatternUsage(modName: string, success: boolean): Promise<void> {
    try {
      await SearchPattern.findOneAndUpdate(
        { modName },
        {
          $inc: {
            timesUsed: 1,
            ...(success ? { successCount: 1 } : { failureCount: 1 }),
          },
        }
      );
    } catch (error) {
      console.error('Erro ao incrementar uso de padrão:', error);
    }
  }

  /**
   * Salva estatísticas diárias
   */
  static async saveDailyStatistics(): Promise<void> {
    try {
      const stats = await this.getDailyStatistics();
      const patterns = await SearchPattern.countDocuments();
      const variations = await SearchPattern.aggregate([
        {
          $group: {
            _id: null,
            totalVariations: { $sum: { $size: '$variations' } },
          },
        },
      ]);

      const dailyStats = new Statistics({
        date: new Date(),
        totalMods: patterns,
        totalSuggestions: variations[0]?.totalVariations || 0,
        successRate: stats.totalChecked > 0 ? (stats.totalUpdated / stats.totalChecked) * 100 : 0,
        failureCount: stats.totalFailed,
        averageSearchTime: 0,
        trainingSessionsCount: await TrainingSession.countDocuments({
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
      });

      await dailyStats.save();
      console.log('Estatísticas diárias salvas no MongoDB');
    } catch (error) {
      console.error('Erro ao salvar estatísticas diárias:', error);
    }
  }
}
