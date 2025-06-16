import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import OpenAI from 'openai';
import { LocalizedString, ensureUserNameString } from './types';
import { TokenPackModel, ITokenPack } from './models/TokenPackModel';
import { getRedisClient } from '../lib/redis';
import { UserModel, IUser } from './models/UserModel';
import { AdminModel, IAdmin } from './models/AdminModel';
import { ChatModel, IChat, IMessage } from './models/ChatModel';
import { CharacterModel, ICharacter } from './models/CharacterModel';
import { PurchaseHistoryModel } from './models/PurchaseHistoryModel';
import { NotificationModel } from './models/NotificationModel';
import { UserNotificationReadStatusModel } from './models/UserNotificationReadStatusModel';
import { authenticateToken, AuthRequest } from './middleware/auth';
import authRoutes from './routes/auth';
import characterRoutes from './routes/characters';
import modelRoutes from './routes/modelSettings';
import notificationRoutes from './routes/notifications';
// const userRoutes = require('./routes/user');
// const dashboardRoutes = require('./routes/dashboard');
import { validateMessage } from './utils/contentFilter';
import TokenUsage from '../models/TokenUsage';
import CharacterPromptCache from '../models/CharacterPromptCache';
import {
  getCachePerformanceMetrics,
  getCacheStatsByCharacter,
  getTopPerformingCaches,
  getCacheInvalidationStats,
  performCacheCleanup,
  invalidateCharacterCache
} from './utils/cacheAnalytics';
import { applyMoodTrigger } from './services/moodEngine';
import { startAllMoodJobs, startExchangeRateJob } from './scripts/moodDecay';
import { initializeExchangeRate } from './scripts/exchangeRateJob';
import { 
  errorLoggingMiddleware, 
  responseTimeMiddleware, 
  statusCodeLoggerMiddleware 
} from './middleware/errorLogger';
import { APIErrorModel } from './models/APIError';
import { ExchangeRateModel } from './models/ExchangeRate';
import { calcTokensToGive, logTokenConfig } from './config/tokenConfig';
const TokenService = require('../services/tokenService');
import routeRegistry from './core/RouteRegistry';

dotenv.config({ path: './.env' });

const app = express();
routeRegistry.setApp(app);
// ★ 新: 環境変数優先、無ければ 5000
const PORT = process.env.PORT || 5000;

// MongoDB接続
let isMongoConnected = false;
const connectMongoDB = async () => {
  console.log('🔍 MongoDB connection attempt...');
  console.log('🔍 MONGO_URI exists:', !!process.env.MONGO_URI);
  
  if (process.env.MONGO_URI) {
    try {
      console.log('🔄 Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGO_URI);
      isMongoConnected = true;
      console.log('🍃 MongoDB connected successfully');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error; // Fail if MongoDB connection fails
    }
  } else {
    throw new Error('MONGO_URI is required');
  }
};

// Stripe インスタンス初期化
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-05-28.basil' // 最新のAPIバージョン
  });
  console.log('🔥 Stripe SDK initialized with real API');
} else {
  console.error('❌ STRIPE_SECRET_KEY is required');
}

// OpenAI インスタンス初期化
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('🤖 OpenAI SDK initialized');
} else {
  console.error('❌ OPENAI_API_KEY is required');
}

console.log('🚀 PORT:', PORT);

// 🚀 プロンプトキャッシュ対応チャット応答生成関数
const generateChatResponse = async (characterId: string, userMessage: string, conversationHistory: any[] = [], userId?: string): Promise<{ content: string; tokensUsed: number; systemPrompt: string; cacheHit: boolean }> => {
  const startTime = Date.now();
  
  // キャラクター情報を取得
  const character = await CharacterModel.findById(characterId);
  if (!character || !character.isActive) {
    throw new Error('Character not found');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  let systemPrompt = '';
  let cacheHit = false;

  // 🔧 プロンプトキャッシュシステムの実装
  if (userId && isMongoConnected) {
    try {
      console.log('🔍 Checking CharacterPromptCache...');
      
      // キャッシュ検索（親密度レベル±5で検索）
      const baseAffinityLevel = 50; // デフォルト親密度（実際のユーザー親密度に後で置き換え）
      const affinityRange = 5;
      
      const cachedPrompt = await CharacterPromptCache.findOne({
        userId: userId,
        characterId: characterId,
        'promptConfig.affinityLevel': {
          $gte: Math.max(0, baseAffinityLevel - affinityRange),
          $lte: Math.min(100, baseAffinityLevel + affinityRange)
        },
        'promptConfig.languageCode': 'ja',
        ttl: { $gt: new Date() }, // TTL未期限切れ
        characterVersion: '1.0.0'
      }).sort({ 
        useCount: -1, // 使用回数順
        lastUsed: -1  // 最終使用日順
      });

      if (cachedPrompt) {
        // 🎯 キャッシュヒット！
        console.log('✅ CharacterPromptCache HIT:', {
          cacheId: cachedPrompt._id,
          useCount: cachedPrompt.useCount,
          affinityLevel: cachedPrompt.promptConfig.affinityLevel,
          generationTime: cachedPrompt.generationTime
        });
        
        systemPrompt = cachedPrompt.systemPrompt;
        cacheHit = true;
        
        // キャッシュ使用統計を更新
        cachedPrompt.lastUsed = new Date();
        cachedPrompt.useCount += 1;
        await cachedPrompt.save();
        
      } else {
        console.log('❌ CharacterPromptCache MISS - generating new prompt...');
      }
    } catch (cacheError) {
      console.error('⚠️ CharacterPromptCache error (non-critical):', cacheError);
    }
  }

  // キャッシュがない場合は新規生成
  if (!systemPrompt) {
    console.log('🔨 Generating new system prompt...');
    
    // 🎭 現在の気分状態を取得してプロンプトに反映
    let moodInstruction = '';
    if (userId) {
      try {
        const user = await UserModel.findById(userId);
        if (user) {
          const affinity = user.affinities.find(
            aff => aff.character.toString() === characterId
          );
          
          if (affinity && affinity.emotionalState) {
            const moodToneMap: Record<string, string> = {
              excited: 'より元気で弾むような口調に',
              melancholic: '少し寂しげで静かな口調に',
              happy: '明るく楽しげな口調に',
              sad: 'やや控えめで優しい口調に',
              angry: '少し感情的でエネルギッシュな口調に',
              neutral: '通常のトーンで'
            };
            
            moodInstruction = `

現在このキャラクターのムードは「${affinity.emotionalState}」です。
${moodToneMap[affinity.emotionalState] || '通常のトーンで'}`;
            
            console.log(`🎭 Mood applied to system prompt: ${affinity.emotionalState}`);
          }
        }
      } catch (moodError) {
        console.error('❌ Failed to apply mood to system prompt:', moodError);
      }
    }
    
    systemPrompt = `あなたは${character.name.ja}というキャラクターです。
性格: ${character.personalityPreset || '優しい'}
特徴: ${character.personalityTags?.join(', ') || '親しみやすい'}
説明: ${character.description.ja}${moodInstruction}

【会話スタンス】
あなたは相手の話し相手として会話します。アドバイスや解決策を提示するのではなく、人間らしい自然な反応や共感を示してください。相手の感情や状況に寄り添い、「そうなんだ」「大変だったね」「わかる」といった、友達同士のような気持ちの共有を大切にしてください。

以下の特徴に従って、一人称と話し方でユーザーと自然な会話をしてください：
- ${character.personalityTags?.join('\n- ') || '優しく親しみやすい会話'}
- 約50-150文字程度で返答してください
- 絵文字を適度に使用してください`;

    // キャッシュサイズ制限（8000文字超の場合は要約）
    if (systemPrompt.length > 8000) {
      console.log(`⚠️ System prompt too long (${systemPrompt.length} chars), truncating to 8000`);
      systemPrompt = systemPrompt.substring(0, 8000) + '...';
    }

    // 新規プロンプトをキャッシュに保存
    if (userId && isMongoConnected) {
      try {
        const generationTime = Date.now() - startTime;
        
        const newCache = new CharacterPromptCache({
          userId: userId,
          characterId: characterId,
          systemPrompt: systemPrompt,
          promptConfig: {
            affinityLevel: 50, // デフォルト親密度
            personalityTags: character.personalityTags || [],
            toneStyle: 'friendly',
            moodModifiers: [],
            languageCode: 'ja'
          },
          createdAt: new Date(),
          lastUsed: new Date(),
          useCount: 1,
          ttl: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
          characterVersion: '1.0.0',
          promptVersion: '1.0.0',
          generationTime: generationTime,
          promptLength: systemPrompt.length,
          compressionRatio: 1.0
        });
        
        await newCache.save();
        console.log('💾 New prompt cached:', {
          promptLength: systemPrompt.length,
          generationTime: generationTime
        });
        
      } catch (saveError) {
        console.error('⚠️ Failed to save prompt cache (non-critical):', saveError);
      }
    }
  }

  if (openai) {
    // 実際のOpenAI API呼び出し
    try {
      console.log('🤖 Using OpenAI API:', model, cacheHit ? '(Cache HIT)' : '(Cache MISS)');
      
      // 実際に生成されたプロンプトをログ出力
      console.log('🎭 Generated system prompt for character:', character.name.ja);
      console.log('📝 System prompt content:');
      console.log('='.repeat(50));
      console.log(systemPrompt);
      console.log('='.repeat(50));

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory,
        { role: 'user' as const, content: userMessage }
      ];

      const completion = await openai.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: 200,
        temperature: 0.8
      });

      const responseContent = completion.choices[0]?.message?.content || 'すみません、うまく答えられませんでした...';
      const tokensUsed = completion.usage?.total_tokens || 150;

      console.log('✅ OpenAI API response generated:', {
        character: character.name.ja,
        tokensUsed,
        responseLength: responseContent.length
      });

      return {
        content: responseContent,
        tokensUsed,
        systemPrompt,
        cacheHit
      };

    } catch (error) {
      console.error('❌ OpenAI API error:', error);
      throw new Error('AI応答の生成に失敗しました');
    }
  } else {
    throw new Error('OpenAI API is not configured');
  }
};

// 環境変数チェック
const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  console.error('Please set these variables in your .env file');
  process.exit(1);
}

console.log('✅ All required environment variables are set');

// MongoDB接続を初期化
connectMongoDB();

// CORS設定（Webhookの前に設定）
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001',
    'https://charactier-ai.com',
    'https://www.charactier-ai.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-auth-token', 'stripe-signature']
}));

// エラーロギング用ミドルウェア（CORS後、認証前に設定）
app.use(responseTimeMiddleware);
app.use(statusCodeLoggerMiddleware);

