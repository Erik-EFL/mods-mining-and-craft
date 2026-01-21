import { exec } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { CurseForgeAPI } from '../apis/CurseForgeAPI';
import { ModrinthAPI } from '../apis/ModrinthAPI';
import type { UpdateLog, UpdateStats } from '../types/mod.types';
import { FileService } from './FileService';
import { SearchService } from './SearchService';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DownloadInfo {
  url: string;
  filename: string;
  size: number;
}

export interface UpdateProgress {
  current: number;
  total: number;
  percentage: number;
  currentMod: string;
  estimatedTimeRemaining?: number;
}

export type ProgressCallback = (progress: UpdateProgress) => void;

/**
 * Serviço de atualização de mods
 * Orquestrador de processos
 */
export class UpdateService {
  private searchService: SearchService;
  private fileService: FileService;
  private stats: UpdateStats = {
    checked: 0,
    updated: 0,
    upToDate: 0,
    failed: 0,
  };
  private updatedLogs: UpdateLog[] = [];
  private failedLogs: UpdateLog[] = [];
  private shouldStop = false;
  private progressCallback?: ProgressCallback;
  private startTime?: number;

  constructor(
    private modrinthAPI: ModrinthAPI,
    private curseforgeAPI: CurseForgeAPI,
    private minecraftVersion: string,
    private modLoader: string,
    private modsFolder: string,
    private backupFolder: string
  ) {
    this.searchService = new SearchService(modrinthAPI, curseforgeAPI, minecraftVersion, modLoader);
    this.fileService = new FileService(modsFolder);
  }

  /**
   * Define callback para progresso
   */
  setProgressCallback(callback: ProgressCallback) {
    this.progressCallback = callback;
  }

  /**
   * Solicita parada do processo
   */
  stop() {
    this.shouldStop = true;
    console.log('Solicitação de parada recebida');
  }

  /**
   * Verifica se deve continuar processando
   */
  private shouldContinue(): boolean {
    return !this.shouldStop;
  }

  /**
   * Emite progresso atual
   */
  private emitProgress(current: number, total: number, currentMod: string) {
    if (this.progressCallback) {
      const percentage = Math.round((current / total) * 100);

      let estimatedTimeRemaining: number | undefined;
      if (this.startTime && current > 0) {
        const elapsed = Date.now() - this.startTime;
        const avgTimePerMod = elapsed / current;
        const remaining = total - current;
        estimatedTimeRemaining = Math.round((avgTimePerMod * remaining) / 1000);
      }

      this.progressCallback({
        current,
        total,
        percentage,
        currentMod,
        estimatedTimeRemaining,
      });
    }
  }

  /**
   * Busca informações de versão baseado na fonte
   */
  private async getLatestVersion(projectId: string | number, source: 'modrinth' | 'curseforge') {
    if (source === 'modrinth') {
      const versions = await this.modrinthAPI.getVersions(
        projectId as string,
        this.minecraftVersion,
        this.modLoader
      );

      if (versions.length > 0) {
        const latestVersion = versions[0];
        const primaryFile =
          latestVersion.files.find((f: any) => f.primary) || latestVersion.files[0];

        console.log(`Modrinth Version Debug:`, {
          version_number: latestVersion.version_number,
          name: latestVersion.name,
          filename: primaryFile.filename,
        });

        return {
          version: latestVersion.version_number,
          versionName: latestVersion.name,
          downloadUrl: primaryFile.url,
          filename: primaryFile.filename,
          size: primaryFile.size,
        };
      }
    } else if (source === 'curseforge') {
      const files = await this.curseforgeAPI.getFiles(
        projectId as number,
        this.minecraftVersion,
        this.modLoader
      );

      if (files.length > 0) {
        const sortedFiles = files.sort(
          (a: any, b: any) => new Date(b.fileDate).getTime() - new Date(a.fileDate).getTime()
        );

        const latestFile = sortedFiles[0];

        console.log(`CurseForge File Debug:`, {
          displayName: latestFile.displayName,
          fileName: latestFile.fileName,
          fileDate: latestFile.fileDate,
        });

        let version = latestFile.displayName || latestFile.fileName;

        const versionMatch = version.match(/(\d+\.\d+\.?\d*)/);
        if (versionMatch) {
          version = versionMatch[1];
        }

        return {
          version: version,
          versionName: latestFile.displayName,
          downloadUrl: latestFile.downloadUrl,
          filename: latestFile.fileName,
          size: latestFile.fileLength,
        };
      }
    }

    return null;
  }

  /**
   * Baixa um arquivo
   */
  private async downloadFile(url: string, filename: string, destination: string): Promise<boolean> {
    try {
      const response = await this.modrinthAPI.downloadFile(url);
      return true;
    } catch (error) {
      console.error(`Erro ao baixar ${filename}: ${error}`);
      return false;
    }
  }

