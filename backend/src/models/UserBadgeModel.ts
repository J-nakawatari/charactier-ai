import mongoose, { Document, Schema } from 'mongoose';

export interface IUserBadge extends Document {
  userId: mongoose.Types.ObjectId;
  badgeId: mongoose.Types.ObjectId;
  isUnlocked: boolean;
  progress: number;
  maxProgress: number;
  unlockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userBadgeSchema = new Schema<IUserBadge>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  badgeId: { type: Schema.Types.ObjectId, ref: 'Badge', required: true },
  isUnlocked: { type: Boolean, default: false },
  progress: { type: Number, default: 0 },
  maxProgress: { type: Number, required: true },
  unlockedAt: { type: Date }
}, {
  timestamps: true
});

userBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });

export const UserBadgeModel = mongoose.model<IUserBadge>('UserBadge', userBadgeSchema);