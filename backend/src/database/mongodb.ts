import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Conecta ao MongoDB
 */
export async function connectMongoDB(): Promise<typeof mongoose> {
  try {
    console.log('Conectando ao MongoDB...');
    if (!MONGODB_URI) {
      console.warn('MONGODB_URI não definida. MongoDB não será usado. Continuando com fallback para arquivos JSON.');
      return mongoose;
    }

    const connection = await mongoose.connect(MONGODB_URI, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('Conectado ao MongoDB com sucesso!');
    return connection;
  } catch (error) {
    console.warn('Erro ao conectar ao MongoDB:', error);
    console.warn('Continuando sem MongoDB. Será usado fallback para arquivos JSON.');
    return mongoose;
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
