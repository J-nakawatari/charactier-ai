import { Router, Response } from 'express';
import { SystemSettingsModel } from '../models/SystemSettingsModel';
import { createRateLimiter } from '../middleware/rateLimiter';

const router: Router = Router();

// レートリミッターを作成
const generalRateLimit = createRateLimiter('general');

// Google Analytics設定の取得（公開API - 認証不要）
router.get('/google-analytics', generalRateLimit, async (req: any, res: Response): Promise<void> => {
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


export default router;