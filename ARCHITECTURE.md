# Arquitetura do Sistema - Mods Craft

---

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TypeScript)            │
│                      Port 5173 (Vite)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Dashboard │ UpdateProgress │ LogViewer │ API Client │   │
│  └─────────────────────────────────────────────────────┬┘   │
└────────────────────────────────────────────────────────┼─────┘
                                                         │
                                      HTTP + WebSocket   │
                                                         │
┌────────────────────────────────────────────────────────▼─────┐
│                  BACKEND (Express + TypeScript)              │
│                      Port 3001                               │
│ ┌────────────────────────────────────────────────────────┐   │
│ │           Express Server (HTTP + WebSocket)            │   │
│ │ ┌──────────────────────────────────────────────────┐   │   │
│ │ │  Controllers         Routes         Middleware   │   │   │
│ │ │  UpdateController    /api/logs      errorHandler │   │   │
│ │ │                      /api/stats     CORS         │   │   │
│ │ │                      /api/patterns  Auth         │   │   │
│ │ │                      /api/training               │   │   │
│ │ │                      /api/analytics              │   │   │
│ │ └──────────────────────────────────────────────────┘   │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                                │
│ ┌────────────────────────────────────────────────────────┐   │
│ │                    Services Layer                       │   │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │   │
│ │ │UpdateService │ │SearchService │ │FileService   │    │   │
│ │ │ - Orchestrate│ │ - 4-tier     │ │ - JSON logs  │    │   │
│ │ │ - Download   │ │   search     │ │ - Snapshots  │    │   │
│ │ │ - Install    │ │ - Normalize  │ │ - Backup     │    │   │
│ │ └──────────────┘ └──────────────┘ └──────────────┘    │   │
│ │                                                         │   │
│ │ ┌──────────────┐ ┌──────────────┐                      │   │
│ │ │ZipService    │ │DatabaseService                      │   │
│ │ │ - Archive    │ │ - saveUpdateLog()                   │   │
│ │ │ - Download   │ │ - getFailureHistory()               │   │
│ │ └──────────────┘ │ - getMostUsedPatterns()             │   │
│ │                  │ - incrementPatternUsage()           │   │
│ │                  │ - saveDailyStatistics()             │   │
│ │                  └──────────────────────────────────┘  │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                                │
│ ┌────────────────────────────────────────────────────────┐   │
│ │               APIs Layer                               │   │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │   │
│ │ │ModrinthAPI   │ │CurseForgeAPI │ │AnthropicAPI  │    │   │
│ │ │ - Search     │ │ - Search     │ │ - AI Fallback│    │   │
│ │ │ - GetInfo    │ │ - GetInfo    │ │ - Fallback   │    │   │
│ │ │ - Download   │ │ - Download   │ │ - Last resort│    │   │
│ │ └──────────────┘ └──────────────┘ └──────────────┘    │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                                │
│ ┌────────────────────────────────────────────────────────┐   │
│ │         Database Connection Layer                       │   │
│ │ ┌────────────────────────────────────────────────────┐ │   │
│ │ │  connectMongoDB()  │  disconnectMongoDB()         │ │   │
│ │ │  Error Handling    │  Graceful Degradation       │ │   │
│ │ └────────────────────────────────────────────────────┘ │   │
│ └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┬──┘
                                                              │
                              Database Queries               │
                              Persistent Storage             │
                                                              │
