import { Router, Request, Response } from 'express';
import { getFeatureFlags } from '../config/featureFlags';
import log from '../utils/logger';

const router: Router = Router();

/**
 * 公開Feature Flagエンドポイント
 * フロントエンドが現在有効なFeature Flagを確認できる
 */
router.get('/public', (req: Request, res: Response): void => {
  try {
    const flags = getFeatureFlags();
    
    // クライアントに公開しても安全なフラグのみ返す
    const publicFlags = {
      SECURE_COOKIE_AUTH: flags.SECURE_COOKIE_AUTH,
      // 他の公開可能なフラグはここに追加
    };
    
    log.debug('Feature flags requested', { 
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      publicFlags 
    });
    
    res.json({
      success: true,
      flags: publicFlags
    });
  } catch (error) {
    log.error('Error fetching feature flags', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feature flags'
    });
  }
});

export default router;