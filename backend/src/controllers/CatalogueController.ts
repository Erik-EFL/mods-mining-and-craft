import { Request, Response, Router } from 'express';
import { CurseForgeAPI } from '../apis/CurseForgeAPI';
import { ModrinthAPI } from '../apis/ModrinthAPI';
import { ModCatalogueService } from '../services/ModCatalogueService';

const router = Router();

let catalogueService: ModCatalogueService;

export function initializeCatalogueController(
  modrinthAPI: ModrinthAPI,
  curseforgeAPI: CurseForgeAPI,
  minecraftVersion: string,
  modLoader: string
) {
  catalogueService = new ModCatalogueService(
    modrinthAPI,
    curseforgeAPI,
    minecraftVersion,
    modLoader
  );
}

/**
 * GET /api/catalogue/stats
 * Obtém estatísticas do catálogo
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await catalogueService.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao obter estatísticas do catálogo',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/catalogue/mods
 * Lista mods do catálogo com filtros
 */
router.get('/mods', async (req: Request, res: Response) => {
  try {
    const { minecraftVersion, modLoader, platform, category, limit, sort } = req.query;

    const filters: any = {};

    if (minecraftVersion) filters.minecraftVersion = String(minecraftVersion);
    if (modLoader) filters.modLoader = String(modLoader);
    if (platform) filters.platform = String(platform);
    if (category) filters.category = String(category);
    if (limit) filters.limit = parseInt(String(limit));
    if (sort) filters.sort = String(sort);

    const mods = await catalogueService.listMods(filters);

    res.json({
      success: true,
      data: mods,
      total: mods.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao listar mods',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/catalogue/search/:query
 * Busca um mod específico no catálogo
 */
router.get('/search/:query', async (req: Request, res: Response) => {
  try {
    const { query } = req.params;
    const mod = await catalogueService.findInCatalogue(query);

    if (!mod) {
      return res.status(404).json({
        success: false,
        error: 'Mod não encontrado no catálogo',
      });
    }

    res.json({
      success: true,
      data: mod,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar mod',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/catalogue/index/modrinth
 * Indexa mods do Modrinth
 */
router.post('/index/modrinth', async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.body;
    const indexed = await catalogueService.indexPlatformMods('modrinth', limit);

    res.json({
      success: true,
      message: `${indexed} mods indexados do Modrinth`,
      indexed,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao indexar mods do Modrinth',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/catalogue/index/curseforge
 * Indexa mods do CurseForge
 */
router.post('/index/curseforge', async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.body;
    const indexed = await catalogueService.indexPlatformMods('curseforge', limit);

    res.json({
      success: true,
      message: `${indexed} mods indexados do CurseForge`,
      indexed,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao indexar mods do CurseForge',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/catalogue/search-and-index
 * Busca e indexa um mod específico
 */
router.post('/search-and-index', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query é obrigatório',
      });
    }

    const mod = await catalogueService.searchAndIndex(query);

    if (!mod) {
      return res.status(404).json({
        success: false,
        error: 'Mod não encontrado',
      });
    }

    res.json({
      success: true,
      message: 'Mod encontrado e indexado',
      data: mod,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar e indexar mod',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/catalogue/record-success
 * Registra sucesso de busca
 */
router.post('/record-success', async (req: Request, res: Response) => {
  try {
    const { modName } = req.body;

    if (!modName) {
      return res.status(400).json({
        success: false,
        error: 'modName é obrigatório',
      });
    }

    await catalogueService.recordSearchSuccess(modName);

    res.json({
      success: true,
      message: 'Sucesso registrado',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao registrar sucesso',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/catalogue/record-failure
 * Registra falha de busca
 */
router.post('/record-failure', async (req: Request, res: Response) => {
  try {
    const { modName } = req.body;

    if (!modName) {
      return res.status(400).json({
        success: false,
        error: 'modName é obrigatório',
      });
    }

    await catalogueService.recordSearchFailure(modName);

    res.json({
      success: true,
      message: 'Falha registrada',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao registrar falha',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
