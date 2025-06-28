const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const TokenService = require('../services/tokenService');
const { validatePricingConfig } = require('../config/pricing');
// const { getRedisClient } = require('../lib/redis');
const mongoose = require('mongoose');

// PurchaseHistoryModel の遅延インポート（Runtime時に実行）
let PurchaseHistoryModel = null;

// モデルを遅延で取得する関数
const getPurchaseHistoryModel = () => {
  if (!PurchaseHistoryModel) {
    try {
      // TypeScriptコンパイル後のモジュールパスで試行
      const modelModule = require('../dist/src/models/PurchaseHistoryModel');
      PurchaseHistoryModel = modelModule.PurchaseHistoryModel;
      console.log('✅ PurchaseHistoryModel インポート成功');
      return PurchaseHistoryModel;
    } catch (tsError) {
      console.error('❌ TypeScript モジュールインポートエラー:', tsError.message);
      try {
        // JSコンパイル済みファイルで試行
        const compiledModule = require('../dist/src/models/PurchaseHistoryModel');
        PurchaseHistoryModel = compiledModule.PurchaseHistoryModel;
        console.log('✅ PurchaseHistoryModel（コンパイル済み）インポート成功');
        return PurchaseHistoryModel;
      } catch (jsError) {
        console.error('❌ 全てのPurchaseHistoryModelインポートが失敗:', jsError.message);
        console.error('⚠️ 購入履歴記録機能は無効化されます');
        return null;
      }
    }
  }
  return PurchaseHistoryModel;
};

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
    // エラーメッセージをHTMLエスケープしてXSSを防止
    const safeErrorMessage = error.message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
    return res.status(400).send(`Webhook Error: ${safeErrorMessage}`);
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
    console.log('🔥 新しいwebhook処理が実行されています！');
    console.log('👤 顧客:', session.customer);
    console.log('💰 金額:', session.amount_total, session.currency);
    
    // 必要な情報を抽出
    const userId = session.metadata?.userId;
    const purchaseAmountYen = session.amount_total; // Stripeは最小通貨単位で返す
    const sessionId = session.id;
    
    // 価格IDから購入タイプを判別
    const fullSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items']
    });
    const priceId = fullSession.line_items.data[0].price.id;
    
    console.log('🔍 決済詳細:', {
      sessionId: sessionId,
      priceId: priceId,
      amount: purchaseAmountYen
    });
    
    // 価格IDからキャラクター購入かトークン購入かを判別
    const CharacterModel = require('../dist/src/models/CharacterModel').CharacterModel;
    const character = await CharacterModel.findOne({ stripeProductId: priceId });
    
    let purchaseType, characterId;
    if (character) {
      purchaseType = 'character';
      characterId = character._id;
      console.log(`🎭 キャラクター購入検出: ${character.name.ja || character.name.en}`);
    } else {
      purchaseType = 'token';
      console.log('🎁 トークン購入検出');
    }
    
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
    
    console.log(`🎁 購入処理開始... (タイプ: ${purchaseType})`);
    console.log(`👤 ユーザーID: ${userId}`);
    console.log(`💰 購入金額: ${purchaseAmountYen}円`);
    console.log(`🔑 セッションID: ${sessionId}`);
    
    if (purchaseType === 'character') {
      // キャラクター購入処理
      console.log(`🎭 キャラクター購入処理開始: ${characterId}`);
      await handleCharacterPurchase(userId, characterId, sessionId, purchaseAmountYen);
      
    } else {
      // トークン購入処理
      console.log('🎁 トークン付与処理...');
      
      let grantResult;
      
      // まず価格IDからTokenPackModelを検索
      try {
        const { TokenPackModel } = require('../dist/src/models/TokenPackModel');
        const tokenPack = await TokenPackModel.findOne({ priceId, isActive: true }).lean();
        
        if (tokenPack) {
          // 管理画面で設定されたトークン数を使用
          const tokensToGrant = tokenPack.tokens;
          console.log(`📦 TokenPack設定を使用:`);
          console.log(`  - 価格ID: ${priceId}`);
          console.log(`  - パック名: ${tokenPack.name}`);
          console.log(`  - 付与トークン数: ${tokensToGrant}`);
          console.log(`  - 価格: ￥${tokenPack.price}`);
          
          // 重複チェック
          const UserTokenPack = require('../models/UserTokenPack');
          const existingPack = await UserTokenPack.findOne({ stripeSessionId: sessionId });
          if (existingPack) {
            console.log(`⚠️ 重複付与防止: セッション ${sessionId} は既に処理済み`);
            grantResult = {
              success: false,
              reason: 'Already processed',
              tokensGranted: 0,
              newBalance: await TokenService.getUserTokenBalance(userId)
            };
          } else {
            // UserTokenPack レコード作成
            const newTokenPack = new UserTokenPack({
              userId,
              stripeSessionId: sessionId,
              purchaseAmountYen,
              tokensPurchased: tokensToGrant,
              tokensRemaining: tokensToGrant,
              isActive: true,
              purchaseDate: new Date()
            });
            await newTokenPack.save();
            
            // User.tokenBalance を更新
            const { UserModel } = require('../dist/src/models/UserModel');
            await UserModel.findByIdAndUpdate(userId, {
              $inc: { tokenBalance: tokensToGrant }
            });
            
            grantResult = {
              success: true,
              tokensGranted: tokensToGrant,
              newBalance: await TokenService.getUserTokenBalance(userId),
              purchaseAmountYen,
              profitMargin: tokenPack.profitMargin / 100 || 0.90,
              model: 'admin-configured'
            };
            
            console.log(`✅ TokenPack設定でトークン付与完了`);
          }
        } else {
          // TokenPackが見つからない場合は従来の計算方式にフォールバック
          console.log(`⚠️ 価格ID ${priceId} のTokenPackが見つかりません`);
          console.log(`📊 計算方式にフォールバック`);
          
          const currentModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
          console.log(`🤖 Webhook使用モデル: ${currentModel}`);
          
          grantResult = await TokenService.grantTokens(
            userId,
            sessionId,
            purchaseAmountYen,
            currentModel
          );
        }
      } catch (tokenPackError) {
        // TokenPackModel検索エラーの場合も計算方式にフォールバック
        console.error('❌ TokenPackModel検索エラー:', tokenPackError.message);
        console.log(`📊 計算方式にフォールバック`);
        
        const currentModel = process.env.OPENAI_MODEL || 'o4-mini';
        console.log(`🤖 Webhook使用モデル: ${currentModel}`);
        
        grantResult = await TokenService.grantTokens(
          userId,
          sessionId,
          purchaseAmountYen,
          currentModel
        );
      }
    
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
        
        // 🌊 SSE用購入完了データをRedis/メモリに保存
        // TODO: Redis処理を一時的にコメントアウト（Webhook成功確認のため）
        console.log('⚠️ SSE用データ保存はスキップ（デバッグ中）');
        
        // 📝 購入履歴をデータベースに記録
        const PurchaseModel = getPurchaseHistoryModel();
        if (PurchaseModel) {
          try {
            console.log('📝 購入履歴記録処理開始...');
            
            const purchaseRecord = await PurchaseModel.createFromStripeSession({
              userId: new mongoose.Types.ObjectId(userId),
              stripeSessionId: sessionId,
              stripePaymentIntentId: session.payment_intent,
              type: 'token', // トークン購入として記録
              amount: grantResult.tokensGranted,
              price: purchaseAmountYen,
              currency: session.currency || 'jpy',
              status: 'completed',
              paymentMethod: session.payment_method_types?.[0] || 'card',
              details: `${grantResult.tokensGranted}トークン購入`,
              description: `Stripe経由でのトークン購入 - ${grantResult.tokensGranted}トークン`,
              metadata: {
                profitMargin: grantResult.profitMargin,
                originalAmount: purchaseAmountYen,
                grantedTokens: grantResult.tokensGranted
              },
              stripeData: {
                sessionId: sessionId,
                paymentIntentId: session.payment_intent,
                customerId: session.customer,
                mode: session.mode
              }
            });
            
            console.log('✅ 購入履歴記録成功:', {
              recordId: purchaseRecord._id,
              userId: userId,
              type: 'token',
              amount: grantResult.tokensGranted,
              price: purchaseAmountYen
            });
            
          } catch (purchaseHistoryError) {
            // 購入履歴記録エラーはWebhook処理全体を失敗させない
            console.error('⚠️ 購入履歴記録エラー（トークン付与は成功）:', purchaseHistoryError);
            console.error('🔍 購入履歴エラー詳細:', {
              userId: userId,
              sessionId: sessionId,
              error: purchaseHistoryError.message
            });
          }
        } else {
          console.log('⚠️ PurchaseHistoryModel が利用できません - 購入履歴記録をスキップ');
        }
      
      // TODO: 必要に応じてユーザーへの通知メール送信
      // await sendPurchaseConfirmationEmail(userId, grantResult);
      
      } else {
        console.log('⚠️ トークン付与スキップ:', grantResult.reason);
      }
    }
    
  } catch (error) {
    console.error('❌ チェックアウトセッション処理エラー:', error);
    throw error; // 上位の catch で処理
  }
}

