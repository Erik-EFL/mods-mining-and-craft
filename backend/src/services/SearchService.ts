import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { CurseForgeAPI } from '../apis/CurseForgeAPI';
import { ModrinthAPI } from '../apis/ModrinthAPI';
import {
  CURSEFORGE_NAME_MAPPING,
  DIRECT_PROJECT_MAPPING,
  MOD_DETAILS_DB,
  MOD_NAME_MAPPING,
  NAME_VARIATIONS,
} from '../database/modDatabase';
import { AISearchService } from './AISearchService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ModSearchResult {
  found: boolean;
  source?: 'modrinth' | 'curseforge';
  projectId?: string | number;
  slug?: string;
  title?: string;
  description?: string;
}

/**
 * Serviço de busca de mods nas duas plataformas
 */
export class SearchService {
  private aiSearchService: AISearchService;
  private learnedPatterns: Map<string, string[]> = new Map();

  constructor(
    private modrinthAPI: ModrinthAPI,
    private curseforgeAPI: CurseForgeAPI,
    private minecraftVersion: string,
    private modLoader: string
  ) {
    this.aiSearchService = new AISearchService(
      modrinthAPI,
      curseforgeAPI,
      minecraftVersion,
      modLoader
    );

    this.loadLearnedPatterns();
  }

  /**
   * Carrega padrões aprendidos do arquivo search-learning.json
   */
  private loadLearnedPatterns(): void {
    try {
      const possiblePaths = [
        path.join(process.cwd(), 'backend', 'search-learning.json'),
        path.join(process.cwd(), 'search-learning.json'),
        path.join(__dirname, '..', '..', 'search-learning.json'),
      ];

      let learningFile = '';
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          learningFile = possiblePath;
          break;
        }
      }

