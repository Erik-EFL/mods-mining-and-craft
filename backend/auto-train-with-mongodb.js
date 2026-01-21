/**
 * Script de Treinamento com Persistência em MongoDB
 * Integra aprendizado com banco de dados para análise posterior
 */

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://admin:modcraft2026@localhost:27017/mods-craft?authSource=admin';
const MAX_SUGGESTIONS_PER_MOD = 5;

let TrainingSession;
let SearchPattern;
let UpdateLog;

/**
 * Conecta ao MongoDB
 */
async function connectMongoDB() {
  try {
    console.log('Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado ao MongoDB');

    const schemas = await import('./src/database/schemas.js');
    TrainingSession = schemas.TrainingSession;
    SearchPattern = schemas.SearchPattern;
    UpdateLog = schemas.UpdateLog;
  } catch (error) {
    console.error('Erro ao conectar no MongoDB:', error.message);
    throw error;
  }
}

/**
 * Busca o último log de atualização do MongoDB
 */
async function getLatestUpdateLog() {
  try {
    const log = await UpdateLog.findOne().sort({ timestamp: -1 });
    if (!log) {
      throw new Error('Nenhum log de atualização encontrado no MongoDB');
    }
    return log;
  } catch (error) {
    throw new Error(`Erro ao buscar log: ${error.message}`);
  }
}

/**
 * Normaliza nome do mod
 */