// ⚠️ IMPORTANT: Stripe webhook MUST come BEFORE express.json()
// Stripe webhook endpoint (needs raw body)
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response): Promise<void> => {
  console.log('🔔 Stripe Webhook received (CLI)');
  
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!stripe || !webhookSecret) {
      console.error('❌ Stripe or webhook secret not configured');
      res.status(500).json({ error: 'Stripe not configured' });
      return;
    }
    
    console.log('🔥 Stripe signature verification');
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log('✅ Stripe signature verified');

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💳 チェックアウトセッション完了:', session.id);
        console.log('🔥 新しいwebhook処理が実行されています！');
        
        const userId = session.metadata?.userId;
        const purchaseAmountYen = session.amount_total;
        const sessionId = session.id;
        
        if (!userId || !purchaseAmountYen) {
          console.error('❌ 必要な購入データが不足:', { userId, purchaseAmountYen });
          break;
        }
        
        // 価格IDから購入タイプを判別
        if (!stripe) {
          console.error('❌ Stripe not initialized');
          break;
        }
        
        const fullSession = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['line_items']
        });
        
        if (!fullSession.line_items?.data?.[0]?.price?.id) {
          console.error('❌ 価格ID取得失敗');
          break;
        }
        
        const priceId = fullSession.line_items.data[0].price.id;
        
        console.log('🔍 決済詳細:', {
          sessionId: sessionId,
          priceId: priceId,
          amount: purchaseAmountYen
        });
        
        // 価格IDからキャラクター購入かトークン購入かを判別
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
        
        if (purchaseType === 'character' && character && characterId) {
          // キャラクター購入処理
          console.log(`🎭 キャラクター購入処理開始: ${characterId}`);
          
          try {
            // ユーザーの購入済みキャラクターに追加
            const user = await UserModel.findById(userId);
            if (!user) {
              console.error('❌ ユーザーが見つかりません:', userId);
              break;
            }
            
            if (!user.purchasedCharacters.includes(characterId)) {
              user.purchasedCharacters.push(characterId);
              await user.save();
              console.log('✅ キャラクター購入完了:', character.name.ja || character.name.en);
            }
            
            // キャラクター購入履歴を記録
            const purchaseRecord = await PurchaseHistoryModel.createFromStripeSession({
              userId: new mongoose.Types.ObjectId(userId),
              stripeSessionId: sessionId,
              stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
              type: 'character',
              amount: 1, // キャラクター1体
              price: purchaseAmountYen,
              currency: session.currency || 'jpy',
              status: 'completed',
              paymentMethod: session.payment_method_types?.[0] || 'card',
              details: `${character.name.ja || character.name.en}キャラクター購入`,
              description: `Stripe経由でのキャラクター購入 - ${character.name.ja || character.name.en}`,
              metadata: {
                characterId: characterId.toString(),
                characterName: character.name.ja || character.name.en
              },
              stripeData: {
                sessionId: sessionId,
                paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
                customerId: session.customer,
                mode: session.mode
              }
            });
            
            console.log('✅ キャラクター購入履歴記録成功:', {
              recordId: purchaseRecord._id,
              userId: userId,
              type: 'character',
              characterName: character.name.ja || character.name.en
            });
            
            // SSE用キャラクター購入完了データをRedisに保存
            try {
              const redis = await getRedisClient();
              const purchaseCompleteData = {
                success: true,
                type: 'character',
                characterId: characterId.toString(),
                characterName: character.name.ja || character.name.en,
                purchaseAmountYen,
                timestamp: new Date().toISOString()
              };
              
              // SSE用データを保存（60秒で自動削除）
              await redis.set(`purchase:${sessionId}`, JSON.stringify(purchaseCompleteData), { EX: 60 });
              console.log('✅ SSE用キャラクター購入完了データ保存:', sessionId);
            } catch (sseError) {
              console.error('⚠️ SSE用データ保存失敗:', sseError);
            }
            
          } catch (error) {
            console.error('❌ キャラクター購入処理エラー:', error);
          }
          
        } else {
          // トークン購入処理（従来の処理）
          console.log('🎁 トークン付与処理...');
          
          // 現在の使用モデルを取得（環境変数 or デフォルト）
          const currentModel = process.env.OPENAI_MODEL || 'o4-mini';
          
          // トークン付与処理
          const grantResult = await TokenService.grantTokens(userId, sessionId, purchaseAmountYen, currentModel);
        
          if (grantResult.success) {
            console.log('✅ トークン付与完了:', grantResult.tokensGranted);
            
            // 🎭 購入金額に基づいてGIFTムードトリガーを適用
            if (purchaseAmountYen >= 500) {
              try {
                const user = await UserModel.findById(userId);
                if (user?.selectedCharacter) {
                  await applyMoodTrigger(
                    userId,
                    user.selectedCharacter.toString(),
                    { kind: 'GIFT', value: purchaseAmountYen }
                  );
                  console.log('🎭 GIFT ムードトリガー適用完了');
                }
              } catch (moodError) {
                console.error('⚠️ ムードトリガー適用失敗:', moodError);
              }
            }
            
            // 📝 購入履歴をデータベースに記録
            try {
              console.log('📝 購入履歴記録処理開始...');
              
              const purchaseRecord = await PurchaseHistoryModel.createFromStripeSession({
                userId: new mongoose.Types.ObjectId(userId),
                stripeSessionId: sessionId,
                stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
                type: 'token',
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
                  paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
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
              console.error('⚠️ 購入履歴記録エラー（トークン付与は成功）:', purchaseHistoryError);
              console.error('🔍 購入履歴エラー詳細:', {
                userId: userId,
                sessionId: sessionId,
                error: purchaseHistoryError instanceof Error ? purchaseHistoryError.message : String(purchaseHistoryError)
              });
            }

            // SSE用購入完了データをRedis/メモリに保存
            try {
              const redis = await getRedisClient();
              const purchaseCompleteData = {
                success: true,
                type: 'token',
                addedTokens: grantResult.tokensGranted,
                newBalance: grantResult.newBalance,
                purchaseAmountYen,
                timestamp: new Date().toISOString()
              };
              
              // SSE用データを保存（60秒で自動削除）
              await redis.set(`purchase:${sessionId}`, JSON.stringify(purchaseCompleteData), { EX: 60 });
              console.log('✅ SSE用購入完了データ保存:', sessionId);
            } catch (sseError) {
              console.error('⚠️ SSE用データ保存失敗:', sseError);
            }
          }
        }
        break;
      }
      
      default:
        console.log(`⚠️ 未処理のWebhookイベント: ${event.type}`);
    }

    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('❌ Webhook処理エラー:', error);
    console.error('❌ エラー詳細:', {
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// JSON body parser (AFTER Stripe webhook)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 認証ルート
app.use('/api/auth', authRoutes);

// ユーザールート
// app.use('/api/user', userRoutes);

// 管理者ルート - モデル設定
app.use('/api/admin', modelRoutes);

// 管理者ルート - その他
import adminUsersRoutes from './routes/adminUsers';
import adminTokenPacksRoutes from './routes/adminTokenPacks';
import adminTokenUsageRoutes from './routes/adminTokenUsage';

routeRegistry.mount('/admin/users', adminUsersRoutes);
routeRegistry.mount('/api/admin/token-packs', adminTokenPacksRoutes);
routeRegistry.mount('/api/admin/token-usage', adminTokenUsageRoutes);

// デバッグ: 登録されたルートを出力
console.log('🔧 Registered admin routes:');
console.log('  GET /api/admin/models');
console.log('  GET /api/admin/models/current');
console.log('  POST /api/admin/models/set-model');
console.log('  POST /api/admin/models/simulate');
console.log('  GET /admin/users');
console.log('  POST /admin/users/:userId/reset-tokens');
console.log('  PUT /admin/users/:userId/status');
console.log('  GET /api/admin/token-packs');
console.log('  POST /api/admin/token-packs');
console.log('  GET /api/admin/token-usage');
console.log('  GET /api/admin/token-usage/daily-stats');
console.log('  GET /api/admin/stats');

// 静的ファイル配信（アップロードされた画像）
app.use('/uploads', express.static(path.join(__dirname, '../../uploads'), {
  maxAge: '365d', // 1年キャッシュ
  etag: true,
  setHeaders: (res, filePath) => {
    // PNGファイルの場合、明示的にContent-Typeを設定
    if (filePath.toLowerCase().endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.toLowerCase().endsWith('.jpg') || filePath.toLowerCase().endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.toLowerCase().endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (filePath.toLowerCase().endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }
  }
}));

// キャラクタールート
routeRegistry.mount('/api/characters', characterRoutes);

// お知らせルート（ユーザー用 + 管理者用）
routeRegistry.mount('/api/notifications', notificationRoutes);

// Dashboard API
// routeRegistry.mount('/api/user/dashboard', dashboardRoutes);

// ユーザーダッシュボード情報取得
routeRegistry.define('GET', '/api/user/dashboard', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // ユーザー基本情報を取得
    const user = await UserModel.findById(userId)
      .select('_id email name createdAt lastLogin affinities tokenBalance totalSpent selectedCharacter purchasedCharacters')
      .populate('purchasedCharacters', '_id name')
      .populate('affinities.character', '_id name imageCharacterSelect themeColor');

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // トークン使用状況
    const tokenUsage = await TokenUsage.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { 
        $group: {
          _id: null,
          totalUsed: { $sum: '$tokensUsed' },
          totalCost: { $sum: '$cost' }
        }
      }
    ]);

    // 最近のチャット（最新3件）
    const recentChats = await ChatModel.find({ userId })
      .populate('characterId', 'name imageCharacterSelect')
      .sort({ lastActivityAt: -1 })
      .limit(3)
      .select('characterId lastActivityAt messages');

    // デバッグログ：populateの結果を確認
    console.log('🔍 Dashboard API - Recent Chats Raw:', JSON.stringify(recentChats, null, 2));
    console.log('🔍 Dashboard API - First Chat characterId:', recentChats[0]?.characterId);
    console.log('🔍 Dashboard API - First Chat characterId type:', typeof recentChats[0]?.characterId);

    // 親密度情報をフロントエンドが期待する形式に変換
    const affinities = await Promise.all((user.affinities || []).map(async (affinity: any) => {
      // キャラクターがpopulateされていない場合は手動で取得
      let character = affinity.character;
      if (!character || typeof character === 'string' || character instanceof mongoose.Types.ObjectId) {
        console.log('⚠️ Affinity character not populated:', character);
        const characterDoc = await CharacterModel.findById(character).select('_id name imageCharacterSelect themeColor');
        if (!characterDoc) {
          console.error('❌ Character not found for affinity:', character);
          return null;
        }
        character = characterDoc;
      }

      // デフォルト値を設定
      return {
        character: {
          _id: character._id,
          name: character.name || { ja: '不明なキャラクター', en: 'Unknown Character' },
          imageCharacterSelect: character.imageCharacterSelect || '/images/default-avatar.png',
          themeColor: character.themeColor || '#8B5CF6'
        },
        level: affinity.level || 0,
        experience: affinity.experience || 0,
        experienceToNext: affinity.experienceToNext || 10,
        maxExperience: 100, // 固定値
        unlockedImages: affinity.unlockedImages || [],
        nextUnlockLevel: Math.floor((affinity.level || 0) / 10 + 1) * 10
      };
    }));

    // nullを除外
    const validAffinities = affinities.filter(a => a !== null);

    // recentChatsをフロントエンドが期待する形式に変換
    const formattedRecentChats = await Promise.all(recentChats.map(async (chat) => {
      // デバッグログ：各チャットのcharacterIdを確認
      console.log('🔍 Formatting chat:', {
        chatId: chat._id,
        characterId: chat.characterId,
        characterIdType: typeof chat.characterId,
        isPopulated: chat.characterId && typeof chat.characterId === 'object'
      });

      // populateが失敗した場合の処理
      let character: any = chat.characterId;
      if (typeof character === 'string' || character instanceof mongoose.Types.ObjectId) {
        // characterIdが文字列またはObjectIdの場合（populate失敗）、手動でCharacterを取得
        console.log('⚠️ Populate failed for characterId:', character, '- Fetching manually');
        const characterDoc = await CharacterModel.findById(character).select('name imageCharacterSelect');
        if (characterDoc) {
          character = characterDoc;
        } else {
          console.error('❌ Character not found:', character);
          // デフォルトのキャラクター情報を返す
          character = {
            _id: character.toString(),
            name: { ja: 'Unknown Character', en: 'Unknown Character' },
            imageCharacterSelect: '/images/default-avatar.png'
          };
        }
      }

      return {
        _id: chat._id,
        character: character,
        lastMessage: chat.messages && chat.messages.length > 0 
          ? chat.messages[chat.messages.length - 1].content 
          : '',
        lastMessageAt: chat.lastActivityAt,
        messageCount: chat.messages ? chat.messages.length : 0
      };
    }));

    // アナリティクスデータの生成（過去7日間）
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    console.log('🔍 Analytics: Fetching data from:', sevenDaysAgo.toISOString());
    
    // チャット統計（日別メッセージ数）
    // まず全チャットを確認
    const allChatsForDebug = await ChatModel.find({ userId }).select('messages').lean();
    const totalMessagesDebug = allChatsForDebug.reduce((sum, chat) => sum + (chat.messages?.length || 0), 0);
    console.log('🔍 Debug - Total messages in all chats:', totalMessagesDebug);
    console.log('🔍 Debug - Sample message timestamps:', 
      allChatsForDebug.slice(0, 2).map(chat => 
        chat.messages?.slice(0, 2).map(m => ({
          role: m.role,
          timestamp: m.timestamp
        }))
      )
    );

    // userIdの文字列変換を確認
    const userIdString = userId.toString();
    console.log('🔍 Debug - userId types:', {
      original: userId,
      originalType: typeof userId,
      asObjectId: new mongoose.Types.ObjectId(userId),
      asString: userIdString
    });

    const chatStats = await ChatModel.aggregate([
      {
        $match: {
          userId: userIdString // 文字列として比較
        }
      },
      { $unwind: "$messages" },
      {
        $match: {
          "messages.timestamp": { $gte: sevenDaysAgo },
          "messages.role": "user" // ユーザーメッセージのみカウント
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$messages.timestamp" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).catch((err) => {
      console.error('❌ Chat aggregation error:', err);
      return [];
    });

    // トークン使用統計（日別）
    const tokenStats = await TokenUsage.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalTokens: { $sum: "$tokensUsed" },
          totalCost: { $sum: "$cost" }
        }
      },
      { $sort: { _id: 1 } }
    ]).catch((err) => {
      console.error('❌ Token aggregation error:', err);
      return [];
    });

    // 親密度情報をアナリティクス用に変換
    const affinityProgress = validAffinities.map(affinity => ({
      characterName: affinity.character.name.ja || affinity.character.name.en || 'Unknown',
      level: affinity.level,
      color: affinity.character.themeColor
    }));

    const analytics = {
      chatCountPerDay: chatStats.map(stat => ({
        date: stat._id,
        count: stat.count
      })),
      tokenUsagePerDay: tokenStats.map(stat => ({
        date: stat._id,
        amount: stat.totalTokens || 0
      })),
      affinityProgress: affinityProgress
    };

    // 全期間のメッセージ数も集計（デバッグ用）
    const allTimeChatStats = await ChatModel.aggregate([
      {
        $match: {
          userId: userIdString
        }
      },
      { $unwind: "$messages" },
      {
        $match: {
          "messages.role": "user" // ユーザーメッセージのみカウント
        }
      },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 }
        }
      }
    ]).catch((err) => {
      console.error('❌ All-time chat aggregation error:', err);
      return [];
    });

    console.log('📊 Analytics Data:', {
      chatStats: chatStats.length,
      chatStatsDetail: JSON.stringify(chatStats, null, 2),
      allTimeUserMessages: allTimeChatStats[0]?.totalCount || 0,
      tokenStats: tokenStats.length,
      affinityProgress: affinityProgress.length,
      chatCountPerDay: analytics.chatCountPerDay,
      tokenUsagePerDay: analytics.tokenUsagePerDay
    });

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLogin,
        selectedCharacter: user.selectedCharacter,
        tokenBalance: user.tokenBalance || 0,
        totalSpent: user.totalSpent || 0,
        purchasedCharacters: user.purchasedCharacters || []
      },
      tokens: {
        balance: user.tokenBalance || 0,
        totalUsed: tokenUsage[0]?.totalUsed || 0,
        totalPurchased: user.totalSpent || 0,
        recentUsage: []
      },
      affinities: validAffinities,
      recentChats: formattedRecentChats,
      purchaseHistory: [],
      loginHistory: [],
      notifications: [],
      badges: [],
      analytics: analytics
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 現在のユーザー情報確認エンドポイント（デバッグ用）
routeRegistry.define('GET', '/api/debug/current-user', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({
      user: req.user,
      admin: req.admin,
      isAdmin: req.user?.isAdmin,
      headers: {
        authorization: req.headers.authorization?.substring(0, 20) + '...',
        userAgent: req.headers['user-agent']
      }
    });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

// アナリティクスデバッグ用エンドポイント
routeRegistry.define('GET', '/api/debug/analytics', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // すべてのチャットを取得
    const allChats = await ChatModel.find({ userId }).select('messages lastActivityAt characterId');
    
    // メッセージの詳細
    const messageDetails = allChats.flatMap(chat => 
      chat.messages.map(msg => ({
        chatId: chat._id,
        characterId: chat.characterId,
        messageId: msg._id,
        role: msg.role,
        timestamp: msg.timestamp,
        content: msg.content.substring(0, 50) + '...'
      }))
    );

    // 過去7日間のメッセージ
    const recentMessages = messageDetails.filter(msg => 
      new Date(msg.timestamp) >= sevenDaysAgo
    );

    res.json({
      totalChats: allChats.length,
      totalMessages: messageDetails.length,
      recentMessages: recentMessages.length,
      messagesByDate: recentMessages.reduce((acc, msg) => {
        const date = new Date(msg.timestamp).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      sampleMessages: recentMessages.slice(0, 5)
    });
  } catch (error) {
    console.error('Debug analytics error:', error);
    res.status(500).json({ error: error });
  }
});



// ユーザープロフィール取得
routeRegistry.define('GET', '/api/user/profile', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // ユーザー基本情報を取得
    const user = await UserModel.findById(userId)
      .select('_id email name createdAt lastLogin affinities tokenBalance totalSpent selectedCharacter purchasedCharacters')
      .populate('purchasedCharacters', '_id');

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // purchasedCharactersからIDの配列を作成
    const purchasedCharacterIds = user.purchasedCharacters?.map((char: any) => {
      if (typeof char === 'string') return char;
      return char._id?.toString() || char.id?.toString() || char;
    }) || [];

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        selectedCharacter: user.selectedCharacter,
        tokenBalance: user.tokenBalance || 0,
        totalSpent: user.totalSpent || 0
      },
      tokenBalance: user.tokenBalance || 0,
      affinities: user.affinities || [],
      purchasedCharacters: purchasedCharacterIds
    });

  } catch (error) {
    console.error('Profile GET error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ユーザープロフィール更新
routeRegistry.define('PUT', '/api/user/profile', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({
        error: 'Name required',
        message: '名前を入力してください'
      });
      return;
    }

    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { name: name.trim() },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log('✅ Profile updated:', { id: updatedUser._id, name: updatedUser.name });

    res.json({
      success: true,
      message: 'プロフィールを更新しました',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        tokenBalance: updatedUser.tokenBalance,
        isSetupComplete: updatedUser.isSetupComplete
      }
    });

  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// 初回セットアップ完了
app.post('/api/user/setup-complete', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, selectedCharacterId } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({
        error: 'Name required',
        message: '名前を入力してください'
      });
      return;
    }

    if (!selectedCharacterId) {
      res.status(400).json({
        error: 'Character selection required',
        message: 'キャラクターを選択してください'
      });
      return;
    }

    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // キャラクターが存在するかチェック
    const character = await CharacterModel.findById(selectedCharacterId);
    if (!character || !character.isActive) {
      res.status(400).json({
        error: 'Invalid character',
        message: '選択されたキャラクターが見つかりません'
      });
      return;
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { 
        name: name.trim(),
        selectedCharacter: selectedCharacterId,
        isSetupComplete: true
      },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log('✅ Setup completed:', { 
      id: updatedUser._id, 
      name: updatedUser.name,
      selectedCharacter: selectedCharacterId 
    });

    res.json({
      success: true,
      message: 'セットアップが完了しました',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        tokenBalance: updatedUser.tokenBalance,
        selectedCharacter: updatedUser.selectedCharacter,
        isSetupComplete: updatedUser.isSetupComplete
      }
    });

  } catch (error) {
    console.error('❌ Setup completion error:', error);
    res.status(500).json({ error: 'Setup completion failed' });
  }
});

// Stripe Webhook endpoints (must be before express.json())


// Character routes are handled by the imported characterRoutes module
// All character-related endpoints are defined in ./routes/characters.ts

// User API endpoints
app.get('/api/auth/user', authenticateToken, (req: Request, res: Response): void => {
  console.log('👤 ユーザー情報取得');
  if (!req.user) {
    res.status(401).json({ msg: 'Unauthorized' });
    return;
  }
  
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    tokenBalance: req.user.tokenBalance,
    selectedCharacter: req.user.selectedCharacter
  });
});


