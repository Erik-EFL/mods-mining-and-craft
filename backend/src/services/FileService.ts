import { promises as fs } from "fs";
import path from "path";
import type { UpdateLog, UpdateStats } from "../types/mod.types";

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
      return files.filter((file) => file.endsWith(".jar"));
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
    const name = filename.replace(".jar", "");

    const patterns = [
      /^(.+?)[-_](?:fabric|forge|neoforge)[-_](?:mc)?(.+?)[-_](.+)$/i,
      /^(.+?)[-_](.+?)[-_](.+)$/,
      /^(.+?)[-_]v?(.+)$/,
    ];

    for (const pattern of patterns) {
      const match = name.match(pattern);
      if (match) {
        return {
          name: match[1].toLowerCase().replace(/[^a-z0-9]/g, ""),
          filename: filename,
          currentVersion: match[match.length - 1],
        };
      }
    }

    return {
      name: name.toLowerCase().replace(/[^a-z0-9]/g, ""),
      filename: filename,
      currentVersion: "unknown",
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
      const jarFiles = currentMods.filter((file) => file.endsWith(".jar"));

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
   * Cria arquivo de log de atualização
   */
  async createLogFile(
    stats: UpdateStats,
    updatedMods: UpdateLog[],
    failedMods: UpdateLog[]
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const logFileName = `update-log-${timestamp}.txt`;
      const logFilePath = path.join(".", logFileName);

      let logContent = "";
      logContent += "=".repeat(80) + "\n";
      logContent += "RELATÓRIO DE ATUALIZAÇÃO DE MODS\n";
      logContent += "=".repeat(80) + "\n\n";
      logContent += `Data: ${new Date().toLocaleString("pt-BR")}\n\n`;

      logContent += "-".repeat(80) + "\n";
      logContent += "ESTATÍSTICAS\n";
      logContent += "-".repeat(80) + "\n";
      logContent += `Total verificado: ${stats.checked}\n`;
      logContent += `Atualizados: ${stats.updated}\n`;
      logContent += `Já atualizados: ${stats.upToDate}\n`;
      logContent += `Falhas: ${stats.failed}\n\n`;

      if (updatedMods.length > 0) {
        logContent += "=".repeat(80) + "\n";
        logContent += `MODS ATUALIZADOS (${updatedMods.length})\n`;
        logContent += "=".repeat(80) + "\n\n";

        updatedMods.forEach((mod, index) => {
          logContent += `${index + 1}. ${mod.modName}\n`;
          logContent += `   Fonte: ${mod.source?.toUpperCase()}\n`;
          logContent += `   Versão: ${mod.oldVersion} → ${mod.newVersion}\n`;
          logContent += `   Data: ${new Date(mod.timestamp).toLocaleString(
            "pt-BR"
          )}\n\n`;
        });
      }

      if (failedMods.length > 0) {
        logContent += "=".repeat(80) + "\n";
        logContent += `MODS QUE FALHARAM (${failedMods.length})\n`;
        logContent += "=".repeat(80) + "\n\n";

        failedMods.forEach((mod, index) => {
          logContent += `${index + 1}. ${mod.modName || mod.filename}\n`;
          logContent += `   Motivo: ${mod.reason}\n`;
          logContent += `   Data: ${new Date(mod.timestamp).toLocaleString(
            "pt-BR"
          )}\n\n`;
        });
      }

      await fs.writeFile(logFilePath, logContent, "utf-8");
      return logFileName;
    } catch (error) {
      throw new Error(`Erro ao criar arquivo de log: ${error}`);
    }
  }
}