function normalizeName(filename) {
  let name = filename.replace(/\.jar$/, '');

  name = name.replace(/[-_](v|mc|fabric|forge|neoforge)[\d\.\w\-\+]*/gi, '');
  name = name.replace(/[-_](build|alpha|beta|kotlin)[\d\.\w\-\+]*/gi, '');
  name = name.replace(/[-_]?[vx]\d+[\.\d\w\-\+]*$/gi, '');

  name = name.replace(/\d+[\.\d\w\-\+]*(?=[-_]|$)/g, (match) => {
    if (/^\d+\.\d+/.test(match)) {
      return '';
    }
    return match;
  });

  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Gera variações de busca para um nome de mod
 */
function generateSearchVariations(filename) {
  const variations = new Set();

  const original = filename.replace(/\.jar$/, '');
  variations.add(original);

  const normalized = normalizeName(filename);
  variations.add(normalized);

  const withSpaces = normalized.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  variations.add(withSpaces);

  const withHyphens = normalized.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  variations.add(withHyphens);

  const words = original.match(/[A-Z][a-z]+|[a-z]+/g);
  if (words && words.length > 1) {
    variations.add(words.join(' ').toLowerCase());
    variations.add(words.join('-').toLowerCase());
  }

  const withoutVersion = original.replace(/\d+\.\d+[\.\d]*/g, '').replace(/[-_]+/g, '-');
  if (withoutVersion !== original) {
    variations.add(withoutVersion);
  }

  return Array.from(variations).filter((v) => v.length > 2);
}

/**
 * Carrega padrões aprendidos existentes do MongoDB
 */
async function loadLearnedPatterns() {
  try {
    const patterns = await SearchPattern.find();
    const result = {};

    patterns.forEach((pattern) => {
      result[pattern.modName] = pattern.variations;
    });

    console.log(`Carregados ${Object.keys(result).length} padrões existentes do MongoDB`);
    return result;
  } catch (error) {
    console.log('Criando novos padrões no MongoDB...');
    return {};
  }
}

/**
 * Salva padrões aprendidos no MongoDB
 */
async function saveLearnedPatterns(patterns) {
  try {
    for (const [modName, variations] of Object.entries(patterns)) {
      await SearchPattern.findOneAndUpdate(
        { modName },
        {
          modName,
          normalizedName: modName,
          variations,
          lastUpdated: new Date(),
          source: 'auto-train',
        },
        { upsert: true, new: true }
      );
    }
    console.log('Padrões salvos no MongoDB');
  } catch (error) {
    console.error('Erro ao salvar padrões:', error);
    throw error;
  }
}

/**
 * Processa log de erros e atualiza padrões
 */
async function trainFromErrors() {
  console.log('═'.repeat(70));
  console.log('SISTEMA DE TREINAMENTO AUTOMÁTICO COM MONGODB');
  console.log('═'.repeat(70));
  console.log();

  try {
    await connectMongoDB();

    console.log('Buscando último log de atualização do MongoDB...');
    const logData = await getLatestUpdateLog();
    console.log(`Log encontrado: ${logData._id}`);

    const failedMods = logData.failed || [];

    if (failedMods.length === 0) {
      console.log('Nenhuma falha encontrada. Nada a treinar!');
      console.log('═'.repeat(70));
      await mongoose.disconnect();
      return;
    }

    console.log(`\nEncontrados ${failedMods.length} mods que falharam:`);
    failedMods.forEach((mod, i) => {
      console.log(`   ${i + 1}. ${mod.filename || mod.modName}`);
    });

    const learnedPatterns = await loadLearnedPatterns();
    let newPatternsCount = 0;
    let updatedPatternsCount = 0;
    const processedFailedMods = [];

    console.log('\nGerando padrões de busca...\n');

    for (const mod of failedMods) {
      const filename = mod.filename || mod.modName;
      if (!filename) continue;

      const normalized = normalizeName(filename);
      const variations = generateSearchVariations(filename);

      if (!learnedPatterns[normalized]) {
        learnedPatterns[normalized] = [];
        newPatternsCount++;
      }

      const existingVariations = new Set(learnedPatterns[normalized]);
      let addedCount = 0;

      for (const variation of variations) {
        if (!existingVariations.has(variation)) {
          learnedPatterns[normalized].push(variation);
          addedCount++;
        }
      }

      if (learnedPatterns[normalized].length > MAX_SUGGESTIONS_PER_MOD) {
        learnedPatterns[normalized] = learnedPatterns[normalized].slice(0, MAX_SUGGESTIONS_PER_MOD);
      }

      if (addedCount > 0) {
        updatedPatternsCount++;
        console.log(`${normalized}: +${addedCount} variações`);
        console.log(
          `   → ${variations.slice(0, 3).join(', ')}${variations.length > 3 ? '...' : ''}`
        );
      }

      processedFailedMods.push({
        filename,
        normalizedName: normalized,
        variations: learnedPatterns[normalized],
      });
    }

    console.log('\nSalvando padrões no MongoDB...');
    await saveLearnedPatterns(learnedPatterns);

    try {
      const session = new TrainingSession({
        timestamp: new Date(),
        failedModsCount: failedMods.length,
        newModsAdded: newPatternsCount,
        patternsUpdated: updatedPatternsCount,
        totalSuggestions: Object.values(learnedPatterns).flat().length,
        learnedPatterns: new Map(Object.entries(learnedPatterns)),
        failedMods: processedFailedMods,
      });

      await session.save();
      console.log(`Sessão de treinamento salva no MongoDB: ${session._id}`);
    } catch (mongoError) {
      console.warn('Erro ao salvar sessão:', mongoError.message);
    }

    console.log('\n═'.repeat(70));
    console.log('RESUMO DO TREINAMENTO');
    console.log('═'.repeat(70));
    console.log(`Total de mods no sistema: ${Object.keys(learnedPatterns).length}`);
    console.log(`Novos mods adicionados: ${newPatternsCount}`);
    console.log(`Padrões atualizados: ${updatedPatternsCount}`);
    console.log(`Total de sugestões: ${Object.values(learnedPatterns).flat().length}`);
    console.log('═'.repeat(70));
    console.log('\nDica: Reinicie o servidor para aplicar os novos padrões!');
    console.log();

    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Desconectado do MongoDB');
    }
  } catch (error) {
    console.error('Erro no treinamento:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

trainFromErrors();
