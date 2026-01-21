import express from 'express';
import { DatabaseService } from '../services/DatabaseService';

const router = express.Router();

/**
 * GET /api/logs - Obtém histórico de logs
 */
router.get('/logs', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const logs = await DatabaseService.getFailureHistory(limit);
    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/logs/stats - Obtém estatísticas do dia
 */
router.get('/logs/stats', async (req, res) => {
  try {
    const stats = await DatabaseService.getDailyStatistics();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/patterns - Obtém padrões de busca mais usados
 */
router.get('/patterns', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const patterns = await DatabaseService.getMostUsedPatterns(limit);
    res.json({
      success: true,
      count: patterns.length,
      data: patterns,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/training - Obtém histórico de treinamento
 */
router.get('/training', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const sessions = await DatabaseService.getTrainingHistory(limit);
    res.json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/analytics - Obtém análise completa do sistema
 */
router.get('/analytics', async (req, res) => {
  try {
    const [stats, patterns, training] = await Promise.all([
      DatabaseService.getDailyStatistics(),
      DatabaseService.getMostUsedPatterns(10),
      DatabaseService.getTrainingHistory(5),
    ]);

    res.json({
      success: true,
      data: {
        stats,
        topPatterns: patterns,
        recentTraining: training,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/logs/save-daily-stats - Salva estatísticas diárias
 */
router.post('/logs/save-daily-stats', async (req, res) => {
  try {
    await DatabaseService.saveDailyStatistics();
    res.json({
      success: true,
      message: 'Estatísticas diárias salvas com sucesso',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
