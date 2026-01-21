import { Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { CurseForgeAPI } from '../apis/CurseForgeAPI';
import { ModrinthAPI } from '../apis/ModrinthAPI';
import { UpdateService } from '../services/UpdateService';
import { ZipService } from '../services/ZipService';
import type { ApiResponse } from '../types/api.types';

/**
 * Controller para operações de atualização de mods
 */
export class UpdateController {
  private zipService: ZipService;

  constructor(
    private updateService: UpdateService,
    private modrinthAPI: ModrinthAPI,
    private curseforgeAPI: CurseForgeAPI,
    private io: SocketIOServer
  ) {
    this.zipService = new ZipService();
  }

  /**
   * Inicia o processo de atualização
   */
  async startUpdate(req: Request, res: Response<ApiResponse<any>>) {
    try {
      let { modsFolder } = req.body;

      if (!modsFolder) {
        return res.status(400).json({
          success: false,
          error: "Campo 'modsFolder' é obrigatório",
        });
      }

      modsFolder = modsFolder.trim().replace(/^["']|["']$/g, '');

      if (!modsFolder.match(/^[A-Za-z]:\\/) && !modsFolder.startsWith('/')) {
        return res.status(400).json({
          success: false,
          error: 'Por favor, forneça um caminho absoluto (ex: C:\\Users\\...\\mods)',
        });
      }

      console.log(`Pasta de mods: ${modsFolder}`);

      const updateService = new UpdateService(
        this.modrinthAPI,
        this.curseforgeAPI,
        process.env.MINECRAFT_VERSION || '1.21.11',
        process.env.MOD_LOADER || 'fabric',
        modsFolder,
        `${modsFolder}_backup`
      );

      updateService.setProgressCallback((progress) => {
        this.io.emit('update-progress', progress);
      });

      updateService.reset();
      const result = await updateService.updateAllMods();
      await updateService.finalize(`${modsFolder}_atualizados`);

      const zipPath = await this.zipService.createModsZip(
        `${modsFolder}_atualizados`,
        './downloads',
        'mods-atualizados.zip'
      );

      res.json({
        success: true,
        data: {
          stats: result.stats,
          summary: {
            totalChecked: result.stats.checked,
            updated: result.stats.updated,
            upToDate: result.stats.upToDate,
            failed: result.stats.failed,
          },
          updated: result.logs.updated,
          failed: result.logs.failed,
          zipFile: 'mods-atualizados.zip',
          zipPath: zipPath,
        },
        message: 'Atualização concluída com sucesso',
      });
    } catch (error) {
      console.error('Erro ao atualizar mods:', error);
      res.status(500).json({
        success: false,
        error: `Erro ao atualizar mods: ${error}`,
      });
    }
  }

  /**
   * Obtém o status da atualização
   */
  async getStatus(req: Request, res: Response<ApiResponse<any>>) {
    try {
      res.json({
        success: true,
        data: { status: 'idle' },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Erro ao obter status: ${error}`,
      });
    }
  }
}
