import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ServerMonitor } from '../monitoring/ServerMonitor';
import type { Router as ExpressRouter } from 'express';

const router: ExpressRouter = Router();

// ヘルスチェックAPI（管理者のみ）
router.get('/health', authenticateToken, async (req: Request, res: Response) => {
  try {
    // 管理者権限チェック（仮実装）
    // TODO: 実際の管理者権限チェックを実装
    
    const monitor = ServerMonitor.getInstance();
    const healthStatus = monitor.getHealthStatus();
    
    res.json(healthStatus);
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'ヘルスチェックに失敗しました'
    });
  }
});

// 監視データ取得API（管理者のみ）
router.get('/monitoring', authenticateToken, async (req: Request, res: Response) => {
  try {
    // 管理者権限チェック（仮実装）
    // TODO: 実際の管理者権限チェックを実装
    
    const period = req.query.period as string || '1h';
    const monitor = ServerMonitor.getInstance();
    const monitoringData = monitor.getMonitoringData(period);
    
    res.json(monitoringData);
  } catch (error) {
    console.error('❌ Monitoring data error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '監視データの取得に失敗しました'
    });
  }
});

export default router;