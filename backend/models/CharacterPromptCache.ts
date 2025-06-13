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

  // キャッシュされたプロンプト
  systemPrompt: string;
  promptConfig: {
    affinityLevel: number;
    personalityTags: string[];
    toneStyle: string;
    moodModifiers: string[];
    languageCode: 'ja' | 'en';
  };

  // キャッシュ管理
  createdAt: Date;
  lastUsed: Date;
  useCount: number;
  ttl: Date;

  // バージョン管理
  characterVersion: string;
  promptVersion: string;

  // パフォーマンス指標
  generationTime: number; // プロンプト生成時間（ms）
  promptLength: number; // プロンプト文字数
  compressionRatio: number; // 圧縮率（将来の最適化用）
}

const CharacterPromptCacheSchema = new Schema<ICharacterPromptCache>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  characterId: {
    type: Schema.Types.ObjectId,
    ref: 'Character',
    required: true,
    index: true
  },

  // キャッシュされたプロンプト
  systemPrompt: {
    type: String,
    required: true,
    maxlength: 8000, // OpenAI制限考慮
    validate: {
      validator: function(v: string) {
        return v.trim().length > 50; // 最小プロンプト長
      },
      message: 'System prompt too short'
    }
  },
  promptConfig: {
    affinityLevel: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    personalityTags: [{
      type: String,
      maxlength: 20,
      validate: {
        validator: function(tags: string[]) {
          return tags.length <= 15; // 最大15タグ
        },
        message: 'Too many personality tags'
      }
    }],
    toneStyle: {
      type: String,
      required: true,
      enum: [
        '丁寧語で礼儀正しい口調',
        '少しだけ砕けた丁寧語',
        '時々タメ口を交えた親しみやすい口調',
        '親友のようにフレンドリーで親しみやすい口調',
        '恋人のように甘く親密な口調'
      ]
    },
    moodModifiers: [{
      type: String,
      enum: ['excited', 'shy', 'playful', 'melancholic', 'neutral']
    }],
    languageCode: {
      type: String,
      required: true,
      enum: ['ja', 'en'],
      default: 'ja'
    }
  },

  // キャッシュ管理
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  lastUsed: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  useCount: {
    type: Number,
    default: 1,
    min: 1,
    max: 10000 // 異常使用検知
  },
  ttl: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30日後
    },
    required: true
  },

  // バージョン管理
  characterVersion: {
    type: String,
    required: true,
    maxlength: 50,
    default: '1.0.0'
  },
  promptVersion: {
    type: String,
    required: true,
    maxlength: 20,
    default: '1.0.0'
  },

  // パフォーマンス指標
  generationTime: {
    type: Number,
    required: true,
    min: 0,
    max: 60000, // 60秒上限
    default: 0
  },
  promptLength: {
    type: Number,
    required: true,
    min: 50,
    max: 8000
  },
  compressionRatio: {
    type: Number,
    default: 1.0,
    min: 0.1,
    max: 10.0
  }
}, {
  timestamps: false, // 手動管理
  collection: 'characterpromptcaches'
});

/**
 * インデックス戦略
 * 
 * 1. 主キー複合インデックス（最重要）
 * 2. 使用頻度ベースの最適化
 * 3. キャッシュ管理用インデックス
 * 4. バージョン管理用インデックス
 */

// 1. ユーザー・キャラクター・親密度レベル複合インデックス（最重要）
CharacterPromptCacheSchema.index({ 
  userId: 1, 
  characterId: 1, 
  'promptConfig.affinityLevel': 1,
  'promptConfig.languageCode': 1
}, { 
  name: 'primary_cache_lookup',
  unique: true // 同一設定の重複防止
});

// 2. 使用頻度最適化インデックス
CharacterPromptCacheSchema.index({ 
  lastUsed: -1, 
  useCount: -1 
}, { 
  name: 'usage_optimization' 
});

// 3. キャッシュクリーンアップ用インデックス
CharacterPromptCacheSchema.index({ 
  characterId: 1, 
  characterVersion: 1, 
  createdAt: -1 
}, { 
  name: 'cache_cleanup' 
});

// 4. バージョン管理用インデックス
CharacterPromptCacheSchema.index({ 
  characterVersion: 1, 
  promptVersion: 1, 
  createdAt: -1 
}, { 
  name: 'version_management' 
});

// 5. パフォーマンス分析用インデックス
CharacterPromptCacheSchema.index({ 
  generationTime: -1, 
  promptLength: -1, 
  createdAt: -1 
}, { 
  name: 'performance_analysis' 
});

/**
 * 仮想フィールド・プロパティ
 */

// キャッシュ有効性チェック
CharacterPromptCacheSchema.virtual('isValid').get(function() {
  return (
    this.ttl > new Date() && 
    this.characterVersion && 
    this.promptVersion &&
    this.systemPrompt.length > 50
  );
});

// キャッシュ効率性指標
CharacterPromptCacheSchema.virtual('efficiency').get(function() {
  const daysSinceCreation = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceCreation > 0 ? this.useCount / daysSinceCreation : this.useCount;
});

