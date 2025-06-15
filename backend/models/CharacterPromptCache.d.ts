import mongoose, { Schema, Document } from 'mongoose';
/**
 * CharacterPromptCache Model
 *
 * 保存目的:
 * - システムプロンプト生成コストの最適化
 * - API呼び出し回数削減による経済性向上
 * - 親密度レベル別プロンプトの効率的管理
 * - 性格タグ・ムード変化の動的プロンプト構築
 * - キャラクター更新時の自動キャッシュ無効化
 *
 * パフォーマンス考慮:
 * - 高頻度アクセス（チャット毎）に対応
 * - メモリ効率を考慮したプロンプトサイズ制限
 * - TTL（30日）による自動削除でストレージ最適化
 * - 複合インデックスによる高速検索
 * - バージョン管理によるキャッシュ整合性確保
 */
interface ICharacterPromptCache extends Document {
    userId: Schema.Types.ObjectId;
    characterId: Schema.Types.ObjectId;
    systemPrompt: string;
    promptConfig: {
        affinityLevel: number;
        personalityTags: string[];
        toneStyle: string;
        moodModifiers: string[];
        languageCode: 'ja' | 'en';
    };
    createdAt: Date;
    lastUsed: Date;
    useCount: number;
    ttl: Date;
    characterVersion: string;
    promptVersion: string;
    generationTime: number;
    promptLength: number;
    compressionRatio: number;
}
declare const _default: mongoose.Model<ICharacterPromptCache, {}, {}, {}, mongoose.Document<unknown, {}, ICharacterPromptCache, {}> & ICharacterPromptCache & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
