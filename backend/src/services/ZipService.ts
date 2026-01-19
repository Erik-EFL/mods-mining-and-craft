import archiver from "archiver";
import { createWriteStream, promises as fs } from "fs";
import { join } from "path";

/**
 * Serviço para criar arquivos ZIP
 */
export class ZipService {
  /**
   * Cria um arquivo ZIP da pasta de mods atualizados
   */
  async createModsZip(
    sourcePath: string,
    outputPath: string,
    zipFileName: string = "mods-atualizados.zip"
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        // Verificar se pasta existe
        await fs.access(sourcePath);

        const zipFilePath = join(outputPath, zipFileName);

        await fs.mkdir(outputPath, { recursive: true });

        const output = createWriteStream(zipFilePath);
        const archive = archiver("zip", {
          zlib: { level: 9 },
        });

        output.on("close", () => {
          console.log(
            `✅ ZIP criado: ${zipFilePath} (${archive.pointer()} bytes)`
          );
          resolve(zipFilePath);
        });

        output.on("error", (error) => {
          reject(new Error(`Erro ao criar ZIP: ${error.message}`));
        });

        archive.on("error", (error) => {
          reject(new Error(`Erro ao arquivar: ${error.message}`));
        });

        archive.pipe(output);

        // Cria o ZIP
        archive.directory(sourcePath, false);

        await archive.finalize();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Cria um ZIP contendo os arquivos de backup
   */
  async createBackupZip(
    sourcePath: string,
    outputPath: string,
    zipFileName: string = "mods-backup.zip"
  ): Promise<string> {
    return this.createModsZip(sourcePath, outputPath, zipFileName);
  }

  /**
   * Cria um arquivo ZIP com relatório detalhado
   */
  async createReportZip(
    modsFolder: string,
    backupFolder: string,
    logFile: string,
    outputPath: string
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const zipFilePath = join(outputPath, "mods-atualizados-completo.zip");

        await fs.mkdir(outputPath, { recursive: true });

        const output = createWriteStream(zipFilePath);
        const archive = archiver("zip", {
          zlib: { level: 9 },
        });

        output.on("close", () => {
          console.log(
            `✅ ZIP completo criado: ${zipFilePath} (${archive.pointer()} bytes)`
          );
          resolve(zipFilePath);
        });

        output.on("error", (error) => {
          reject(new Error(`Erro ao criar ZIP: ${error.message}`));
        });

        archive.on("error", (error) => {
          reject(new Error(`Erro ao arquivar: ${error.message}`));
        });

        archive.pipe(output);

        // Adicionar mods atualizados
        try {
          await fs.access(modsFolder);
          archive.directory(modsFolder, "mods-atualizados");
        } catch {
          console.warn("Pasta de mods atualizados não encontrada");
        }

        // Adicionar backup
        try {
          await fs.access(backupFolder);
          archive.directory(backupFolder, "mods-backup");
        } catch {
          console.warn("Pasta de backup não encontrada");
        }

        // Adicionar arquivo de log
        try {
          await fs.access(logFile);
          archive.file(logFile, { name: "relatorio.txt" });
        } catch {
          console.warn("Arquivo de log não encontrado");
        }

        await archive.finalize();
      } catch (error) {
        reject(error);
      }
    });
  }
}