/**
 * キャラクター購入処理
 * @param {string} userId - ユーザーID
 * @param {string} characterId - キャラクターID
 * @param {string} sessionId - StripeセッションID
 * @param {number} purchaseAmountYen - 購入金額（円）
 */
async function handleCharacterPurchase(userId, characterId, sessionId, purchaseAmountYen) {
  try {
    // UserModelでpurchasedCharactersにキャラクターIDを追加
    const { UserModel } = require('../src/models/UserModel');
    
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error(`ユーザーが見つかりません: ${userId}`);
    }
    
    // 既に購入済みかチェック
    if (user.purchasedCharacters && user.purchasedCharacters.includes(characterId)) {
      console.log('⚠️ キャラクターは既に購入済みです:', { userId, characterId });
      return;
    }
    
    // キャラクターを購入済みリストに追加
    await UserModel.findByIdAndUpdate(userId, {
      $addToSet: { purchasedCharacters: characterId }
    });
    
    console.log('✅ キャラクター購入完了:', {
      userId,
      characterId,
      sessionId,
      amount: purchaseAmountYen
    });
    
    // 購入履歴に記録
    const { PurchaseHistoryModel } = require('../src/models/PurchaseHistoryModel');
    
    if (PurchaseHistoryModel) {
      try {
        const purchaseRecord = await PurchaseHistoryModel.create({
          userId,
          stripeSessionId: sessionId,
          type: 'character',
          characterId: characterId,
          price: purchaseAmountYen,
          currency: 'jpy',
          status: 'completed',
          paymentMethod: 'card',
          details: `キャラクター購入`,
          description: `Stripe経由でのキャラクター購入`,
          metadata: {
            characterId: characterId,
            originalAmount: purchaseAmountYen
          },
          stripeData: {
            sessionId: sessionId
          }
        });
        
        console.log('✅ キャラクター購入履歴記録成功:', {
          recordId: purchaseRecord._id,
          userId,
          characterId,
          price: purchaseAmountYen
        });
        
      } catch (purchaseHistoryError) {
        console.error('⚠️ キャラクター購入履歴記録エラー:', purchaseHistoryError);
      }
    }
    
  } catch (error) {
    console.error('❌ キャラクター購入処理エラー:', error);
    throw error;
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
    const tokenPlans = await TokenService.getTokenPlans();
    
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