// 親密度レンジ
CharacterPromptCacheSchema.virtual('affinityRange').get(function() {
  const level = this.promptConfig.affinityLevel;
  if (level >= 85) return 'lover';
  if (level >= 60) return 'close_friend';
  if (level >= 40) return 'friend';
  if (level >= 20) return 'acquaintance';
  return 'stranger';
});

/**
 * スタティックメソッド
 */

// キャッシュ検索（高速）
CharacterPromptCacheSchema.statics.findCachedPrompt = async function(
  userId: string, 
  characterId: string, 
  affinityLevel: number,
  languageCode: 'ja' | 'en' = 'ja'
) {
  // 親密度レベルの範囲マッチング（±5レベル許容）
  const levelRange = 5;
  
  return this.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    characterId: new mongoose.Types.ObjectId(characterId),
    'promptConfig.affinityLevel': {
      $gte: Math.max(0, affinityLevel - levelRange),
      $lte: Math.min(100, affinityLevel + levelRange)
    },
    'promptConfig.languageCode': languageCode,
    ttl: { $gt: new Date() }
  }).sort({ 
    lastUsed: -1,
    useCount: -1 
  });
};

// バージョン一括無効化
CharacterPromptCacheSchema.statics.invalidateByVersion = async function(
  characterId: string, 
  oldVersion: string
) {
  return this.deleteMany({
    characterId: new mongoose.Types.ObjectId(characterId),
    characterVersion: oldVersion
  });
};

// 使用統計取得
CharacterPromptCacheSchema.statics.getUsageStats = async function(days: number = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$characterId',
        totalUseCount: { $sum: '$useCount' },
        avgGenerationTime: { $avg: '$generationTime' },
        cacheHitRate: { 
          $avg: { 
            $cond: [{ $gt: ['$useCount', 1] }, 1, 0] 
          } 
        },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        characterId: '$_id',
        totalUseCount: 1,
        avgGenerationTime: 1,
        cacheHitRate: 1,
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    }
  ]);
};

// 古いキャッシュクリーンアップ
CharacterPromptCacheSchema.statics.cleanupOldCaches = async function(daysOld: number = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  return this.deleteMany({
    $or: [
      { lastUsed: { $lt: cutoffDate } },
      { ttl: { $lt: new Date() } },
      { useCount: { $lt: 2 } } // 使用回数が少ないキャッシュ
    ]
  });
};

/**
 * インスタンスメソッド
 */

// キャッシュ使用記録
CharacterPromptCacheSchema.methods.recordUsage = function() {
  this.lastUsed = new Date();
  this.useCount += 1;
  return this.save();
};

// プロンプト更新
CharacterPromptCacheSchema.methods.updatePrompt = function(
  newPrompt: string, 
  generationTime: number
) {
  this.systemPrompt = newPrompt;
  this.generationTime = generationTime;
  this.promptLength = newPrompt.length;
  this.lastUsed = new Date();
  this.useCount = 1; // リセット
  return this.save();
};

/**
 * プリ・ポストフック
 */

// 保存前バリデーション
CharacterPromptCacheSchema.pre('save', function(next) {
  // プロンプト長設定
  this.promptLength = this.systemPrompt.length;
  
  // TTL延長（よく使われるキャッシュ）
  if (this.useCount > 10) {
    this.ttl = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60日
  }
  
  // 圧縮率計算（将来の最適化用）
  const baseSize = this.promptConfig.personalityTags.join('').length + 
                   this.promptConfig.toneStyle.length;
  this.compressionRatio = baseSize > 0 ? this.promptLength / baseSize : 1.0;
  
  next();
});

// 保存後ログ
CharacterPromptCacheSchema.post('save', function(doc) {
  if (doc.isNew) {
    console.log(`New prompt cache created: ${doc._id} for character ${doc.characterId}`);
  }
});

// 削除前ログ
CharacterPromptCacheSchema.pre('deleteOne', function(next) {
  console.log(`Deleting prompt cache: ${this.getQuery()._id}`);
  next();
});

/**
 * カスタムバリデーション
 */

// 重複キャッシュ防止
CharacterPromptCacheSchema.pre('save', async function(next) {
  if (this.isNew) {
    const existing = await (this.constructor as any).findOne({
      userId: this.userId,
      characterId: this.characterId,
      'promptConfig.affinityLevel': this.promptConfig.affinityLevel,
      'promptConfig.languageCode': this.promptConfig.languageCode,
      _id: { $ne: this._id }
    });
    
    if (existing) {
      // 既存キャッシュを更新して新規作成を中止
      await existing.updatePrompt(this.systemPrompt, this.generationTime);
      return next(new Error('Cache already exists, updated existing instead'));
    }
  }
  next();
});

// インデックス最適化
CharacterPromptCacheSchema.index({ userId: 1, characterId: 1, promptVersion: 1, characterVersion: 1 });
CharacterPromptCacheSchema.index({ ttl: 1 }, { expireAfterSeconds: 0 });
CharacterPromptCacheSchema.index({ useCount: -1 });
CharacterPromptCacheSchema.index({ languageCode: 1 });

export default mongoose.model<ICharacterPromptCache>('CharacterPromptCache', CharacterPromptCacheSchema);