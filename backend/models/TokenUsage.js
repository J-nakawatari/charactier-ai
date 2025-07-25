"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const TokenUsageSchema = new mongoose_1.Schema({
    // 基本情報
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    characterId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Character',
        required: true,
        index: true
    },
    sessionId: {
        type: String,
        required: true,
        index: true,
        maxlength: 128
    },
    // 使用量詳細
    tokensUsed: {
        type: Number,
        required: true,
        min: 0,
        max: 100000 // 異常値制限
    },
    tokenType: {
        type: String,
        required: true,
        enum: ['chat_message', 'character_purchase', 'image_generation', 'voice_synthesis', 'bonus_grant'],
        index: true
    },
    messageContent: {
        type: String,
        required: true,
        maxlength: 2000 // ログサイズ制限
    },
    responseContent: {
        type: String,
        required: true,
        maxlength: 4000 // AI応答ログ制限
    },
    // AI API詳細
    aiModel: {
        type: String,
        required: true,
        enum: ['gpt-3.5-turbo', 'gpt-4o-mini'],
        index: true
    },
    inputTokens: {
        type: Number,
        required: true,
        min: 0,
        max: 50000
    },
    outputTokens: {
        type: Number,
        required: true,
        min: 0,
        max: 50000
    },
    apiCost: {
        type: Number,
        required: true,
        min: 0,
        validate: {
            validator: function (v) {
                return v <= 10.0; // $10上限（異常値防止）
            },
            message: 'API cost exceeds safety limit'
        }
    },
    apiCostYen: {
        type: Number,
        required: true,
        min: 0,
        max: 1500 // 1500円上限
    },
    // キャッシュヒット情報
    cacheHit: {
        type: Boolean,
        default: false,
        index: true
    },
    // 原価・利益分析
    stripeFee: {
        type: Number,
        default: 0,
        min: 0
    },
    grossProfit: {
        type: Number,
        required: true,
        validate: {
            validator: function (v) {
                // 99%利益率システムチェック
                return v >= (this.apiCostYen * 99);
            },
            message: 'Profit margin below 99% rule'
        }
    },
    profitMargin: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
        validate: {
            validator: function (v) {
                return v >= 0.99; // 99%利益率システム
            },
            message: 'Profit margin must be at least 99%'
        }
    },
    // 親密度変化
    intimacyBefore: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    intimacyAfter: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    affinityChange: {
        type: Number,
        required: true,
        min: -20,
        max: 20
    },
    experienceGained: {
        type: Number,
        required: true,
        min: 0,
        max: 1000
    },
    // メタデータ
    userAgent: {
        type: String,
        required: true,
        maxlength: 500
    },
    ipAddress: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                // IPv4/IPv6バリデーション
                const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
                const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
                return ipv4Regex.test(v) || ipv6Regex.test(v);
            },
            message: 'Invalid IP address format'
        }
    },
    platform: {
        type: String,
        required: true,
        enum: ['web', 'mobile'],
        index: true
    },
    // タイムスタンプ
    createdAt: {
        type: Date,
        default: Date.now,
        required: true,
        index: true
    },
    processedAt: {
        type: Date,
        required: true,
        default: Date.now
    }
}, {
    timestamps: false, // 手動管理
    collection: 'tokenusages'
});
/**
 * インデックス戦略
 *
 * 1. 複合インデックス（検索・集計最適化）
 * 2. 時系列データ用インデックス
 * 3. セキュリティ検知用インデックス
 * 4. 分析用インデックス
 */