  /**
   * Atualiza um mod individual
   */
  async updateMod(filename: string): Promise<void> {
    this.stats.checked++;

    const modInfo = this.fileService.extractModInfo(filename);
    const normalizedName = this.searchService.normalizeName(filename);

    const modData = await this.searchService.searchMod(normalizedName, filename);

    if (!modData.found) {
      this.stats.failed++;
      this.failedLogs.push({
        filename,
        reason: 'Não encontrado em nenhuma plataforma',
        timestamp: new Date().toISOString(),
        status: 'failed',
      });
      return;
    }

    const latestVersion = await this.getLatestVersion(modData.projectId!, modData.source!);

    console.log(`Debug - ${modData.title}:`);
    console.log(`   Source: ${modData.source}`);
    console.log(`   Latest Version:`, latestVersion);
    console.log(`   Current Version:`, modInfo.currentVersion);

    if (!latestVersion) {
      this.stats.failed++;
      this.failedLogs.push({
        filename,
        modName: modData.title,
        reason: `Nenhuma versão para Minecraft ${this.minecraftVersion}`,
        timestamp: new Date().toISOString(),
        status: 'failed',
      });
      return;
    }

    // Verificar se precisa atualizar
    if (latestVersion.filename === filename) {
      this.stats.upToDate++;
      this.updatedLogs.push({
        filename,
        modName: modData.title,
        status: 'skipped',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await this.fileService.backupMod(filename, this.backupFolder);

    const downloaded = await this.downloadFile(
      latestVersion.downloadUrl,
      latestVersion.filename,
      this.modsFolder
    );

    if (downloaded) {
      await this.fileService.removeOldMod(filename);
      this.stats.updated++;
      this.updatedLogs.push({
        filename: latestVersion.filename,
        modName: modData.title,
        oldVersion: modInfo.currentVersion,
        newVersion: latestVersion.version,
        source: modData.source,
        timestamp: new Date().toISOString(),
        status: 'success',
      });
    } else {
      this.stats.failed++;
      this.failedLogs.push({
        filename,
        modName: modData.title,
        reason: 'Erro ao baixar arquivo',
        timestamp: new Date().toISOString(),
        status: 'failed',
      });
    }
  }

  /**
   * Atualiza todos os mods
   */
  async updateAllMods(): Promise<{
    stats: UpdateStats;
    logs: { updated: UpdateLog[]; failed: UpdateLog[] };
    stopped: boolean;
  }> {
    this.startTime = Date.now();
    this.shouldStop = false;

    const mods = await this.fileService.scanMods();
    const total = mods.length;

    console.log(`Encontrados ${total} mods para verificar`);

    const batchSize = 3;
    let current = 0;

    for (let i = 0; i < mods.length; i += batchSize) {
      if (!this.shouldContinue()) {
        console.log('Processo interrompido pelo usuário');
        break;
      }

      const batch = mods.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (mod) => {
          if (!this.shouldContinue()) return;

          this.emitProgress(current, total, mod);
          await this.updateMod(mod);
          current++;
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return {
      stats: this.stats,
      logs: {
        updated: this.updatedLogs,
        failed: this.failedLogs,
      },
      stopped: this.shouldStop,
    };
  }

  /**
   * Cria pastas finais após atualização
   */
  async finalize(updatedModsFolder: string): Promise<{
    logFile: string;
    modsCount: number;
  }> {
    const modsCount = await this.fileService.createUpdatedModsFolder(updatedModsFolder);

    const logId = await this.fileService.saveUpdateLog(
      this.stats,
      this.updatedLogs,
      this.failedLogs
    );

    if (this.failedLogs.length > 0) {
      console.log('\nAguardando 3 segundos antes de iniciar treinamento automático...');

      await new Promise((resolve) => setTimeout(resolve, 3000));

      console.log('\nIniciando treinamento automático a partir de erros...');
      try {
        const scriptPath = path.join(__dirname, '..', '..', 'auto-train-with-mongodb.js');
        const { stdout, stderr } = await execAsync(`node "${scriptPath}"`);

        if (stdout) {
          console.log(stdout);
        }

        if (stderr) {
          console.error('Avisos do treinamento:', stderr);
        }

        console.log('Treinamento automático concluído!');
        console.log('Novos padrões foram salvos no MongoDB.');
      } catch (error) {
        console.error('Erro ao executar treinamento automático:', error);
      }
    }

    return { logFile: logId, modsCount };
  }

  /**
   * Reseta as estatísticas
   */
  reset(): void {
    this.stats = {
      checked: 0,
      updated: 0,
      upToDate: 0,
      failed: 0,
    };
    this.updatedLogs = [];
    this.failedLogs = [];
    this.shouldStop = false;
    this.startTime = undefined;
  }
}
