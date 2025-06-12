import mongoose, { Schema, Document } from 'mongoose';

// メッセージの型定義
interface IMessage {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokensUsed: number;
  metadata?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    apiCost?: number;
    toneStyle?: string;
    relationshipStatus?: string;
    intimacyChange?: number;
    moodModifiers?: Array<{
      type: string;
      value: number;
      trigger?: string;
    }>;
    uiColor?: string;
  };
}

// チャットセッションの型定義
export interface IChat extends Document {
  _id: string;
  userId: string;
  characterId: string;
  messages: IMessage[];
  totalTokensUsed: number;
  currentAffinity: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// メッセージのスキーマ
const MessageSchema = new Schema<IMessage>({
  _id: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxLength: 4000
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  tokensUsed: {
    type: Number,
    default: 0,
    min: 0
  },
  metadata: {
    model: String,
    temperature: Number,
    maxTokens: Number
  }
}, { _id: false });

// チャットのスキーマ
const ChatSchema = new Schema<IChat>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  characterId: {
    type: String,
    required: true,
    index: true
  },
  messages: [MessageSchema],
  totalTokensUsed: {
    type: Number,
    default: 0,
    min: 0
  },
  currentAffinity: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 複合インデックス: ユーザー＋キャラクターの組み合わせでユニーク
ChatSchema.index({ userId: 1, characterId: 1 }, { unique: true });

// 古いチャット履歴のクリーンアップ用インデックス
ChatSchema.index({ lastActivityAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // 90日後に自動削除

export const ChatModel = mongoose.model<IChat>('Chat', ChatSchema);
export { IMessage };