import { Schema, model } from 'mongoose';
import type { CataloguedMod } from '../../types/unified-mod.types';

const cataloguedModSchema = new Schema<CataloguedMod>({
  // Nome normalizado (único)
  normalizedName: {
    type: String,
    required: true,
    unique: true,
  },

  // Nomes reais
  displayName: {
    type: String,
    required: true,
  },
  alternativeNames: [String],

  // Disponibilidade
  availability: {
    modrinth: { type: Boolean, default: false },
    curseforge: { type: Boolean, default: false },
  },

  // IDs nas plataformas
  modrinthId: String,
  modrinthSlug: String,
  curseforgeId: Number,
  curseforgeSlug: String,

  // Metadados
  category: String,
  description: String,

  // Versões suportadas
  minecraftVersions: [String],
  supportedLoaders: [String],

  // Estatísticas agregadas
  totalDownloads: { type: Number, default: 0 },
  popularity: { type: Number, default: 0 },

  // Timestamps
  firstSeen: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
  lastChecked: { type: Date, default: Date.now },

  // Informações de busca
  searchKeywords: [String],
  commonMisspellings: [String],

  // Metadados de aprendizado
  searchSuccessRate: { type: Number, default: 0 },
  timesSearched: { type: Number, default: 0 },
  timesFound: { type: Number, default: 0 },
  timesFailed: { type: Number, default: 0 },
});

// Índices para buscas eficientes
cataloguedModSchema.index({ displayName: 1 });
cataloguedModSchema.index({ 'availability.modrinth': 1, 'availability.curseforge': 1 });
cataloguedModSchema.index({ popularity: -1 });
cataloguedModSchema.index({ totalDownloads: -1 });
cataloguedModSchema.index({ searchSuccessRate: -1 });
cataloguedModSchema.index({ lastUpdated: -1 });

export const CataloguedModModel = model<CataloguedMod>('CataloguedMod', cataloguedModSchema);
