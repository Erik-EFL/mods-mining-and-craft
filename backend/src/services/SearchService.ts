import { CurseForgeAPI } from "../apis/CurseForgeAPI";
import { ModrinthAPI } from "../apis/ModrinthAPI";
import {
  CURSEFORGE_NAME_MAPPING,
  DIRECT_PROJECT_MAPPING,
  MOD_DETAILS_DB,
  MOD_NAME_MAPPING,
  NAME_VARIATIONS,
} from "../database/modDatabase";

export interface ModSearchResult {
  found: boolean;
  source?: "modrinth" | "curseforge";
  projectId?: string | number;
  slug?: string;
  title?: string;
  description?: string;
}

/**
 * Serviço de busca de mods nas duas plataformas
 */
export class SearchService {
  constructor(
    private modrinthAPI: ModrinthAPI,
    private curseforgeAPI: CurseForgeAPI,
    private minecraftVersion: string,
    private modLoader: string
  ) {}

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

    const withHyphens = modName
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .toLowerCase();
    if (withHyphens !== modName) variations.push(withHyphens);

    const withSpaces = modName
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .toLowerCase();
    if (withSpaces !== modName) variations.push(withSpaces);

    // Detectar palavras conhecidas comuns em nomes de mods
    const commonWords = [
      "sodium",
      "iris",
      "fabric",
      "forge",
      "neo",
      "api",
      "lib",
      "core",
      "entity",
      "model",
      "features",
      "dynamic",
      "better",
      "improved",
      "enhanced",
      "path",
      "blocks",
      "shadowy",
      "ambient",
      "sounds",
      "biomes",
      "plenty",
      "config",
      "port",
      "creative",
      "apple",
      "skin",
      "grass",
      "cloth",
      "architecture",
      "mod",
      "menu",
      "screen",
      "fps",
      "boost",
      "performance",
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
      variations.push(foundWords.join("-"));
      variations.push(foundWords.join(" "));
    }

    // (fabric, forge, neoforge, quilt)
    const withoutLoader = modName
      .replace(/(fabric|forge|neoforge|quilt)$/i, "")
      .trim();
    if (withoutLoader && withoutLoader !== modName) {
      variations.push(withoutLoader);
      variations.push(
        withoutLoader.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
      );
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
        const project = await this.modrinthAPI.getProjectById(
          dbDetails.modrinth.projectId
        );
        return {
          found: true,
          source: "modrinth",
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
          source: "modrinth",
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
            source: "modrinth",
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
    // Primeiro verificar banco de dados
    const dbDetails = this.getModDetailsFromDB(modName);
    if (dbDetails?.curseforge?.projectId) {
      try {
        const project = await this.curseforgeAPI.getProjectById(
          dbDetails.curseforge.projectId
        );
        return {
          found: true,
          source: "curseforge",
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
          source: "curseforge",
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
            source: "curseforge",
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
   * Busca mod em ambas as plataformas
   */
  async searchMod(modName: string): Promise<ModSearchResult> {
    console.log(`🔍 Buscando mod: ${modName}`);

    const variations = this.generateNameVariations(modName);
    console.log(`Variações: ${variations.join(", ")}`);

    const modrinthResult = await this.searchOnModrinth(modName);
    if (modrinthResult.found) {
      console.log(`✅ Encontrado no Modrinth: ${modrinthResult.title}`);
      return modrinthResult;
    }

    console.log(`⚠️ Não encontrado no Modrinth, tentando CurseForge...`);

    const curseforgeResult = await this.searchOnCurseForge(modName);
    if (curseforgeResult.found) {
      console.log(`✅ Encontrado no CurseForge: ${curseforgeResult.title}`);
      return curseforgeResult;
    }

    console.log(`❌ Mod não encontrado: ${modName}`);
    return curseforgeResult;
  }

  /**
   * Normaliza nome do mod para busca
   */
  normalizeName(filename: string): string {
    let name = filename.replace(".jar", "");

    // Remover versões comuns (v1.2.3, 1.2.3, mc1.21.1, etc)
    name = name.replace(/[-_]?v?\d+\.\d+\.?\d*[\w\.\-]*/gi, "");

    // Remover loaders (fabric, forge, neoforge, quilt)
    name = name.replace(/[-_]?(fabric|forge|neoforge|quilt|neo)[-_]?/gi, "");

    // Remover versão do minecraft
    name = name.replace(/[-_]?mc[-_]?\d+\.?\d*\.?\d*/gi, "");
    name = name.replace(/[-_]?minecraft[-_]?\d+\.?\d*\.?\d*/gi, "");

    // Remover palavras comuns de sufixo
    name = name.replace(/[-_]?(mod|api|lib|core)$/gi, "");

    // Remover caracteres especiais e limpar
    let modName = name.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Se ficou vazio, usar nome original
    if (!modName || modName.length < 3) {
      modName = filename
        .replace(".jar", "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    }

    if (MOD_NAME_MAPPING[modName]) {
      modName = MOD_NAME_MAPPING[modName];
    }

    return modName;
  }
}
