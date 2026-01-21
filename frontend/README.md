# Frontend - Mods Craft

## Visão Geral
- Dashboard em React + TypeScript (Vite)
- WebSocket para progresso em tempo real
- Consome APIs do backend (port padrão 3001)

## Requisitos
- Node.js 20+
- npm ou yarn

## Instalação
```bash
cd frontend
npm install
```

## Scripts
- `npm run dev` — inicia Vite em modo desenvolvimento (porta 5173)
- `npm run build` — build de produção
- `npm run preview` — pré-visualiza o build

## Configuração
Defina a URL do backend via variável Vite:
```
VITE_API_BASE=http://localhost:3001
```

## Estrutura de Pastas
```
frontend/
  src/
    main.tsx
    App.tsx
    pages/
      Dashboard.tsx
    components/
      UpdateProgress.tsx
      LogViewer.tsx
    hooks/
      useSocket.ts
      useUpdate.ts
    services/
      api-client.ts
    styles/
```

## Uso
1) Inicie o backend em `http://localhost:3001`
2) Rode `npm run dev` no frontend
3) Acesse `http://localhost:5173`

## Observações
- Logs no console não usam emojis
- WebSocket exibe progresso de atualização em tempo real
