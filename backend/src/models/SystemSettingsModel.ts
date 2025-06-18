import mongoose, { Schema, Document } from 'mongoose';

/**
 * システム設定モデル
 * Google Analytics設定やその他のグローバル設定を管理
 */

export interface ISystemSettings extends Document {
  key: string;                    // 設定キー（例: 'google_analytics'）
  value: any;                     // 設定値（JSONで保存）
  description?: string;           // 設定の説明
  isActive: boolean;             // 有効/無効フラグ
  updatedBy?: mongoose.Types.ObjectId; // 最終更新者（管理者）
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      enum: [
        'google_analytics',
        'maintenance_mode',
        'site_announcement',
        'feature_flags'
      ]
    },
    value: {
      type: Schema.Types.Mixed,
      required: true
    },
    description: {
      type: String,
      maxlength: 500
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  {
    timestamps: true
  }
);

// Google Analytics設定の型定義
export interface GoogleAnalyticsSettings {
  measurementId: string;      // G-XXXXXXXXXX
  trackingCode?: string;      // カスタムトラッキングコード（オプション）
  enabledPages?: string[];    // トラッキングを有効にするページパス
  excludedPages?: string[];   // トラッキングから除外するページパス
}

// 設定を取得するヘルパーメソッド
SystemSettingsSchema.statics.getGoogleAnalytics = async function(): Promise<GoogleAnalyticsSettings | null> {
  const setting = await this.findOne({ key: 'google_analytics', isActive: true });
  return setting ? setting.value : null;
};

// 設定を更新するヘルパーメソッド
SystemSettingsSchema.statics.updateGoogleAnalytics = async function(
  settings: GoogleAnalyticsSettings,
  adminId: string
): Promise<ISystemSettings> {
  return await this.findOneAndUpdate(
    { key: 'google_analytics' },
    {
      value: settings,
      isActive: true,
      updatedBy: adminId
    },
    { 
      upsert: true, 
      new: true,
      setDefaultsOnInsert: true
    }
  );
};

export const SystemSettingsModel = mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);