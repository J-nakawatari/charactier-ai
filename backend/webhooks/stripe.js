const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const TokenService = require('../services/tokenService');
const { validatePricingConfig } = require('../config/pricing');

const router = express.Router();

/**
 * Stripe Webhook（簡素化版）
 * 50%利益保証を確実に実現する自動トークン付与システム
 */

// Webhook署名検証ミドルウェア
const verifyStripeSignature = (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET環境変数が設定されていません');
      return res.status(500).send('Webhook secret not configured');
    }
    
    // Stripe署名検証
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    req.stripeEvent = event;
    
    console.log(`✅ Stripe署名検証成功: ${event.type}`);
    next();
    
  } catch (error) {
    console.error('❌ Stripe署名検証エラー:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

// 重複処理防止ミドルウェア
const preventDuplicateProcessing = async (req, res, next) => {
  const event = req.stripeEvent;
  
  try {
    // イベントIDによる重複チェック（簡易実装）
    const eventId = event.id;
    const cacheKey = `stripe_event_${eventId}`;
    
    // 実際の実装では Redis などを使用することを推奨
    // ここでは簡単な in-memory チェック
    if (global.processedStripeEvents && global.processedStripeEvents.has(eventId)) {
      console.log(`⚠️ 重複イベント検出: ${eventId}`);
      return res.json({ received: true, duplicate: true });
    }
    
    // イベントを処理済みとしてマーク
    if (!global.processedStripeEvents) {
      global.processedStripeEvents = new Set();
    }
    global.processedStripeEvents.add(eventId);
    
    // 古いイベントIDをクリーンアップ（1000件を超えた場合）
    if (global.processedStripeEvents.size > 1000) {
      const eventsArray = Array.from(global.processedStripeEvents);
      global.processedStripeEvents = new Set(eventsArray.slice(-500));
    }
    
    next();
    
  } catch (error) {
    console.error('❌ 重複処理防止エラー:', error);
    next(); // エラーが発生してもWebhook処理は続行
  }
};

// POST /webhooks/stripe - Stripe Webhook エンドポイント
router.post('/stripe', 
  express.raw({ type: 'application/json' }), // 生のボディを取得
  verifyStripeSignature,
  preventDuplicateProcessing,
  async (req, res) => {
    const event = req.stripeEvent;
    
    try {
      console.log(`🔔 Stripeイベント受信: ${event.type}`);
      console.log(`📋 イベントID: ${event.id}`);
      
      // イベントタイプ別の処理
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event);
          break;
          
        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event);
          break;
          
        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event);
          break;
          
        case 'customer.subscription.created':
          console.log('📝 サブスクリプション作成（今回は対象外）');
          break;
          
        case 'invoice.payment_succeeded':
          console.log('📝 請求書決済成功（今回は対象外）');
          break;
          
        default:
          console.log(`ℹ️ 未対応イベント: ${event.type}`);
          break;
      }
      
      // 成功レスポンス
      res.json({ 
        received: true, 
        eventType: event.type,
        eventId: event.id,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Webhook処理エラー:', error);
      
      // エラー詳細をログに記録
      console.error('🔍 エラー詳細:', {
        eventType: event.type,
        eventId: event.id,
        error: error.message,
        stack: error.stack,
        eventData: JSON.stringify(event.data, null, 2)
      });
      
      // Stripeには500エラーを返して再試行を促す
      res.status(500).json({
        error: 'Internal server error',
        eventId: event.id,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * チェックアウトセッション完了の処理
 * @param {Object} event - Stripeイベント
 */
async function handleCheckoutSessionCompleted(event) {
  try {
    const session = event.data.object;
    
    console.log('💳 チェックアウトセッション完了:', session.id);
    console.log('👤 顧客:', session.customer);
    console.log('💰 金額:', session.amount_total, session.currency);
    
    // 必要な情報を抽出
    const userId = session.metadata?.userId;
    const purchaseAmountYen = session.amount_total; // Stripeは最小通貨単位で返す
    const sessionId = session.id;
    
    // バリデーション
    if (!userId) {
      throw new Error('ユーザーIDがセッションメタデータに含まれていません');
    }
    
    if (!purchaseAmountYen || purchaseAmountYen <= 0) {
      throw new Error(`無効な購入金額: ${purchaseAmountYen}`);
    }
    
    if (session.currency !== 'jpy') {
      console.warn(`⚠️ 通貨が円ではありません: ${session.currency}`);
    }
    
    // 設定検証
    const configValidation = validatePricingConfig();
    if (!configValidation.valid) {
      console.error('❌ 価格設定エラー:', configValidation.errors);
      throw new Error('価格設定に問題があります');
    }
    
    console.log('🎁 トークン付与処理開始...');
    console.log(`👤 ユーザーID: ${userId}`);
    console.log(`💰 購入金額: ${purchaseAmountYen}円`);
    console.log(`🔑 セッションID: ${sessionId}`);
    
    // 🎯 自動計算でトークン付与（50%利益保証）
    const grantResult = await TokenService.grantTokens(
      userId,
      sessionId,
      purchaseAmountYen
    );
    
    if (grantResult.success) {
      console.log('✅ トークン付与成功:', {
        ユーザーID: userId,
        付与トークン数: grantResult.tokensGranted,
        新しい残高: grantResult.newBalance,
        購入金額: `${purchaseAmountYen}円`,
        利益率: `${(grantResult.profitMargin * 100)}%`
      });
      
      // Stripe決済成功ログ（管理者向け）
      console.log(`📊 決済完了サマリー:`, {
        sessionId: sessionId,
        userId: userId,
        amount: `${purchaseAmountYen}円`,
        tokensGranted: grantResult.tokensGranted,
        profitMargin: `${(grantResult.profitMargin * 100)}%`,
        timestamp: new Date().toISOString()
      });
      
      // TODO: 必要に応じてユーザーへの通知メール送信
      // await sendPurchaseConfirmationEmail(userId, grantResult);
      
    } else {
      console.log('⚠️ トークン付与スキップ:', grantResult.reason);
    }
    
  } catch (error) {
    console.error('❌ チェックアウトセッション処理エラー:', error);
    throw error; // 上位の catch で処理
  }
}

/**
 * 決済成功の処理
 * @param {Object} event - Stripeイベント
 */
async function handlePaymentIntentSucceeded(event) {
  try {
    const paymentIntent = event.data.object;
    
    console.log('💰 決済成功:', paymentIntent.id);
    console.log('💰 金額:', paymentIntent.amount, paymentIntent.currency);
    
    // 必要に応じて追加処理
    // 通常はcheckout.session.completedで処理するため、ここでは主にログのみ
    
  } catch (error) {
    console.error('❌ 決済成功処理エラー:', error);
    throw error;
  }
}

/**
 * 決済失敗の処理
 * @param {Object} event - Stripeイベント
 */
async function handlePaymentIntentFailed(event) {
  try {
    const paymentIntent = event.data.object;
    
    console.log('❌ 決済失敗:', paymentIntent.id);
    console.log('💰 金額:', paymentIntent.amount, paymentIntent.currency);
    console.log('❌ エラー:', paymentIntent.last_payment_error?.message);
    
    // TODO: 必要に応じて管理者への通知
    // TODO: ユーザーへの決済失敗通知
    
  } catch (error) {
    console.error('❌ 決済失敗処理エラー:', error);
    throw error;
  }
}

// GET /webhooks/test - Webhook動作テスト用エンドポイント（開発用）
router.get('/test', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not found' });
    }
    
    // テスト用の設定検証
    const configValidation = validatePricingConfig();
    const tokenPlans = TokenService.getTokenPlans();
    
    res.json({
      message: 'Stripe Webhook Test Endpoint',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      configValidation,
      tokenPlans,
      stripeKeys: {
        publicKey: process.env.STRIPE_PUBLISHABLE_KEY ? '設定済み' : '未設定',
        secretKey: process.env.STRIPE_SECRET_KEY ? '設定済み' : '未設定',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? '設定済み' : '未設定'
      }
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Test endpoint error',
      message: error.message
    });
  }
});

// POST /webhooks/test-grant - トークン付与テスト（開発用）
router.post('/test-grant', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not found' });
    }
    
    const { userId, purchaseAmountYen } = req.body;
    
    if (!userId || !purchaseAmountYen) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'purchaseAmountYen']
      });
    }
    
    // テスト用セッションIDを生成
    const testSessionId = `test_session_${Date.now()}`;
    
    const result = await TokenService.grantTokens(
      userId,
      testSessionId,
      purchaseAmountYen
    );
    
    res.json({
      message: 'Test grant completed',
      result,
      testSessionId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Test grant error',
      message: error.message
    });
  }
});

module.exports = router;