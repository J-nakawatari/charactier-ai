import mongoose from 'mongoose';

const CharacterTranslationSchema = new mongoose.Schema({
  characterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Character',
    required: true,
    unique: true // One translation document per character
  },
  name: {
    ja: { type: String, required: true },
    en: { type: String, required: true }
  },
  description: {
    ja: { type: String, required: true },
    en: { type: String, required: true }
  },
  personalityPreset: {
    ja: { type: String, required: true },
    en: { type: String, required: true }
  },
  personalityTags: {
    ja: [{ type: String }],
    en: [{ type: String }]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field on save
CharacterTranslationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create indexes for better performance
CharacterTranslationSchema.index({ characterId: 1 });
CharacterTranslationSchema.index({ updatedAt: -1 });

export default mongoose.models.CharacterTranslation || mongoose.model('CharacterTranslation', CharacterTranslationSchema);