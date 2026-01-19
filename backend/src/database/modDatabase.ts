import type { ModDetails } from "../types/mod.types";

/**
 * Banco de dados local com informações detalhadas dos mods
 * Melhora significativamente a precisão dos downloads
 */
export const MOD_DETAILS_DB: Record<string, ModDetails> = {
  geophilic: {
    modrinth: {
      projectId: "hl5OLM95",
      slug: "geophilic",
      name: "Geophilic",
      category: "datapack",
      description: "Um datapack que adiciona blocos geológicos únicos",
    },
    curseforge: {
      projectId: 711216,
      slug: "geophilic",
      name: "Geophilic",
      description: "Adiciona minerais e formações geológicas",
    },
  },
  "philips-ruins": {
    modrinth: {
      projectId: "KdJhOYVV",
      slug: "philips-ruins",
      name: "Philips Ruins",
      category: "mod",
      description: "Adiciona ruínas antigas ao mundo do Minecraft",
    },
    curseforge: {
      projectId: 356090,
      slug: "ruins",
      name: "Ruins",
      description: "Estruturas de ruínas para Minecraft",
    },
  },
  "better-block-entities": {
    modrinth: {
      projectId: "",
      slug: "better-block-entities",
      name: "Better Block Entities",
      category: "mod",
      description: "Melhora visualmente as entidades de bloco",
    },
    curseforge: {
      projectId: 0,
      slug: "better-block-entities",
      name: "Better Block Entities",
      description: "Melhora visualmente as entidades de bloco",
    },
  },
};

/**
 * Mapeamento de nomes especiais (quando o nome do arquivo não corresponde ao slug)
 */
export const MOD_NAME_MAPPING: Record<string, string> = {
  bbe: "better-block-entities",
  bingoreloadedcompanion: "bingo-reloaded-companion",
  forgeconfigapiport: "forge-config-api-port",
  geophilic: "geophilic",
  philipsruins: "philips-ruins",
  supermartijn642configlib: "supermartijn642s-config-lib",
  supermartijn642corelib: "supermartijn642s-core-lib",
  medievalbuildings: "medieval-buildings",
  medievalbuildingsendendition: "medieval-buildings-end-edition",
  medievalbuildingsnetherendition: "medieval-buildings-nether-edition",
};

/**
 * Mapeamento de IDs diretos para mods problemáticos
 */
export const DIRECT_PROJECT_MAPPING: Record<
  string,
  { modrinth: string; curseforge: number }
> = {
  geophilic: {
    modrinth: "hl5OLM95",
    curseforge: 711216,
  },
  "philips-ruins": {
    modrinth: "KdJhOYVV",
    curseforge: 356090,
  },
};

/**
 * Variações de nomes para busca
 */
export const NAME_VARIATIONS: Record<string, string[]> = {
  "philips-ruins": ["philips ruins", "philipsruins", "ruins", "philip's ruins"],
  geophilic: ["geophilic", "geo philic"],
};

/**
 * Mapeamento específico para CurseForge
 */
export const CURSEFORGE_NAME_MAPPING: Record<string, string> = {
  "philips-ruins": "ruins",
  geophilic: "geophilic",
};