┌─────────────────────────────────────────────────────────────▼──┐
│              DATABASE LAYER (MongoDB + Docker)                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │   MongoDB 7.0 Container (Port 27017)                     │  │
│  │   ┌──────────────────────────────────────────────────┐   │  │
│  │   │  UpdateLog Collection                            │   │  │
│  │   │  ├─ timestamp, date, stats                       │   │  │
│  │   │  ├─ updated: ModLog[], failed: FailureLog[]     │   │  │
│  │   │  └─ Index: timestamp, stats.failed, failed.name │   │  │
│  │   │                                                  │   │  │
│  │   │  TrainingSession Collection                      │   │  │
│  │   │  ├─ timestamp, failedModsCount, patternsUpdated │   │  │
│  │   │  ├─ learnedPatterns: Map<string, string[]>     │   │  │
│  │   │  └─ Index: timestamp, newModsAdded             │   │  │
│  │   │                                                  │   │  │
│  │   │  SearchPattern Collection                        │   │  │
│  │   │  ├─ modName, normalizedName, variations         │   │  │
│  │   │  ├─ timesUsed, successCount, failureCount       │   │  │
│  │   │  └─ Index: source+lastUpdated, successCount     │   │  │
│  │   │                                                  │   │  │
│  │   │  Statistics Collection                           │   │  │
│  │   │  ├─ date, totalMods, totalChecked, totalFailed  │   │  │
│  │   │  ├─ successRate, totalUpdated                   │   │  │
│  │   │  └─ Index: date                                 │   │  │
│  │   └──────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  │   Storage (Named Volumes)                               │  │
│  │   ├─ mongo-data: /data/db (Database files)             │  │
│  │   └─ mongo-config: /data/configdb (Config)             │  │
│  │                                                           │  │
│  │   Health Checks: mongosh ping every 10s                 │  │
│  │   Network: mods-craft-network (Bridge)                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │   Mongo Express UI (Port 8081)                           │  │
│  │   ├─ Visual Database Management                          │  │
│  │   ├─ Collection Browser                                  │  │
│  │   ├─ Query Executor                                      │  │
│  │   └─ Credentials: admin / modcraft2026                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL APIs                                │
│  ┌────────────────────┐ ┌────────────────────┐                 │
│  │  Modrinth API      │ │  CurseForge API    │                 │
│  │  v2 REST Endpoint  │ │  v1 REST Endpoint  │                 │
│  │  Port 443 HTTPS    │ │  Port 443 HTTPS    │                 │
│  └────────────────────┘ └────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Dados - Update Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USUÁRIO INICIA ATUALIZAÇÃO                              │
│    Frontend Dashboard → UpdateController.startUpdate()      │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ 2. SERVIÇO DE ATUALIZAÇÃO PROCESSA                         │
│    UpdateService.execute()                                  │
│    ├─ Scan local mods                                       │
│    ├─ Check version (Modrinth/CurseForge)                  │
│    ├─ Download updates                                      │
│    ├─ Install files                                         │
│    └─ Generate statistics                                   │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ 3. CRIAÇÃO DE LOGS                                         │
│    FileService.createLogFile()                              │
│    ├─ Cria JSON file (update-log-*.json)                   │
│    ├─ Cria TXT file (update-log-*.txt)                     │
│    └─ Gera snapshots (mod-database-snapshot-*.json)        │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ 4. SALVAR EM MONGODB                                       │
│    DatabaseService.saveUpdateLog()                          │
│    ├─ Persiste UpdateLog collection                         │
│    ├─ Log de sucesso no console                             │
│    └─ Warn se MongoDB indisponível (fallback)              │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ 5. TIMEOUT 3 SEGUNDOS                                      │
│    await sleep(3000)                                        │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ 6. TREINAMENTO AUTOMÁTICO INICIA                           │
│    execAsync("node auto-train-with-mongodb.js")            │
│    ├─ Lê último update log                                  │
│    ├─ Extrai mods que falharam                             │
│    ├─ Gera variações de busca                              │
│    └─ Entrena sistema de padrões                           │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ 7. SALVAR TREINAMENTO                                      │
│    DatabaseService.saveTrainingSession()                    │
│    ├─ Persiste TrainingSession                             │
│    ├─ Atualiza SearchPattern collection                    │
│    ├─ Salva em JSON (search-learning.json)                 │
│    └─ Incrementa padrão usage                              │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ 8. PRONTO PARA CONSULTA                                    │
│    APIs REST disponíveis                                    │
│    ├─ GET /api/logs (histórico)                            │
│    ├─ GET /api/patterns (padrões)                          │
│    ├─ GET /api/training (sessões)                          │
│    ├─ GET /api/analytics (completo)                        │
│    └─ GET /api/logs/stats (estatísticas)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Detalhamento do Serviço de Busca (4-Camadas)

