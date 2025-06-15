import mongoose, { Schema, Document } from 'mongoose';
/**
 * TokenUsage Model
 *
 * 保存目的:
 * - 全トークン使用状況の詳細トラッキング
 * - API費用・利益率の正確な計算
 * - 異常使用検知・セキュリティ監視
 * - 経済モデル（50%利益ルール）の維持
 * - ユーザー行動分析・最適化判断
 *
 * パフォーマンス考慮:
 * - 時系列データとして大量発生する想定
 * - 月次集計用の効率的な複合インデックス
 * - セキュリティ検知用の高速クエリ対応
 * - 古いデータの自動削除（TTL: 365日）
 */
interface ITokenUsage extends Document {
    userId: Schema.Types.ObjectId;
    characterId: Schema.Types.ObjectId;
    sessionId: string;
    tokensUsed: number;
    tokenType: 'chat_message' | 'character_purchase' | 'image_generation' | 'voice_synthesis' | 'bonus_grant';
    messageContent: string;
    responseContent: string;
    aiModel: string;
    inputTokens: number;
    outputTokens: number;
    apiCost: number;
    apiCostYen: number;
    stripeFee: number;
    grossProfit: number;
    profitMargin: number;
    intimacyBefore: number;
    intimacyAfter: number;
    affinityChange: number;
    experienceGained: number;
    userAgent: string;
    ipAddress: string;
    platform: 'web' | 'mobile';
    createdAt: Date;
    processedAt: Date;
}
declare const _default: mongoose.Model<ITokenUsage, {}, {}, {}, mongoose.Document<unknown, {}, ITokenUsage, {}> & ITokenUsage & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
