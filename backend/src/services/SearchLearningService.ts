import axios, { AxiosInstance } from 'axios';
import { DatabaseService } from './DatabaseService';

/**
 * Serviço de aprendizado e otimização de busca
 * Registra tentativas falhadas e aprende padrões
 */
export class SearchLearningService {
  private client: AxiosInstance;
  private apiKey: string;
  private learnedPatterns: Map<string, string[]> = new Map();

  constructor(private minecraftVersion: string, private modLoader: string) {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';

    this.client = axios.create({
      baseURL: 'https://api.anthropic.com/v1',
      timeout: 20000,
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    });

    this.loadLearnedPatterns();
  }

  /**
   * Carrega padrões aprendidos do MongoDB
   */
  private async loadLearnedPatterns(): Promise<void> {
    try {
      const patterns = await DatabaseService.getAllSearchPatterns();
      this.learnedPatterns = new Map(patterns.map((p: any) => [p.modName, p.variations]));
      console.log(`Carregados ${this.learnedPatterns.size} padrões aprendidos do MongoDB`);
    } catch (error) {
      console.warn('Erro ao carregar padrões aprendidos:', error);
    }
  }

  /**
   * Salva padrões aprendidos no MongoDB
   */
  private async saveLearnedPatterns(): Promise<void> {
    try {
      const data = Object.fromEntries(this.learnedPatterns);
      await DatabaseService.updateSearchPatterns(data);
      console.log('Padrões aprendidos salvos no MongoDB');
    } catch (error) {
      console.error('Erro ao salvar padrões:', error);
    }
  }

  /**
   * Registra uma tentativa falhada e aprende com ela
   */
  async learnFromFailure(
    filename: string,
    normalizedName: string,
    failedAttempts: string[] = []
  ): Promise<void> {
    console.log(`\nAPRENDENDO COM FALHA: ${filename}`);
    console.log(`   Nome normalizado: ${normalizedName}`);
    console.log(`   Tentativas falhadas: ${failedAttempts.join(', ') || 'nenhuma'}`);

    try {
      const suggestions = await this.generateImprovedSuggestions(
        filename,
        normalizedName,
        failedAttempts
      );

      if (suggestions.length > 0) {
        this.learnedPatterns.set(normalizedName, suggestions);
        this.saveLearnedPatterns();

        console.log(`NOVAS SUGESTÕES APRENDIDAS:`);
        suggestions.forEach((s, i) => {
          console.log(`   ${i + 1}. ${s}`);
        });
      }
    } catch (error) {
      console.error('Erro ao aprender do fracasso:', error);
    }
  }

  /**
   * Gera sugestões melhoradas analisando falhas anteriores
   */
  private async generateImprovedSuggestions(
    filename: string,
    normalizedName: string,
    failedAttempts: string[]
  ): Promise<string[]> {
    if (!this.apiKey) {
      return [];
    }

    const failedInfo =
      failedAttempts.length > 0
        ? `\n\nTentativas que FALHARAM: ${failedAttempts.join(', ')}\nPor favor, não repita essas!`
        : '';

    const prompt = `VOCÊ É UM ESPECIALISTA EM MODS MINECRAFT - AJUDE A ENCONTRAR ESTE MOD!

Arquivo: "${filename}"
Nome normalizado: "${normalizedName}"
Versão Minecraft: ${this.minecraftVersion}
Loader: ${this.modLoader}

${failedInfo}

IMPORTANTE: Este mod EXISTE em Modrinth ou CurseForge, apenas o nome de busca está errado!

Forneça uma lista JSON com 8-12 possíveis slugs para encontrar este mod:

Considere:
1. Separação de palavras compostas (underscores → hífens → espaços)
2. Nomes em português vs inglês
3. Abreviações comuns
4. Variações de capitalização
5. Nomes alternativos conhecidos
6. Plurais vs singulares
7. Ordem de palavras alternativa
8. Nomes que parecem incorretos mas funcionam
9. Siglas ou acrônimos

Responda APENAS com JSON array:
["sugestao1", "sugestao2", "sugestao3", ...]

Seja CRIATIVO e EXPERIMENTE variações DIFERENTES das tentativas falhadas!`;

    try {
      const message = await this.client.post('/messages', {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      if (message.data?.content?.[0]?.text) {
        const text = message.data.content[0].text;
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const suggestions = JSON.parse(jsonMatch[0]);
          return Array.isArray(suggestions) ? suggestions : [];
        }
      }

      return [];
    } catch (error) {
      console.error('Erro ao gerar sugestões melhoradas:', error);
      return [];
    }
  }

  /**
   * Obtém sugestões aprendidas para um mod
   */
  getLearnedSuggestions(normalizedName: string): string[] {
    return this.learnedPatterns.get(normalizedName) || [];
  }

  /**
   * Registra um sucesso (quando encontrado)
   */
  registerSuccess(
    filename: string,
    normalizedName: string,
    foundName: string,
    foundSlug: string,
    attemptNumber: number
  ): void {
    console.log(`\nSUCESSO REGISTRADO:`);
    console.log(`   Arquivo: ${filename}`);
    console.log(`   Nome encontrado: ${foundName}`);
    console.log(`   Slug: ${foundSlug}`);
    console.log(`   Tentativa número: ${attemptNumber}`);
  }

  /**
   * Analisa padrões de falha
   */
  analyzeFailurePatterns(): Map<string, number> {
    const patterns = new Map<string, number>();

    for (const [key, suggestions] of this.learnedPatterns.entries()) {
      patterns.set(key, suggestions.length);
    }

    return patterns;
  }

  /**
   * Gera relatório de aprendizado
   */
  generateLearningReport(): string {
    const patterns = this.analyzeFailurePatterns();
    let report = '\nRELATÓRIO DE APRENDIZADO\n';
    report += '═'.repeat(50) + '\n';
    report += `Total de padrões aprendidos: ${patterns.size}\n`;
    report += '\nMods com sugestões aprendidas:\n';

    patterns.forEach((count, modName) => {
      report += `  • ${modName}: ${count} sugestões\n`;
    });

    report += '═'.repeat(50) + '\n';
    return report;
  }

  /**
   * Prioriza sugestões (aprendidas vs novas)
   */
  prioritizeSuggestions(normalizedName: string, newSuggestions: string[]): string[] {
    const learned = this.getLearnedSuggestions(normalizedName);

    if (learned.length > 0) {
      const combined = [...learned, ...newSuggestions.filter((s) => !learned.includes(s))];
      return combined;
    }

    return newSuggestions;
  }
}
