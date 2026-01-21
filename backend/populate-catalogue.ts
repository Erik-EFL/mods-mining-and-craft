/**
 * Script para popular o catálogo de mods
 * Indexa mods populares do Modrinth e CurseForge
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { CurseForgeAPI } from './src/apis/CurseForgeAPI';
import { ModrinthAPI } from './src/apis/ModrinthAPI';
import { ModCatalogueService } from './src/services/ModCatalogueService';

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://admin:modcraft2026@localhost:27017/mods-craft?authSource=admin';

const MINECRAFT_VERSION = process.env.MINECRAFT_VERSION || '1.21.1';
const MOD_LOADER = process.env.MOD_LOADER || 'fabric';
const CURSEFORGE_API_KEY = process.env.CURSEFORGE_API_KEY || '';

// Número de mods a indexar de cada plataforma
const MODRINTH_LIMIT = 100; // Reduzido para teste
const CURSEFORGE_LIMIT = 100; // Reduzido para teste

/**
 * Conecta ao MongoDB
 */
async function connectMongoDB() {
  try {
    console.log('Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado ao MongoDB');
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error);
    throw error;
  }
}

/**
 * Popula o catálogo
 */
async function populateCatalogue() {
  console.log('═'.repeat(70));
  console.log('POPULAÇÃO DO CATÁLOGO DE MODS');
  console.log('═'.repeat(70));
  console.log(`Minecraft: ${MINECRAFT_VERSION}`);
  console.log(`Mod Loader: ${MOD_LOADER}`);
  console.log(`Modrinth: ${MODRINTH_LIMIT} mods`);
  console.log(`CurseForge: ${CURSEFORGE_LIMIT} mods`);
  console.log('═'.repeat(70));
  console.log();

  try {
    // Conectar ao MongoDB
    await connectMongoDB();

    // Inicializar APIs
    const modrinthAPI = new ModrinthAPI();
    const curseforgeAPI = new CurseForgeAPI(CURSEFORGE_API_KEY);

    // Inicializar serviço
    const catalogueService = new ModCatalogueService(
      modrinthAPI,
      curseforgeAPI,
      MINECRAFT_VERSION,
      MOD_LOADER
    );

    // Obter estatísticas iniciais
    console.log('Estatísticas iniciais:');
    const initialStats = await catalogueService.getStats();
    console.log(`   Total de mods: ${initialStats.totalMods}`);
    console.log(`   Modrinth: ${initialStats.modrinthOnly}`);
    console.log(`   CurseForge: ${initialStats.curseforgeOnly}`);
    console.log(`   Ambas plataformas: ${initialStats.bothPlatforms}`);
    console.log();

    // Indexar Modrinth
    console.log('Indexando mods do MODRINTH...');
    try {
      const modrinthIndexed = await catalogueService.indexPlatformMods('modrinth', MODRINTH_LIMIT);
      console.log(`${modrinthIndexed} mods do Modrinth indexados\n`);
    } catch (error) {
      console.error(`Erro ao indexar Modrinth:`, error instanceof Error ? error.message : error);
    }

    // Pequeno delay entre as indexações
    console.log('Aguardando 2 segundos...\n');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Indexar CurseForge (opcional, pode falhar)
    if (CURSEFORGE_API_KEY) {
      console.log('Indexando mods do CURSEFORGE...');
      try {
        const curseforgeIndexed = await catalogueService.indexPlatformMods(
          'curseforge',
          CURSEFORGE_LIMIT
        );
        console.log(`${curseforgeIndexed} mods do CurseForge indexados\n`);
      } catch (error) {
        console.error(
          `Erro ao indexar CurseForge:`,
          error instanceof Error ? error.message : error
        );
      }
    } else {
      console.log('CurseForge skipped (sem API key)\n');
    }

    // Obter estatísticas finais
    console.log('═'.repeat(70));
    console.log('ESTATÍSTICAS FINAIS');
    console.log('═'.repeat(70));
    const finalStats = await catalogueService.getStats();

    console.log(`\nTotais:`);
    console.log(`   Total de mods: ${finalStats.totalMods}`);
    console.log(`   Exclusivos do Modrinth: ${finalStats.modrinthOnly}`);
    console.log(`   Exclusivos do CurseForge: ${finalStats.curseforgeOnly}`);
    console.log(`   Disponíveis em ambas: ${finalStats.bothPlatforms}`);

    if (Object.keys(finalStats.byCategory).length > 0) {
      console.log(`\nPor Categoria:`);
      Object.entries(finalStats.byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([category, count]) => {
          console.log(`   ${category}: ${count}`);
        });
    }

    if (Object.keys(finalStats.byMinecraftVersion).length > 0) {
      console.log(`\nPor Versão do Minecraft (Top 10):`);
      Object.entries(finalStats.byMinecraftVersion)
        .slice(0, 10)
        .forEach(([version, count]) => {
          console.log(`   ${version}: ${count}`);
        });
    }

    if (Object.keys(finalStats.byModLoader).length > 0) {
      console.log(`\nPor Mod Loader:`);
      Object.entries(finalStats.byModLoader).forEach(([loader, count]) => {
        console.log(`   ${loader}: ${count}`);
      });
    }

    console.log('\n═'.repeat(70));
    console.log('População do catálogo concluída com sucesso!');
    console.log('═'.repeat(70));
    console.log();

    // Desconectar do MongoDB
    await mongoose.disconnect();
    console.log('Desconectado do MongoDB');
  } catch (error) {
    console.error('Erro crítico ao popular catálogo:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

// Executar
populateCatalogue();
