import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { SystemSettingsModel } from '../models/SystemSettingsModel';

const router: Router = Router();

// リクエストの型定義
interface AuthRequest extends Request {
  user?: any;
  admin?: any;
  body: any;
  params: any;
  query: any;
}

// 管理者認証ミドルウェア
const authenticateAdmin = (req: any, res: Response, next: any) => {
  // 管理者として認証されているかチェック（標準パターンに従う）
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: '管理者権限が必要です' });
    return;
  }
  next();
};

// Google Analytics設定の取得（公開API - 認証不要）
router.get('/google-analytics', async (req: any, res: Response): Promise<void> => {
  try {
    const settings = await SystemSettingsModel.findOne({ key: 'google_analytics' });
    
    res.json({
      settings: settings?.value || null,
      isActive: settings?.isActive || false
    });
  } catch (error) {
    console.error('GA設定取得エラー:', error);
    res.status(500).json({ error: 'Google Analytics設定の取得に失敗しました' });
  }
});

// Google Analytics設定の更新
router.post('/google-analytics', authenticateToken, authenticateAdmin, async (req: any, res: Response): Promise<void> => {
  try {
    const { measurementId, trackingCode, isActive } = req.body;
    const adminId = req.user?._id;

    // 測定IDの検証
    if (!measurementId || !measurementId.match(/^G-[A-Z0-9]{10}$/)) {
      res.status(400).json({ error: '有効な測定ID（G-XXXXXXXXXX）を入力してください' });
      return;
    }

    // トラッキングコードから測定IDを抽出（ユーザーが完全なスクリプトを貼り付けた場合）
    let extractedMeasurementId = measurementId;
    if (trackingCode) {
      const match = trackingCode.match(/gtag\s*\(\s*['"]config['"]\s*,\s*['"]([^'"]+)['"]/);
      if (match && match[1]) {
        extractedMeasurementId = match[1];
      }
    }

    const settingsValue = {
      measurementId: extractedMeasurementId,
      trackingCode: trackingCode || null,
      enabledPages: ['*'], // デフォルトで全ページ有効
      excludedPages: ['/admin/*'] // 管理画面は除外
    };

    const updated = await SystemSettingsModel.findOneAndUpdate(
      { key: 'google_analytics' },
      {
        value: settingsValue,
        isActive: isActive !== false,
        updatedBy: adminId,
        description: 'Google Analytics tracking configuration'
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({
      success: true,
      settings: updated.value,
      isActive: updated.isActive
    });
  } catch (error) {
    console.error('GA設定更新エラー:', error);
    res.status(500).json({ error: 'Google Analytics設定の更新に失敗しました' });
  }
});

// Google Analytics設定の削除（無効化）
router.delete('/google-analytics', authenticateToken, authenticateAdmin, async (req: any, res: Response): Promise<void> => {
  try {
    await SystemSettingsModel.findOneAndUpdate(
      { key: 'google_analytics' },
      { isActive: false },
      { new: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('GA設定削除エラー:', error);
    res.status(500).json({ error: 'Google Analytics設定の削除に失敗しました' });
  }
});

export default router;