```
MOD NÃO ENCONTRADO DURANTE UPDATE
    │
    ├─────────────────────────────────────────────────┐
    │                                                  │
    ▼                                                  │
┌───────────────────────────────────┐                │
│ Tier 0: DIRECT_PROJECT_MAPPING    │ (0.1s)        │
│ ├─ 7 mods mapeados              │                │
│ ├─ easyanvils: OZBR5JT5         │                │
│ ├─ easymagic: 9hx3AbJM          │                │
│ ├─ terralith: 8oi3bsk5          │                │
│ ├─ etc...                        │                │
│ └─ Sucesso? ──YES──► ENCONTRADO │                │
└───────────────────────────────────┘ NO            │
    │◄────────────────────────────────────────────────┘
    ▼
┌───────────────────────────────────┐
│ Tier 1: LEARNED_PATTERNS          │ (0.5s)
│ ├─ Lê search-learning.json        │
│ ├─ Padrões de 24 mods            │
│ ├─ Variações aprendidas          │
│ ├─ easymagic → [easymagic, easy  │
│ │            easy-magic, ...]    │
│ └─ Sucesso? ──YES──► ENCONTRADO │
└───────────────────────────────────┘ NO
    │◄────────────────────────────────
    ▼
┌───────────────────────────────────┐
│ Tier 2: CONVENTIONAL_VARIATIONS    │ (1s)
│ ├─ easy_magic                     │
│ ├─ easy-magic                     │
│ ├─ EasyMagic                      │
│ ├─ EASY_MAGIC                     │
│ ├─ easyMagic                      │
│ └─ Sucesso? ──YES──► ENCONTRADO │
└───────────────────────────────────┘ NO
    │◄────────────────────────────────
    ▼
┌───────────────────────────────────┐
│ Tier 3: AI_FALLBACK               │ (5s)
│ ├─ Claude Haiku API               │
│ ├─ "Qual mod Minecraft é ...?"   │
│ ├─ Gera sugestões com IA         │
│ ├─ Última tentativa              │
│ └─ Sucesso? ──YES──► ENCONTRADO │
└───────────────────────────────────┘ NO
    │◄────────────────────────────────
    ▼
┌───────────────────────────────────┐
│ FALHA - REGISTRA NO LOG           │
│ ├─ UpdateLog collection          │
│ ├─ failed array                  │
│ ├─ Será re-treinado próximo vez │
└───────────────────────────────────┘
```

---

## Estrutura de Pacotes TypeScript

```
Backend
├── controllers/
│   └── UpdateController.ts
│       ├─ startUpdate()
│       └─ getStatus()
│
├── services/
│   ├── UpdateService.ts
│   │   ├─ execute()
│   │   ├─ getStats()
│   │   └─ stop()
│   │
│   ├── SearchService.ts
│   │   ├─ search() [4-tier]
│   │   ├─ normalize()
│   │   └─ generateVariations()
│   │
│   ├── FileService.ts
│   │   ├─ createLogFile()
│   │   └─ createSnapshot()
│   │
│   ├── DatabaseService.ts (novo)
│   │   ├─ saveUpdateLog()
│   │   ├─ saveTrainingSession()
│   │   ├─ updateSearchPatterns()
│   │   ├─ getDailyStatistics()
│   │   ├─ getFailureHistory()
│   │   ├─ getMostUsedPatterns()
│   │   ├─ getTrainingHistory()
│   │   ├─ incrementPatternUsage()
│   │   └─ saveDailyStatistics()
│   │
│   ├── ZipService.ts
│   │   ├─ createZip()
│   │   └─ downloadZip()
│
├── database/ (novo)
│   ├── mongodb.ts
│   │   ├─ connectMongoDB()
│   │   └─ disconnectMongoDB()
│   │
│   └── schemas.ts
│       ├─ UpdateLog schema
│       ├─ TrainingSession schema
│       ├─ SearchPattern schema
│       └─ Statistics schema
│
├── routes/ (novo)
│   └── analytics.ts
│       ├─ GET /api/logs
│       ├─ GET /api/logs/stats
│       ├─ GET /api/patterns
│       ├─ GET /api/training
│       ├─ GET /api/analytics
│       └─ POST /api/logs/save-daily-stats
│
├── apis/
│   ├── ModrinthAPI.ts
│   ├── CurseForgeAPI.ts
│   └── AnthropicAPI.ts (fallback)
│
├── types/
│   ├── api.types.ts
│   └── mod.types.ts
│
├── middleware/
│   └── errorHandler.ts
│
└── server.ts
    ├─ connectMongoDB()
    ├─ app.use("/api", analyticsRouter)
    └─ httpServer.listen()
```

---

## Integração de Componentes

