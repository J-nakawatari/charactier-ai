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
  themeColor: {
    type: String,
    default: '#6366f1',
    validate: {
      validator: function(v: string) {
        return /^#[0-9A-Fa-f]{6}$/.test(v);
      },
      message: 'themeColor must be a valid hex color (e.g., #6366f1)'
    }
  },
  imageCharacterSelect: { type: String },
  imageDashboard: { type: String },
  imageChatAvatar: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Character || mongoose.model('Character', CharacterSchema);