// Chat API endpoints
app.get('/api/chats/:characterId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  console.log('💬 Chat history API called');
  console.log('🔍 Requested characterId:', req.params.characterId);
  console.log('🔍 User ID:', req.user?._id);
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const characterId = req.params.characterId;
  const locale = (req.query.locale as string) || 'ja';

  try {
    // キャラクター情報を取得
    const character = await CharacterModel.findById(characterId);
    console.log('🔍 Found character:', character ? { _id: character._id, name: character.name } : 'NOT FOUND');
    if (!character || !character.isActive) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    let chatData: IChat | null = null;
    
    // MongoDB から会話履歴を取得
    if (isMongoConnected) {
      try {
        chatData = await ChatModel.findOne({ 
          userId: req.user._id, 
          characterId: characterId 
        });
        console.log('🔍 Found chat data:', chatData ? { characterId: chatData.characterId, messagesCount: chatData.messages?.length } : 'NOT FOUND');
        
        if (!chatData) {
          // 初回アクセス時は新しいチャットセッションを作成
          const welcomeMessage: IMessage = {
            _id: `msg_${Date.now()}_welcome`,
            role: 'assistant',
            content: character.defaultMessage?.[locale as keyof LocalizedString] || character.defaultMessage?.ja || 'こんにちは！',
            timestamp: new Date(),
            tokensUsed: 0
          };

          chatData = new ChatModel({
            userId: req.user._id,
            characterId: characterId,
            messages: [welcomeMessage],
            totalTokensUsed: 0,
            currentAffinity: 0,
            lastActivityAt: new Date()
          });
          
          await chatData.save();
          console.log('💬 New chat session created for user:', req.user._id);
        } else {
          console.log('💬 Existing chat session found with', chatData.messages.length, 'messages');
        }
      } catch (dbError) {
        console.error('❌ MongoDB chat lookup failed:', dbError);
        // フォールバックでモックデータを作成
        chatData = null;
      }
    }

    // MongoDB が利用できない場合はエラー
    if (!chatData) {
      console.error('❌ MongoDB unavailable and mock data disabled');
      res.status(500).json({ 
        error: 'Database connection required',
        message: 'チャット機能を利用するにはデータベース接続が必要です'
      });
      return;
    }

    // ユーザー情報を取得
    const user = await UserModel.findById(req.user._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // ユーザーの選択中キャラクターを更新
    if (user.selectedCharacter !== characterId) {
      user.selectedCharacter = characterId;
      await user.save();
      console.log('✅ Updated user selectedCharacter to:', characterId);
    }

    // キャラクター情報を多言語対応で返す
    const localizedCharacter = {
      _id: character._id,
      name: character.name,
      description: character.description,
      personality: character.personalityPreset,
      model: character.aiModel,
      aiModel: character.aiModel, // フロントエンドの互換性のため両方返す
      imageChatAvatar: character.imageChatAvatar,
      imageChatBackground: character.imageChatBackground,
      themeColor: character.themeColor,
      // プロンプト情報を追加（デバッグ用）
      personalityPrompt: character.personalityPrompt,
      adminPrompt: character.adminPrompt
    };

    // キャラクターに対する親密度情報を取得
    const characterAffinity = user.affinities.find(
      aff => aff.character.toString() === characterId
    );

    // ユーザー状態情報を構築
    const userState = {
      tokenBalance: user.tokenBalance || 0,
      affinity: {
        level: characterAffinity?.level || chatData.currentAffinity || 0,
        experience: characterAffinity?.experience || chatData.totalTokensUsed || 0,
        mood: characterAffinity?.emotionalState || 'neutral'
      },
      unlockedGalleryImages: characterAffinity?.unlockedRewards || []
    };

    console.log('🔍 Sending response with character:', { _id: localizedCharacter._id, name: localizedCharacter.name });
    res.json({
      chat: {
        _id: chatData._id,
        messages: chatData.messages
      },
      character: localizedCharacter,
      userState: userState
    });

  } catch (error) {
    console.error('❌ Chat history fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/chats/:characterId/messages', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  console.log('💬 Send message API called');
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const characterId = req.params.characterId;
  const { message, sessionId } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  // メッセージ長制限チェック
  if (message.length > 2000) {
    res.status(400).json({
      error: 'Message too long',
      message: 'メッセージが長すぎます（2000文字以内）'
    });
    return;
  }

  try {
    // キャラクター存在確認
    const character = await CharacterModel.findById(characterId);
    if (!character || !character.isActive) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    // ユーザーのトークン残高確認（MongoDB必須）
    if (!isMongoConnected) {
      console.error('❌ MongoDB connection required for user data');
      res.status(500).json({ 
        error: 'Database connection required',
        message: 'ユーザーデータの取得にはデータベース接続が必要です'
      });
      return;
    }

    const dbUser = await UserModel.findById(req.user._id);
    if (!dbUser) {
      console.error('❌ User not found in database:', req.user._id);
      res.status(404).json({ 
        error: 'User not found',
        message: 'ユーザーが見つかりません'
      });
      return;
    }

    const userTokenBalance = dbUser.tokenBalance;

    console.log('💰 Current user token balance:', userTokenBalance);

    // 🔥 禁止用語フィルタリング（メッセージ処理前に実行）
    console.log('🔍 Content filtering check started');
    const { validateMessage: tsValidateMessage } = await import('./utils/contentFilter');
    const validation = tsValidateMessage(message.trim());
    if (!validation.allowed) {
      console.log('🚫 Content violation detected:', validation.reason);
      res.status(403).json({
        error: validation.reason,
        code: 'CONTENT_VIOLATION',
        violationType: validation.violationType,
        detectedWord: validation.detectedWord
      });
      return;
    }
    console.log('✅ Content filtering passed');

    // 🚀 プロンプトキャッシュ対応AI応答を生成
    const aiResponse = await generateChatResponse(characterId, message, [], req.user._id);
    
    // トークン消費量の確認
    if (userTokenBalance < aiResponse.tokensUsed) {
      res.status(402).json({ 
        error: 'Insufficient tokens',
        message: 'トークンが不足しています。トークンパックを購入してください。',
        tokensNeeded: aiResponse.tokensUsed,
        currentBalance: userTokenBalance
      });
      return;
    }

    // トークンを消費
    const newBalance = userTokenBalance - aiResponse.tokensUsed;
    
    if (isMongoConnected) {
      try {
        await UserModel.findByIdAndUpdate(req.user._id, {
          tokenBalance: newBalance
        });
        console.log('💰 Token balance updated in MongoDB');
      } catch (updateError) {
        console.error('❌ Failed to update token balance in MongoDB:', updateError);
      }
    }

    // レスポンス用のメッセージオブジェクト
    const userMessage = {
      _id: `msg_${Date.now()}_user`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      tokensUsed: 0
    };

    const assistantMessage = {
      _id: `msg_${Date.now()}_assistant`,
      role: 'assistant', 
      content: aiResponse.content,
      timestamp: new Date().toISOString(),
      tokensUsed: aiResponse.tokensUsed
    };

    // MongoDB にメッセージを保存
    if (isMongoConnected) {
      try {
        const userMsg: IMessage = {
          _id: userMessage._id,
          role: 'user',
          content: userMessage.content,
          timestamp: new Date(), // 現在時刻を直接使用
          tokensUsed: 0
        };

        const assistantMsg: IMessage = {
          _id: assistantMessage._id,
          role: 'assistant',
          content: assistantMessage.content,
          timestamp: new Date(), // 現在時刻を直接使用
          tokensUsed: aiResponse.tokensUsed,
          metadata: {
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            temperature: 0.8
          }
        };

        // 既存のチャットセッションを更新、または新規作成
        const updatedChat = await ChatModel.findOneAndUpdate(
          { userId: req.user._id, characterId: characterId },
          {
            $push: { 
              messages: { $each: [userMsg, assistantMsg] }
            },
            $inc: { 
              totalTokensUsed: aiResponse.tokensUsed,
              currentAffinity: 1 // メッセージごとに1ポイント増加
            },
            $set: { lastActivityAt: new Date() }
          },
          { 
            new: true, 
            upsert: true // 存在しない場合は新規作成
          }
        );

        const affinityIncrease = 1; // 固定で1ポイント増加
        const previousAffinity = Math.max(0, (updatedChat.currentAffinity || 0) - affinityIncrease);
        const newAffinity = Math.min(100, updatedChat.currentAffinity);

        // UserModelの親密度データも更新
        try {
          const userAffinityUpdate = await UserModel.findOneAndUpdate(
            { 
              _id: req.user._id,
              'affinities.character': characterId 
            },
            {
              $inc: { 'affinities.$.level': affinityIncrease },
              $set: { 
                'affinities.$.lastInteraction': new Date(),
                'affinities.$.totalMessages': { $inc: 1 }
              }
            },
            { new: true }
          );

          if (!userAffinityUpdate) {
            // 親密度データが存在しない場合は新規作成
            await UserModel.findByIdAndUpdate(
              req.user._id,
              {
                $push: {
                  affinities: {
                    character: characterId,
                    level: affinityIncrease,
                    experience: 0,
                    experienceToNext: 10,
                    emotionalState: 'neutral',
                    relationshipType: 'stranger',
                    trustLevel: 0,
                    intimacyLevel: affinityIncrease,
                    totalConversations: 1,
                    totalMessages: 1,
                    averageResponseTime: 0,
                    lastInteraction: new Date(),
                    currentStreak: 1,
                    maxStreak: 1,
                    consecutiveDays: 1,
                    favoriteTopics: [],
                    specialMemories: [],
                    personalNotes: '',
                    giftsReceived: [],
                    totalGiftsValue: 0,
                    unlockedRewards: [],
                    nextRewardLevel: 10,
                    moodHistory: []
                  }
                }
              },
              { new: true }
            );
            console.log('✅ Created new affinity data for character:', characterId);
          } else {
            console.log('✅ Updated existing affinity data for character:', characterId);
          }
        } catch (affinityError) {
          console.error('❌ Failed to update user affinity:', affinityError);
        }

        console.log('✅ Chat messages saved to MongoDB:', {
          character: character.name.ja,
          tokensUsed: aiResponse.tokensUsed,
          newBalance,
          affinityIncrease,
          totalMessages: updatedChat.messages.length,
          cacheHit: aiResponse.cacheHit
        });

        // 🎭 レベルアップ検出とムードトリガー適用
        try {
          const previousLevel = Math.floor(previousAffinity / 10);
          const currentLevel = Math.floor(newAffinity / 10);
          
          console.log(`🔍 Level check: previous affinity=${previousAffinity} (level ${previousLevel}), new affinity=${newAffinity} (level ${currentLevel})`);
          
          if (currentLevel > previousLevel) {
            // レベルアップが発生
            await applyMoodTrigger(
              req.user._id.toString(),
              characterId,
              { kind: 'LEVEL_UP', newLevel: currentLevel }
            );
            console.log(`📈 Level up mood trigger applied: level ${previousLevel} → ${currentLevel}`);
          }
        } catch (levelUpMoodError) {
          console.error('❌ Failed to apply level up mood trigger:', levelUpMoodError);
        }

        // 🎭 ネガティブ感情検出とムードトリガー適用
        try {
          if (openai) {
            // OpenAI moderation APIでネガティブ感情を検出
            const moderationResponse = await openai.moderations.create({
              input: message
            });
            
            const moderation = moderationResponse.results[0];
            const isNegative = moderation.flagged || 
                              moderation.categories.harassment ||
                              moderation.categories.hate ||
                              moderation.categories['self-harm'] ||
                              moderation.categories.violence;
            
            if (isNegative) {
              await applyMoodTrigger(
                req.user._id.toString(),
                characterId,
                { kind: 'USER_SENTIMENT', sentiment: 'neg' }
              );
              console.log('😞 Negative sentiment mood trigger applied');
            }
          }
        } catch (sentimentMoodError) {
          console.error('❌ Failed to apply sentiment mood trigger:', sentimentMoodError);
        }

        // 🚀 詳細TokenUsage記録（仕様書に基づく高度トラッキング）
        try {
          console.log('📊 Recording detailed TokenUsage tracking...');
          
          // API費用計算
          const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
          const inputTokens = Math.floor(aiResponse.tokensUsed * 0.6); // 推定入力トークン
          const outputTokens = Math.floor(aiResponse.tokensUsed * 0.4); // 推定出力トークン
          
          // GPTモデル別の料金計算（USD）
          let apiCost = 0;
          if (model === 'gpt-4') {
            apiCost = (inputTokens * 0.03 + outputTokens * 0.06) / 1000;
          } else if (model === 'gpt-3.5-turbo') {
            apiCost = (inputTokens * 0.0015 + outputTokens * 0.002) / 1000;
          } else {
            apiCost = (inputTokens * 0.01 + outputTokens * 0.03) / 1000; // デフォルト
          }
          
          const apiCostYen = apiCost * 150; // USD→JPY換算（150円/ドル想定）
          const sessionId = `chat_${req.user._id}_${characterId}_${Date.now()}`;
          
          // 利益分析計算
          const tokenPrice = userTokenBalance > 0 ? (500 / 15000) : 0; // 500円で15000トークンの想定
          const grossRevenue = aiResponse.tokensUsed * tokenPrice;
          const grossProfit = grossRevenue - apiCostYen;
          const profitMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
          
          const tokenUsageRecord = new TokenUsage({
            // 基本情報
            userId: req.user._id,
            characterId: characterId,
            sessionId: sessionId,
            
            // 使用量詳細
            tokensUsed: aiResponse.tokensUsed,
            tokenType: 'chat_message',
            messageContent: message.substring(0, 2000), // 2000文字制限
            responseContent: aiResponse.content.substring(0, 2000),
            
            // AI API詳細
            model: model,
            inputTokens: inputTokens,
            outputTokens: outputTokens,
            apiCost: apiCost,
            apiCostYen: apiCostYen,
            
            // 原価・利益分析
            stripeFee: 0, // チャットメッセージは直接課金なし
            grossProfit: grossProfit,
            profitMargin: profitMargin,
            
            // 親密度変化
            intimacyBefore: Math.max(0, newAffinity - affinityIncrease),
            intimacyAfter: newAffinity,
            affinityChange: affinityIncrease,
            experienceGained: affinityIncrease,
            
            // メタデータ
            userAgent: req.get('User-Agent') || 'unknown',
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
            platform: 'web',
            
            // タイムスタンプ
            createdAt: new Date(),
            processedAt: new Date()
          });
          
          await tokenUsageRecord.save();
          
          console.log('✅ Detailed TokenUsage recorded:', {
            tokensUsed: aiResponse.tokensUsed,
            apiCostYen: Math.round(apiCostYen * 100) / 100,
            profitMargin: Math.round(profitMargin * 100) / 100,
            model: model,
            sessionId: sessionId,
            cacheHit: aiResponse.cacheHit,
            promptLength: aiResponse.systemPrompt.length
          });
          
        } catch (tokenUsageError) {
          console.error('⚠️ Failed to record TokenUsage (non-critical):', tokenUsageError);
          // TokenUsage記録の失敗はチャット機能に影響させない
        }

        res.json({
          userMessage,
          aiResponse: assistantMessage,
          affinity: {
            characterId,
            level: newAffinity,
            increase: affinityIncrease
          },
          tokenBalance: newBalance
        });

      } catch (dbError) {
        console.error('❌ Failed to save chat messages to MongoDB:', dbError);
        
        // DB保存に失敗した場合はエラーを返す（MongoDB必須のため）
        res.status(500).json({ 
          error: 'Message save failed',
          message: 'メッセージの保存に失敗しました。データベース接続を確認してください。'
        });
        return;
      }
    } else {
      // MongoDB が利用できない場合はエラー
      console.error('❌ MongoDB unavailable and mock data disabled');
      res.status(500).json({ 
        error: 'Database connection required',
        message: 'メッセージの保存にはデータベース接続が必要です'
      });
      return;
    }

  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'メッセージの送信に失敗しました。しばらくしてから再度お試しください。'
    });
  }
});

app.get('/api/ping', (_req: Request, res: Response): void => {
  res.send('pong');
});

// Dashboard API route
// 削除: 重複するダッシュボードAPI（routes/dashboard.jsを使用）

