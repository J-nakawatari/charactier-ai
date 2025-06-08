import mongoose from 'mongoose';

const CharacterSchema = new mongoose.Schema({
  name: {
    ja: { type: String, required: true },
    en: { type: String, required: true },
  },
  description: {
    ja: { type: String, required: true },
    en: { type: String, required: true },
  },
  model: {
    type: String,
    enum: ['gpt-3.5-turbo', 'gpt-4'],
    default: 'gpt-3.5-turbo'
  },
  characterAccessType: {
    type: String,
    enum: ['free', 'token-based', 'purchaseOnly'],
    required: true
  },
  personalityPreset: { type: String },
  personalityTags: [String],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Character || mongoose.model('Character', CharacterSchema);
