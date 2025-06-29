import mongoose, { Schema, Document } from 'mongoose';

export interface IAPIError extends Document {
  endpoint: string;  // エラーが発生したエンドポイント
  method: string;    // HTTPメソッド (GET, POST, etc.)
  statusCode: number; // HTTPステータスコード
  errorType: string;  // エラータイプ (validation, authentication, server, etc.)
  errorMessage: string; // エラーメッセージ
  userId?: string;   // ユーザーID (認証エラーの場合)
  userAgent?: string; // ユーザーエージェント
  ipAddress?: string; // IPアドレス
  requestBody?: any;  // リクエストボディ (機密情報は除外)
  stackTrace?: string; // スタックトレース (開発環境のみ)
  responseTime: number; // レスポンス時間 (ms)
  timestamp: Date;   // エラー発生時刻
  resolved: boolean; // 解決済みフラグ
  resolvedAt?: Date; // 解決日時
  resolvedBy?: string; // 解決者ID
  notes?: string;    // 管理者メモ
  metadata?: any;    // 追加のメタデータ（レート制限情報など）
}

const APIErrorSchema: Schema = new Schema({
  endpoint: {
    type: String,
    required: true,
    index: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']
  },
  statusCode: {
    type: Number,
    required: true,
    index: true
  },
  errorType: {
    type: String,
    required: true,
    enum: [
      'validation',      // バリデーションエラー
      'authentication',  // 認証エラー
      'authorization',   // 認可エラー
      'not_found',      // リソース未発見
      'rate_limit',     // レート制限
      'server_error',   // サーバーエラー
      'database_error', // データベースエラー
      'external_api',   // 外部API連携エラー
      'timeout',        // タイムアウト
      'unknown'         // その他
    ],
    index: true
  },
  errorMessage: {
    type: String,
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userAgent: String,
  ipAddress: String,
  requestBody: Schema.Types.Mixed,
  stackTrace: String,
  responseTime: {
    type: Number,
    required: true,
    default: 0
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  resolved: {
    type: Boolean,
    default: false,
    index: true
  },
  resolvedAt: Date,
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String,
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'api_errors'
});

// 複合インデックス
APIErrorSchema.index({ timestamp: -1, statusCode: 1 });
APIErrorSchema.index({ endpoint: 1, timestamp: -1 });
APIErrorSchema.index({ errorType: 1, timestamp: -1 });
APIErrorSchema.index({ resolved: 1, timestamp: -1 });

// 統計取得用の静的メソッド
APIErrorSchema.statics.getErrorStats = async function(timeRange: string = '24h') {
  let startDate: Date | null = null;
  const endDate = new Date();

  switch (timeRange) {
    case '1h':
      startDate = new Date(Date.now() - 60 * 60 * 1000);
      break;
    case '24h':
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
      // 全期間のデータを取得
      startDate = null;
      break;
    default:
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  }

  const matchCondition: any = {};
  if (startDate) {
    matchCondition.timestamp = { $gte: startDate, $lte: endDate };
  }

  const pipeline = [
    {
      $match: matchCondition
    },
    {
      $group: {
        _id: null,
        totalErrors: { $sum: 1 },
        unresolvedErrors: {
          $sum: { $cond: [{ $eq: ['$resolved', false] }, 1, 0] }
        },
        avgResponseTime: { $avg: '$responseTime' },
        errorsByType: {
          $push: {
            type: '$errorType',
            statusCode: '$statusCode',
            endpoint: '$endpoint'
          }
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  
  if (result.length === 0) {
    return {
      totalErrors: 0,
      unresolvedErrors: 0,
      avgResponseTime: 0,
      errorsByType: {},
      errorsByStatus: {},
      topErrorEndpoints: []
    };
  }

  const stats = result[0];
  
  // エラータイプ別集計
  const errorsByType = {};
  const errorsByStatus = {};
  const endpointCounts = {};
  
  stats.errorsByType.forEach((error: any) => {
    errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    errorsByStatus[error.statusCode] = (errorsByStatus[error.statusCode] || 0) + 1;
    endpointCounts[error.endpoint] = (endpointCounts[error.endpoint] || 0) + 1;
  });

  // トップエラーエンドポイント
  const topErrorEndpoints = Object.entries(endpointCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([endpoint, count]) => ({ endpoint, count }));

  return {
    totalErrors: stats.totalErrors,
    unresolvedErrors: stats.unresolvedErrors,
    avgResponseTime: Math.round(stats.avgResponseTime),
    errorsByType,
    errorsByStatus,
    topErrorEndpoints
  };
};

// エラーログ記録用の静的メソッド
APIErrorSchema.statics.logError = async function(errorData: {
  endpoint: string;
  method: string;
  statusCode: number;
  errorType: string;
  errorMessage: string;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  requestBody?: any;
  stackTrace?: string;
  responseTime?: number;
  metadata?: any;
}) {
  try {
    // 機密情報を除外
    const sanitizedRequestBody = errorData.requestBody ? 
      JSON.parse(JSON.stringify(errorData.requestBody, (key, value) => {
        // パスワード、トークン、秘密情報を除外
        if (['password', 'token', 'secret', 'key', 'authorization'].some(secret => 
          key.toLowerCase().includes(secret))) {
          return '[REDACTED]';
        }
        return value;
      })) : undefined;

    const error = new this({
      ...errorData,
      requestBody: sanitizedRequestBody,
      responseTime: errorData.responseTime || 0,
      stackTrace: process.env.NODE_ENV === 'development' ? errorData.stackTrace : undefined,
      metadata: errorData.metadata || {}
    });

    await error.save();
    
    console.log(`🚨 API Error logged: ${errorData.method} ${errorData.endpoint} - ${errorData.statusCode}`);
    
    return error;
  } catch (logError) {
    console.error('❌ Failed to log API error:', logError);
  }
};

export const APIErrorModel = mongoose.model<IAPIError>('APIError', APIErrorSchema);