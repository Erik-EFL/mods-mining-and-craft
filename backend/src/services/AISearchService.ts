import axios, { AxiosInstance } from 'axios';
import { CurseForgeAPI } from '../apis/CurseForgeAPI';
import { ModrinthAPI } from '../apis/ModrinthAPI';
import { SearchLearningService } from './SearchLearningService';
import { ModSearchResult } from './SearchService';

/**
 * @description Serviço de busca com IA usando Claude API
 * Melhora significativamente a precisão na busca de mods
 * Aprende com falhas anteriores
 */
export class AISearchService {
  private client: AxiosInstance;
  private apiKey: string;
  private learningService: SearchLearningService;

  constructor(
    private modrinthAPI: ModrinthAPI,
    private curseforgeAPI: CurseForgeAPI,
    private minecraftVersion: string,
    private modLoader: string
  ) {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';

    if (!this.apiKey) {
      console.warn('ANTHROPIC_API_KEY não definida. Busca com IA desabilitada.');
    }

    this.client = axios.create({
      baseURL: 'https://api.anthropic.com/v1',
      timeout: 20000,
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    });

    this.learningService = new SearchLearningService(minecraftVersion, modLoader);
  }

  /**
   * Gera sugestões de nomes usando IA
   */
  async generateNameSuggestions(filename: string): Promise<string[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      const prompt = `Analisando o arquivo de mod Minecraft: "${filename}"

      Por favor, forneça uma lista de nomes de busca possíveis (slugs) para encontrar este mod nas plataformas Modrinth e CurseForge.

      Considere:
      1. O nome base do mod (sem versão)
      2. Variações com hífens vs espaços
      3. Nomes alternados em inglês
      4. Abreviações comuns
      5. Nomes compostos possíveis

      Responda APENAS com uma lista JSON de strings, exemplo: ["mod-name", "mod name", "modname", "mod"]

      Arquivo: ${filename}`;

      const response = await this.client.post('/messages', {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      if (response.data?.content?.[0]?.text) {
        const text = response.data.content[0].text;

        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      return [];
    } catch (error) {
      console.error('Erro ao chamar Claude API:', error);
      return [];
    }
  }

  /**
   * Analisa o resultado da busca com IA para validar se é correto
   */
  async validateSearchResult(
    filename: string,
    searchResult: ModSearchResult
  ): Promise<{ isValid: boolean; confidence: number; reason?: string }> {
    if (!this.apiKey || !searchResult.found) {
      return { isValid: searchResult.found, confidence: 0.5 };
    }

    try {
      const prompt = `Você é um especialista em mods Minecraft. Analise se o resultado da busca está correto.

      Arquivo original: "${filename}"
      Mod encontrado: "${searchResult.title}"
      Descrição: "${searchResult.description?.substring(0, 200) || 'N/A'}"
      Plataforma: ${searchResult.source}

      Responda em JSON com:
      {
        "isValid": boolean,
        "confidence": número de 0 a 1,
        "reason": "explicação breve"
      }

      Considere se o nome do mod encontrado corresponde razoavelmente bem ao arquivo.`;

      const response = await this.client.post('/messages', {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      if (response.data?.content?.[0]?.text) {
        const text = response.data.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      return { isValid: searchResult.found, confidence: 0.7 };
    } catch (error) {
      console.error('Erro ao validar resultado com Claude:', error);
      return { isValid: searchResult.found, confidence: 0.5 };
    }
  }

  /**
   * Busca inteligente com fallback para IA + aprendizado
   */
  async intelligentSearch(filename: string, normalizedName: string): Promise<ModSearchResult> {
    console.log(`Iniciando busca inteligente para: ${filename}`);

    const conventionalResult = await this.tryConventionalSearch(normalizedName);
    if (conventionalResult.found) {
      console.log(`Encontrado via busca convencional: ${conventionalResult.title}`);
      this.learningService.registerSuccess(
        filename,
        normalizedName,
        conventionalResult.title || '',
        conventionalResult.slug || '',
        1
      );
      return conventionalResult;
    }

    console.log('Busca convencional falhou. Usando IA para sugestões...');

    const learnedSuggestions = this.learningService.getLearnedSuggestions(normalizedName);
    if (learnedSuggestions.length > 0) {
      console.log(`Encontradas ${learnedSuggestions.length} sugestões aprendidas anteriormente`);
      const result = await this.tryMultipleSuggestions(learnedSuggestions);
      if (result.found) {
        console.log(`Encontrado via sugestões aprendidas: ${result.title}`);
        return result;
      }
    }

    const newSuggestions = await this.generateNameSuggestions(filename);
    if (newSuggestions.length === 0) {
      console.log('IA não conseguiu gerar sugestões. Tentando aprendizado de falha...');

      await this.learningService.learnFromFailure(filename, normalizedName, learnedSuggestions);
      return { found: false };
    }

    console.log(`Novas sugestões da IA: ${newSuggestions.join(', ')}`);

    const allSuggestions = this.learningService.prioritizeSuggestions(
      normalizedName,
      newSuggestions
    );

    for (const suggestion of allSuggestions) {
      try {
        const modrinthResult = await this.modrinthAPI.searchMods(
          suggestion,
          this.minecraftVersion,
          this.modLoader
        );

        if (modrinthResult.length > 0) {
          const result: ModSearchResult = {
            found: true,
            source: 'modrinth',
            projectId: modrinthResult[0].project_id,
            slug: modrinthResult[0].slug,
            title: modrinthResult[0].title,
            description: modrinthResult[0].description,
          };

          console.log(`Encontrado no Modrinth via IA: ${result.title}`);
          this.learningService.registerSuccess(
            filename,
            normalizedName,
            result.title || '',
            result.slug || '',
            allSuggestions.indexOf(suggestion) + 1
          );
          return result;
        }

        const curseforgeResult = await this.curseforgeAPI.searchMods(
          suggestion,
          this.minecraftVersion,
          this.modLoader
        );

        if (curseforgeResult.length > 0) {
          const result: ModSearchResult = {
            found: true,
            source: 'curseforge',
            projectId: curseforgeResult[0].id,
            slug: curseforgeResult[0].slug,
            title: curseforgeResult[0].name,
            description: curseforgeResult[0].summary,
          };

          console.log(`Encontrado no CurseForge via IA: ${result.title}`);
          this.learningService.registerSuccess(
            filename,
            normalizedName,
            result.title || '',
            result.slug || '',
            allSuggestions.indexOf(suggestion) + 1
          );
          return result;
        }
      } catch (error) {
        continue;
      }
    }

    console.log('Nenhuma sugestão funcionou. Registrando aprendizado de falha...');
    await this.learningService.learnFromFailure(filename, normalizedName, allSuggestions);
    return { found: false };
  }

  /**
   * Tenta múltiplas sugestões sequencialmente
   */
  private async tryMultipleSuggestions(suggestions: string[]): Promise<ModSearchResult> {
    for (const suggestion of suggestions) {
      try {
        const modrinthResult = await this.modrinthAPI.searchMods(
          suggestion,
          this.minecraftVersion,
          this.modLoader
        );

        if (modrinthResult.length > 0) {
          return {
            found: true,
            source: 'modrinth',
            projectId: modrinthResult[0].project_id,
            slug: modrinthResult[0].slug,
            title: modrinthResult[0].title,
            description: modrinthResult[0].description,
          };
        }

        const curseforgeResult = await this.curseforgeAPI.searchMods(
          suggestion,
          this.minecraftVersion,
          this.modLoader
        );

        if (curseforgeResult.length > 0) {
          return {
            found: true,
            source: 'curseforge',
            projectId: curseforgeResult[0].id,
            slug: curseforgeResult[0].slug,
            title: curseforgeResult[0].name,
            description: curseforgeResult[0].summary,
          };
        }
      } catch (error) {
        continue;
      }
    }

    return { found: false };
  }

  /**
   * Tenta busca convencional (rápida, sem IA)
   */
  private async tryConventionalSearch(normalizedName: string): Promise<ModSearchResult> {
    try {
      const modrinthResults = await this.modrinthAPI.searchMods(
        normalizedName,
        this.minecraftVersion,
        this.modLoader
      );

      if (modrinthResults.length > 0) {
        return {
          found: true,
          source: 'modrinth',
          projectId: modrinthResults[0].project_id,
          slug: modrinthResults[0].slug,
          title: modrinthResults[0].title,
          description: modrinthResults[0].description,
        };
      }

      const curseforgeResults = await this.curseforgeAPI.searchMods(
        normalizedName,
        this.minecraftVersion,
        this.modLoader
      );

      if (curseforgeResults.length > 0) {
        return {
          found: true,
          source: 'curseforge',
          projectId: curseforgeResults[0].id,
          slug: curseforgeResults[0].slug,
          title: curseforgeResults[0].name,
          description: curseforgeResults[0].summary,
        };
      }

      return { found: false };
    } catch (error) {
      return { found: false };
    }
  }

  /**
   * Extrai informações do mod do arquivo usando IA
   */
  async extractModInfo(
    filename: string
  ): Promise<{ name: string; version: string; loader?: string }> {
    if (!this.apiKey) {
      return { name: filename, version: '' };
    }

    try {
      const prompt = `Analise o nome deste arquivo de mod Minecraft e extraia as informações:

      Arquivo: "${filename}"

      Responda em JSON com:
      {
        "name": "nome do mod",
        "version": "versão do mod",
        "loader": "fabric|forge|neoforge|quilt"
      }

      Seja preciso!`;

      const response = await this.client.post('/messages', {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      if (response.data?.content?.[0]?.text) {
        const text = response.data.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      return { name: filename, version: '' };
    } catch (error) {
      console.error('❌ Erro ao extrair informações com IA:', error);
      return { name: filename, version: '' };
    }
  }

  /**
   * Registra sucesso/falha para aprendizado futuro
   */
  logSearchResult(filename: string, result: ModSearchResult, success: boolean): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      filename,
      found: result.found,
      source: result.source,
      title: result.title,
      success,
    };

    console.log(`LOG: ${JSON.stringify(logEntry)}`);
  }
}