// 1. ユーザー・キャラクター・時系列複合インデックス（最重要）
TokenUsageSchema.index({
    userId: 1,
    characterId: 1,
    createdAt: -1
}, {
    name: 'user_character_time_compound'
});
// 2. 時系列分析用インデックス
TokenUsageSchema.index({
    createdAt: -1,
    tokenType: 1
}, {
    name: 'time_type_analysis'
});
// 3. セキュリティ・異常検知用インデックス
TokenUsageSchema.index({
    userId: 1,
    tokensUsed: -1,
    createdAt: -1
}, {
    name: 'security_anomaly_detection'
});
// 4. 経済分析用インデックス
TokenUsageSchema.index({
    model: 1,
    createdAt: -1,
    profitMargin: 1
}, {
    name: 'economic_analysis'
});
// 5. セッション分析用インデックス
TokenUsageSchema.index({
    sessionId: 1,
    createdAt: -1
}, {
    name: 'session_analysis'
});
// 6. 日次集計用インデックス
TokenUsageSchema.index({
    createdAt: -1,
    platform: 1,
    tokenType: 1
}, {
    name: 'daily_aggregation'
});
/**
 * TTL (Time To Live) 設定
 * 365日後に自動削除（ストレージ最適化）
 */
TokenUsageSchema.index({
    createdAt: 1
}, {
    expireAfterSeconds: 365 * 24 * 60 * 60, // 365日
    name: 'ttl_365_days'
});
/**
 * 仮想フィールド・メソッド
 */
// トークン効率性計算
TokenUsageSchema.virtual('tokenEfficiency').get(function () {
    return this.tokensUsed > 0 ? this.apiCostYen / this.tokensUsed : 0;
});
// 1時間当たりのコスト
TokenUsageSchema.virtual('costPerHour').get(function () {
    const hoursDiff = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 0 ? this.apiCostYen / hoursDiff : this.apiCostYen;
});
/**
 * スタティックメソッド
 */
// 異常使用検知
TokenUsageSchema.statics.detectAnomalies = async function (userId, timeWindow = 3600000) {
    const oneHourAgo = new Date(Date.now() - timeWindow);
    const usage = await this.aggregate([
        {
            $match: {
                userId: new mongoose_1.default.Types.ObjectId(userId),
                createdAt: { $gte: oneHourAgo }
            }
        },
        {
            $group: {
                _id: '$model',
                totalTokens: { $sum: '$tokensUsed' },
                totalCost: { $sum: '$apiCostYen' },
                messageCount: { $sum: 1 },
                avgTokensPerMessage: { $avg: '$tokensUsed' }
            }
        }
    ]);
    return usage.filter(u => u.totalTokens > 10000 || // 1時間で10k tokens異常
        u.avgTokensPerMessage > 2000 || // 1メッセージ2k tokens異常
        u.totalCost > 500 // 1時間で500円異常
    );
};
// 利益率分析
TokenUsageSchema.statics.getProfitAnalysis = async function (startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: '$model',
                totalRevenue: { $sum: '$grossProfit' },
                totalCost: { $sum: '$apiCostYen' },
                avgProfitMargin: { $avg: '$profitMargin' },
                messageCount: { $sum: 1 }
            }
        },
        {
            $project: {
                model: '$_id',
                totalRevenue: 1,
                totalCost: 1,
                avgProfitMargin: 1,
                messageCount: 1,
                netProfit: { $subtract: ['$totalRevenue', '$totalCost'] }
            }
        }
    ]);
};
/**
 * プリ・ポストフック
 */
// 保存前バリデーション
TokenUsageSchema.pre('save', function (next) {
    // 利益率計算
    if (this.apiCostYen > 0) {
        this.profitMargin = Math.max(0, Math.min(1, (this.grossProfit - this.apiCostYen) / this.grossProfit));
    }
    // 親密度変化計算
    this.affinityChange = this.intimacyAfter - this.intimacyBefore;
    // 処理時刻設定
    this.processedAt = new Date();
    next();
});
// 異常値アラート
TokenUsageSchema.post('save', async function (doc) {
    // 高コスト使用時のアラート
    if (doc.apiCostYen > 100) {
        console.warn(`High API cost detected: ${doc.apiCostYen} yen for user ${doc.userId}`);
    }
    // 利益率違反アラート
    if (doc.profitMargin < 0.99) {
        console.error(`Profit margin violation: ${doc.profitMargin} for user ${doc.userId}`);
    }
});
// モデルが既に存在する場合は再利用
exports.default = mongoose_1.default.models.TokenUsage || mongoose_1.default.model('TokenUsage', TokenUsageSchema);