// Purchase History API
app.get('/api/user/purchase-history', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  console.log('📋 Purchase History API called');
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    
    // クエリパラメータから フィルター・ソート設定を取得
    const {
      type = 'all',
      status = 'all',
      limit = 50,
      skip = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 購入履歴を取得
    const purchases = await PurchaseHistoryModel.getUserPurchaseHistory(userId, {
      type: type as string,
      status: status as string,
      limit: parseInt(limit as string),
      skip: parseInt(skip as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    // 統計情報を取得
    const stats = await PurchaseHistoryModel.getUserPurchaseStats(userId);
    
    // 統計データを整形
    const summary = {
      totalSpent: 0,
      totalPurchases: 0,
      tokens: { count: 0, amount: 0 },
      characters: { count: 0, amount: 0 },
      subscriptions: { count: 0, amount: 0 }
    };

    stats.forEach((stat: any) => {
      summary.totalSpent += stat.totalPrice;
      summary.totalPurchases += stat.count;
      
      if (stat._id === 'token') {
        summary.tokens = { count: stat.count, amount: stat.totalPrice };
      } else if (stat._id === 'character') {
        summary.characters = { count: stat.count, amount: stat.totalPrice };
      } else if (stat._id === 'subscription') {
        summary.subscriptions = { count: stat.count, amount: stat.totalPrice };
      }
    });

    const response = {
      purchases: purchases.map((purchase: any) => ({
        _id: purchase._id,
        type: purchase.type,
        amount: purchase.amount,
        price: purchase.price,
        currency: purchase.currency,
        status: purchase.status,
        paymentMethod: purchase.paymentMethod,
        date: purchase.createdAt,
        details: purchase.details,
        description: purchase.description,
        transactionId: purchase.transactionId,
        stripeSessionId: purchase.stripeSessionId
      })),
      summary,
      totalSpent: summary.totalSpent,
      totalPurchases: summary.totalPurchases
    };

    console.log(`✅ Purchase history retrieved: ${purchases.length} items`);
    res.json(response);

  } catch (error) {
    console.error('🚨 Purchase history API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to retrieve purchase history'
    });
  }
});


// Token Pack Management APIs
app.get('/api/token-packs', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  console.log('📦 User Token Packs API called');
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // Query parameters
    const limit = parseInt(req.query.limit as string) || 50;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : true; // デフォルトでアクティブのみ
    
    if (isMongoConnected) {
      // MongoDB実装
      console.log('🍃 Using MongoDB for user token packs', { isActive, limit });
      
      // ユーザー向けはアクティブなパックのみ表示
      const filter: any = { isActive };
      
      // アクティブなトークンパックを取得（作成日降順）
      const tokenPacks = await TokenPackModel.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      
      // 利益率とトークン単価を計算
      const packsWithMetrics = tokenPacks.map((pack: any) => {
        const profitMargin = pack.tokens > 0 && pack.price > 0 
          ? ((pack.tokens - pack.price * 2) / pack.tokens) * 100 
          : 0;
        const tokenPerYen = pack.price > 0 ? pack.tokens / pack.price : 0;
        
        return {
          ...pack,
          profitMargin: Math.round(profitMargin * 10) / 10,
          tokenPerYen: Math.round(tokenPerYen * 10) / 10
        };
      });

      console.log('✅ User Token Packs 取得完了:', {
        totalPacks: packsWithMetrics.length,
        activeFilter: isActive
      });
      
      res.json({ 
        tokenPacks: packsWithMetrics,
        total: packsWithMetrics.length
      });
      
    } else {
      console.log('❌ MongoDB not connected for user token packs');
      res.status(500).json({ error: 'Database not connected' });
    }
    
  } catch (error) {
    console.error('❌ User Token Packs取得エラー:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Additional API endpoints continue here...



// Purchase History API
// 削除: 重複するpurchase-history API（1351行目の定義を使用）

// 新トークン計算モデルバリデーション関数（利益率90%）
const validateTokenPriceRatio = async (tokens: number, price: number): Promise<boolean> => {
  const currentModel = process.env.OPENAI_MODEL || 'o4-mini';
  const expectedTokens = await calcTokensToGive(price, currentModel);
  const tolerance = 0.05; // 5%の許容範囲
  const minTokens = expectedTokens * (1 - tolerance);
  const maxTokens = expectedTokens * (1 + tolerance);
  
  return tokens >= minTokens && tokens <= maxTokens;
};

// 削除: 重複するtoken-packs API（adminTokenPacksRoutesを使用）


// Stripe Price API endpoint
app.get('/api/admin/stripe/price/:priceId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  console.log('💳 Stripe Price 取得 API called:', { priceId: req.params.priceId });
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { priceId } = req.params;
  
  if (!priceId || typeof priceId !== 'string') {
    res.status(400).json({ 
      success: false,
      message: 'Price ID が無効です' 
    });
    return;
  }

  try {
    {
      // 実際のStripe API呼び出し（本番環境用）
      if (!stripe) {
        throw new Error('Stripe が正しく初期化されていません');
      }
      
      console.log('🔥 実際のStripe APIでPrice情報を取得します:', priceId);
      
      const price = await stripe.prices.retrieve(priceId, {
        expand: ['product']
      });
      
      if (!price.active) {
        throw new Error('この Price ID は無効または非アクティブです');
      }
      
      if (!price.unit_amount) {
        throw new Error('Price に金額情報がありません');
      }
      
      // 通貨に応じた単位変換
      let priceInMainUnit: number;
      if (price.currency === 'jpy') {
        // 日本円は最小単位が円なので変換不要
        priceInMainUnit = price.unit_amount;
      } else {
        // USD等は最小単位がセントなので100で割る
        priceInMainUnit = Math.floor(price.unit_amount / 100);
      }
      
      console.log('💰 Stripe価格情報:', {
        unit_amount: price.unit_amount,
        currency: price.currency,
        converted_amount: priceInMainUnit
      });
      
      // 新トークン計算システムに基づくトークン数計算（利益率90%）
      const currentModel = process.env.OPENAI_MODEL || 'o4-mini';
      const calculatedTokens = await calcTokensToGive(priceInMainUnit, currentModel);
      
      // 実際の利益率は90%固定
      const profitMargin = 90;
      const tokenPerYen = await calcTokensToGive(1, currentModel); // 1円あたりのトークン数
      
      // Product名を安全に取得
      const productName = price.product && typeof price.product === 'object' && 'name' in price.product 
        ? price.product.name 
        : 'Unknown Product';
      
      console.log('✅ 実際のStripe Price データ取得完了:', {
        priceId,
        amount: priceInMainUnit,
        currency: price.currency,
        tokens: calculatedTokens,
        productName
      });
      
      res.json({
        success: true,
        price: {
          id: price.id,
          object: price.object,
          active: price.active,
          currency: price.currency,
          unit_amount: price.unit_amount,
          unit_amount_decimal: price.unit_amount_decimal,
          product: price.product,
          recurring: price.recurring,
          type: price.type
        },
        // フロントエンド用の追加情報
        calculatedTokens,
        profitMargin,
        tokenPerYen
      });
    }
    
  } catch (error: any) {
    console.error('❌ Stripe Price 取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'Price情報の取得に失敗しました',
      error: 'Internal server error'
    });
  }
});


// Stripe Checkout Session作成API
app.post('/api/purchase/create-checkout-session', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  console.log('🛒 Checkout Session 作成 API called:', req.body);
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { priceId, userId } = req.body;
  
  if (!priceId) {
    res.status(400).json({ 
      success: false,
      message: 'Price ID is required' 
    });
    return;
  }

  try {
    if (!stripe) {
      res.status(500).json({
        success: false,
        message: 'Stripe not configured'
      });
      return;
    }
    
    {
      // 実際のStripe API呼び出し
      console.log('🔥 実際のStripe APIでCheckout Session作成:', priceId);
      
      if (!stripe) {
        res.status(500).json({ error: 'Stripe not initialized' });
        return;
      }
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/ja/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/ja/purchase/cancel`,
        metadata: {
          userId: userId || req.user._id,
          priceId: priceId
        }
      });
      
      console.log('✅ Stripe Checkout Session 作成完了:', {
        sessionId: session.id,
        url: session.url
      });

      res.json({
        success: true,
        sessionId: session.id,
        url: session.url
      });
    }
    
  } catch (error) {
    console.error('❌ Checkout Session 作成エラー:', error);
    res.status(500).json({
      success: false,
      message: 'チェックアウトセッションの作成に失敗しました'
    });
  }
});

// キャラクター購入用チェックアウトセッション作成API
app.post('/api/purchase/create-character-checkout-session', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  console.log('🛒 キャラクター購入 Checkout Session 作成 API called:', req.body);
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { characterId } = req.body;
  
  if (!characterId) {
    res.status(400).json({ 
      success: false,
      message: 'Character ID is required' 
    });
    return;
  }

  try {
    // キャラクター情報を取得
    const character = await CharacterModel.findById(characterId);
    if (!character) {
      res.status(404).json({
        success: false,
        message: 'Character not found'
      });
      return;
    }

    // Stripe商品IDが設定されているかチェック
    if (!character.stripeProductId) {
      res.status(400).json({
        success: false,
        message: 'Character is not available for purchase'
      });
      return;
    }

    if (!stripe) {
      res.status(500).json({
        success: false,
        message: 'Stripe not configured'
      });
      return;
    }
    
    // Stripe価格情報を取得（商品IDまたは価格IDに対応）
    let priceId;
    
    if (character.stripeProductId.startsWith('price_')) {
      // 価格IDが直接保存されている場合
      priceId = character.stripeProductId;
      console.log('🏷️ 価格IDを直接使用:', priceId);
    } else if (character.stripeProductId.startsWith('prod_')) {
      // 商品IDから価格を取得する場合
      console.log('📦 商品IDから価格取得:', character.stripeProductId);
      
      if (!stripe) {
        res.status(500).json({ error: 'Stripe not initialized' });
        return;
      }
      
      const prices = await stripe.prices.list({
        product: character.stripeProductId,
        active: true
      });

      if (prices.data.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No active price found for this character'
        });
        return;
      }

      priceId = prices.data[0].id;
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid Stripe ID format. Must be price_* or prod_*'
      });
      return;
    }
    
    console.log('🔥 実際のStripe APIでキャラクター購入Checkout Session作成:', {
      characterId,
      priceId,
      characterName: character.name.ja
    });
    
    if (!stripe) {
      res.status(500).json({ error: 'Stripe not initialized' });
      return;
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/ja/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/ja/characters`,
      metadata: {
        userId: req.user._id.toString(),
        characterId: characterId,
        purchaseType: 'character'
      }
    });
    
    console.log('✅ キャラクター購入 Stripe Checkout Session 作成完了:', {
      sessionId: session.id,
      url: session.url,
      characterName: character.name.ja
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
    
  } catch (error) {
    console.error('❌ キャラクター購入 Checkout Session 作成エラー:', error);
    console.error('❌ エラー詳細:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      success: false,
      message: 'チェックアウトセッションの作成に失敗しました',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Stripe価格情報取得API（商品IDまたは価格IDに対応・管理者専用）
app.get('/api/admin/stripe/product-price/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 Stripe価格取得 API called:', req.params.id);
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  
  if (!id) {
    res.status(400).json({ 
      success: false,
      message: 'Product ID or Price ID is required' 
    });
    return;
  }

  try {
    if (!stripe) {
      res.status(500).json({
        success: false,
        message: 'Stripe not configured'
      });
      return;
    }
    
    let price;
    let priceAmount;
    let currency;
    
    if (id.startsWith('price_')) {
      // 価格IDが直接渡された場合
      console.log('🏷️ 価格IDから直接取得:', id);
      
      if (!stripe) {
        res.status(500).json({ error: 'Stripe not initialized' });
        return;
      }
      
      price = await stripe.prices.retrieve(id);
      priceAmount = price.unit_amount || 0;
      currency = price.currency.toUpperCase();
      
    } else if (id.startsWith('prod_')) {
      // 商品IDから価格を取得する場合
      console.log('📦 商品IDから価格取得:', id);
      
      if (!stripe) {
        res.status(500).json({ error: 'Stripe not initialized' });
        return;
      }
      
      const prices = await stripe.prices.list({
        product: id,
        active: true
      });

      if (prices.data.length === 0) {
        res.status(404).json({
          success: false,
          message: 'No active price found for this product'
        });
        return;
      }

      price = prices.data[0];
      priceAmount = price.unit_amount || 0;
      currency = price.currency.toUpperCase();
      
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid ID format. Must start with "prod_" or "price_"'
      });
      return;
    }
    
    console.log('✅ Stripe価格取得成功:', {
      id,
      priceAmount,
      currency,
      priceId: price.id
    });

    res.json({
      price: priceAmount,
      currency: currency,
      priceId: price.id
    });
    
  } catch (error) {
    console.error('❌ Stripe価格取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '価格情報の取得に失敗しました'
    });
  }
});


// 開発用：Session IDを使って手動でトークンを付与するAPI
app.post('/api/user/process-session', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 Session処理 API called:', req.body);
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { sessionId } = req.body;
  
  if (!sessionId) {
    res.status(400).json({ 
      success: false,
      message: 'Session ID is required' 
    });
    return;
  }

  try {
    if (stripe) {
      // 実際のStripe APIでSession情報を取得
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status === 'paid') {
        const priceId = session.metadata?.priceId;
        let tokensToAdd = 0;
        
        // Token packからトークン数を取得
        if (isMongoConnected && priceId) {
          const tokenPack = await TokenPackModel.findOne({ priceId }).lean();
          if (tokenPack) {
            tokensToAdd = tokenPack.tokens;
          }
        }
        
        // Fallback: 金額ベースで計算
        if (tokensToAdd === 0) {
          const amountInYen = session.amount_total || 0;
          const currentModel = process.env.OPENAI_MODEL || 'o4-mini';
          tokensToAdd = await calcTokensToGive(amountInYen, currentModel);
        }
        
        // ユーザーにトークンを付与
        if (isMongoConnected) {
          let user = await UserModel.findById(req.user._id);
          if (!user) {
            user = new UserModel({
              _id: req.user._id,
              email: req.user.email,
              name: req.user.name,
              tokenBalance: tokensToAdd
            });
          } else {
            user.tokenBalance += tokensToAdd;
          }
          await user.save();
          
          console.log('✅ MongoDB: Manual token grant successful', {
            sessionId,
            tokensAdded: tokensToAdd,
            newBalance: user.tokenBalance
          });

          res.json({
            success: true,
            tokensAdded: tokensToAdd,
            newBalance: user.tokenBalance,
            sessionId
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Database not connected'
          });
        }
      } else {
        res.status(400).json({
          success: false,
          message: 'Payment not completed'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: 'Stripe not configured'
      });
    }
  } catch (error) {
    console.error('❌ Session processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Session processing failed'
    });
  }
});

// ユーザートークン残高更新API
app.post('/api/user/add-tokens', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  console.log('💰 ユーザートークン追加 API called:', req.body);
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { tokens, purchaseId, priceId } = req.body;
  
  if (!tokens || typeof tokens !== 'number' || tokens <= 0) {
    res.status(400).json({ 
      success: false,
      message: 'Valid token amount is required' 
    });
    return;
  }

  try {
    if (isMongoConnected) {
      // MongoDB実装
      console.log('🍃 Using MongoDB for user token update');
      
      // ユーザーを検索または作成
      let user = await UserModel.findById(req.user._id);
      if (!user) {
        // ユーザーが存在しない場合は作成
        user = new UserModel({
          _id: req.user._id,
          email: req.user.email,
          name: req.user.name,
          tokenBalance: tokens,
          selectedCharacter: req.user.selectedCharacter
        });
      } else {
        // 既存ユーザーのトークン残高を更新
        user.tokenBalance += tokens;
      }
      
      await user.save();
      
      console.log('✅ MongoDB User Token 更新完了:', {
        userId: user._id,
        newBalance: user.tokenBalance,
        addedTokens: tokens
      });

      res.json({
        success: true,
        newBalance: user.tokenBalance,
        addedTokens: tokens,
        purchaseId
      });
      
    } else {
      res.status(500).json({
        success: false,
        message: 'Database not connected'
      });
    }
    
  } catch (error) {
    console.error('❌ User Token 更新エラー:', error);
    res.status(500).json({
      success: false,
      message: 'トークン残高の更新に失敗しました'
    });
  }
});

