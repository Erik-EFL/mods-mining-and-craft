import { promises as fs } from 'fs';
import path from 'path';
import type { UpdateLog, UpdateStats } from '../types/mod.types';
import { DatabaseService } from './DatabaseService';

/**
 * Serviço para buscar e extrair informações de arquivos de mods
 */
export class FileService {
  constructor(private modsFolder: string) {}

  /**
   * Escaneia a pasta de mods e retorna lista de arquivos .jar
   */
  async scanMods(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.modsFolder);
      return files.filter((file) => file.endsWith('.jar'));
    } catch (error) {
      throw new Error(`Erro ao escanear pasta de mods: ${error}`);
    }
  }

  /**
   * Extrai informações do nome do arquivo do mod
   */
  extractModInfo(filename: string): {
    name: string;
    filename: string;
    currentVersion: string;
  } {
    const name = filename.replace('.jar', '');

    const patterns = [
      /^(.+?)[-_](?:fabric|forge|neoforge)[-_](?:mc)?(.+?)[-_](.+)$/i,
      /^(.+?)[-_](.+?)[-_](.+)$/,
      /^(.+?)[-_]v?(.+)$/,
    ];

    for (const pattern of patterns) {
      const match = name.match(pattern);
      if (match) {
        return {
          name: match[1].toLowerCase().replace(/[^a-z0-9]/g, ''),
          filename: filename,
          currentVersion: match[match.length - 1],
        };
      }
    }

    return {
      name: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      filename: filename,
      currentVersion: 'unknown',
    };
  }

  /**
   * Cria backup de um mod
   */
  async backupMod(filename: string, backupFolder: string): Promise<void> {
    try {
      await fs.mkdir(backupFolder, { recursive: true });
      const sourcePath = path.join(this.modsFolder, filename);
      const backupPath = path.join(backupFolder, filename);
      await fs.copyFile(sourcePath, backupPath);
    } catch (error) {
      throw new Error(`Erro ao fazer backup de ${filename}: ${error}`);
    }
  }

  /**
   * Remove um mod antigo
   */
  async removeOldMod(filename: string): Promise<void> {
    try {
      const filePath = path.join(this.modsFolder, filename);
      await fs.unlink(filePath);
    } catch (error) {
      throw new Error(`Erro ao remover ${filename}: ${error}`);
    }
  }

  /**
   * Cria pasta com todos os mods atualizados
   */
  async createUpdatedModsFolder(updatedModsFolder: string): Promise<number> {
    try {
      await fs.mkdir(updatedModsFolder, { recursive: true });

      const existingFiles = await fs.readdir(updatedModsFolder);
      for (const file of existingFiles) {
        await fs.unlink(path.join(updatedModsFolder, file));
      }

      const currentMods = await fs.readdir(this.modsFolder);
      const jarFiles = currentMods.filter((file) => file.endsWith('.jar'));

      for (const modFile of jarFiles) {
        const sourcePath = path.join(this.modsFolder, modFile);
        const destPath = path.join(updatedModsFolder, modFile);
        await fs.copyFile(sourcePath, destPath);
      }

      return jarFiles.length;
    } catch (error) {
      throw new Error(`Erro ao criar pasta de mods atualizados: ${error}`);
    }
  }

  /**
   * Salva log de atualização no MongoDB
   */
  async saveUpdateLog(
    stats: UpdateStats,
    updatedMods: UpdateLog[],
    failedMods: UpdateLog[]
  ): Promise<string> {
    try {
      const logId = await DatabaseService.saveUpdateLog(stats, updatedMods, failedMods);
      console.log(`Log salvo no MongoDB: ${logId}`);
      return logId;
    } catch (error) {
      throw new Error(`Erro ao salvar log no MongoDB: ${error}`);
    }
  }

  /**
   * Normaliza nome do mod (usado no snapshot)
   */
  private normalizeModName(filename: string): string {
    let name = filename.replace(/\.jar$/i, '');

    // 1. Remove padrão -v/-mc/-fabric/etc seguido de versão
    name = name.replace(/[-_](v|mc|fabric|forge|neoforge)[\d\.\w\-\+]*/gi, '');

    // 2. Remove -build, -alpha, -beta, -kotlin
    name = name.replace(/[-_](build|alpha|beta|kotlin)[\d\.\w\-\+]*/gi, '');

    // 3. Remove versão no final se começar com v/x seguido de números
    name = name.replace(/[-_]?[vx]\d+[\.\d\w\-\+]*$/gi, '');

    // 4. Remove versões numéricas (padrão X.Y.Z ou X.Y)
    name = name.replace(/\d+[\.\d\w\-\+]*(?=[-_]|$)/g, (match) => {
      if (/^\d+\.\d+/.test(match)) {
        return '';
      }
      return match;
    });

    // 5. Remove caracteres especiais
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}
