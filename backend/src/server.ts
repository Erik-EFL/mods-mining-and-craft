import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express } from 'express';
import { createServer } from 'http';
import { join } from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { CurseForgeAPI } from './apis/CurseForgeAPI';
import { ModrinthAPI } from './apis/ModrinthAPI';
import catalogueRouter, { initializeCatalogueController } from './controllers/CatalogueController';
import { UpdateController } from './controllers/UpdateController';
import { connectMongoDB } from './database/mongodb';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import analyticsRouter from './routes/analytics';
import { UpdateService } from './services/UpdateService';

dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
});

const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use(
  '/downloads',
  express.static(join(process.cwd(), 'downloads'), {
    setHeaders: (res) => {
      res.setHeader('Content-Disposition', 'attachment; filename=mods-atualizados.zip');
    },
  })
);

const modrinthAPI = new ModrinthAPI();
const curseforgeAPI = new CurseForgeAPI(process.env.CURSEFORGE_API_KEY || '');

const updateService = new UpdateService(
  modrinthAPI,
  curseforgeAPI,
  process.env.MINECRAFT_VERSION || '1.21.11',
  process.env.MOD_LOADER || 'fabric',
  process.env.MODS_FOLDER || './mods',
  process.env.BACKUP_FOLDER || './mods_backup'
);

const updateController = new UpdateController(updateService, modrinthAPI, curseforgeAPI, io);

// Inicializar controller do catálogo
initializeCatalogueController(
  modrinthAPI,
  curseforgeAPI,
  process.env.MINECRAFT_VERSION || '1.21.11',
  process.env.MOD_LOADER || 'fabric'
);

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('stop-update', () => {
    console.log('Solicitação de parada recebida');
    updateService.stop();
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

app.post('/api/updates/start', (req, res) => updateController.startUpdate(req, res));
app.get('/api/updates/status', (req, res) => updateController.getStatus(req, res));

app.use('/api', analyticsRouter);

app.use('/api/catalogue', catalogueRouter);

app.get('/api/downloads/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = join(process.cwd(), 'downloads', filename);

    if (!filename.match(/^[\w\-\.]+\.zip$/)) {
      return res.status(400).json({
        success: false,
        error: 'Nome de arquivo inválido',
      });
    }

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Erro ao baixar arquivo:', err);
        if (!res.headersSent) {
          res.status(404).json({
            success: false,
            error: 'Arquivo não encontrado',
          });
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Erro ao fazer download: ${error}`,
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(notFoundHandler);

app.use(errorHandler);

connectMongoDB().catch((err) => {
  console.warn('MongoDB não disponível:', err.message);
  console.warn('Sistema continuará usando JSON files');
});

httpServer.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  console.log(`WebSocket disponível em ws://localhost:${port}`);
});