// 管理者用：ユーザー一覧取得
app.get('/api/admin/users', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('👥 管理者用ユーザー一覧 API called');
  
  if (!req.user || !(req.user as any).isAdmin) {
    res.status(401).json({ error: 'Admin access required' });
    return;
  }

  const { page = 1, limit = 20, search, status } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  try {
    if (isMongoConnected) {
      // MongoDB実装
      console.log('🍃 Using MongoDB for admin users list');
      
      const query: any = {
        isActive: { $ne: false } // 論理削除されたユーザーを除外
      };
      
      // 検索フィルター
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      
      // ステータスフィルター（管理者は停止ユーザーも含めて表示）
      if (status && status !== 'all') {
        query.accountStatus = status;
      }
      
      const totalUsers = await UserModel.countDocuments(query);
      const users = await UserModel.find(query)
        .select('_id name email tokenBalance accountStatus totalSpent totalChatMessages affinities lastLogin createdAt violationCount isActive')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean();
      
      // ユーザーデータを管理画面用の形式に変換（UserTokenPackから正確なトークン残高を取得）
      const UserTokenPack = require('../models/UserTokenPack');
      const formattedUsers = await Promise.all(users.map(async (user) => {
        let actualTokenBalance = user.tokenBalance || 0; // fallback
        try {
          actualTokenBalance = await UserTokenPack.calculateUserTokenBalance(user._id);
        } catch (error) {
          console.error('❌ Failed to calculate token balance for user:', user._id, error);
        }
        
        return {
          id: user._id.toString(),
          _id: user._id.toString(),
          name: ensureUserNameString(user.name),
          email: user.email || 'no-email@example.com',
          tokenBalance: actualTokenBalance, // 統一されたトークン残高を使用
          totalSpent: user.totalSpent || 0,
          chatCount: user.totalChatMessages || 0,
          avgIntimacy: user.affinities && user.affinities.length > 0 
            ? user.affinities.reduce((sum: number, aff: any) => sum + (aff.level || 0), 0) / user.affinities.length 
            : 0,
          lastLogin: user.lastLogin || user.createdAt || new Date(),
          status: user.accountStatus || 'active',
          isTrialUser: (actualTokenBalance === 10000 && user.totalSpent === 0),
          violationCount: user.violationCount || 0,
          isActive: user.isActive !== false,
          createdAt: user.createdAt || new Date()
        };
      }));
      
      console.log('✅ MongoDB Users retrieved:', formattedUsers.length);
      console.log('🔍 Admin: First user token balance:', formattedUsers[0]?.tokenBalance);

      // トークン残高の集計をバックエンドで実行（表示対象ユーザーと同じフィルタを適用）
      console.log('💰 Admin: Starting token aggregation with query:', query);
      const tokenSummary = await UserModel.aggregate([
        { $match: query }, // 表示対象と同じフィルタを適用
        { 
          $group: { 
            _id: null, 
            totalTokenBalance: { $sum: "$tokenBalance" },
            totalUsers: { $sum: 1 },
            averageBalance: { $avg: "$tokenBalance" }
          } 
        }
      ]);
      console.log('💰 Admin: Token aggregation result:', tokenSummary[0]);

      const tokenStats = tokenSummary.length > 0 ? tokenSummary[0] : {
        totalTokenBalance: 0,
        totalUsers: 0,
        averageBalance: 0
      };

      res.json({
        users: formattedUsers,
        pagination: {
          total: totalUsers,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalUsers / limitNum)
        },
        tokenStats: {
          totalBalance: tokenStats.totalTokenBalance || 0,
          totalUsers: tokenStats.totalUsers || 0,
          averageBalance: Math.round(tokenStats.averageBalance || 0)
        }
      });
      
    } else {
      res.status(500).json({
        success: false,
        message: 'Database not connected'
      });
    }
    
  } catch (error) {
    console.error('❌ Admin Users List エラー:', error);
    res.status(500).json({
      error: 'ユーザー一覧の取得に失敗しました'
    });
  }
});

// ⚠️ 管理者用：ユーザーのトークンをゼロにリセット（一時的機能）
app.post('/admin/users/:userId/reset-tokens', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  console.log('🔥 管理者用トークンリセット API called:', req.params.userId);
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { userId } = req.params;
  
  if (!userId) {
    res.status(400).json({ 
      success: false,
      message: 'User ID is required' 
    });
    return;
  }

  try {
    let previousBalance = 0;
    
    if (isMongoConnected) {
      // MongoDB実装
      console.log('🍃 Using MongoDB for token reset');
      
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'ユーザーが見つかりません'
        });
        return;
      }
      
      previousBalance = user.tokenBalance;
      user.tokenBalance = 0;
      await user.save();
      
      console.log('✅ MongoDB User Token リセット完了:', {
        userId: user._id,
        previousBalance,
        newBalance: 0
      });
      
    } else {
      res.status(500).json({
        success: false,
        message: 'Database not connected'
      });
      return;
    }

    res.json({
      success: true,
      message: `トークン残高を${previousBalance}から0にリセットしました`,
      previousBalance
    });
    
  } catch (error) {
    console.error('❌ Token Reset エラー:', error);
    res.status(500).json({
      success: false,
      message: 'トークンリセットに失敗しました'
    });
  }
});

// 管理者向けユーザー停止/復活（より具体的なルートを先に定義）
routeRegistry.define('PUT', '/api/admin/users/:id/status', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !(req.user as any).isAdmin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { id } = req.params;
    const { status, banReason } = req.body;
    
    if (!isMongoConnected) {
      res.status(500).json({ error: 'Database not connected' });
      return;
    }

    if (!['active', 'suspended', 'banned'].includes(status)) {
      res.status(400).json({
        error: 'Invalid status',
        message: '無効なステータスです'
      });
      return;
    }

    const updateData: any = { 
      accountStatus: status,
      ...(status === 'suspended' && { suspensionEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }), // 7日後
      ...(banReason && { banReason })
    };

    if (status === 'active') {
      updateData.suspensionEndDate = undefined;
      updateData.banReason = undefined;
    }

    const user = await UserModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, select: '-password' }
    );

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'ユーザーが見つかりません'
      });
      return;
    }

    console.log('✅ User status updated:', { id, status, banReason });

    res.json({
      success: true,
      message: `ユーザーのステータスを${status}に変更しました`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.accountStatus,
        suspensionEndDate: user.suspensionEndDate,
        banReason: user.banReason
      }
    });

  } catch (error) {
    console.error('❌ User status update error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'ユーザーステータスの更新に失敗しました'
    });
  }
});

// 管理者向けユーザー削除（論理削除）
routeRegistry.define('DELETE', '/api/admin/users/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !(req.user as any).isAdmin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { id } = req.params;
    
    if (!isMongoConnected) {
      res.status(500).json({ error: 'Database not connected' });
      return;
    }

    // 関連データも含めて完全削除
    const user = await UserModel.findById(id);
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'ユーザーが見つかりません'
      });
      return;
    }

    // 関連データを削除
    try {
      // チャット履歴を削除
      if (ChatModel) {
        const deletedChats = await ChatModel.deleteMany({ userId: id });
        console.log('✅ Deleted chats:', deletedChats.deletedCount);
      }
      
      // トークン使用履歴を削除
      if (TokenUsage) {
        const deletedTokenUsage = await TokenUsage.deleteMany({ userId: id });
        console.log('✅ Deleted token usage records:', deletedTokenUsage.deletedCount);
      }
    } catch (relatedDataError) {
      console.warn('⚠️ Warning: Failed to delete some related data:', relatedDataError);
      // 関連データの削除に失敗してもユーザー削除は続行
    }
    
    // ユーザーを物理削除
    await UserModel.findByIdAndDelete(id);

    console.log('✅ User completely deleted:', { id, name: user.name, email: user.email });

    res.json({
      success: true,
      message: `ユーザー ${user.name} を完全に削除しました`
    });

  } catch (error) {
    console.error('❌ User deletion error:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      error: 'Server error',
      message: 'ユーザーの削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 管理者向けユーザー詳細取得（一般的なルートを最後に定義）
app.get('/api/admin/users/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !(req.user as any).isAdmin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { id } = req.params;
    
    if (!isMongoConnected) {
      res.status(500).json({ error: 'Database not connected' });
      return;
    }

    const user = await UserModel.findById(id)
      .select('-password')
      .populate('selectedCharacter', 'name')
      .populate('purchasedCharacters', 'name')
      .populate('affinities.character', 'name');

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'ユーザーが見つかりません'
      });
      return;
    }

    // UserTokenPackから正確なトークン残高を計算
    let actualTokenBalance = user.tokenBalance; // fallback
    try {
      const UserTokenPack = require('../models/UserTokenPack');
      actualTokenBalance = await UserTokenPack.calculateUserTokenBalance(user._id);
      console.log('🔍 Admin API: UserTokenPack calculated balance:', actualTokenBalance);
      console.log('🔍 Admin API: UserModel.tokenBalance:', user.tokenBalance);
    } catch (error) {
      console.error('❌ Failed to calculate token balance from UserTokenPack:', error);
    }

    res.json({
      id: user._id,
      name: ensureUserNameString(user.name),
      email: user.email,
      tokenBalance: actualTokenBalance, // 統一されたトークン残高を使用
      chatCount: user.totalChatMessages,
      avgIntimacy: user.affinities.length > 0 
        ? user.affinities.reduce((sum, aff) => sum + aff.level, 0) / user.affinities.length 
        : 0,
      totalSpent: user.totalSpent,
      status: user.accountStatus,
      isTrialUser: actualTokenBalance === 10000 && user.totalSpent === 0,
      loginStreak: user.loginStreak,
      maxLoginStreak: user.maxLoginStreak,
      violationCount: user.violationCount,
      registrationDate: user.registrationDate,
      lastLogin: user.lastLogin,
      suspensionEndDate: user.suspensionEndDate,
      banReason: user.banReason,
      unlockedCharacters: user.purchasedCharacters?.map(char => {
        const character = char as any;
        return {
          id: character._id,
          name: typeof character === 'object' && character.name ? 
            (typeof character.name === 'object' ? (character.name.ja || character.name.en || 'Unknown') : character.name) : 
            'Unknown Character'
        };
      }) || [],
      affinities: user.affinities.map(aff => {
        console.log('🐛 Affinity character data:', typeof aff.character, aff.character);
        const character = aff.character as any;
        return {
          characterId: typeof character === 'object' ? character._id : character,
          characterName: typeof character === 'object' && character.name ? 
            (typeof character.name === 'object' ? (character.name.ja || character.name.en || 'Unknown') : character.name) : 
            'Unknown Character',
          level: aff.level,
          totalConversations: aff.totalConversations,
          relationshipType: aff.relationshipType,
          trustLevel: aff.trustLevel
        };
      })
    });

  } catch (error) {
    console.error('❌ User detail fetch error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'ユーザー詳細の取得に失敗しました'
    });
  }
});

app.get('/api/debug', (_req: Request, res: Response): void => {
  res.json({
    PORT: PORT,
    NODE_ENV: process.env.NODE_ENV,
    isMongoConnected: isMongoConnected,
    hasStripe: !!stripe,
    hasOpenAI: !!openai
  });
});

// Swagger UI setup (optional)
try {
  const openApiPath = path.resolve(__dirname, '../../docs/openapi.yaml');
  if (fs.existsSync(openApiPath)) {
    const swaggerDocument = YAML.load(openApiPath);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    console.log('📚 Swagger UI available at /api-docs');
  } else {
    console.log('⚠️  OpenAPI file not found, Swagger UI disabled');
  }
} catch (error) {
  console.log('⚠️  Failed to load OpenAPI documentation:', error.message);
}

// 管理者作成API
app.post('/api/admin/create-admin', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('👤 管理者作成 API called:', req.body);
  
  if (!req.user || !(req.user as any).isAdmin) {
    res.status(401).json({ error: 'Admin access required' });
    return;
  }

  const { name, email, password, role = 'admin', permissions } = req.body;

  // バリデーション
  if (!name || !email || !password) {
    res.status(400).json({
      error: 'Missing required fields',
      message: '名前、メールアドレス、パスワードは必須です'
    });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({
      error: 'Password too short',
      message: 'パスワードは6文字以上で入力してください'
    });
    return;
  }

  try {
    if (isMongoConnected) {
      // 既存の管理者をチェック
      const existingAdmin = await AdminModel.findOne({ email });
      if (existingAdmin) {
        res.status(409).json({
          error: 'Email already exists',
          message: 'このメールアドレスは既に登録されています'
        });
        return;
      }

      // パスワードをハッシュ化
      const bcrypt = require('bcryptjs');
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // デフォルト権限
      const defaultPermissions = permissions || [
        'users.read',
        'users.write',
        'characters.read',
        'characters.write',
        'tokens.read',
        'tokens.write'
      ];

      // 新しい管理者を作成
      const newAdmin = new AdminModel({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role,
        permissions: defaultPermissions,
        isActive: true
      });

      const savedAdmin = await newAdmin.save();
      console.log('✅ 新しい管理者を作成しました:', { id: savedAdmin._id, email: savedAdmin.email });

      res.status(201).json({
        success: true,
        message: '管理者を作成しました',
        admin: {
          _id: savedAdmin._id,
          name: savedAdmin.name,
          email: savedAdmin.email,
          role: savedAdmin.role,
          permissions: savedAdmin.permissions,
          isActive: savedAdmin.isActive,
          createdAt: savedAdmin.createdAt
        }
      });
    } else {
      // モック実装
      res.status(201).json({
        success: true,
        message: '管理者を作成しました（モック）',
        admin: {
          _id: 'mock-admin-id',
          name,
          email,
          role,
          permissions: permissions || ['users.read', 'characters.read'],
          isActive: true,
          createdAt: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('❌ 管理者作成エラー:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '管理者の作成に失敗しました'
    });
  }
});

// 管理者一覧取得API
app.get('/api/admin/admins', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('👤 管理者一覧取得 API called');
  
  if (!req.user || !(req.user as any).isAdmin) {
    res.status(401).json({ error: 'Admin access required' });
    return;
  }

  const { page = 1, limit = 20, search } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  try {
    if (isMongoConnected) {
      const query: any = {};
      
      // 検索フィルター
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const totalAdmins = await AdminModel.countDocuments(query);
      const admins = await AdminModel.find(query)
        .select('-password') // パスワードは除外
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean();

      console.log(`📊 Found ${admins.length} admins (total: ${totalAdmins})`);

      res.json({
        success: true,
        admins: admins,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalAdmins / limitNum),
          totalAdmins: totalAdmins,
          hasNext: pageNum * limitNum < totalAdmins,
          hasPrev: pageNum > 1
        }
      });
    } else {
      // モック実装
      res.json({
        success: true,
        admins: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalAdmins: 0,
          hasNext: false,
          hasPrev: false
        }
      });
    }
  } catch (error) {
    console.error('❌ 管理者一覧取得エラー:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '管理者一覧の取得に失敗しました'
    });
  }
});


// 🔄 リアルタイムセキュリティイベントストリーム（SSE）
app.get('/api/admin/security/events-stream', async (req: Request, res: Response): Promise<void> => {
  try {
    // クエリパラメータから認証トークンを取得
    const token = req.query.token as string;
    if (!token) {
      res.status(401).json({ error: 'Authentication token required' });
      return;
    }

    // JWT認証
    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      res.status(401).json({ error: 'Invalid authentication token' });
      return;
    }

    console.log('🛡️ リアルタイムセキュリティストリーム開始');

    // SSEヘッダー設定
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // 初期接続確認
    res.write('data: {"type":"connected","message":"セキュリティイベントストリーム接続済み"}\n\n');

    // Redis Subscriber取得
    const { getRedisSubscriber } = require('../lib/redis');
    const subscriber = await getRedisSubscriber();

    // セキュリティイベント購読
    const handleSecurityEvent = (message: string, channel: string) => {
      try {
        const eventData = JSON.parse(message);
        console.log('🛡️ セキュリティイベント受信:', eventData.type);
        
        // SSEフォーマットで送信
        res.write(`data: ${JSON.stringify({
          type: 'security_event',
          event: eventData,
          timestamp: new Date().toISOString()
        })}\n\n`);
      } catch (error) {
        console.error('SSE security event error:', error);
      }
    };

    await subscriber.subscribe('security:events', handleSecurityEvent);
    console.log('📡 セキュリティイベント購読開始');

    // 接続終了時のクリーンアップ
    req.on('close', async () => {
      try {
        await subscriber.unsubscribe('security:events', handleSecurityEvent);
        console.log('🛡️ セキュリティストリーム終了');
      } catch (error) {
        console.error('Security stream cleanup error:', error);
      }
    });

    // 30秒ごとのハートビート
    const heartbeat = setInterval(() => {
      res.write('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
    });

  } catch (error) {
    console.error('❌ セキュリティストリームエラー:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'セキュリティストリームの開始に失敗しました'
    });
  }
});

