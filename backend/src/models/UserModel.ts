import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  email: string;
  name: string;
  tokenBalance: number;
  selectedCharacter?: {
    _id: string;
    name: { ja: string; en: string };
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  tokenBalance: {
    type: Number,
    default: 1000, // 初回登録時に1000トークン付与
    min: 0
  },
  selectedCharacter: {
    _id: String,
    name: {
      ja: String,
      en: String
    }
  }
}, {
  timestamps: true,
  versionKey: false
});

// インデックス設定
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ createdAt: -1 });

export const UserModel = mongoose.model<IUser>('User', UserSchema);