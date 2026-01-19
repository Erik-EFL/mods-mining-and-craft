# ModsCraft - Gerenciador de Mods Minecraft

Aplicação profissional para gerenciar, atualizar e organizar mods de Minecraft com suporte a Modrinth e CurseForge.

## 🚀 Características

- ✅ Atualização automática de mods
- ✅ Suporte dual a Modrinth e CurseForge
- ✅ Interface web moderna com React + TypeScript
- ✅ Backend Node.js + Express
- ✅ Busca inteligente com fallback automático
- ✅ Backup automático de versões antigas
- ✅ Logs detalhados de atualização
- ✅ Arquitetura modular e profissional

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Variáveis de ambiente configuradas (veja `.env.example`)

## 🔧 Instalação

### 1. Clone ou extraia o projeto

```bash
cd mods-craft
```

### 2. Instale as dependências

```bash
npm install
```

Isso instalará automaticamente as dependências do backend e frontend (workspaces).

### 3. Configure o ambiente

Copie e configure o arquivo `.env.example`:

```bash
cd backend
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
PORT=3001
MINECRAFT_VERSION=1.21.11
MOD_LOADER=fabric
MODS_FOLDER=./mods
BACKUP_FOLDER=./mods_backup
CURSEFORGE_API_KEY=seu_token_aqui
```

Para obter uma API Key do CurseForge, visite: https://console.curseforge.com/

## 🎯 Como Usar

### Desenvolvimento

Inicie o backend e frontend simultaneamente:

```bash
npm run dev
```

Ou separadamente:

```bash
# Terminal 1 - Backend
npm run backend

# Terminal 2 - Frontend
npm run frontend
```

### Build para Produção

```bash
npm run build
```

Isso compila tanto o backend quanto o frontend.

## 📁 Estrutura do Projeto

```
mods-craft/
├── backend/
│   ├── src/
│   │   ├── apis/              # Clientes das APIs (Modrinth, CurseForge)
│   │   ├── database/          # Banco de dados local de mods
│   │   ├── services/          # Lógica de negócio (File, Search, Update)
│   │   ├── controllers/       # Handlers das rotas HTTP
│   │   ├── types/             # Tipos TypeScript
│   │   └── server.ts          # Aplicação Express
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Componentes React reutilizáveis
│   │   ├── pages/             # Páginas da aplicação
│   │   ├── services/          # Serviços HTTP (API Client)
│   │   ├── hooks/             # React Hooks customizados
│   │   ├── types/             # Tipos TypeScript
│   │   ├── styles/            # Estilos CSS
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
└── package.json (workspace root)
```

## 🔌 API Endpoints

### POST /api/updates/start

Inicia a atualização de todos os mods.

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "checked": 49,
      "updated": 12,
      "upToDate": 35,
      "failed": 2
    },
    "logs": [...],
    "folderInfo": {
      "updated_mods": "path/to/updated_mods",
      "backup": "path/to/backup",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  }
}
```

### GET /api/updates/status

Obtém o status atual da atualização.

## 🛠️ Desenvolvimento

### Adicionando novos endpoints

1. Crie um método no controller (`src/controllers/*.ts`)
2. Adicione a rota no arquivo de rotas (`src/routes/*.ts`)
3. Implemente a lógica de negócio nos services

### Adicionando novos componentes React

1. Crie o componente em `src/components/`
2. Exporte em um arquivo `index.ts` se necessário
3. Use em suas páginas

### Estendendo o banco de dados de mods

Edite `src/database/modDatabase.ts` para adicionar mais mods conhecidos:

```typescript
export const MOD_DETAILS_DB: Record<string, ModDetails> = {
  "seu-mod": {
    modrinthProjectId: "modrinth-id",
    curseforgeProjectId: 123456,
  },
};
```

## 📝 Logs

Os logs de atualização são salvos em:
```
./updated_mods/update_log_YYYYMMDD_HHmmss.txt
```

## 🤝 Contribuindo

Para adicionar suporte a novos mods ou melhorias:

1. Teste localmente com `npm run dev`
2. Verifique se o TypeScript compila sem erros
3. Valide com a API antes de fazer commit

## 📦 Dependências Principais

### Backend
- **express**: Framework HTTP
- **axios**: Cliente HTTP
- **typescript**: Tipagem estática
- **dotenv**: Variáveis de ambiente
- **cors**: CORS middleware

### Frontend
- **react**: UI framework
- **typescript**: Tipagem estática
- **axios**: Cliente HTTP
- **vite**: Bundler moderno
- **lucide-react**: Ícones SVG

## 🚀 Próximas Melhorias

- [ ] Persistência em banco de dados (SQLite/MongoDB)
- [ ] Autenticação e autorização
- [ ] Interface para adicionar mods manualmente
- [ ] Histórico de atualizações
- [ ] Docker containerization
- [ ] CI/CD pipeline

## 📄 Licença

MIT

## 📞 Suporte

Para problemas ou dúvidas, verifique os logs em `updated_mods/update_log_*.txt`

---

**Desenvolvido para gerenciar mods Minecraft de forma profissional e eficiente.**