// 🛡️ セキュリティ管理API（管理者専用）
app.get('/api/admin/security-events', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected) {
      res.status(500).json({ error: 'Database connection required' });
      return;
    }

    // ViolationRecordから最新のセキュリティイベントを取得
    const ViolationRecord = require('../models/ViolationRecord');
    
    const events = await ViolationRecord.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('userId', 'email name')
      .lean();

    // フロントエンド用フォーマットに変換
    const formattedEvents = events.map((event: any) => ({
      id: event._id.toString(),
      type: event.violationType === 'blocked_word' ? 'content_violation' : 'ai_moderation',
      severity: event.severityLevel === 3 ? 'high' : event.severityLevel === 2 ? 'medium' : 'low',
      message: event.reason,
      timestamp: event.timestamp.toISOString(),
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      userId: event.userId?._id?.toString(),
      userEmail: event.userId?.email,
      detectedWord: event.detectedWord,
      messageContent: event.messageContent?.substring(0, 100) + '...',
      isResolved: event.isResolved,
      resolvedBy: event.resolvedBy,
      resolvedAt: event.resolvedAt
    }));

    console.log('📊 Security events API called:', { eventsCount: formattedEvents.length });
    
    res.json({
      events: formattedEvents,
      totalCount: events.length,
      stats: {
        high: formattedEvents.filter((e: any) => e.severity === 'high').length,
        medium: formattedEvents.filter((e: any) => e.severity === 'medium').length,
        low: formattedEvents.filter((e: any) => e.severity === 'low').length,
        unresolved: formattedEvents.filter((e: any) => !e.isResolved).length
      }
    });

  } catch (error) {
    console.error('❌ Security events API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'セキュリティイベントの取得に失敗しました'
    });
  }
});

// 🔧 違反解決API
app.post('/api/admin/resolve-violation/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected) {
      res.status(500).json({ error: 'Database connection required' });
      return;
    }

    const { id } = req.params;
    const { notes } = req.body;
    
    const ViolationRecord = require('../models/ViolationRecord');
    
    const violation = await ViolationRecord.findByIdAndUpdate(
      id,
      {
        isResolved: true,
        resolvedBy: req.user?._id,
        resolvedAt: new Date(),
        adminNotes: notes || '管理者により解決済み'
      },
      { new: true }
    );

    if (!violation) {
      res.status(404).json({ error: 'Violation record not found' });
      return;
    }

    console.log('✅ Violation resolved:', { violationId: id, resolvedBy: req.user?._id });
    
    res.json({
      success: true,
      message: '違反記録が解決済みになりました',
      violation: {
        id: violation._id.toString(),
        isResolved: violation.isResolved,
        resolvedAt: violation.resolvedAt,
        resolvedBy: violation.resolvedBy
      }
    });

  } catch (error) {
    console.error('❌ Resolve violation API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: '違反の解決処理に失敗しました'
    });
  }
});

// 📊 セキュリティ統計API
app.get('/api/admin/security-stats', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected) {
      res.status(500).json({ error: 'Database connection required' });
      return;
    }

    const ViolationRecord = require('../models/ViolationRecord');
    
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total, last24hCount, last7dCount, unresolvedCount] = await Promise.all([
      ViolationRecord.countDocuments(),
      ViolationRecord.countDocuments({ timestamp: { $gte: last24h } }),
      ViolationRecord.countDocuments({ timestamp: { $gte: last7d } }),
      ViolationRecord.countDocuments({ isResolved: false })
    ]);

    res.json({
      total,
      last24h: last24hCount,
      last7d: last7dCount,
      unresolved: unresolvedCount,
      resolvedRate: total > 0 ? ((total - unresolvedCount) / total * 100).toFixed(1) : '0'
    });

  } catch (error) {
    console.error('❌ Security stats API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'セキュリティ統計の取得に失敗しました'
    });
  }
});

// 📊 トークン使用量分析API群
// =================================

// 📈 包括的トークン使用量統計API
app.get('/api/admin/token-analytics/overview', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected) {
      res.status(500).json({ error: 'Database connection required' });
      return;
    }

    const { days = 30, granularity = 'daily' } = req.query;
    const daysNumber = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNumber);

    // 集計クエリを実行
    const [
      overallStats,
      dailyBreakdown,
      modelBreakdown,
      profitAnalysis,
      topUsers,
      topCharacters
    ] = await Promise.all([
      // 1. 全体統計
      TokenUsage.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalTokensUsed: { $sum: '$tokensUsed' },
            totalInputTokens: { $sum: '$inputTokens' },
            totalOutputTokens: { $sum: '$outputTokens' },
            totalApiCost: { $sum: '$apiCost' },
            totalApiCostYen: { $sum: '$apiCostYen' },
            totalGrossProfit: { $sum: '$grossProfit' },
            totalMessages: { $sum: 1 },
            avgTokensPerMessage: { $avg: '$tokensUsed' },
            avgProfitMargin: { $avg: '$profitMargin' },
            maxTokensInMessage: { $max: '$tokensUsed' },
            minTokensInMessage: { $min: '$tokensUsed' }
          }
        }
      ]),

      // 2. 日別内訳
      TokenUsage.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            tokensUsed: { $sum: '$tokensUsed' },
            apiCostYen: { $sum: '$apiCostYen' },
            grossProfit: { $sum: '$grossProfit' },
            messageCount: { $sum: 1 },
            avgProfitMargin: { $avg: '$profitMargin' },
            uniqueUsers: { $addToSet: '$userId' }
          }
        },
        {
          $addFields: {
            uniqueUserCount: { $size: '$uniqueUsers' },
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day'
              }
            }
          }
        },
        { $sort: { date: 1 } }
      ]),

      // 3. モデル別内訳
      TokenUsage.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$model',
            tokensUsed: { $sum: '$tokensUsed' },
            inputTokens: { $sum: '$inputTokens' },
            outputTokens: { $sum: '$outputTokens' },
            apiCostYen: { $sum: '$apiCostYen' },
            grossProfit: { $sum: '$grossProfit' },
            messageCount: { $sum: 1 },
            avgProfitMargin: { $avg: '$profitMargin' },
            avgTokensPerMessage: { $avg: '$tokensUsed' }
          }
        },
        { $sort: { tokensUsed: -1 } }
      ]),

      // 4. 利益分析
      TokenUsage.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$grossProfit' },
            totalCost: { $sum: '$apiCostYen' },
            profitableMessages: {
              $sum: { $cond: [{ $gte: ['$profitMargin', 0.5] }, 1, 0] }
            },
            lowProfitMessages: {
              $sum: { $cond: [{ $lt: ['$profitMargin', 0.5] }, 1, 0] }
            },
            highCostMessages: {
              $sum: { $cond: [{ $gt: ['$apiCostYen', 50] }, 1, 0] }
            }
          }
        }
      ]),

      // 5. トップユーザー（トークン消費量）
      TokenUsage.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$userId',
            tokensUsed: { $sum: '$tokensUsed' },
            apiCostYen: { $sum: '$apiCostYen' },
            grossProfit: { $sum: '$grossProfit' },
            messageCount: { $sum: 1 },
            avgTokensPerMessage: { $avg: '$tokensUsed' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $project: {
            userId: '$_id',
            userName: { $ifNull: [{ $arrayElemAt: ['$user.name', 0] }, 'Unknown'] },
            userEmail: { $ifNull: [{ $arrayElemAt: ['$user.email', 0] }, 'Unknown'] },
            tokensUsed: 1,
            apiCostYen: 1,
            grossProfit: 1,
            messageCount: 1,
            avgTokensPerMessage: 1
          }
        },
        { $sort: { tokensUsed: -1 } },
        { $limit: 10 }
      ]),

      // 6. トップキャラクター（利用頻度）
      TokenUsage.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$characterId',
            tokensUsed: { $sum: '$tokensUsed' },
            apiCostYen: { $sum: '$apiCostYen' },
            grossProfit: { $sum: '$grossProfit' },
            messageCount: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            avgTokensPerMessage: { $avg: '$tokensUsed' }
          }
        },
        {
          $addFields: {
            uniqueUserCount: { $size: '$uniqueUsers' }
          }
        },
        {
          $lookup: {
            from: 'characters',
            localField: '_id',
            foreignField: '_id',
            as: 'character'
          }
        },
        {
          $project: {
            characterId: '$_id',
            characterName: { $ifNull: [{ $arrayElemAt: ['$character.name.ja', 0] }, 'Unknown'] },
            tokensUsed: 1,
            apiCostYen: 1,
            grossProfit: 1,
            messageCount: 1,
            uniqueUserCount: 1,
            avgTokensPerMessage: 1
          }
        },
        { $sort: { tokensUsed: -1 } },
        { $limit: 10 }
      ])
    ]);

    // レスポンスデータの構築
    const stats = overallStats[0] || {
      totalTokensUsed: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalApiCost: 0,
      totalApiCostYen: 0,
      totalGrossProfit: 0,
      totalMessages: 0,
      avgTokensPerMessage: 0,
      avgProfitMargin: 0,
      maxTokensInMessage: 0,
      minTokensInMessage: 0
    };

    const profit = profitAnalysis[0] || {
      totalRevenue: 0,
      totalCost: 0,
      profitableMessages: 0,
      lowProfitMessages: 0,
      highCostMessages: 0
    };

    const netProfit = profit.totalRevenue - profit.totalCost;
    const netProfitMargin = profit.totalRevenue > 0 ? (netProfit / profit.totalRevenue) : 0;

    res.json({
      period: `${daysNumber}日間`,
      overview: {
        totalTokensUsed: stats.totalTokensUsed,
        totalInputTokens: stats.totalInputTokens,
        totalOutputTokens: stats.totalOutputTokens,
        totalMessages: stats.totalMessages,
        avgTokensPerMessage: parseFloat(stats.avgTokensPerMessage?.toFixed(2) || '0'),
        maxTokensInMessage: stats.maxTokensInMessage,
        minTokensInMessage: stats.minTokensInMessage
      },
      financial: {
        totalApiCostUsd: parseFloat(stats.totalApiCost?.toFixed(4) || '0'),
        totalApiCostYen: parseFloat(stats.totalApiCostYen?.toFixed(2) || '0'),
        totalGrossProfit: parseFloat(stats.totalGrossProfit?.toFixed(2) || '0'),
        netProfit: parseFloat(netProfit.toFixed(2)),
        netProfitMargin: parseFloat((netProfitMargin * 100).toFixed(2)),
        avgProfitMargin: parseFloat((stats.avgProfitMargin * 100).toFixed(2) || '0'),
        profitableMessageRate: stats.totalMessages > 0 ? parseFloat(((profit.profitableMessages / stats.totalMessages) * 100).toFixed(2)) : 0,
        highCostMessageCount: profit.highCostMessages
      },
      breakdown: {
        daily: dailyBreakdown.map(day => ({
          date: day.date.toISOString().split('T')[0],
          tokensUsed: day.tokensUsed,
          apiCostYen: parseFloat(day.apiCostYen.toFixed(2)),
          grossProfit: parseFloat(day.grossProfit.toFixed(2)),
          messageCount: day.messageCount,
          uniqueUsers: day.uniqueUserCount,
          avgProfitMargin: parseFloat((day.avgProfitMargin * 100).toFixed(2))
        })),
        byModel: modelBreakdown.map(model => ({
          model: model._id,
          tokensUsed: model.tokensUsed,
          inputTokens: model.inputTokens,
          outputTokens: model.outputTokens,
          apiCostYen: parseFloat(model.apiCostYen.toFixed(2)),
          grossProfit: parseFloat(model.grossProfit.toFixed(2)),
          messageCount: model.messageCount,
          avgProfitMargin: parseFloat((model.avgProfitMargin * 100).toFixed(2)),
          avgTokensPerMessage: parseFloat(model.avgTokensPerMessage.toFixed(2))
        }))
      },
      topUsers: topUsers.map(user => ({
        userId: user.userId,
        userName: user.userName,
        userEmail: user.userEmail,
        tokensUsed: user.tokensUsed,
        apiCostYen: parseFloat(user.apiCostYen.toFixed(2)),
        grossProfit: parseFloat(user.grossProfit.toFixed(2)),
        messageCount: user.messageCount,
        avgTokensPerMessage: parseFloat(user.avgTokensPerMessage.toFixed(2))
      })),
      topCharacters: topCharacters.map(char => ({
        characterId: char.characterId,
        characterName: char.characterName,
        tokensUsed: char.tokensUsed,
        apiCostYen: parseFloat(char.apiCostYen.toFixed(2)),
        grossProfit: parseFloat(char.grossProfit.toFixed(2)),
        messageCount: char.messageCount,
        uniqueUsers: char.uniqueUserCount,
        avgTokensPerMessage: parseFloat(char.avgTokensPerMessage.toFixed(2))
      }))
    });

  } catch (error) {
    console.error('❌ Token analytics overview API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'トークン分析データの取得に失敗しました'
    });
  }
});

