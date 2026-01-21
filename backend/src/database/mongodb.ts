import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://admin:modcraft2026@localhost:27017/mods-craft?authSource=admin';

/**
 * Conecta ao MongoDB
 */
export async function connectMongoDB(): Promise<typeof mongoose> {
  try {
    console.log('Conectando ao MongoDB...');

    const connection = await mongoose.connect(MONGODB_URI, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('Conectado ao MongoDB com sucesso!');
    return connection;
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
}

/**
 * Desconecta do MongoDB
 */
export async function disconnectMongoDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('Desconectado do MongoDB');
  } catch (error) {
    console.error('Erro ao desconectar do MongoDB:', error);
  }
}

export default mongoose;
