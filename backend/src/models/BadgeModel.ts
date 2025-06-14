import mongoose, { Document, Schema } from 'mongoose';

export interface IBadge extends Document {
  _id: string;
  name: {
    ja: string;
    en: string;
  };
  description: {
    ja: string;
    en: string;
  };
  iconUrl: string;
  type: 'beginner' | 'chat' | 'affinity' | 'login' | 'special';
  condition: {
    type: 'chat_count' | 'affinity_level' | 'login_days' | 'purchase_count';
    value: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const badgeSchema = new Schema<IBadge>({
  name: {
    ja: { type: String, required: true },
    en: { type: String, required: true }
  },
  description: {
    ja: { type: String, required: true },
    en: { type: String, required: true }
  },
  iconUrl: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['beginner', 'chat', 'affinity', 'login', 'special'],
    required: true 
  },
  condition: {
    type: { 
      type: String, 
      enum: ['chat_count', 'affinity_level', 'login_days', 'purchase_count'],
      required: true 
    },
    value: { type: Number, required: true }
  },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

export const BadgeModel = mongoose.model<IBadge>('Badge', badgeSchema);