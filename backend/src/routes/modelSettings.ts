import type { AuthRequest } from '../middleware/auth';
import { Router, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { calcTokensToGive, validateModel } from '../config/tokenConfig';

const router: Router = Router();

// 利用可能なモデル一覧
const AVAILABLE_MODELS = [
  {
    id: 'gpt-3.5-turbo', 
    name: 'GPT-3.5 Turbo',
    description: '開発・テスト用',
    cost: '$0.5/$1.5 per 1M tokens',
    recommended: false
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    description: '本番環境用 - 推奨',
    cost: '$0.15/$0.6 per 1M tokens',
    recommended: true
  }
];

/**
 * 利用可能なモデル一覧取得
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const modelsWithCalc = await Promise.all(AVAILABLE_MODELS.map(async model => ({
      ...model,
      tokensPerYen: await calcTokensToGive(1, model.id),
      sampleTokens: {
        500: await calcTokensToGive(500, model.id),
        1000: await calcTokensToGive(1000, model.id),
        2000: await calcTokensToGive(2000, model.id)
      }
    })));

    res.json({
      success: true,
      models: modelsWithCalc,
      currentModel: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    });
  } catch (error) {
    console.error('❌ Models取得エラー:', error);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

/**
 * 現在のモデル設定取得
 */
router.get('/current', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const currentModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const modelInfo = AVAILABLE_MODELS.find(m => m.id === currentModel);
    
    res.json({
      success: true,
      currentModel,
      modelInfo,
      tokensPerYen: await calcTokensToGive(1, currentModel),
      sampleCalculation: {
        500: await calcTokensToGive(500, currentModel),
        1000: await calcTokensToGive(1000, currentModel),
        2000: await calcTokensToGive(2000, currentModel)
      }
    });
  } catch (error) {
    console.error('❌ Current model取得エラー:', error);
    res.status(500).json({ error: 'Failed to get current model' });
  }
});

/**
 * モデル設定変更
 */
router.post('/set-model', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { model } = req.body;
    
    if (!model) {
      res.status(400).json({ error: 'Model is required' });
      return;
    }
    
    if (!validateModel(model)) {
      res.status(400).json({ error: 'Invalid model' });
      return;
    }
    
    // 環境変数を更新（実際のアプリケーションでは再起動が必要）
    process.env.OPENAI_MODEL = model;
    
    console.log(`🔄 Model changed to: ${model} by admin`);
    
    res.json({
      success: true,
      message: `Model changed to ${model}`,
      newModel: model,
      tokensPerYen: await calcTokensToGive(1, model),
      note: 'アプリケーションの再起動が推奨されます'
    });
  } catch (error) {
    console.error('❌ Model変更エラー:', error);
    res.status(500).json({ error: 'Failed to change model' });
  }
});

/**
 * モデル別料金シミュレーション
 */
router.post('/simulate', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { model, purchaseAmount } = req.body;
    
    if (!model || !purchaseAmount) {
      res.status(400).json({ error: 'Model and purchaseAmount are required' });
      return;
    }
    
    if (!validateModel(model)) {
      res.status(400).json({ error: 'Invalid model' });
      return;
    }
    
    const tokensToGive = await calcTokensToGive(purchaseAmount, model);
    const modelInfo = AVAILABLE_MODELS.find(m => m.id === model);
    
    res.json({
      success: true,
      simulation: {
        model,
        modelInfo,
        purchaseAmount,
        tokensToGive,
        profitMargin: 0.90,
        costRatio: 0.10
      }
    });
  } catch (error) {
    console.error('❌ Simulation エラー:', error);
    res.status(500).json({ error: 'Failed to simulate' });
  }
});

export default router;