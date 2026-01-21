import mongoose, { Document, Schema } from 'mongoose';

// Exportar schema de CataloguedMod
export { CataloguedModModel } from './schemas/CataloguedMod.schema';

/**
 * Interface para documento de Log de Atualização
 */
export interface IUpdateLog extends Document {
  timestamp: Date;
  date: string;
  stats: {
    checked: number;
    updated: number;
    upToDate: number;
    failed: number;
  };
  updated: Array<{
    filename: string;
    modName?: string;
    oldVersion?: string;
    newVersion?: string;
    source?: 'modrinth' | 'curseforge';
    timestamp: Date;
    status: 'success';
  }>;
  failed: Array<{
    filename: string;
    modName?: string;
    normalizedName?: string;
    reason: string;
    timestamp: Date;
    status: 'failed';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema para logs de atualização
 */
const updateLogSchema = new Schema<IUpdateLog>(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    date: {
      type: String,
      required: true,
    },
    stats: {
      checked: Number,
      updated: Number,
      upToDate: Number,
      failed: Number,
    },
    updated: [
      {
        filename: String,
        modName: String,
        oldVersion: String,
        newVersion: String,
        source: {
          type: String,
          enum: ['modrinth', 'curseforge'],
        },
        timestamp: Date,
        status: { type: String, default: 'success' },
      },
    ],
    failed: [
      {
        filename: String,
        modName: String,
        normalizedName: String,
        reason: String,
        timestamp: Date,
        status: { type: String, default: 'failed' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Índices para melhor performance
updateLogSchema.index({ timestamp: -1 });
updateLogSchema.index({ 'stats.failed': 1 });
updateLogSchema.index({ 'failed.filename': 1 });

export const UpdateLog = mongoose.model<IUpdateLog>('UpdateLog', updateLogSchema);

/**
 * Interface para documento de Treinamento
 */
export interface ITrainingSession extends Document {
  timestamp: Date;
  failedModsCount: number;
  newModsAdded: number;
  patternsUpdated: number;
  totalSuggestions: number;
  learnedPatterns: Map<string, string[]>;
  failedMods: Array<{
    filename: string;
    normalizedName: string;
    variations: string[];
  }>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema para sessões de treinamento
 */
const trainingSessionSchema = new Schema<ITrainingSession>(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    failedModsCount: Number,
    newModsAdded: Number,
    patternsUpdated: Number,
    totalSuggestions: Number,
    learnedPatterns: Map,
    failedMods: [
      {
        filename: String,
        normalizedName: String,
        variations: [String],
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Índices para melhor performance
trainingSessionSchema.index({ timestamp: -1 });
trainingSessionSchema.index({ failedModsCount: 1 });
trainingSessionSchema.index({ newModsAdded: 1 });

export const TrainingSession = mongoose.model<ITrainingSession>(
  'TrainingSession',
  trainingSessionSchema
);

/**
 * Interface para documento de Padrão de Busca
 */
export interface ISearchPattern extends Document {
  modName: string;
  normalizedName: string;
  variations: string[];
  firstSeen: Date;
  lastUpdated: Date;
  timesUsed: number;
  successCount: number;
  failureCount: number;
  source: 'direct' | 'learned' | 'variation';
}

/**
 * Schema para padrões de busca
 */
const searchPatternSchema = new Schema<ISearchPattern>(
  {
    modName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    normalizedName: {
      type: String,
      required: true,
      index: true,
    },
    variations: [String],
    firstSeen: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    timesUsed: {
      type: Number,
      default: 0,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    source: {
      type: String,
      enum: ['direct', 'learned', 'variation'],
      default: 'learned',
    },
  },
  {
    timestamps: true,
  }
);

// Índices compostos para queries otimizadas
searchPatternSchema.index({ source: 1, lastUpdated: -1 });
searchPatternSchema.index({ successCount: -1 });

export const SearchPattern = mongoose.model<ISearchPattern>('SearchPattern', searchPatternSchema);

/**
 * Interface para documento de Estatísticas
 */
export interface IStatistics extends Document {
  date: Date;
  totalMods: number;
  totalSuggestions: number;
  successRate: number;
  failureCount: number;
  averageSearchTime: number;
  trainingSessionsCount: number;
}

/**
 * Schema para estatísticas diárias
 */
const statisticsSchema = new Schema<IStatistics>(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
      index: true,
    },
    totalMods: Number,
    totalSuggestions: Number,
    successRate: Number,
    failureCount: Number,
    averageSearchTime: Number,
    trainingSessionsCount: Number,
  },
  {
    timestamps: true,
  }
);

statisticsSchema.index({ date: -1 });

export const Statistics = mongoose.model<IStatistics>('Statistics', statisticsSchema);
