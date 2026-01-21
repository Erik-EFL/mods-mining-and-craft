# Backend - Mods Craft

## Visão Geral
- API REST e WebSocket com Express + TypeScript
- Integração com Modrinth e CurseForge para busca e atualização de mods
- Persistência opcional em MongoDB (fallback para arquivos JSON)
- Treinamento automático de padrões de busca com base em falhas

## Requisitos
- Node.js 20+
- npm ou yarn
- MongoDB (opcional, habilita persistência e métricas)

## Instalação
```bash
cd backend
npm install
```

## Configuração
Crie um arquivo `.env` (ou use variáveis de ambiente) com:
```
PORT=3001
MONGODB_URI=mongodb://admin:modcraft2026@localhost:27017/mods-craft?authSource=admin
CURSEFORGE_API_KEY=... # opcional
MODRINTH_LIMIT=200
CURSEFORGE_LIMIT=200
MINECRAFT_VERSION=1.20.1
MOD_LOADER=fabric
```
Se o MongoDB não estiver disponível, o sistema continua com JSON files.

## Scripts
- `npm run dev` — inicia o servidor com ts-node-dev
- `npm run build` — compila para `dist`
- `npm run start` — roda build em produção
- `npm run populate-catalogue` — indexa catálogo inicial
- `npm run cleanup-catalogue` — limpa coleção/catalogo
- `npm run auto-train` — roda treinamento automático com MongoDB

## Endpoints Principais
- `POST /api/updates/start` — inicia atualização
- `GET /api/updates/status` — status da atualização
- `GET /api/logs` — últimos logs
- `GET /api/logs/stats` — estatísticas agregadas
- `GET /api/patterns` — padrões de busca aprendidos
- `GET /api/training` — sessões de treinamento
- `GET /api/analytics` — dashboard combinado
- `GET /api/downloads/:filename` — download de .zip
- `POST /api/logs/save-daily-stats` — grava estatísticas diárias

## Estrutura de Pastas
```
backend/
  src/
    server.ts
    controllers/
    services/
    apis/
    routes/
    middleware/
    database/
    types/
  downloads/
```

## Fluxo de Atualização (resumo)
1) `POST /api/updates/start`
2) `UpdateService` verifica versões (Modrinth/CurseForge)
3) Faz download + backup + log
4) Salva log no MongoDB (se disponível)
5) Executa treinamento automático de padrões (auto-train)

## Treinamento Automático
- Lê o último update log
- Gera variações de nome para mods que falharam
- Atualiza `SearchPattern` no MongoDB

## Desenvolvimento
- Lint/format: `npm run lint` (se configurado) / `npm run format`
- Testes: (não definidos) — adicionar conforme necessidade

## Observações
- Logs de console não usam emojis
- Fallback seguro para ambientes sem MongoDB