// 📊 利益分析詳細API
app.get('/api/admin/token-analytics/profit-analysis', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected) {
      res.status(500).json({ error: 'Database connection required' });
      return;
    }

    const { days = 30, minProfitMargin = 0 } = req.query;
    const daysNumber = parseInt(days as string);
    const minMargin = parseFloat(minProfitMargin as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNumber);

    const [
      profitDistribution,
      modelProfitability,
      lowProfitMessages,
      highCostAnalysis,
      timeBasedProfits
    ] = await Promise.all([
      // 利益率分布
      TokenUsage.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $bucket: {
            groupBy: '$profitMargin',
            boundaries: [0, 0.3, 0.5, 0.7, 0.9, 1.0],
            default: 'above_100%',
            output: {
              count: { $sum: 1 },
              avgApiCost: { $avg: '$apiCostYen' },
              avgGrossProfit: { $avg: '$grossProfit' },
              totalTokens: { $sum: '$tokensUsed' }
            }
          }
        }
      ]),

      // モデル別利益性
      TokenUsage.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$model',
            avgProfitMargin: { $avg: '$profitMargin' },
            totalApiCost: { $sum: '$apiCostYen' },
            totalGrossProfit: { $sum: '$grossProfit' },
            messageCount: { $sum: 1 },
            avgInputTokens: { $avg: '$inputTokens' },
            avgOutputTokens: { $avg: '$outputTokens' },
            costPerToken: { $avg: { $divide: ['$apiCostYen', '$tokensUsed'] } }
          }
        },
        { $sort: { avgProfitMargin: -1 } }
      ]),

      // 低利益メッセージ分析
      TokenUsage.aggregate([
        { 
          $match: { 
            createdAt: { $gte: startDate },
            profitMargin: { $lt: 0.5 }
          } 
        },
        {
          $group: {
            _id: '$characterId',
            count: { $sum: 1 },
            avgProfitMargin: { $avg: '$profitMargin' },
            avgTokensUsed: { $avg: '$tokensUsed' },
            avgApiCost: { $avg: '$apiCostYen' }
          }
        },
        {
          $lookup: {
            from: 'characters',
            localField: '_id',
            foreignField: '_id',
            as: 'character'
          }
        },
        {
          $project: {
            characterName: { $ifNull: [{ $arrayElemAt: ['$character.name.ja', 0] }, 'Unknown'] },
            count: 1,
            avgProfitMargin: 1,
            avgTokensUsed: 1,
            avgApiCost: 1
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      // 高コストメッセージ分析
      TokenUsage.aggregate([
        { 
          $match: { 
            createdAt: { $gte: startDate },
            apiCostYen: { $gt: 50 }
          } 
        },
        {
          $group: {
            _id: {
              model: '$model',
              costRange: {
                $switch: {
                  branches: [
                    { case: { $lte: ['$apiCostYen', 100] }, then: '50-100円' },
                    { case: { $lte: ['$apiCostYen', 200] }, then: '100-200円' },
                    { case: { $lte: ['$apiCostYen', 500] }, then: '200-500円' }
                  ],
                  default: '500円以上'
                }
              }
            },
            count: { $sum: 1 },
            avgTokensUsed: { $avg: '$tokensUsed' },
            avgApiCost: { $avg: '$apiCostYen' },
            avgProfitMargin: { $avg: '$profitMargin' }
          }
        },
        { $sort: { '_id.model': 1, '_id.costRange': 1 } }
      ]),

      // 時間別利益推移
      TokenUsage.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              hour: { $hour: '$createdAt' }
            },
            avgProfitMargin: { $avg: '$profitMargin' },
            totalApiCost: { $sum: '$apiCostYen' },
            totalGrossProfit: { $sum: '$grossProfit' },
            messageCount: { $sum: 1 }
          }
        },
        { $sort: { '_id.hour': 1 } }
      ])
    ]);

    res.json({
      period: `${daysNumber}日間`,
      profitDistribution: profitDistribution.map(bucket => ({
        marginRange: bucket._id === 'above_100%' ? '100%以上' : `${(bucket._id * 100).toFixed(0)}%以上`,
        messageCount: bucket.count,
        avgApiCost: parseFloat(bucket.avgApiCost.toFixed(2)),
        avgGrossProfit: parseFloat(bucket.avgGrossProfit.toFixed(2)),
        totalTokens: bucket.totalTokens
      })),
      modelProfitability: modelProfitability.map(model => ({
        model: model._id,
        avgProfitMargin: parseFloat((model.avgProfitMargin * 100).toFixed(2)),
        totalApiCost: parseFloat(model.totalApiCost.toFixed(2)),
        totalGrossProfit: parseFloat(model.totalGrossProfit.toFixed(2)),
        netProfit: parseFloat((model.totalGrossProfit - model.totalApiCost).toFixed(2)),
        messageCount: model.messageCount,
        avgInputTokens: parseFloat(model.avgInputTokens.toFixed(1)),
        avgOutputTokens: parseFloat(model.avgOutputTokens.toFixed(1)),
        costPerToken: parseFloat(model.costPerToken.toFixed(6))
      })),
      lowProfitAnalysis: lowProfitMessages.map(char => ({
        characterName: char.characterName,
        lowProfitCount: char.count,
        avgProfitMargin: parseFloat((char.avgProfitMargin * 100).toFixed(2)),
        avgTokensUsed: parseFloat(char.avgTokensUsed.toFixed(1)),
        avgApiCost: parseFloat(char.avgApiCost.toFixed(2))
      })),
      highCostAnalysis: highCostAnalysis.map(item => ({
        model: item._id.model,
        costRange: item._id.costRange,
        count: item.count,
        avgTokensUsed: parseFloat(item.avgTokensUsed.toFixed(1)),
        avgApiCost: parseFloat(item.avgApiCost.toFixed(2)),
        avgProfitMargin: parseFloat((item.avgProfitMargin * 100).toFixed(2))
      })),
      hourlyProfitTrends: timeBasedProfits.map(hour => ({
        hour: hour._id.hour,
        avgProfitMargin: parseFloat((hour.avgProfitMargin * 100).toFixed(2)),
        totalApiCost: parseFloat(hour.totalApiCost.toFixed(2)),
        totalGrossProfit: parseFloat(hour.totalGrossProfit.toFixed(2)),
        netProfit: parseFloat((hour.totalGrossProfit - hour.totalApiCost).toFixed(2)),
        messageCount: hour.messageCount
      }))
    });

  } catch (error) {
    console.error('❌ Profit analysis API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: '利益分析データの取得に失敗しました'
    });
  }
});

// 📈 トークン使用量トレンドAPI
app.get('/api/admin/token-analytics/usage-trends', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected) {
      res.status(500).json({ error: 'Database connection required' });
      return;
    }

    const { days = 30, granularity = 'daily' } = req.query;
    const daysNumber = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNumber);

    let groupBy: any;
    let sortBy: any;

    // 粒度に応じてグループ化を変更
    if (granularity === 'hourly' && daysNumber <= 7) {
      groupBy = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
        hour: { $hour: '$createdAt' }
      };
      sortBy = { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 };
    } else if (granularity === 'weekly' || daysNumber > 90) {
      groupBy = {
        year: { $year: '$createdAt' },
        week: { $week: '$createdAt' }
      };
      sortBy = { '_id.year': 1, '_id.week': 1 };
    } else {
      groupBy = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' }
      };
      sortBy = { '_id.year': 1, '_id.month': 1, '_id.day': 1 };
    }

    const [
      usageTrends,
      tokenTypeBreakdown,
      platformBreakdown,
      peakUsageAnalysis
    ] = await Promise.all([
      // 使用量トレンド
      TokenUsage.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: groupBy,
            totalTokens: { $sum: '$tokensUsed' },
            inputTokens: { $sum: '$inputTokens' },
            outputTokens: { $sum: '$outputTokens' },
            messageCount: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            uniqueCharacters: { $addToSet: '$characterId' },
            avgTokensPerMessage: { $avg: '$tokensUsed' },
            maxTokensInPeriod: { $max: '$tokensUsed' },
            apiCost: { $sum: '$apiCostYen' }
          }
        },
        {
          $addFields: {
            uniqueUserCount: { $size: '$uniqueUsers' },
            uniqueCharacterCount: { $size: '$uniqueCharacters' }
          }
        },
        { $sort: sortBy }
      ]),

      // トークンタイプ別内訳
      TokenUsage.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$tokenType',
            totalTokens: { $sum: '$tokensUsed' },
            messageCount: { $sum: 1 },
            avgTokensPerMessage: { $avg: '$tokensUsed' },
            apiCost: { $sum: '$apiCostYen' }
          }
        },
        { $sort: { totalTokens: -1 } }
      ]),

      // プラットフォーム別内訳
      TokenUsage.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$platform',
            totalTokens: { $sum: '$tokensUsed' },
            messageCount: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            avgTokensPerMessage: { $avg: '$tokensUsed' },
            apiCost: { $sum: '$apiCostYen' }
          }
        },
        {
          $addFields: {
            uniqueUserCount: { $size: '$uniqueUsers' }
          }
        },
        { $sort: { totalTokens: -1 } }
      ]),

      // ピーク使用量分析
      TokenUsage.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              hour: { $hour: '$createdAt' },
              dayOfWeek: { $dayOfWeek: '$createdAt' }
            },
            totalTokens: { $sum: '$tokensUsed' },
            messageCount: { $sum: 1 },
            avgTokensPerMessage: { $avg: '$tokensUsed' }
          }
        },
        { $sort: { totalTokens: -1 } },
        { $limit: 20 }
      ])
    ]);

    // トレンドデータの整形
    const trends = usageTrends.map(item => {
      let timeLabel: string;
      
      if (item._id.hour !== undefined) {
        timeLabel = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')} ${String(item._id.hour).padStart(2, '0')}:00`;
      } else if (item._id.week !== undefined) {
        timeLabel = `${item._id.year}年第${item._id.week}週`;
      } else {
        timeLabel = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
      }

      return {
        period: timeLabel,
        totalTokens: item.totalTokens,
        inputTokens: item.inputTokens,
        outputTokens: item.outputTokens,
        messageCount: item.messageCount,
        uniqueUsers: item.uniqueUserCount,
        uniqueCharacters: item.uniqueCharacterCount,
        avgTokensPerMessage: parseFloat(item.avgTokensPerMessage.toFixed(2)),
        maxTokensInPeriod: item.maxTokensInPeriod,
        apiCost: parseFloat(item.apiCost.toFixed(2)),
        tokensPerUser: item.uniqueUserCount > 0 ? parseFloat((item.totalTokens / item.uniqueUserCount).toFixed(2)) : 0
      };
    });

    // 曜日名マッピング
    const dayNames = ['', '日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

    res.json({
      period: `${daysNumber}日間`,
      granularity,
      trends,
      breakdown: {
        byTokenType: tokenTypeBreakdown.map(type => ({
          tokenType: type._id,
          totalTokens: type.totalTokens,
          messageCount: type.messageCount,
          avgTokensPerMessage: parseFloat(type.avgTokensPerMessage.toFixed(2)),
          apiCost: parseFloat(type.apiCost.toFixed(2)),
          sharePercentage: parseFloat(((type.totalTokens / usageTrends.reduce((sum, t) => sum + t.totalTokens, 0)) * 100).toFixed(2))
        })),
        byPlatform: platformBreakdown.map(platform => ({
          platform: platform._id,
          totalTokens: platform.totalTokens,
          messageCount: platform.messageCount,
          uniqueUsers: platform.uniqueUserCount,
          avgTokensPerMessage: parseFloat(platform.avgTokensPerMessage.toFixed(2)),
          apiCost: parseFloat(platform.apiCost.toFixed(2)),
          tokensPerUser: platform.uniqueUserCount > 0 ? parseFloat((platform.totalTokens / platform.uniqueUserCount).toFixed(2)) : 0
        }))
      },
      peakUsage: peakUsageAnalysis.map(peak => ({
        hour: peak._id.hour,
        dayOfWeek: dayNames[peak._id.dayOfWeek],
        totalTokens: peak.totalTokens,
        messageCount: peak.messageCount,
        avgTokensPerMessage: parseFloat(peak.avgTokensPerMessage.toFixed(2))
      })),
      summary: {
        totalPeriods: trends.length,
        avgTokensPerPeriod: trends.length > 0 ? parseFloat((trends.reduce((sum, t) => sum + t.totalTokens, 0) / trends.length).toFixed(2)) : 0,
        peakTokensInPeriod: Math.max(...trends.map(t => t.totalTokens)),
        mostActiveDay: peakUsageAnalysis[0] ? `${dayNames[peakUsageAnalysis[0]._id.dayOfWeek]} ${peakUsageAnalysis[0]._id.hour}時` : 'N/A'
      }
    });

  } catch (error) {
    console.error('❌ Usage trends API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: '使用量トレンドデータの取得に失敗しました'
    });
  }
});

// 🔍 異常使用検知API
app.get('/api/admin/token-analytics/anomaly-detection', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected) {
      res.status(500).json({ error: 'Database connection required' });
      return;
    }

    const { hours = 24 } = req.query;
    const hoursNumber = parseInt(hours as string);
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hoursNumber);

    const [
      suspiciousUsers,
      abnormalMessages,
      costAnomalies,
      frequencyAnomalies
    ] = await Promise.all([
      // 疑わしいユーザー（異常な使用量）
      TokenUsage.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$userId',
            totalTokens: { $sum: '$tokensUsed' },
            messageCount: { $sum: 1 },
            totalCost: { $sum: '$apiCostYen' },
            avgTokensPerMessage: { $avg: '$tokensUsed' },
            maxTokensInMessage: { $max: '$tokensUsed' },
            distinctCharacters: { $addToSet: '$characterId' },
            firstMessage: { $min: '$createdAt' },
            lastMessage: { $max: '$createdAt' }
          }
        },
        {
          $addFields: {
            characterCount: { $size: '$distinctCharacters' },
            timeSpanHours: { $divide: [{ $subtract: ['$lastMessage', '$firstMessage'] }, 3600000] }
          }
        },
        {
          $match: {
            $or: [
              { totalTokens: { $gt: 20000 } }, // 24時間で20k tokens以上
              { avgTokensPerMessage: { $gt: 3000 } }, // 1メッセージ3k tokens以上
              { totalCost: { $gt: 1000 } }, // 24時間で1000円以上
              { messageCount: { $gt: 200 } } // 24時間で200メッセージ以上
            ]
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $project: {
            userId: '$_id',
            userName: { $ifNull: [{ $arrayElemAt: ['$user.name', 0] }, 'Unknown'] },
            userEmail: { $ifNull: [{ $arrayElemAt: ['$user.email', 0] }, 'Unknown'] },
            totalTokens: 1,
            messageCount: 1,
            totalCost: 1,
            avgTokensPerMessage: 1,
            maxTokensInMessage: 1,
            characterCount: 1,
            timeSpanHours: 1,
            anomalyScore: {
              $add: [
                { $cond: [{ $gt: ['$totalTokens', 20000] }, 3, 0] },
                { $cond: [{ $gt: ['$avgTokensPerMessage', 3000] }, 3, 0] },
                { $cond: [{ $gt: ['$totalCost', 1000] }, 2, 0] },
                { $cond: [{ $gt: ['$messageCount', 200] }, 2, 0] }
              ]
            }
          }
        },
        { $sort: { anomalyScore: -1, totalTokens: -1 } },
        { $limit: 20 }
      ]),

      // 異常メッセージ（高トークン使用）
      TokenUsage.aggregate([
        { 
          $match: { 
            createdAt: { $gte: startDate },
            tokensUsed: { $gt: 2000 }
          } 
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $lookup: {
            from: 'characters',
            localField: 'characterId',
            foreignField: '_id',
            as: 'character'
          }
        },
        {
          $project: {
            userId: 1,
            userName: { $ifNull: [{ $arrayElemAt: ['$user.name', 0] }, 'Unknown'] },
            characterName: { $ifNull: [{ $arrayElemAt: ['$character.name.ja', 0] }, 'Unknown'] },
            tokensUsed: 1,
            inputTokens: 1,
            outputTokens: 1,
            apiCostYen: 1,
            model: 1,
            createdAt: 1,
            messageLength: { $strLenCP: '$messageContent' },
            responseLength: { $strLenCP: '$responseContent' }
          }
        },
        { $sort: { tokensUsed: -1 } },
        { $limit: 50 }
      ]),

      // コスト異常（高額API使用）
      TokenUsage.aggregate([
        { 
          $match: { 
            createdAt: { $gte: startDate },
            apiCostYen: { $gt: 100 }
          } 
        },
        {
          $group: {
            _id: {
              userId: '$userId',
              model: '$model'
            },
            totalCost: { $sum: '$apiCostYen' },
            messageCount: { $sum: 1 },
            avgCost: { $avg: '$apiCostYen' },
            maxCost: { $max: '$apiCostYen' },
            totalTokens: { $sum: '$tokensUsed' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id.userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $project: {
            userId: '$_id.userId',
            model: '$_id.model',
            userName: { $ifNull: [{ $arrayElemAt: ['$user.name', 0] }, 'Unknown'] },
            totalCost: 1,
            messageCount: 1,
            avgCost: 1,
            maxCost: 1,
            totalTokens: 1
          }
        },
        { $sort: { totalCost: -1 } },
        { $limit: 20 }
      ]),

      // 頻度異常（短時間での大量使用）
      TokenUsage.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              userId: '$userId',
              hour: { $hour: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            messageCount: { $sum: 1 },
            totalTokens: { $sum: '$tokensUsed' },
            totalCost: { $sum: '$apiCostYen' }
          }
        },
        {
          $match: {
            $or: [
              { messageCount: { $gt: 50 } }, // 1時間で50メッセージ以上
              { totalTokens: { $gt: 5000 } } // 1時間で5k tokens以上
            ]
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id.userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $project: {
            userId: '$_id.userId',
            hour: '$_id.hour',
            day: '$_id.day',
            userName: { $ifNull: [{ $arrayElemAt: ['$user.name', 0] }, 'Unknown'] },
            messageCount: 1,
            totalTokens: 1,
            totalCost: 1
          }
        },
        { $sort: { messageCount: -1 } },
        { $limit: 30 }
      ])
    ]);

    res.json({
      period: `過去${hoursNumber}時間`,
      suspiciousUsers: suspiciousUsers.map(user => ({
        userId: user.userId,
        userName: user.userName,
        userEmail: user.userEmail,
        totalTokens: user.totalTokens,
        messageCount: user.messageCount,
        totalCost: parseFloat(user.totalCost.toFixed(2)),
        avgTokensPerMessage: parseFloat(user.avgTokensPerMessage.toFixed(2)),
        maxTokensInMessage: user.maxTokensInMessage,
        characterCount: user.characterCount,
        timeSpanHours: parseFloat(user.timeSpanHours.toFixed(2)),
        anomalyScore: user.anomalyScore,
        riskLevel: user.anomalyScore >= 5 ? 'high' : user.anomalyScore >= 3 ? 'medium' : 'low'
      })),
      abnormalMessages: abnormalMessages.map(msg => ({
        userId: msg.userId,
        userName: msg.userName,
        characterName: msg.characterName,
        tokensUsed: msg.tokensUsed,
        inputTokens: msg.inputTokens,
        outputTokens: msg.outputTokens,
        apiCostYen: parseFloat(msg.apiCostYen.toFixed(2)),
        model: msg.model,
        messageLength: msg.messageLength,
        responseLength: msg.responseLength,
        createdAt: msg.createdAt,
        efficiency: msg.messageLength > 0 ? parseFloat((msg.tokensUsed / msg.messageLength).toFixed(3)) : 0
      })),
      costAnomalies: costAnomalies.map(item => ({
        userId: item.userId,
        userName: item.userName,
        model: item.model,
        totalCost: parseFloat(item.totalCost.toFixed(2)),
        messageCount: item.messageCount,
        avgCost: parseFloat(item.avgCost.toFixed(2)),
        maxCost: parseFloat(item.maxCost.toFixed(2)),
        totalTokens: item.totalTokens,
        costPerToken: parseFloat((item.totalCost / item.totalTokens).toFixed(6))
      })),
      frequencyAnomalies: frequencyAnomalies.map(item => ({
        userId: item.userId,
        userName: item.userName,
        timeSlot: `${item.day}日 ${item.hour}時台`,
        messageCount: item.messageCount,
        totalTokens: item.totalTokens,
        totalCost: parseFloat(item.totalCost.toFixed(2)),
        messagesPerMinute: parseFloat((item.messageCount / 60).toFixed(2))
      })),
      summary: {
        totalSuspiciousUsers: suspiciousUsers.length,
        totalAbnormalMessages: abnormalMessages.length,
        totalCostAnomalies: costAnomalies.length,
        totalFrequencyAnomalies: frequencyAnomalies.length,
        highRiskUsers: suspiciousUsers.filter(u => u.anomalyScore >= 5).length,
        mediumRiskUsers: suspiciousUsers.filter(u => u.anomalyScore >= 3 && u.anomalyScore < 5).length
      }
    });

  } catch (error) {
    console.error('❌ Anomaly detection API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: '異常検知データの取得に失敗しました'
    });
  }
});

