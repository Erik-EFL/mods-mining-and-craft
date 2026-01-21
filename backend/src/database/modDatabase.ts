import type { ModDetails } from '../types/mod.types';

/**
 * Banco de dados local com informações detalhadas dos mods
 * Melhora significativamente a precisão dos downloads
 */
export const MOD_DETAILS_DB: Record<string, ModDetails> = {
  geophilic: {
    modrinth: {
      projectId: 'hl5OLM95',
      slug: 'geophilic',
      name: 'Geophilic',
      category: 'datapack',
      description: 'Um datapack que adiciona blocos geológicos únicos',
    },
    curseforge: {
      projectId: 711216,
      slug: 'geophilic',
      name: 'Geophilic',
      description: 'Adiciona minerais e formações geológicas',
    },
  },
  'philips-ruins': {
    modrinth: {
      projectId: 'KdJhOYVV',
      slug: 'philips-ruins',
      name: 'Philips Ruins',
      category: 'mod',
      description: 'Adiciona ruínas antigas ao mundo do Minecraft',
    },
    curseforge: {
      projectId: 356090,
      slug: 'ruins',
      name: 'Ruins',
      description: 'Estruturas de ruínas para Minecraft',
    },
  },
  'better-block-entities': {
    modrinth: {
      projectId: '',
      slug: 'better-block-entities',
      name: 'Better Block Entities',
      category: 'mod',
      description: 'Melhora visualmente as entidades de bloco',
    },
    curseforge: {
      projectId: 0,
      slug: 'better-block-entities',
      name: 'Better Block Entities',
      description: 'Melhora visualmente as entidades de bloco',
    },
  },
};

/**
 * Mapeamento de nomes especiais (quando o nome do arquivo não corresponde ao slug)
 */
export const MOD_NAME_MAPPING: Record<string, string> = {
  bbe: 'better-block-entities',
  bingoreloadedcompanion: 'bingo-reloaded-companion',
  forgeconfigapiport: 'forge-config-api-port',
  geophilic: 'geophilic',
  philipsruins: 'philips-ruins',
  supermartijn642configlib: 'supermartijn642s-config-lib',
  supermartijn642corelib: 'supermartijn642s-core-lib',
  medievalbuildings: 'medieval-buildings',
  medievalbuildingsendendition: 'medieval-buildings-end-edition',
  medievalbuildingsnetherendition: 'medieval-buildings-nether-edition',
  fabriclanguagekotlin: 'fabric-language-kotlin',
  fabriclanguage: 'fabric-language-kotlin',
  irisfabric: 'iris',
  irisshaders: 'iris',
  continuity: 'continuity',
  easyanvils: 'easy-anvils',
  easymagic: 'easymagic',
  fancytoasts: 'fancytoasts',
  jei: 'jei',
  optigui: 'optigui',
  xaerominimap: 'xaeros-minimap',
  inventorymanagement: 'inventory-management',
  inventory: 'inventory-management',
  lambdynamiclights: 'lambdynamiclights',
  lambda: 'lambdynamiclights',
  skinshuffle: 'skin-shuffle',
  skin: 'skin-shuffle',
  modernfix: 'modern-fix',
  pandatemple: 'panda-temple',
  pandatemple21: 'panda-temple',
  pandatemplev1: 'panda-temple',
  philipsRuins: 'philips-ruins',
  philipsruins12111: 'philips-ruins',
  terralith: 'terralith',
  terralithv: 'terralith',
  terralithv2: 'terralith',
};

/**
 * Mapeamento de IDs diretos para mods problemáticos
 */
export const DIRECT_PROJECT_MAPPING: Record<string, { modrinth: string; curseforge: number }> = {
  geophilic: {
    modrinth: 'hl5OLM95',
    curseforge: 711216,
  },
  'philips-ruins': {
    modrinth: 'KdJhOYVV',
    curseforge: 356090,
  },
  inventorymanagement: {
    modrinth: 'F7wXag4i',
    curseforge: 0,
  },
  lambdynamiclights: {
    modrinth: 'yBW8D80W',
    curseforge: 393442,
  },
  skinshuffle: {
    modrinth: '3s19I5jr',
    curseforge: 676064,
  },
  modernfix: {
    modrinth: 'nmDcB62a',
    curseforge: 790626,
  },
  terralith: {
    modrinth: '8oi3bsk5',
    curseforge: 513688,
  },
  philipsruins: {
    modrinth: 'KdJhOYVV',
    curseforge: 356090,
  },
  pandatemple: {
    modrinth: 'z0qJSbtP',
    curseforge: 0,
  },
  easyanvils: {
    modrinth: 'OZBR5JT5',
    curseforge: 546930,
  },
  easymagic: {
    modrinth: '9hx3AbJM',
    curseforge: 648455,
  },
  visualworkbench: {
    modrinth: 'kfqD1JRw',
    curseforge: 648455,
  },
};

/**
 * Variações de nomes para busca
 */
export const NAME_VARIATIONS: Record<string, string[]> = {
  'philips-ruins': ['philips ruins', 'philipsruins', 'ruins', "philip's ruins"],
  geophilic: ['geophilic', 'geo philic'],
  'fabric-language-kotlin': ['fabric language kotlin', 'fabric-kotlin', 'kotlin-fabric'],
  iris: ['iris', 'iris shaders', 'iris-shaders', 'iris-fabric'],
  'medieval-buildings-nether-edition': [
    'medieval buildings nether edition',
    'medieval-buildings-nether-edition',
    'medieval buildings [nether edition]',
  ],
  'medieval-buildings-end-edition': [
    'medieval buildings end edition',
    'medieval-buildings-end-edition',
    'medieval buildings [end edition]',
  ],
  'easy-anvils': ['easy anvils', 'easyanvils'],
  easymagic: ['easy magic', 'easymagic'],
  'xaeros-minimap': ['xaeros minimap', 'xaero minimap', 'xaerominimap'],
  'inventory-management': ['inventory management', 'inventorymanagement', 'inventory_management'],
  lambdynamiclights: [
    'lambda dynamic lights',
    'lambdadynamiclights',
    'lambda-dynamic-lights',
    'lambdynamiclights - dynamic lights',
  ],
  'skin-shuffle': ['skin shuffle', 'skinshuffle', 'skin-shuffle'],
  'modern-fix': ['modern fix', 'modernfix'],
  'panda-temple': ['panda temple', 'pandatemple'],
  'better-block-entities': ['better block entities', 'bbe'],
};

/**
 * Mapeamento específico para CurseForge
 */
export const CURSEFORGE_NAME_MAPPING: Record<string, string> = {
  'philips-ruins': 'ruins',
  geophilic: 'geophilic',
};