```
┌──────────────────────────────────────────────────────────┐
│                 UPDATE REQUEST FLOW                       │
└──────────────────────┬───────────────────────────────────┘
                       │
    ┌──────────────────▼──────────────────┐
    │   UpdateController.startUpdate()    │
    └──────────────────┬──────────────────┘
                       │
    ┌──────────────────▼──────────────────┐
    │     UpdateService.execute()         │
    ├──────────────────┬──────────────────┤
    │ ┌────────────────▼──────┐           │
    │ │  SearchService        │           │
    │ │  (4-tier search)      │           │
    │ └────────────────┬──────┘           │
    │ ┌────────────────▼──────┐           │
    │ │  ModrinthAPI/         │           │
    │ │  CurseForgeAPI        │           │
    │ └────────────────┬──────┘           │
    │ ┌────────────────▼──────┐           │
    │ │  ZipService           │           │
    │ │  (download/install)   │           │
    │ └────────────────┬──────┘           │
    └──────────────────┼──────────────────┘
                       │
    ┌──────────────────▼──────────────────┐
    │    FileService.createLogFile()      │
    └──────────────────┬──────────────────┘
                       │ (JSON)
    ┌──────────────────▼──────────────────┐
    │  DatabaseService.saveUpdateLog()    │
    └──────────────────┬──────────────────┘
                       │ (MongoDB)
    ┌──────────────────▼──────────────────┐
    │    MongoDB UpdateLog Collection     │
    └──────────────────┬──────────────────┘
                       │ (sleep 3s)
    ┌──────────────────▼──────────────────┐
    │ auto-train-with-mongodb.js         │
    └──────────────────┬──────────────────┘
                       │
    ┌──────────────────▼──────────────────┐
    │  DatabaseService.saveTrainingSexi()│
    │  DatabaseService.updateSearchPtns()│
    └──────────────────┬──────────────────┘
                       │
    ┌──────────────────▼──────────────────┐
    │   MongoDB Collections Updated      │
    │   ├─ TrainingSession               │
    │   └─ SearchPattern                 │
    └──────────────────┬──────────────────┘
                       │
    ┌──────────────────▼──────────────────┐
    │     UPDATE COMPLETE                │
    │  APIs Ready for Data Query          │
    └──────────────────────────────────────┘
```

---

## REST API Endpoints

```
┌─────────────────────────────────────────────┐
│         REST API Architecture               │
│                                             │
│ Base URL: http://localhost:3001/api        │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│ GET /logs                                  │
│   └─ Returns: UpdateLog[] (limit=20)      │
│   └─ Query: ?limit=20                     │
│                                             │
│ GET /logs/stats                            │
│   └─ Returns: Daily statistics            │
│   └─ Aggregation from UpdateLog           │
│                                             │
│ GET /patterns?limit=10                     │
│   └─ Returns: SearchPattern[] (top)       │
│   └─ Sorted by successCount               │
│                                             │
│ GET /training?limit=10                     │
│   └─ Returns: TrainingSession[]           │
│   └─ Recent sessions first                │
│                                             │
│ GET /analytics                             │
│   └─ Returns: {stats, patterns, training} │
│   └─ Complete dashboard data              │
│                                             │
│ POST /logs/save-daily-stats                │
│   └─ Trigger: Manual stats save           │
│   └─ Body: empty                          │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Deployment Targets

```
┌─────────────────────────────────────────┐
│        DEVELOPMENT ENVIRONMENT           │
│  ┌──────────────────────────────────┐   │
│  │ Docker Compose (Local)           │   │
│  │ ├─ MongoDB 7.0                   │   │
│  │ ├─ Node.js Backend               │   │
│  │ ├─ React Frontend (Vite)         │   │
│  │ └─ Mongo Express UI              │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      PRODUCTION ENVIRONMENT              │
│  ┌──────────────────────────────────┐   │
│  │ Kubernetes / Docker Swarm         │   │
│  │ ├─ MongoDB Atlas (managed)        │   │
│  │ ├─ Node.js Cluster                │   │
│  │ ├─ React Static Site (CDN)        │   │
│  │ ├─ Load Balancer                  │   │
│  │ └─ Monitoring Stack               │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

**Diagrama criado em:** 21/01/2026
**Status:** Implementação Completa
**Documentação Associada:** IMPLEMENTATION_SUMMARY.md, README_FINAL.md