// ================================
// 🎯 CharacterPromptCache Performance API Endpoints
// ================================

/**
 * 📊 キャッシュパフォーマンス総合メトリクス取得
 */
app.get('/api/admin/cache/performance', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('📊 Cache performance metrics requested by admin:', req.user?._id);
    
    const timeframe = parseInt(req.query.timeframe as string) || 30; // デフォルト30日
    
    if (!isMongoConnected) {
      res.status(503).json({
        error: 'Database not connected',
        message: 'データベース接続が必要です'
      });
      return;
    }

    const metrics = await getCachePerformanceMetrics(timeframe);
    
    console.log('✅ Cache performance metrics retrieved:', {
      totalCaches: metrics.totalCaches,
      hitRatio: metrics.hitRatio,
      charactersAnalyzed: metrics.cachesByCharacter.length
    });

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date(),
      timeframe: timeframe
    });

  } catch (error) {
    console.error('❌ Cache performance metrics error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'キャッシュパフォーマンス取得に失敗しました'
    });
  }
});

/**
 * 📈 キャラクター別キャッシュ統計取得
 */
app.get('/api/admin/cache/characters', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('📈 Character cache stats requested by admin:', req.user?._id);
    
    const timeframe = parseInt(req.query.timeframe as string) || 30;
    
    if (!isMongoConnected) {
      res.status(503).json({
        error: 'Database not connected',
        message: 'データベース接続が必要です'
      });
      return;
    }

    const characters = await CharacterModel.find({ isActive: true });
    const characterStats = await getCacheStatsByCharacter(characters, timeframe);
    
    console.log('✅ Character cache stats retrieved for', characterStats.length, 'characters');

    res.json({
      success: true,
      data: characterStats,
      timestamp: new Date(),
      timeframe: timeframe
    });

  } catch (error) {
    console.error('❌ Character cache stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'キャラクター別キャッシュ統計取得に失敗しました'
    });
  }
});

/**
 * 🏆 トップパフォーマンスキャッシュ取得
 */
app.get('/api/admin/cache/top-performing', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('🏆 Top performing caches requested by admin:', req.user?._id);
    
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (!isMongoConnected) {
      res.status(503).json({
        error: 'Database not connected',
        message: 'データベース接続が必要です'
      });
      return;
    }

    const characters = await CharacterModel.find({ isActive: true });
    const topCaches = await getTopPerformingCaches(characters, limit);
    
    console.log('✅ Top performing caches retrieved:', topCaches.length);

    res.json({
      success: true,
      data: topCaches,
      timestamp: new Date(),
      limit: limit
    });

  } catch (error) {
    console.error('❌ Top performing caches error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'トップパフォーマンスキャッシュ取得に失敗しました'
    });
  }
});

/**
 * 🗑️ キャッシュ無効化統計取得
 */
app.get('/api/admin/cache/invalidation-stats', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('🗑️ Cache invalidation stats requested by admin:', req.user?._id);
    
    const timeframe = parseInt(req.query.timeframe as string) || 30;
    
    if (!isMongoConnected) {
      res.status(503).json({
        error: 'Database not connected',
        message: 'データベース接続が必要です'
      });
      return;
    }

    const invalidationStats = await getCacheInvalidationStats(timeframe);
    
    console.log('✅ Cache invalidation stats retrieved');

    res.json({
      success: true,
      data: invalidationStats,
      timestamp: new Date(),
      timeframe: timeframe
    });

  } catch (error) {
    console.error('❌ Cache invalidation stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'キャッシュ無効化統計取得に失敗しました'
    });
  }
});


/**
 * 💱 現在の為替レート取得
 */
app.get('/api/admin/exchange-rate', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('💱 Exchange rate requested by admin:', req.user?._id);
    
    // 最新の為替レートを取得
    const latestRate = await ExchangeRateModel.findOne({
      baseCurrency: 'USD',
      targetCurrency: 'JPY',
      isValid: true
    }).sort({ fetchedAt: -1 });

    // 前回のレートも取得（比較用）
    const previousRate = await ExchangeRateModel.findOne({
      baseCurrency: 'USD',
      targetCurrency: 'JPY',
      isValid: true,
      fetchedAt: { $lt: latestRate?.fetchedAt || new Date() }
    }).sort({ fetchedAt: -1 });

    if (!latestRate) {
      // フォールバックレートを返す
      res.json({
        success: true,
        data: {
          rate: 150,
          source: 'fallback',
          fetchedAt: new Date().toISOString(),
          isValid: false,
          message: '為替レートが未取得です'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: {
        rate: latestRate.rate,
        source: latestRate.source,
        fetchedAt: latestRate.fetchedAt,
        isValid: latestRate.isValid,
        previousRate: previousRate?.rate
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching exchange rate:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '為替レートの取得に失敗しました'
    });
  }
});

/**
 * 📊 APIエラー統計取得
 */
app.get('/api/admin/error-stats', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('📊 API error stats requested by admin:', req.user?._id);
    
    const timeRange = (req.query.range as string) || '24h';
    const errorStats = await (APIErrorModel as any).getErrorStats(timeRange);
    
    res.json({
      success: true,
      data: {
        timeRange,
        stats: errorStats,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching API error stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'APIエラー統計の取得に失敗しました'
    });
  }
});

/**
 * 📅 クーロンジョブ状態確認
 */
app.get('/api/admin/cron-status', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('📅 Cron job status requested by admin:', req.user?._id);
    
    const now = new Date();
    const jstOffset = 9 * 60; // JST = UTC+9
    const jstNow = new Date(now.getTime() + jstOffset * 60000);
    
    // 次回実行時刻の計算（概算）
    const nextMoodDecay = new Date(Math.ceil(jstNow.getTime() / (10 * 60 * 1000)) * (10 * 60 * 1000));
    const nextInactivity = new Date(jstNow);
    nextInactivity.setHours(9, 0, 0, 0);
    if (jstNow.getHours() >= 9) {
      nextInactivity.setDate(nextInactivity.getDate() + 1);
    }
    
    const status = {
      serverTime: now.toISOString(),
      serverTimeJST: jstNow.toISOString().replace('Z', '+09:00'),
      jobs: [
        {
          id: 'mood-decay',
          name: '気分減衰クリーンアップ',
          schedule: '*/10 * * * *',
          description: '10分毎に期限切れの気分修飾子をクリーンアップ',
          frequency: '10分毎',
          nextRunJST: nextMoodDecay.toISOString().replace('Z', '+09:00'),
          isActive: true,
          lastRunTime: 'ログを確認してください'
        },
        {
          id: 'inactivity-mood',
          name: '非アクティブユーザー処理',
          schedule: '0 9 * * *',
          description: '毎日9時に7日以上非アクティブなユーザーの気分を調整',
          frequency: '毎日 9:00',
          nextRunJST: nextInactivity.toISOString().replace('Z', '+09:00'),
          isActive: true,
          lastRunTime: 'ログを確認してください'
        },
        {
          id: 'exchange-rate-update',
          name: '為替レート更新',
          schedule: '0 10 * * 1',
          description: 'USD/JPY為替レートを毎週月曜日10時に更新（異常値検知・フォールバック機能付き）',
          frequency: '週1回（月曜 10:00）',
          nextRunJST: (() => {
            try {
              const dayjs = require('dayjs');
              const utc = require('dayjs/plugin/utc');
              const timezone = require('dayjs/plugin/timezone');
              dayjs.extend(utc);
              dayjs.extend(timezone);
              
              const now = dayjs().tz('Asia/Tokyo');
              let nextMonday = now.day(1).hour(10).minute(0).second(0);
              if (nextMonday.isBefore(now)) {
                nextMonday = nextMonday.add(1, 'week');
              }
              return nextMonday.toISOString().replace('Z', '+09:00');
            } catch (error) {
              // dayjsエラー時のフォールバック
              const now = new Date();
              const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              nextWeek.setHours(10, 0, 0, 0);
              return nextWeek.toISOString().replace('Z', '+09:00');
            }
          })(),
          isActive: true,
          lastRunTime: 'ログを確認してください'
        }
      ],
      monitoring: {
        note: 'クーロンジョブの詳細な実行状況はサーバーログで確認できます',
        logMessages: [
          '🎭 Starting Mood Decay Cron Job (起動時)',
          '🧹 Running mood decay cleanup... (10分毎)',
          '😔 Checking for inactive users... (毎日9時)',
          '💱 Starting Exchange Rate Update Cron Job (起動時)',
          '💱 Running weekly exchange rate update... (週1回月曜10時)'
        ]
      }
    };

    res.json({
      success: true,
      data: status,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('❌ Cron status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'クーロンジョブ状態取得に失敗しました'
    });
  }
});

/**
 * 📋 サーバーログ取得（管理者用）
 */
app.get('/api/admin/logs', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('📋 Server logs requested by admin:', req.user?._id);
    
    const lines = parseInt(req.query.lines as string) || 100;
    const filter = req.query.filter as string || '';
    
    // PM2ログの読み取り（本番環境）
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    try {
      // PM2ログを取得
      const { stdout } = await execAsync(`pm2 logs --lines ${lines} --raw --nostream`);
      let logs = stdout.split('\n').filter((line: string) => line.trim() !== '');
      
      // フィルタリング
      if (filter) {
        logs = logs.filter((line: string) => 
          line.toLowerCase().includes(filter.toLowerCase())
        );
      }
      
      // クーロンジョブ関連ログのハイライト
      const processedLogs = logs.map((line: string) => {
        const timestamp = new Date().toISOString();
        let type = 'info';
        
        if (line.includes('🎭') || line.includes('🧹') || line.includes('😔')) {
          type = 'cron';
        } else if (line.includes('❌') || line.includes('ERROR')) {
          type = 'error';
        } else if (line.includes('✅') || line.includes('SUCCESS')) {
          type = 'success';
        } else if (line.includes('⚠️') || line.includes('WARN')) {
          type = 'warning';
        }
        
        return {
          timestamp,
          type,
          message: line,
          isCronRelated: line.includes('🎭') || line.includes('🧹') || line.includes('😔') || 
                        line.includes('mood') || line.includes('cron') || line.includes('Mood')
        };
      });
      
      res.json({
        success: true,
        data: {
          logs: processedLogs.slice(-lines), // 最新のログを返す
          totalLines: processedLogs.length,
          filter: filter,
          cronJobLogs: processedLogs.filter(log => log.isCronRelated).slice(-20)
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (pm2Error) {
      // PM2が利用できない場合は、Console.logの履歴を返す
      console.warn('PM2 logs not available, returning recent console output');
      
      const recentLogs = [
        { timestamp: new Date().toISOString(), type: 'info', message: 'PM2ログにアクセスできません', isCronRelated: false },
        { timestamp: new Date().toISOString(), type: 'info', message: 'サーバーは正常に動作しています', isCronRelated: false },
        { timestamp: new Date().toISOString(), type: 'cron', message: '🎭 クーロンジョブは設定されています', isCronRelated: true },
        { timestamp: new Date().toISOString(), type: 'info', message: 'ログの詳細確認にはサーバー直接アクセスが必要です', isCronRelated: false }
      ];
      
      res.json({
        success: true,
        data: {
          logs: recentLogs,
          totalLines: recentLogs.length,
          filter: filter,
          cronJobLogs: recentLogs.filter(log => log.isCronRelated),
          note: 'PM2ログにアクセスできないため、限定的な情報のみ表示'
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Server logs error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'サーバーログ取得に失敗しました'
    });
  }
});

/**
 * 🧹 キャッシュクリーンアップ実行
 */
app.post('/api/admin/cache/cleanup', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('🧹 Cache cleanup requested by admin:', req.user?._id);
    
    if (!isMongoConnected) {
      res.status(503).json({
        error: 'Database not connected',
        message: 'データベース接続が必要です'
      });
      return;
    }

    const cleanupResult = await performCacheCleanup();
    
    console.log('✅ Cache cleanup completed:', cleanupResult);

    res.json({
      success: true,
      data: cleanupResult,
      message: `${cleanupResult.deletedCount}個のキャッシュを削除し、${Math.round(cleanupResult.memoryFreed / 1024)}KBのメモリを解放しました`,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Cache cleanup error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'キャッシュクリーンアップに失敗しました'
    });
  }
});

/**
 * 🎯 特定キャラクターのキャッシュ無効化
 */
routeRegistry.define('DELETE', '/api/admin/cache/character/:characterId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { characterId } = req.params;
    const reason = req.body.reason || 'manual_admin_action';
    
    console.log('🎯 Character cache invalidation requested:', {
      characterId,
      reason,
      adminId: req.user?._id
    });
    
    if (!isMongoConnected) {
      res.status(503).json({
        error: 'Database not connected',
        message: 'データベース接続が必要です'
      });
      return;
    }

    // キャラクターの存在確認
    const character = await CharacterModel.findById(characterId);
    if (!character) {
      res.status(404).json({
        error: 'Character not found',
        message: 'キャラクターが見つかりません'
      });
      return;
    }

    const invalidationResult = await invalidateCharacterCache(characterId, reason);
    
    console.log('✅ Character cache invalidation completed:', invalidationResult);

    res.json({
      success: true,
      data: invalidationResult,
      message: `${character.name?.ja || character.name}のキャッシュ${invalidationResult.deletedCount}個を無効化しました`,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Character cache invalidation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'キャラクターキャッシュ無効化に失敗しました'
    });
  }
});


// ==================== DEBUG ENDPOINTS ====================




// グローバルエラーハンドリングミドルウェア（最後に設定）
app.use(errorLoggingMiddleware);

app.listen(PORT, async () => {
  console.log('✅ Server is running on:', { port: PORT, url: `http://localhost:${PORT}` });
  
  // 🎭 MoodEngine Cronジョブを開始
  startAllMoodJobs();
  
  // 💱 為替レート更新Cronジョブを開始
  startExchangeRateJob();
  
  // 💱 初回起動時に為替レートを初期化
  await initializeExchangeRate();
});
