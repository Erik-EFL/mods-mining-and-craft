/**
 * Script para limpar a coleção de mods do catálogo
 * Remove índices problemáticos e permite recriação
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function cleanupCatalogue() {
  try {
    console.log('Conectando ao MongoDB...');
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI não definida. Configure no .env ou variável de ambiente.');
    }
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado ao MongoDB');

    // Dropar coleção inteira
    console.log('\nRemovendo coleção CataloguedMod...');
    await mongoose.connection
      .collection('cataloguedmods')
      .drop()
      .catch(() => {
        console.log('   (coleção não existe ou já foi removida)');
      });

    // Dropar índices
    console.log('Removendo índices...');
    try {
      await mongoose.connection.collection('cataloguedmods').dropIndexes();
      console.log('Índices removidos');
    } catch (e) {
      console.log('   (sem índices para remover)');
    }

    console.log('\nLimpeza concluída!');
    console.log('   Próximo passo: npm run populate-catalogue');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

cleanupCatalogue();