      if (learningFile && fs.existsSync(learningFile)) {
        const data = fs.readFileSync(learningFile, 'utf-8');
        const patterns = JSON.parse(data);
        this.learnedPatterns = new Map(Object.entries(patterns));
        console.log(
          `Carregados ${this.learnedPatterns.size} padrões aprendidos de: ${learningFile}`
        );
      } else {
        console.log('Arquivo search-learning.json não encontrado. Execute: node smart-train.js');
      }
    } catch (error) {
      console.warn('Erro ao carregar padrões aprendidos:', error);
    }
  }

  /**
   * Obtém sugestões aprendidas para um mod
   */
  private getLearnedSuggestions(modName: string): string[] {
    return this.learnedPatterns.get(modName) || [];
  }

  /**
   * Busca informações do banco de dados local
   */
  private getModDetailsFromDB(modName: string) {
    return MOD_DETAILS_DB[modName] || null;
  }

  /**
   * Gera variações do nome do mod para busca
   */
  private generateNameVariations(modName: string): string[] {
    const variations: string[] = [modName];

    const withHyphens = modName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    if (withHyphens !== modName) variations.push(withHyphens);

    const withSpaces = modName.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    if (withSpaces !== modName) variations.push(withSpaces);

    const commonWords = [
      'sodium',
      'iris',
      'fabric',
      'forge',
      'neo',
      'api',
      'lib',
      'core',
      'entity',
      'model',
      'features',
      'dynamic',
      'better',
      'improved',
      'enhanced',
      'path',
      'blocks',
      'shadowy',
      'ambient',
      'sounds',
      'biomes',
      'plenty',
      'config',
      'port',
      'creative',
      'apple',
      'skin',
      'grass',
      'cloth',
      'architecture',
      'mod',
      'menu',
      'screen',
      'fps',
      'boost',
      'performance',
    ];

    let remaining = modName.toLowerCase();
    const foundWords: string[] = [];

    while (remaining.length > 0) {
      let matched = false;
      for (const word of commonWords) {
        if (remaining.startsWith(word)) {
          foundWords.push(word);
          remaining = remaining.slice(word.length);
          matched = true;
          break;
        }
      }
      if (!matched) {
        if (foundWords.length > 0) {
          foundWords[foundWords.length - 1] += remaining[0];
        } else {
          foundWords.push(remaining[0]);
        }
        remaining = remaining.slice(1);
      }
    }

    if (foundWords.length > 1) {
      variations.push(foundWords.join('-'));
      variations.push(foundWords.join(' '));
    }

    const withoutLoader = modName.replace(/(fabric|forge|neoforge|quilt)$/i, '').trim();
    if (withoutLoader && withoutLoader !== modName) {
      variations.push(withoutLoader);
      variations.push(withoutLoader.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase());
    }

    return [...new Set(variations)];
  }

  /**
   * Busca mod no Modrinth com fallbacks
   */
  async searchOnModrinth(modName: string): Promise<ModSearchResult> {
    const dbDetails = this.getModDetailsFromDB(modName);
    if (dbDetails?.modrinth?.projectId) {
      try {
        const project = await this.modrinthAPI.getProjectById(dbDetails.modrinth.projectId);
        return {
          found: true,
          source: 'modrinth',
          projectId: project.id,
          slug: project.slug,
          title: project.title,
          description: project.description,
        };
      } catch (error) {
        console.error(`Erro ao buscar no banco de dados Modrinth: ${error}`);
      }
    }

    if (DIRECT_PROJECT_MAPPING[modName]?.modrinth) {
      try {
        const projectId = DIRECT_PROJECT_MAPPING[modName].modrinth;
        const project = await this.modrinthAPI.getProjectById(projectId);
        return {
          found: true,
          source: 'modrinth',
          projectId: project.id,
          slug: project.slug,
          title: project.title,
          description: project.description,
        };
      } catch (error) {
        console.error(`Erro ao buscar por ID direto no Modrinth: ${error}`);
      }
    }

    const namesToTry = [modName];
    if (NAME_VARIATIONS[modName]) {
      namesToTry.push(...NAME_VARIATIONS[modName]);
    }

    const autoVariations = this.generateNameVariations(modName);
    namesToTry.push(...autoVariations);

    for (const nameVariation of namesToTry) {
      try {
        const results = await this.modrinthAPI.searchMods(
          nameVariation,
          this.minecraftVersion,
          this.modLoader
        );

        if (results.length > 0) {
          const mod = results[0];
          return {
            found: true,
            source: 'modrinth',
            projectId: mod.project_id,
            slug: mod.slug,
            title: mod.title,
            description: mod.description,
          };
        }
      } catch (error) {
        // Silenciar erro individual, continuar tentando
      }
    }

    return { found: false };
  }

  /**
   * Busca mod no CurseForge com fallbacks
   */
  async searchOnCurseForge(modName: string): Promise<ModSearchResult> {
    const dbDetails = this.getModDetailsFromDB(modName);
    if (dbDetails?.curseforge?.projectId) {
      try {
        const project = await this.curseforgeAPI.getProjectById(dbDetails.curseforge.projectId);
        return {
          found: true,
          source: 'curseforge',
          projectId: project.id,
          slug: project.slug,
          title: project.name,
          description: project.summary,
        };
      } catch (error) {
        console.error(`Erro ao buscar no banco de dados CurseForge: ${error}`);
      }
    }

    if (DIRECT_PROJECT_MAPPING[modName]?.curseforge) {
      try {
        const projectId = DIRECT_PROJECT_MAPPING[modName].curseforge;
        const project = await this.curseforgeAPI.getProjectById(projectId);
        return {
          found: true,
          source: 'curseforge',
          projectId: project.id,
          slug: project.slug,
          title: project.name,
          description: project.summary,
        };
      } catch (error) {
        console.error(`Erro ao buscar por ID direto no CurseForge: ${error}`);
      }
    }

    const curseForgeModName = CURSEFORGE_NAME_MAPPING[modName] || modName;
    const namesToTry = [curseForgeModName];

    if (NAME_VARIATIONS[modName]) {
      namesToTry.push(...NAME_VARIATIONS[modName]);
    }

    const autoVariations = this.generateNameVariations(modName);
    namesToTry.push(...autoVariations);

    for (const nameVariation of namesToTry) {
      try {
        const results = await this.curseforgeAPI.searchMods(
          nameVariation,
          this.minecraftVersion,
          this.modLoader
        );

        if (results.length > 0) {
          const mod = results[0];
          return {
            found: true,
            source: 'curseforge',
            projectId: mod.id,
            slug: mod.slug,
            title: mod.name,
            description: mod.summary,
          };
        }
      } catch (error) {
        // Silenciar erro individual, continuar tentando
      }
    }

    return { found: false };
  }

  /**
   * Busca mod em ambas as plataformas com fallback para IA
   */
  async searchMod(modName: string, filename?: string): Promise<ModSearchResult> {
    console.log(`Buscando mod: ${modName}`);

    const learnedSuggestions = this.getLearnedSuggestions(modName);
    if (learnedSuggestions.length > 0) {
      console.log(`Encontradas ${learnedSuggestions.length} sugestões aprendidas`);

      for (const suggestion of learnedSuggestions) {
        try {
          const results = await this.modrinthAPI.searchMods(
            suggestion,
            this.minecraftVersion,
            this.modLoader
          );

          if (results.length > 0) {
            const mod = results[0];
            console.log(`Encontrado no Modrinth via sugestão aprendida: ${mod.title}`);
            return {
              found: true,
              source: 'modrinth',
              projectId: mod.project_id,
              slug: mod.slug,
              title: mod.title,
              description: mod.description,
            };
          }
        } catch (error) {
          continue;
        }

        try {
          const results = await this.curseforgeAPI.searchMods(
            suggestion,
            this.minecraftVersion,
            this.modLoader
          );

          if (results.length > 0) {
            const mod = results[0];
            console.log(`Encontrado no CurseForge via sugestão aprendida: ${mod.name}`);
            return {
              found: true,
              source: 'curseforge',
              projectId: mod.id,
              slug: mod.slug,
              title: mod.name,
              description: mod.summary,
            };
          }
        } catch (error) {
          continue;
        }
      }
    }

    const variations = this.generateNameVariations(modName);
    console.log(`Variações: ${variations.join(', ')}`);

    const modrinthResult = await this.searchOnModrinth(modName);
    if (modrinthResult.found) {
      console.log(`Encontrado no Modrinth: ${modrinthResult.title}`);
      return modrinthResult;
    }

    console.log(`Não encontrado no Modrinth, tentando CurseForge...`);

    const curseforgeResult = await this.searchOnCurseForge(modName);
    if (curseforgeResult.found) {
      console.log(`Encontrado no CurseForge: ${curseforgeResult.title}`);
      return curseforgeResult;
    }

    // TERCEIRO: Fallback para IA se buscas convencionais falharem
    if (filename) {
      console.log(`Buscas convencionais falharam. Usando IA como fallback...`);
      try {
        const aiResult = await this.aiSearchService.intelligentSearch(filename, modName);
        if (aiResult.found) {
          console.log(`Encontrado via IA: ${aiResult.title}`);
          return aiResult;
        }
      } catch (error) {
        console.error(`Erro na busca com IA: ${error}`);
      }
    }

    console.log(`Mod não encontrado: ${modName}`);
    return curseforgeResult;
  }

  /**
   * Normaliza nome do mod para busca
   */
  normalizeName(filename: string): string {
    let name = filename.replace(/\.jar$/i, '');

    // 1. Remove padrão -v/-mc/-fabric/etc seguido de versão
    //    Ex: -v21.11.0-mc1.21.11-Fabric → vira só o nome base
    name = name.replace(/[-_](v|mc|fabric|forge|neoforge)[\d\.\w\-\+]*/gi, '');

    // 2. Remove -build, -alpha, -beta, -kotlin
    //    Ex: -5.25.2-build.4 → -5.25.2
    name = name.replace(/[-_](build|alpha|beta|kotlin)[\d\.\w\-\+]*/gi, '');

    // 3. Remove versão no final se começar com v/x seguido de números
    //    Ex: -v2.5.14 → vira vazio; _v2.5.14 → vira vazio
    name = name.replace(/[-_]?[vx]\d+[\.\d\w\-\+]*$/gi, '');

    // 4. Remove versões numéricas (padrão X.Y.Z ou X.Y)
    //    Mas preserva nomes que têm números no meio (tipo Ruins)
    name = name.replace(/\d+[\.\d\w\-\+]*(?=[-_]|$)/g, (match) => {
      // Se é versão com ponto (1.21, 5.25.2), remove
      if (/^\d+\.\d+/.test(match)) {
        return '';
      }
      return match;
    });

    // 5. Remover caracteres especiais, deixando apenas letras
    //    Isso converte: panda-temple → pandatemple
    let modName = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 6. Fallback se ficar vazio
    if (!modName || modName.length < 2) {
      modName = filename
        .replace(/\.jar$/i, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    }

    // 7. Aplicar mapeamento de nomes conhecidos
    if (MOD_NAME_MAPPING[modName]) {
      modName = MOD_NAME_MAPPING[modName];
    }

    return modName;
  }
}
