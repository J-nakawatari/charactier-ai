import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
// PM2が環境変数を注入するため、dotenvは不要
// import dotenv from 'dotenv';
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
import { authenticateToken, AuthRequest, isModerator, hasWritePermission } from './middleware/auth';
import authRoutes from './routes/auth';
import characterRoutes from './routes/characters';
import adminCharactersRoutes from './routes/adminCharacters';
import adminNotificationsRoutes from './routes/adminNotifications';
import modelRoutes from './routes/modelSettings';
import notificationRoutes from './routes/notifications';
import systemSettingsRoutes from './routes/systemSettings';
import systemRoutes from './routes/system';
import debugRoutes from './routes/debug';
import userRoutes from './routes/user';
import { monitoringMiddleware } from './middleware/monitoring';
import { registrationRateLimit } from './middleware/registrationLimit';
import { createRateLimiter } from './middleware/rateLimiter';
// const userRoutes = require('./routes/user');
// const dashboardRoutes = require('./routes/dashboard');
import { validateMessage } from './utils/contentFilter';
import { recordViolation, applySanction, checkChatPermission, getViolationStats } from './utils/sanctionSystem';
import { ViolationRecordModel } from './models/ViolationRecord';
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
// const TokenService = require('../../services/tokenService');
import routeRegistry from './core/RouteRegistry';
import { validate, validateObjectId } from './middleware/validation';
import { authSchemas, characterSchemas, chatSchemas, paymentSchemas, adminSchemas, objectId, email, password, name } from './validation/schemas';
import Joi from 'joi';
import { configureSecurityHeaders } from './middleware/securityHeaders';
import log from './utils/logger';
import { requestLoggingMiddleware, securityAuditMiddleware } from './middleware/requestLogger';
import { sendErrorResponse, ClientErrorCode } from './utils/errorResponse';
import { ServerMonitor } from './monitoring/ServerMonitor';
import { API_PREFIX } from './config/api';

// PM2が環境変数を注入するため、dotenv.config()は不要
// 開発環境の場合のみdotenvを使用（PM2を使わない場合）
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config({ path: './.env' });
  } catch (error) {
    console.log('⚠️ dotenv not available in development, using process.env directly');
  }
}

// 環境変数の読み込み状態をログに出力（値は出力しない）
log.info('Environment configuration', {
  nodeEnv: process.env.NODE_ENV,
  hasSendGridKey: !!process.env.SENDGRID_API_KEY,
  hasMongoUri: !!process.env.MONGO_URI,
  hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
  loadedBy: process.env.NODE_ENV === 'production' ? 'PM2' : 'dotenv'
});

const app = express();
routeRegistry.setApp(app);
// ★ 新: 環境変数優先、無ければ 5000
const PORT = process.env.PORT || 5000;

// Nginxなどのプロキシ経由の場合、実際のクライアントIPを取得
app.set('trust proxy', true);

// MongoDB接続
let isMongoConnected = false;
const connectMongoDB = async () => {
  if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      isMongoConnected = true;
    } catch (error) {
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
}

// OpenAI インスタンス初期化
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}


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
  let userAffinityLevel = 0; // 共通変数として定義

  // 🔧 プロンプトキャッシュシステムの実装
  if (userId && isMongoConnected) {
    try {
      // 実際のユーザー親密度を取得
      const user = await UserModel.findById(userId);
      if (user) {
        const affinity = user.affinities.find(
          aff => aff.character.toString() === characterId
        );
        userAffinityLevel = affinity?.level || 0;
      }
      
      // キャッシュ検索（親密度レベル±5で検索）
      const affinityRange = 5;
      
      const cachedPrompt = await CharacterPromptCache.findOne({
        userId: userId,
        characterId: characterId,
        'promptConfig.affinityLevel': {
          $gte: Math.max(0, userAffinityLevel - affinityRange),
          $lte: Math.min(100, userAffinityLevel + affinityRange)
        },
        'promptConfig.languageCode': 'ja',
        ttl: { $gt: new Date() }, // TTL未期限切れ
        characterVersion: '1.0.0'
      }).sort({ 
        useCount: -1, // 使用回数順
        lastUsed: -1  // 最終使用日順
      });

      if (cachedPrompt) {
        systemPrompt = cachedPrompt.systemPrompt;
        cacheHit = true;
        
        // ユーザー名を動的に追加（キャッシュにはユーザー名を含めない）
        if (user && user.name) {
          const userNameInfo = `

【話し相手について】
あなたが会話している相手の名前は「${user.name}」です。会話の中で自然に名前を呼んであげてください。`;
          
          // プロンプトにユーザー名情報を挿入（説明の後、会話スタンスの前）
          systemPrompt = systemPrompt.replace(
            '【会話スタンス】',
            userNameInfo + '\n\n【会話スタンス】'
          );
        }
        
        // キャッシュ使用統計を更新
        cachedPrompt.lastUsed = new Date();
        cachedPrompt.useCount += 1;
        await cachedPrompt.save();
        
        // キャッシュから取得したプロンプトをログに表示
        console.log('🎯 Cache HIT! Using cached prompt');
        console.log(`📝 Cache details: userId=${userId}, characterId=${characterId}, affinityLevel=${userAffinityLevel}`);
        console.log('📝 ========== CACHED SYSTEM PROMPT ==========');
        console.log(systemPrompt.substring(0, 500) + '...');  // 最初の500文字のみ表示
        console.log('📝 ========== END CACHED PROMPT ==========');
        
      }
    } catch (cacheError) {
      // キャッシュエラーは無視して続行
    }
  }

  // キャッシュがない場合は新規生成
  if (!systemPrompt) {
    
    // 🎭 現在の気分状態とユーザー情報を取得してプロンプトに反映
    let moodInstruction = '';
    let userName = '';
    if (userId) {
      try {
        const user = await UserModel.findById(userId);
        if (user) {
          // ユーザー名を取得
          userName = user.name || '';
          
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
            
          }
        }
      } catch (moodError) {
      }
    }
    
    // ユーザー名の情報を追加
    const userNameInfo = userName ? `

【話し相手について】
あなたが会話している相手の名前は「${userName}」です。会話の中で自然に名前を呼んであげてください。` : '';

    // 統一されたプロンプト構造を生成
    const baseIntro = character.personalityPrompt?.ja || `あなたは${character.name.ja}です。`;
    
    // キャラクター設定セクション
    const characterSettingLines = [];
    if (character.personalityPreset) characterSettingLines.push(`性格: ${character.personalityPreset}`);
    if (character.age) characterSettingLines.push(`年齢: ${character.age}`);
    if (character.occupation) characterSettingLines.push(`職業: ${character.occupation}`);
    if (character.personalityTags && character.personalityTags.length > 0) {
      characterSettingLines.push(`特徴: ${character.personalityTags.join(', ')}`);
    }
    
    const characterSettingSection = characterSettingLines.length > 0 
      ? `\n\n【キャラクター設定】\n${characterSettingLines.join('\n')}`
      : '';

    // プロンプトを組み立て
    systemPrompt = baseIntro + 
      (moodInstruction || '') +
      (userNameInfo || '') +
      `\n\n【会話スタンス】
あなたは相手の話し相手として会話します。アドバイスや解決策を提示するのではなく、人間らしい自然な反応や共感を示してください。
相手の感情や状況に寄り添い、「そうなんだ」「大変だったね」「わかる」といった、友達同士のような気持ちの共有を大切にしてください。` +
      characterSettingSection +
      `\n\n【会話ルール】
- 上記の設定に従って、一人称と話し方でユーザーと自然な会話をしてください
- 約50-150文字程度で返答してください
- 絵文字を適度に使用してください`;

    // 新規生成されたプロンプトをログに表示
    console.log('🔨 Cache MISS! Generating new prompt');
    console.log(`📝 Generation details: characterId=${characterId}, affinityLevel=${userAffinityLevel}`);
    console.log('📝 ========== GENERATED SYSTEM PROMPT ==========');
    console.log(systemPrompt);
    console.log('📝 ========== END GENERATED PROMPT ==========');
    
    // キャッシュサイズ制限（8000文字超の場合は要約）
    if (systemPrompt.length > 8000) {
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
            affinityLevel: userAffinityLevel, // 実際のユーザー親密度
            personalityTags: character.personalityTags || [],
            toneStyle: userAffinityLevel >= 85 ? '恋人のように甘く親密な口調' :
                      userAffinityLevel >= 60 ? '親友のようにフレンドリーで親しみやすい口調' :
                      userAffinityLevel >= 40 ? '時々タメ口を交えた親しみやすい口調' :
                      userAffinityLevel >= 20 ? '少しだけ砕けた丁寧語' :
                      '丁寧語で礼儀正しい口調', // 親密度レベルに応じたトーン
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
        
      } catch (saveError) {
        // キャッシュ保存エラーは無視して続行
        console.error('⚠️ CharacterPromptCache save error:', saveError);
      }
    }
  }

  if (openai) {
    // 実際のOpenAI API呼び出し
    try {

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory,
        { role: 'user' as const, content: userMessage }
      ];

      // OpenAIに送信する直前にプロンプト全体をログ出力
      console.log('🤖 ========== FINAL PROMPT TO OPENAI ==========');
      console.log('SYSTEM PROMPT:');
      console.log(systemPrompt);
      console.log('');
      console.log('CONVERSATION HISTORY:');
      conversationHistory.forEach((msg, index) => {
        console.log(`${index + 1}. ${msg.role}: ${msg.content}`);
      });
      console.log('');
      console.log('USER MESSAGE:');
      console.log(userMessage);
      console.log('🤖 ========== END OPENAI PROMPT ==========');

      const completion = await openai.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: 200,
        temperature: 0.8
      });

      const responseContent = completion.choices[0]?.message?.content || 'すみません、うまく答えられませんでした...';
      const tokensUsed = completion.usage?.total_tokens || 150;

      return {
        content: responseContent,
        tokensUsed,
        systemPrompt,
        cacheHit
      };

    } catch (error) {
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
  process.exit(1);
}

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
// statusCodeLoggerMiddleware を無効化 - monitoringMiddleware と重複してエラーをカウントするため
// app.use(statusCodeLoggerMiddleware);

// 監視ミドルウェア（リクエスト統計収集）
app.use(monitoringMiddleware);

// セキュリティヘッダーの設定（CORSの後、express.json()の前）
configureSecurityHeaders(app);

// リクエストロギングとセキュリティ監査
app.use(requestLoggingMiddleware);
app.use(securityAuditMiddleware);

// ⚠️ IMPORTANT: Stripe webhook MUST come BEFORE express.json()
// Stripe webhook endpoint (needs raw body)
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response): Promise<void> => {
  
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  console.log('[Stripe Webhook] Received request');
  console.log('[Stripe Webhook] Signature:', sig ? 'Present' : 'Missing');
  console.log('[Stripe Webhook] Body type:', typeof req.body);
  console.log('[Stripe Webhook] Body length:', req.body?.length || 0);

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    log.debug('[Stripe Webhook] Configuration', {
      webhookSecretSet: !!webhookSecret,
      stripeInitialized: !!stripe
    });
    
    if (!stripe || !webhookSecret) {
      log.error('[Stripe Webhook] Configuration error', null);
      sendErrorResponse(res, 500, ClientErrorCode.SERVICE_UNAVAILABLE, 'Stripe not configured');
      return;
    }
    
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        const userId = session.metadata?.userId;
        const purchaseAmountYen = session.amount_total;
        const sessionId = session.id;
        
        if (!userId || !purchaseAmountYen) {
          break;
        }
        
        // 価格IDから購入タイプを判別
        if (!stripe) {
          break;
        }
        
        const fullSession = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['line_items']
        });
        
        if (!fullSession.line_items?.data?.[0]?.price?.id) {
          break;
        }
        
        const priceId = fullSession.line_items.data[0].price.id;
        
        
        // セッションのmetadataから購入タイプとキャラクターIDを取得
        let purchaseType = session.metadata?.purchaseType || 'token';
        let characterId = session.metadata?.characterId;
        let character = null;
        
        // キャラクター購入の場合、metadataのcharacterIdを使用
        if (purchaseType === 'character' && characterId) {
          character = await CharacterModel.findById(characterId);
          if (!character) {
            console.error('❌ Character not found for ID:', characterId);
            // フォールバック：価格IDから検索（複数キャラが同じ価格IDを持つ場合は問題あり）
            character = await CharacterModel.findOne({ stripeProductId: priceId });
            if (character) {
              characterId = character._id;
            }
          }
        } else if (!purchaseType || purchaseType === 'token') {
          // トークン購入の場合は、価格IDからキャラクターを検索（キャラクターでなければトークン）
          const possibleCharacter = await CharacterModel.findOne({ stripeProductId: priceId });
          if (possibleCharacter) {
            // 実はキャラクター購入だった（古いセッション対応）
            purchaseType = 'character';
            character = possibleCharacter;
            characterId = possibleCharacter._id;
          }
        }
        
        if (purchaseType === 'character' && character && characterId) {
          // キャラクター購入処理
          
          try {
            // ユーザーの購入済みキャラクターに追加
            const user = await UserModel.findById(userId);
            if (!user) {
              break;
            }
            
            if (!user.purchasedCharacters.includes(characterId)) {
              user.purchasedCharacters.push(characterId);
              await user.save();
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
            } catch (sseError) {
            }
            
          } catch (error) {
          }
          
        } else {
          // トークン購入処理
          log.info('Processing token purchase', { sessionId: session.id });
          console.log(`💰 Amount: ¥${purchaseAmountYen}`);
          console.log(`🔑 Price ID: ${priceId}`);
          
          let grantResult: any;
          
          // まず価格IDからTokenPackModelを検索
          try {
            const tokenPack = await TokenPackModel.findOne({ priceId, isActive: true }).lean();
            
            if (tokenPack) {
              // 管理画面で設定されたトークン数を使用
              const tokensToGrant = tokenPack.tokens;
              console.log(`📦 Using TokenPack configuration:`);
              log.info('Token pack details', {
                packName: tokenPack.name,
                tokensToGrant,
                price: tokenPack.price
              });
              
              // 重複チェック
              const UserTokenPack = require('../../models/UserTokenPack');
              const existingPack = await UserTokenPack.findOne({ stripeSessionId: sessionId });
              if (existingPack) {
                console.log(`⚠️ Duplicate prevention: session ${sessionId} already processed`);
                grantResult = {
                  success: false,
                  reason: 'Already processed',
                  tokensGranted: 0,
                  newBalance: (await UserModel.findById(userId))?.tokenBalance || 0
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
                await UserModel.findByIdAndUpdate(userId, {
                  $inc: { tokenBalance: tokensToGrant }
                });
                
                grantResult = {
                  success: true,
                  tokensGranted: tokensToGrant,
                  newBalance: (await UserModel.findById(userId))?.tokenBalance || 0,
                  purchaseAmountYen,
                  profitMargin: tokenPack.profitMargin / 100 || 0.90,
                  model: 'admin-configured'
                };
                
                console.log(`✅ Tokens granted using TokenPack configuration`);
              }
            } else {
              // TokenPackが見つからない場合は従来の計算方式にフォールバック
              console.log(`⚠️ TokenPack not found for price ID ${priceId}`);
              console.log(`📊 Falling back to calculation method`);
              
              const currentModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
              console.log(`🤖 Using model: ${currentModel}`);
              
              // calcTokensToGiveを直接使用してトークン数を計算
              const { calcTokensToGive } = await import('./config/tokenConfig');
              const tokensToGrant = await calcTokensToGive(purchaseAmountYen, currentModel);
              log.info('Calculated tokens', { tokensToGrant });
              
              // 重複チェック
              const UserTokenPack = require('../../models/UserTokenPack');
              const existingPack = await UserTokenPack.findOne({ stripeSessionId: sessionId });
              if (existingPack) {
                console.log(`⚠️ Duplicate prevention: session ${sessionId} already processed`);
                grantResult = {
                  success: false,
                  reason: 'Already processed',
                  tokensGranted: 0,
                  newBalance: (await UserModel.findById(userId))?.tokenBalance || 0
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
                await UserModel.findByIdAndUpdate(userId, {
                  $inc: { tokenBalance: tokensToGrant }
                });
                
                grantResult = {
                  success: true,
                  tokensGranted: tokensToGrant,
                  newBalance: (await UserModel.findById(userId))?.tokenBalance || 0,
                  purchaseAmountYen,
                  profitMargin: 0.90,
                  model: currentModel
                };
                
                console.log(`✅ Tokens granted using calculation method`);
              }
            }
          } catch (tokenPackError) {
            // エラーの場合も計算方式にフォールバック
            log.error('TokenPack lookup error', tokenPackError);
            console.log(`📊 Falling back to calculation method due to error`);
            
            const currentModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
            const { calcTokensToGive } = await import('./config/tokenConfig');
            const tokensToGrant = await calcTokensToGive(purchaseAmountYen, currentModel);
            
            const UserTokenPack = require('../../models/UserTokenPack');
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
            
            await UserModel.findByIdAndUpdate(userId, {
              $inc: { tokenBalance: tokensToGrant }
            });
            
            grantResult = {
              success: true,
              tokensGranted: tokensToGrant,
              newBalance: (await UserModel.findById(userId))?.tokenBalance || 0,
              purchaseAmountYen,
              profitMargin: 0.90,
              model: currentModel
            };
          }
        
          if (grantResult.success) {
            
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
                }
              } catch (moodError) {
              }
            }
            
            // 📝 購入履歴をデータベースに記録
            try {
              
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
              
              
            } catch (purchaseHistoryError) {
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
            } catch (sseError) {
            }
          }
        }
        break;
      }
      
      default:
    }

    res.status(200).json({ received: true });
    
  } catch (error) {
    log.error('[Stripe Webhook] Error processing webhook', error, {
      hasSignature: !!sig,
      bodyLength: req.body?.length || 0
    });
    sendErrorResponse(res, 400, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// JSON body parser (AFTER Stripe webhook)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser設定
app.use(cookieParser());

// Debug routes
// 一時的に本番環境でも有効化（問題解決後は削除すること）
routeRegistry.mount(`${API_PREFIX}/debug`, debugRoutes);

// レート制限の適用
// 認証エンドポイント（厳しい制限）
app.use(`${API_PREFIX}/auth/login`, createRateLimiter('auth'));
app.use(`${API_PREFIX}/auth/register`, registrationRateLimit); // 既存の登録制限を維持
app.use(`${API_PREFIX}/auth/refresh`, createRateLimiter('auth'));
app.use(`${API_PREFIX}/auth/forgot-password`, createRateLimiter('auth'));

// チャットAPI（コスト保護のため最も重要）
app.use(`${API_PREFIX}/chats/:characterId/messages`, createRateLimiter('chat'));

// 決済関連（中程度の制限）
app.use(`${API_PREFIX}/payment`, createRateLimiter('payment'));
app.use(`${API_PREFIX}/purchase`, createRateLimiter('payment'));
app.use(`${API_PREFIX}/token-packs`, createRateLimiter('payment'));

// 管理者API（緩い制限）
app.use(`${API_PREFIX}/admin`, createRateLimiter('admin'));

// ファイルアップロード（厳しい制限）
app.use(`${API_PREFIX}/upload`, createRateLimiter('upload'));

// 一般的なAPI（標準的な制限）
app.use(API_PREFIX, createRateLimiter('general'));

// 認証ルート
app.use(`${API_PREFIX}/auth`, authRoutes);

// 古いメール認証リンクの互換性対応（/api/auth/verify-email）
app.get('/api/auth/verify-email', (req: Request, res: Response) => {
  // 新しいAPIパスにリダイレクト
  const { token, locale = 'ja' } = req.query;
  res.redirect(301, `${API_PREFIX}/auth/verify-email?token=${token}&locale=${locale}`);
});

// ユーザールート
app.use(`${API_PREFIX}/user`, userRoutes);

// 管理者ルート - モデル設定
app.use(`${API_PREFIX}/admin/models`, modelRoutes);

// システム設定ルート
app.use(`${API_PREFIX}/system-settings`, systemSettingsRoutes);

// システム監視ルート（管理者のみ）
app.use(`${API_PREFIX}/admin/system`, systemRoutes);

// 管理者ルート - その他
import adminUsersRoutes from './routes/adminUsers';
import adminTokenPacksRoutes from './routes/adminTokenPacks';
import adminTokenUsageRoutes from './routes/adminTokenUsage';
import adminSecurityRoutes from './routes/adminSecurity';

routeRegistry.mount(`${API_PREFIX}/admin/users`, adminUsersRoutes);
routeRegistry.mount(`${API_PREFIX}/admin/token-packs`, adminTokenPacksRoutes);
routeRegistry.mount(`${API_PREFIX}/admin/token-usage`, adminTokenUsageRoutes);
routeRegistry.mount(`${API_PREFIX}/admin/security`, adminSecurityRoutes);


// 静的ファイル配信（アップロードされた画像）
const uploadsPath = path.join(__dirname, '../../../uploads');
app.use('/uploads', express.static(uploadsPath, {
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
routeRegistry.mount(`${API_PREFIX}/characters`, characterRoutes);

// 管理者用キャラクタールート
routeRegistry.mount(`${API_PREFIX}/admin/characters`, adminCharactersRoutes);

// 管理者用通知ルート
routeRegistry.mount(`${API_PREFIX}/admin/notifications`, adminNotificationsRoutes);

// お知らせルート（ユーザー用 + 管理者用）
routeRegistry.mount(`${API_PREFIX}/notifications`, notificationRoutes);

// システム設定ルート（Google Analytics等）
routeRegistry.mount(`${API_PREFIX}/system-settings`, systemSettingsRoutes);

// リアルタイム通知SSEエンドポイント
routeRegistry.define('GET', `${API_PREFIX}/notifications/stream`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || req.user?._id;
  if (!userId) {
    res.status(401).json({ error: '認証が必要です' });
    return;
  }

  // SSEヘッダー設定
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  
  // ヘッダーを即座に送信
  res.flushHeaders();

  // 初回の未読数を送信
  try {
    const { NotificationModel } = require('./models/NotificationModel');
    const { UserNotificationReadStatusModel } = require('./models/UserNotificationReadStatusModel');
    
    const now = new Date();
    const activeNotifications = await NotificationModel.find({
      isActive: true,
      validFrom: { $lte: now },
      $or: [
        { validUntil: { $exists: false } },
        { validUntil: { $gte: now } }
      ]
    }).lean();

    // ユーザーが対象のお知らせをフィルタリング
    const targetNotifications = activeNotifications.filter((notification: any) =>
      NotificationModel.prototype.isTargetUser.call(notification, req.user!)
    );

    // 既読状況を取得
    const notificationIds = targetNotifications.map((n: any) => n._id);
    const readStatuses = await UserNotificationReadStatusModel.find({
      userId: new mongoose.Types.ObjectId(userId),
      notificationId: { $in: notificationIds },
      isRead: true
    }).lean();

    const unreadCount = notificationIds.length - readStatuses.length;
    
    res.write(`data: ${JSON.stringify({ type: 'unreadCount', count: unreadCount })}\n\n`);
  } catch (error) {
    console.error('❌ Error getting initial unread count:', error);
  }

  // ハートビート設定（20秒ごと - Nginxのデフォルトタイムアウト30分より前に送信）
  const heartbeatInterval = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 20000);

  // Redis Pub/Sub設定（通知の変更を監視）
  let redisSubscriber: any = null;
  let handleNotificationUpdate: any = null;
  
  try {
    const { getRedisSubscriber } = require('./lib/redis');
    redisSubscriber = getRedisSubscriber();
    const notificationChannel = `notifications:user:${userId}`;
    
    handleNotificationUpdate = async (channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        // 新しい通知または既読状態の変更を通知
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        console.error('❌ Error handling notification update:', error);
      }
    };

    redisSubscriber.subscribe(notificationChannel);
    redisSubscriber.on('message', handleNotificationUpdate);
  } catch (error) {
    console.error('❌ Error setting up Redis subscriber:', error);
  }

  // クライアント切断時のクリーンアップ
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    if (redisSubscriber && handleNotificationUpdate) {
      const notificationChannel = `notifications:user:${userId}`;
      redisSubscriber.unsubscribe(notificationChannel);
      redisSubscriber.removeListener('message', handleNotificationUpdate);
    }
    console.log(`📭 Notification stream closed for user ${userId}`);
  });
});

// Dashboard API
// routeRegistry.mount('/api/user/dashboard', dashboardRoutes);

// ユーザーダッシュボード情報取得
routeRegistry.define('GET', `${API_PREFIX}/user/dashboard`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // ユーザー基本情報を取得 - lean()を使用して生のJavaScriptオブジェクトとして取得
    const user = await UserModel.findById(userId).lean();
    
    if (!user) {
      log.error('User not found in dashboard:', { userId });
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    // purchasedCharactersを別途populate
    const populatedUser = await UserModel.findById(userId)
      .populate('purchasedCharacters', '_id name')
      .lean();
    
    if (populatedUser) {
      user.purchasedCharacters = populatedUser.purchasedCharacters;
    }
    
    // ユーザーオブジェクトの検証
    if (!user.affinities) {
      log.warn('User affinities field is missing:', {
        userId: user._id.toString(),
        userFields: Object.keys(user)
      });
      user.affinities = [];
    }
    
    // 生のユーザーデータをログ出力
    log.info('Dashboard - Raw user data:', {
      userId: user._id.toString(),
      hasAffinities: !!user.affinities,
      affinitiesLength: user.affinities?.length || 0,
      affinitiesData: user.affinities
    });

    // UserTokenPackモデルをインポート
    const UserTokenPack = require('../../models/UserTokenPack');
    
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
    log.info('User affinities raw data:', {
      userId: userId.toString(),
      affinitiesCount: user.affinities?.length || 0,
      affinities: user.affinities
    });

    // 親密度情報をフロントエンドが期待する形式に変換
    log.info('Processing affinities for dashboard:', {
      userId: userId.toString(),
      rawAffinitiesCount: user.affinities?.length || 0
    });
    
    const affinities = await Promise.all((user.affinities || []).map(async (affinity: any, index: number) => {
      log.info(`Processing affinity ${index}:`, {
        characterId: affinity.character,
        level: affinity.level,
        hasCharacterData: !!affinity.character
      });
      
      // キャラクターがpopulateされていない場合は手動で取得
      let character = affinity.character;
      if (!character || typeof character === 'string' || character instanceof mongoose.Types.ObjectId) {
        const characterDoc = await CharacterModel.findById(character).select('_id name imageCharacterSelect themeColor');
        if (!characterDoc) {
          log.warn('Character not found for affinity:', { characterId: character });
          return null;
        }
        character = characterDoc;
      }

      // デフォルト値を設定
      const formattedAffinity = {
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
      
      log.info(`Formatted affinity ${index}:`, formattedAffinity);
      
      return formattedAffinity;
    }));

    // nullを除外
    const validAffinities = affinities.filter(a => a !== null);
    
    log.info('Formatted affinities for dashboard:', {
      userId: userId.toString(),
      totalAffinities: validAffinities.length,
      affinities: validAffinities
    });

    // recentChatsをフロントエンドが期待する形式に変換
    const formattedRecentChats = await Promise.all(recentChats.map(async (chat) => {
      // デバッグログ：各チャットのcharacterIdを確認

      // populateが失敗した場合の処理
      let character: any = chat.characterId;
      if (typeof character === 'string' || character instanceof mongoose.Types.ObjectId) {
        // characterIdが文字列またはObjectIdの場合（populate失敗）、手動でCharacterを取得
        const characterDoc = await CharacterModel.findById(character).select('name imageCharacterSelect');
        if (characterDoc) {
          character = characterDoc;
        } else {
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
    
    // チャット統計（日別メッセージ数）
    // まず全チャットを確認
    const allChatsForDebug = await ChatModel.find({ userId }).select('messages').lean();
    const totalMessagesDebug = allChatsForDebug.reduce((sum, chat) => sum + (chat.messages?.length || 0), 0);

    // userIdの文字列変換を確認
    const userIdString = userId.toString();

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
      return [];
    });


    // 最終的なレスポンス前にaffinitiesをログ出力
    log.info('Dashboard - Final affinities before response:', {
      userId: userId.toString(),
      validAffinitiesCount: validAffinities.length,
      validAffinities: validAffinities
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
        balance: await UserTokenPack.calculateUserTokenBalance(userId),
        totalUsed: tokenUsage[0]?.totalUsed || 0,
        totalPurchased: await UserTokenPack.calculateTotalPurchasedTokens(userId),
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
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ユーザープロファイルエンドポイント
routeRegistry.define('GET', `${API_PREFIX}/user/profile`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Debug logging
    log.debug('GET /api/user/profile - req.user:', {
      hasUser: !!req.user,
      userId: req.user?._id,
      userIdType: typeof req.user?._id,
      userKeys: req.user ? Object.keys(req.user) : []
    });

    const userId = req.user?._id;
    if (!userId) {
      log.error('No userId found in authenticated request', { 
        user: req.user,
        headers: req.headers 
      });
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
    }

    log.debug('Searching for user with ID:', { userId, userIdString: userId.toString() });
    
    const user = await UserModel.findById(userId)
      .select('-password -emailVerificationToken -createdAt -updatedAt -__v')
      .populate('purchasedCharacters', 'id name profileImage');
    
    if (!user) {
      log.error('User not found in database', { 
        userId,
        userIdString: userId.toString(),
        searchedId: userId
      });
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'User not found');
      return;
    }

    // トークン残高の計算
    const UserTokenPack = require('../../models/UserTokenPack');
    const tokenBalance = await UserTokenPack.calculateUserTokenBalance(userId);

    // 親密度情報の取得
    const affinities = await UserModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      { $unwind: '$affinities' },
      {
        $lookup: {
          from: 'characters',
          localField: 'affinities.character',
          foreignField: '_id',
          as: 'characterInfo'
        }
      },
      {
        $project: {
          character: { $arrayElemAt: ['$characterInfo._id', 0] },
          characterName: { $arrayElemAt: ['$characterInfo.name', 0] },
          level: '$affinities.level',
          emotionalState: '$affinities.emotionalState'
        }
      }
    ]);

    const response = {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        tokenBalance: tokenBalance || user.tokenBalance || 0,
        purchasedCharacters: user.purchasedCharacters,
        selectedCharacter: user.selectedCharacter,
        isSetupComplete: user.isSetupComplete,
        preferredLanguage: user.preferredLanguage || 'ja'
      },
      affinities: affinities
    };

    res.json(response);
  } catch (error) {
    log.error('Error fetching user profile', error);
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED);
  }
});

// ユーザープロファイル更新エンドポイント
routeRegistry.define('PUT', `${API_PREFIX}/user/profile`, authenticateToken, validate({ body: authSchemas.updateProfile }), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
    }

    const { name, preferredLanguage } = req.body;
    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (preferredLanguage) updateData.preferredLanguage = preferredLanguage;

    const user = await UserModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, select: '-password -emailVerificationToken' }
    );

    if (!user) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND, 'User not found');
      return;
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        preferredLanguage: user.preferredLanguage
      }
    });
  } catch (error) {
    log.error('Error updating user profile', error);
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED);
  }
});

// 現在のユーザー情報確認エンドポイント（デバッグ用）
routeRegistry.define('GET', `${API_PREFIX}/debug/current-user`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
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

// 親密度デバッグ用エンドポイント
routeRegistry.define('GET', `${API_PREFIX}/debug/user-affinities`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // 生のユーザーデータを取得
    const user = await UserModel.findById(userId).lean();
    
    // 親密度データのみを取得
    const userWithAffinities = await UserModel.findById(userId)
      .select('affinities')
      .populate('affinities.character', 'name');
    
    res.json({
      userId: userId.toString(),
      affinitiesCount: user?.affinities?.length || 0,
      rawAffinities: user?.affinities || [],
      populatedAffinities: userWithAffinities?.affinities || [],
      firstAffinity: user?.affinities?.[0] || null
    });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

// アナリティクスデバッグ用エンドポイント
routeRegistry.define('GET', `${API_PREFIX}/debug/analytics`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
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
    res.status(500).json({ error: error });
  }
});


// チャットシステム診断エンドポイント
routeRegistry.define('GET', `${API_PREFIX}/debug/chat-diagnostics/:characterId`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { characterId } = req.params;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // 1. キャラクター情報とモデル設定
    const character = await CharacterModel.findById(characterId);
    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    // 2. チャット履歴確認
    const chat = await ChatModel.findOne({ userId, characterId })
      .select('messages totalTokensUsed lastActivityAt createdAt');
    
    // 3. キャッシュ状態確認（MongoDBのCharacterPromptCacheを確認）
    let cacheStatus = { enabled: true, exists: false, data: null, count: 0 };
    
    try {
      // ユーザーの親密度レベルを取得
      const user = userId ? await UserModel.findById(userId) : null;
      let userAffinityLevel = 0;
      if (user) {
        const affinity = user.affinities.find(
          aff => aff.character.toString() === characterId
        );
        userAffinityLevel = affinity?.level || 0;
      }
      
      // キャッシュ検索（親密度レベル±5で検索）
      const affinityRange = 5;
      const cachedPrompts = await CharacterPromptCache.find({
        userId: userId,
        characterId: characterId,
        'promptConfig.affinityLevel': {
          $gte: Math.max(0, userAffinityLevel - affinityRange),
          $lte: Math.min(100, userAffinityLevel + affinityRange)
        },
        'promptConfig.languageCode': 'ja',
        ttl: { $gt: new Date() }, // TTL未期限切れ
        characterVersion: '1.0.0'
      }).sort({ 
        useCount: -1, // 使用回数順
        lastUsed: -1  // 最終使用日順
      }).limit(1);
      
      const cachedPrompt = cachedPrompts[0];
      cacheStatus = {
        enabled: true,
        exists: !!cachedPrompt,
        data: cachedPrompt ? {
          useCount: cachedPrompt.useCount,
          lastUsed: cachedPrompt.lastUsed,
          ttl: cachedPrompt.ttl,
          affinityLevel: cachedPrompt.promptConfig?.affinityLevel,
          promptLength: cachedPrompt.systemPrompt?.length || 0
        } : null,
        count: await CharacterPromptCache.countDocuments({
          characterId: characterId,
          ttl: { $gt: new Date() }
        })
      };
    } catch (err) {
      cacheStatus.enabled = false;
    }

    // 4. 最新のトークン使用状況
    const recentTokenUsage = await TokenUsage.findOne({
      userId,
      characterId
    }).sort({ createdAt: -1 });

    // 5. プロンプトの診断情報
    const promptInfo = {
      personalityPrompt: character.personalityPrompt ? {
        ja: character.personalityPrompt.ja?.substring(0, 200) + '...',
        en: character.personalityPrompt.en?.substring(0, 200) + '...'
      } : null,
      characterInfo: {
        age: character.age || '未設定',
        occupation: character.occupation || '未設定',
        personalityPreset: character.personalityPreset || '未設定',
        personalityTags: character.personalityTags || []
      },
      promptLength: {
        personality: {
          ja: character.personalityPrompt?.ja?.length || 0,
          en: character.personalityPrompt?.en?.length || 0
        }
      }
    };

    res.json({
      diagnostics: {
        character: {
          id: character._id,
          name: character.name,
          aiModel: character.aiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini',
          isActive: character.isActive,
          updatedAt: character.updatedAt
        },
        chat: {
          exists: !!chat,
          messageCount: chat?.messages?.length || 0,
          totalTokensUsed: chat?.totalTokensUsed || 0,
          lastActivity: chat?.lastActivityAt,
          createdAt: chat?.createdAt,
          recentMessages: chat?.messages?.slice(-5).map(m => ({
            role: m.role,
            timestamp: m.timestamp,
            tokensUsed: m.tokensUsed,
            contentPreview: m.content.substring(0, 50) + '...'
          })) || [],
          conversationHistory: {
            description: 'AI記憶システム: 最新10件のメッセージ（各120文字まで）を会話コンテキストとして送信',
            sentToAI: chat?.messages?.slice(-10).map(msg => ({
              role: msg.role,
              content: msg.content.length > 120 ? msg.content.substring(0, 120) + '...' : msg.content,
              originalLength: msg.content.length,
              timestamp: msg.timestamp
            })) || [],
            totalMessagesInDB: chat?.messages?.length || 0,
            messagesUsedForContext: Math.min(10, chat?.messages?.length || 0),
            contextWindowSize: '最大10メッセージ',
            truncationLimit: '120文字/メッセージ'
          }
        },
        cache: cacheStatus,
        tokenUsage: recentTokenUsage ? {
          lastUsed: recentTokenUsage.createdAt,
          tokensUsed: recentTokenUsage.tokensUsed,
          aiModel: recentTokenUsage.aiModel,
          cacheHit: !!(recentTokenUsage as any).cacheHit,
          apiCost: recentTokenUsage.apiCost
        } : null,
        prompt: promptInfo,
        system: {
          mongoConnected: isMongoConnected,
          redisConnected: !!(await getRedisClient()),
          currentModel: character.aiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini'
        }
      }
    });
  } catch (error) {
    log.error('Chat diagnostics error', error);
    res.status(500).json({ 
      error: 'Diagnostics failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// パスワード変更API (削除: 6261行目に同じ定義があるため)
/* routeRegistry.define('PUT', `${API_PREFIX}/user/change-password`, authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    // バリデーション
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        error: 'Missing required fields',
        message: '現在のパスワードと新しいパスワードを入力してください'
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        error: 'Password too short',
        message: '新しいパスワードは8文字以上で入力してください'
      });
      return;
    }

    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // ユーザー情報を取得（パスワード含む）
    const user = await UserModel.findById(userId).select('+password');
    if (!user) {
      res.status(404).json({ 
        error: 'User not found',
        message: 'ユーザーが見つかりません' 
      });
      return;
    }

    // 現在のパスワードを確認
    const bcrypt = require('bcryptjs');
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      res.status(401).json({
        error: 'Invalid current password',
        message: '現在のパスワードが間違っています'
      });
      return;
    }

    // 新しいパスワードをハッシュ化
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // パスワードを更新
    await UserModel.findByIdAndUpdate(userId, {
      password: hashedNewPassword
    });

    res.json({
      success: true,
      message: 'パスワードを変更しました'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ 
      error: 'Password change failed',
      message: 'パスワードの変更に失敗しました'
    });
  }
}); */

// アカウント削除API (削除: 6337行目に同じ定義があるため)
/* routeRegistry.define('DELETE', `${API_PREFIX}/user/delete-account`, authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // ユーザーの存在確認
    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ 
        error: 'User not found',
        message: 'ユーザーが見つかりません' 
      });
      return;
    }

    try {
      // チャット履歴の削除
      await ChatModel.deleteMany({ userId: userId });

      // トークン使用履歴の削除
      await TokenUsage.deleteMany({ userId: userId });

      // 購入履歴の削除
      await PurchaseHistoryModel.deleteMany({ userId: userId });

      // お知らせ既読状態の削除
      await UserNotificationReadStatusModel.deleteMany({ userId: userId });

      // ユーザーアカウントの削除
      await UserModel.findByIdAndDelete(userId);

      res.json({
        success: true,
        message: 'アカウントを削除しました'
      });

    } catch (deleteError) {
      console.error('Account deletion error:', deleteError);
      res.status(500).json({
        error: 'Account deletion failed',
        message: 'アカウントの削除中にエラーが発生しました'
      });
    }

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      error: 'Account deletion failed',
      message: 'アカウントの削除に失敗しました'
    });
  }
}); */

// キャラクター選択API（チャット画面で使用）
routeRegistry.define('POST', `${API_PREFIX}/user/select-character`, authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { characterId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!characterId) {
      res.status(400).json({
        error: 'Character ID required',
        message: 'キャラクターIDが必要です'
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

    // ユーザーの選択キャラクターを更新
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { selectedCharacter: characterId },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      res.status(404).json({
        error: 'User not found',
        message: 'ユーザーが見つかりません'
      });
      return;
    }

    res.json({
      success: true,
      message: 'キャラクターを選択しました',
      selectedCharacter: characterId,
      user: updatedUser
    });

  } catch (error) {
    console.error('Select character error:', error);
    res.status(500).json({
      error: 'Character selection failed',
      message: 'キャラクター選択に失敗しました'
    });
  }
});

// 初回セットアップ完了
app.post(`${API_PREFIX}/user/setup-complete`, authenticateToken, async (req: Request, res: Response): Promise<void> => {
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
    res.status(500).json({ error: 'Setup completion failed' });
  }
});

// Stripe Webhook endpoints (must be before express.json())


// Character routes are handled by the imported characterRoutes module
// All character-related endpoints are defined in ./routes/characters.ts

// User API endpoints
app.get(`${API_PREFIX}/auth/user`, authenticateToken, (req: Request, res: Response): void => {
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
routeRegistry.define('GET', `${API_PREFIX}/chats/:characterId`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const characterId = req.params.characterId;
  const locale = (req.query.locale as string) || 'ja';

  try {
    // キャラクター情報を取得
    const character = await CharacterModel.findById(characterId);
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
        } else {
        }
      } catch (dbError) {
        // フォールバックでモックデータを作成
        chatData = null;
      }
    }

    // MongoDB が利用できない場合はエラー
    if (!chatData) {
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
      personalityPrompt: character.personalityPrompt
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
    
    // デバッグログ
    log.info('Chat API response - userState:', {
      userId: user._id,
      tokenBalance: user.tokenBalance,
      userStateTokenBalance: userState.tokenBalance,
      characterId,
      affinityLevel: userState.affinity.level
    });

    res.json({
      chat: {
        _id: chatData._id,
        messages: chatData.messages
      },
      character: localizedCharacter,
      userState: userState
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

routeRegistry.define('POST', `${API_PREFIX}/chats/:characterId/messages`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  
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
      res.status(500).json({ 
        error: 'Database connection required',
        message: 'ユーザーデータの取得にはデータベース接続が必要です'
      });
      return;
    }

    const dbUser = await UserModel.findById(req.user._id);
    if (!dbUser) {
      res.status(404).json({ 
        error: 'User not found',
        message: 'ユーザーが見つかりません'
      });
      return;
    }

    const userTokenBalance = dbUser.tokenBalance;


    // 🔥 禁止用語フィルタリング（制裁状態に関係なく先に実行）
    const { validateMessage: tsValidateMessage } = await import('./utils/contentFilter');
    const validation = tsValidateMessage(message.trim());
    if (!validation.allowed) {
      
      try {
        // 1. 違反記録を作成
        const violationRecord = await recordViolation({
          userId: new mongoose.Types.ObjectId(req.user._id),
          type: validation.violationType as 'blocked_word' | 'openai_moderation',
          originalMessage: message.trim(),
          violationReason: validation.reason || 'メッセージに不適切な内容が含まれています',
          detectedWords: validation.detectedWord ? [validation.detectedWord] : [],
          ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown'
        });
        
        // 2. 制裁を適用
        const sanction = await applySanction(new mongoose.Types.ObjectId(req.user._id));
        
        
        res.status(403).json({
          error: validation.reason,
          code: 'CONTENT_VIOLATION',
          violationType: validation.violationType,
          detectedWord: validation.detectedWord,
          sanctionAction: sanction.sanctionAction,
          sanctionMessage: sanction.message,
          violationCount: sanction.violationCount,
          accountStatus: sanction.accountStatus
        });
        return;
        
      } catch (sanctionError) {
        // 制裁処理に失敗してもメッセージはブロック
        res.status(403).json({
          error: validation.reason,
          code: 'CONTENT_VIOLATION',
          violationType: validation.violationType,
          detectedWord: validation.detectedWord
        });
        return;
      }
    }

    // 🔒 チャット権限チェック（禁止用語チェック後に実行）
    const permissionCheck = checkChatPermission(dbUser);
    if (!permissionCheck.allowed) {
      res.status(403).json({
        error: permissionCheck.message,
        code: 'CHAT_PERMISSION_DENIED',
        reason: permissionCheck.reason
      });
      return;
    }

    // 会話履歴を取得（最新20件）
    const existingChat = await ChatModel.findOne({
      userId: req.user._id,
      characterId: characterId
    });
    
    // デバッグログ: 既存のチャット情報
    console.log('🔍 [Chat History Debug] Existing chat found:', !!existingChat);
    if (existingChat) {
      console.log('🔍 [Chat History Debug] Total messages in DB:', existingChat.messages?.length || 0);
      console.log('🔍 [Chat History Debug] Last 3 messages:');
      existingChat.messages?.slice(-3).forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg.role}: ${msg.content.substring(0, 50)}...`);
      });
    }
    
    // 会話履歴を10件に調整（1000トークン以内で最適化）
    const conversationHistory = existingChat?.messages?.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content.length > 120 ? msg.content.substring(0, 120) + '...' : msg.content
    })) || [];
    
    // デバッグログ: 送信される会話履歴
    console.log('🔍 [Chat History Debug] Conversation history to send:', conversationHistory.length, 'messages');
    console.log('🔍 [Chat History Debug] History contents:', conversationHistory);

    // 事前トークン残高チェック（1000トークン許容基準）
    const minimumTokensRequired = 1000; // 高品質な会話に必要なトークン
    if (userTokenBalance < minimumTokensRequired) {
      res.status(402).json({ 
        error: 'Insufficient tokens',
        message: 'トークンが不足しています。トークンパックを購入してください。',
        tokensNeeded: minimumTokensRequired,
        currentBalance: userTokenBalance
      });
      return;
    }

    // 🚀 プロンプトキャッシュ対応AI応答を生成
    const aiResponse = await generateChatResponse(characterId, message, conversationHistory, req.user._id);
    
    // 正確なトークン消費量の確認
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
      } catch (updateError) {
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
              totalTokensUsed: aiResponse.tokensUsed
              // currentAffinityの更新を削除（UserModelで一元管理）
            },
            $set: { lastActivityAt: new Date() }
          },
          { 
            new: true, 
            upsert: true // 存在しない場合は新規作成
          }
        );
        
        // デバッグログ: メッセージ保存確認
        console.log('💾 [Chat Save Debug] Messages saved successfully:', !!updatedChat);
        console.log('💾 [Chat Save Debug] Total messages after save:', updatedChat?.messages?.length || 0);

        // UserModelから現在の親密度を取得（ChatModelではなくUserModelが正確な値）
        const userAffinityData = await UserModel.findOne({
          _id: req.user._id,
          'affinities.character': characterId 
        });
        
        const currentUserAffinity = userAffinityData?.affinities?.find(
          (aff: any) => aff.character.toString() === characterId
        )?.level || 0;
        
        // レベル帯別の親密度上昇量を計算
        function calculateAffinityIncrease(currentLevel: number): number {
          if (currentLevel >= 90) {
            return 0.05; // レベル90-100: 非常に困難（200回のメッセージで1レベル）
          } else if (currentLevel >= 80) {
            return 0.1; // レベル80-89: 困難（100回のメッセージで1レベル）
          } else if (currentLevel >= 60) {
            return 0.2; // レベル60-79: やや困難（50回のメッセージで1レベル）
          } else if (currentLevel >= 40) {
            return 0.3; // レベル40-59: 普通（約33回のメッセージで1レベル）
          } else if (currentLevel >= 20) {
            return 0.4; // レベル20-39: やや簡単（25回のメッセージで1レベル）
          } else {
            return 0.5; // レベル0-19: 簡単（20回のメッセージで1レベル）
          }
        }
        
        // currentUserAffinityは既に0-100のレベル値なので、そのまま使用
        const affinityIncrease = calculateAffinityIncrease(currentUserAffinity);
        
        
        const previousAffinity = currentUserAffinity;
        const newAffinity = Math.min(100, currentUserAffinity + affinityIncrease);

        // UserModelの親密度データも更新
        log.info('Updating user affinity:', {
          userId: req.user._id,
          characterId,
          previousAffinity,
          newAffinity,
          affinityIncrease
        });
        
        try {
          const userAffinityUpdate = await UserModel.findOneAndUpdate(
            { 
              _id: req.user._id,
              'affinities.character': characterId 
            },
            {
              $inc: { 
                'affinities.$.level': affinityIncrease,
                'affinities.$.totalMessages': 1
              },
              $set: { 
                'affinities.$.lastInteraction': new Date()
              }
            },
            { new: true }
          );

          if (!userAffinityUpdate) {
            // 親密度データが存在しない場合は新規作成
            log.info('Creating new affinity data for user:', {
              userId: req.user._id,
              characterId
            });
            
            const newAffinityUser = await UserModel.findByIdAndUpdate(
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
                    moodHistory: [],
                    currentMoodModifiers: []
                  }
                }
              },
              { new: true }
            );
            
            log.info('New affinity created successfully:', {
              userId: req.user._id,
              characterId,
              affinityCount: newAffinityUser?.affinities?.length || 0
            });
          } else {
          }
        } catch (affinityError) {
          log.error('Failed to update user affinity:', {
            userId: req.user._id,
            characterId,
            error: affinityError instanceof Error ? affinityError.message : 'Unknown error',
            stack: affinityError instanceof Error ? affinityError.stack : undefined
          });
        }

        // Chat response successful
        console.log("Chat response data:", {
          character: character.name.ja,
          tokensUsed: aiResponse.tokensUsed,
          newBalance,
          affinityIncrease,
          totalMessages: updatedChat.messages.length,
          cacheHit: aiResponse.cacheHit
        });

        // 🎭 レベルアップ検出とムードトリガー適用
        let levelUpInfo = null;
        try {
          // 親密度そのものをレベルとして扱う（0-100）
          const previousLevel = Math.floor(previousAffinity);
          const currentLevel = Math.floor(newAffinity);
          
          
          if (currentLevel > previousLevel) {
            // レベルアップが発生
            levelUpInfo = {
              previousLevel,
              newLevel: currentLevel,
              unlockReward: `特別イラスト「レベル${currentLevel}記念」`
            };
            
            
            await applyMoodTrigger(
              req.user._id.toString(),
              characterId,
              { kind: 'LEVEL_UP', newLevel: currentLevel }
            );
          } else {
          }
        } catch (levelUpMoodError) {
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
            }
          }
        } catch (sentimentMoodError) {
        }

        // 🚀 詳細TokenUsage記録（仕様書に基づく高度トラッキング）
        try {
          
          // API費用計算（tokenConfig.tsの統一された計算を使用）
          const model = character.aiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini';
          const inputTokens = Math.floor(aiResponse.tokensUsed * 0.6); // 推定入力トークン
          const outputTokens = Math.floor(aiResponse.tokensUsed * 0.4); // 推定出力トークン
          
          // tokenConfig.tsから統一された料金設定を使用
          const { MODEL_UNIT_COST_USD, PROFIT_MARGIN } = require('./config/tokenConfig');
          const { getCurrentExchangeRate } = require('./services/exchangeRateService');
          
          const modelCost = MODEL_UNIT_COST_USD[model] || MODEL_UNIT_COST_USD['gpt-4o-mini'];
          const apiCost = (inputTokens * modelCost.input + outputTokens * modelCost.output);
          
          const exchangeRate = await getCurrentExchangeRate();
          const apiCostYen = apiCost * exchangeRate; // USD→JPY換算
          const sessionId = `chat_${req.user._id}_${characterId}_${Date.now()}`;
          
          // 利益分析計算（tokenConfig.tsのPROFIT_MARGINを使用）
          const { tokensPerYen } = require('./config/tokenConfig');
          const tokensPerYenValue = await tokensPerYen(model);
          const tokenPrice = 1 / tokensPerYenValue; // 1トークンあたりの価格（円）
          const grossRevenue = aiResponse.tokensUsed * tokenPrice;
          const grossProfit = grossRevenue - apiCostYen;
          const profitMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) : PROFIT_MARGIN;
          
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
            aiModel: model,
            inputTokens: inputTokens,
            outputTokens: outputTokens,
            apiCost: apiCost,
            apiCostYen: apiCostYen,
            cacheHit: aiResponse.cacheHit,
            
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
          
          console.log("Token usage recorded:", {
            tokensUsed: aiResponse.tokensUsed,
            apiCostYen: Math.round(apiCostYen * 100) / 100,
            profitMargin: Math.round(profitMargin * 100) / 100,
            model: model,
            sessionId: sessionId,
            cacheHit: aiResponse.cacheHit,
            promptLength: aiResponse.systemPrompt.length
          });
          
        } catch (tokenUsageError) {
          // TokenUsage記録の失敗はチャット機能に影響させない
          log.error('TokenUsage save error', tokenUsageError);
        }

        res.json({
          userMessage,
          aiResponse: assistantMessage,
          affinity: {
            characterId,
            level: newAffinity,
            increase: affinityIncrease
          },
          tokenBalance: newBalance,
          levelUp: levelUpInfo // レベルアップ情報を追加
        });

      } catch (dbError) {
        
        // DB保存に失敗した場合はエラーを返す（MongoDB必須のため）
        res.status(500).json({ 
          error: 'Message save failed',
          message: 'メッセージの保存に失敗しました。データベース接続を確認してください。'
        });
        return;
      }
    } else {
      // MongoDB が利用できない場合はエラー
      res.status(500).json({ 
        error: 'Database connection required',
        message: 'メッセージの保存にはデータベース接続が必要です'
      });
      return;
    }

  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'メッセージの送信に失敗しました。しばらくしてから再度お試しください。'
    });
  }
});

app.get(`${API_PREFIX}/ping`, (_req: Request, res: Response): void => {
  res.send('pong');
});

app.head(`${API_PREFIX}/ping`, (_req: Request, res: Response): void => {
  res.status(200).end();
});

// Dashboard API route
// 削除: 重複するダッシュボードAPI（routes/dashboard.jsを使用）

// Purchase History API
app.get(`${API_PREFIX}/user/purchase-history`, authenticateToken, async (req: Request, res: Response): Promise<void> => {
  
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
        stripeSessionId: purchase.stripeSessionId,
        metadata: purchase.metadata,
        createdAt: purchase.createdAt
      })),
      summary,
      totalSpent: summary.totalSpent,
      totalPurchases: summary.totalPurchases
    };

    res.json(response);

  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to retrieve purchase history'
    });
  }
});


// Token Pack Management APIs
app.get(`${API_PREFIX}/token-packs`, authenticateToken, async (req: Request, res: Response): Promise<void> => {
  
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

      console.log("Token packs processed:", {
        totalPacks: packsWithMetrics.length,
        activeFilter: isActive
      });
      
      res.json({ 
        tokenPacks: packsWithMetrics,
        total: packsWithMetrics.length
      });
      
    } else {
      res.status(500).json({ error: 'Database not connected' });
    }
    
  } catch (error) {
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
  const currentModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const expectedTokens = await calcTokensToGive(price, currentModel);
  const tolerance = 0.05; // 5%の許容範囲
  const minTokens = expectedTokens * (1 - tolerance);
  const maxTokens = expectedTokens * (1 + tolerance);
  
  return tokens >= minTokens && tokens <= maxTokens;
};

// 削除: 重複するtoken-packs API（adminTokenPacksRoutesを使用）


// Stripe Price API endpoint
app.get(`${API_PREFIX}/admin/stripe/price/:priceId`, authenticateToken, async (req: Request, res: Response): Promise<void> => {
  
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
      
      console.log("Price conversion:", {
        unit_amount: price.unit_amount,
        currency: price.currency,
        converted_amount: priceInMainUnit
      });
      
      // 99%利益率システムに基づくトークン数計算
      const currentModel = 'gpt-4o-mini'; // デフォルトモデルを指定
      const calculatedTokens = await calcTokensToGive(priceInMainUnit, currentModel);
      
      // 99%利益率システム
      const profitMargin = 99;
      const tokenPerYen = await calcTokensToGive(1, currentModel); // 1円あたりのトークン数
      
      // デバッグログ追加
      console.log("Token calculation debug:", {
        model: currentModel,
        priceInMainUnit,
        calculatedTokens,
        tokenPerYen,
        expectedFor500: await calcTokensToGive(500, currentModel)
      });
      
      // Product名を安全に取得
      const productName = price.product && typeof price.product === 'object' && 'name' in price.product 
        ? price.product.name 
        : 'Unknown Product';
      
      console.log("Price processing result:", {
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
    res.status(500).json({
      success: false,
      message: 'Price情報の取得に失敗しました',
      error: 'Internal server error'
    });
  }
});


// Stripe Checkout Session作成API
app.post(`${API_PREFIX}/purchase/create-checkout-session`, authenticateToken, async (req: Request, res: Response): Promise<void> => {
  
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
      
      if (!stripe) {
        res.status(500).json({ error: 'Stripe not initialized' });
        return;
      }
      
      // リクエストのOriginまたはRefererから動的にURLを取得
      const origin = req.headers.origin || req.headers.referer?.replace(/\/[^/]*$/, '') || 'https://charactier-ai.com';
      const baseUrl = origin.includes('localhost') ? 'http://localhost:3000' : origin;
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/ja/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/ja/purchase/cancel`,
        metadata: {
          userId: userId || req.user._id,
          priceId: priceId
        }
      });
      
      console.log("Checkout session created:", {
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
    res.status(500).json({
      success: false,
      message: 'チェックアウトセッションの作成に失敗しました'
    });
  }
});

// キャラクター購入用チェックアウトセッション作成API
app.post(`${API_PREFIX}/purchase/create-character-checkout-session`, authenticateToken, async (req: Request, res: Response): Promise<void> => {
  
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
    } else if (character.stripeProductId.startsWith('prod_')) {
      // 商品IDから価格を取得する場合
      
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
    
    console.log("Character purchase request:", {
      characterId,
      priceId,
      characterName: character.name.ja
    });
    
    if (!stripe) {
      res.status(500).json({ error: 'Stripe not initialized' });
      return;
    }
    
    // リクエストのOriginまたはRefererから動的にURLを取得
    const origin = req.headers.origin || req.headers.referer?.replace(/\/[^/]*$/, '') || 'https://charactier-ai.com';
    const baseUrl = origin.includes('localhost') ? 'http://localhost:3000' : origin;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/ja/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/ja/characters`,
      metadata: {
        userId: req.user._id.toString(),
        characterId: characterId,
        purchaseType: 'character'
      }
    });
    
    console.log("Character checkout session created:", {
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
    console.error("Character purchase error:", {
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

// SSE - 購入完了リアルタイム通知
app.get(`${API_PREFIX}/purchase/events/:sessionId`, async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;
  
  console.log('🌊 SSE購入イベント接続:', sessionId);
  
  // SSEヘッダーを設定
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // 初期接続確認
  res.write(`data: ${JSON.stringify({ connected: true })}\n\n`);
  
  // Redisまたはメモリストアから購入データを取得
  const checkPurchaseData = async () => {
    try {
      const redis = await getRedisClient();
      const purchaseData = await redis.get(`purchase:${sessionId}`);
      
      if (purchaseData) {
        console.log('✅ SSE: 購入データ送信:', sessionId);
        res.write(`data: ${purchaseData}\n\n`);
        res.end();
        return true;
      }
    } catch (error) {
      console.log('SSE: Redisエラー、メモリストアを確認');
    }
    return false;
  };
  
  // 即座にチェック
  if (await checkPurchaseData()) {
    return;
  }
  
  // ポーリング（最大30秒）
  let attempts = 0;
  const maxAttempts = 30;
  const interval = setInterval(async () => {
    attempts++;
    
    if (await checkPurchaseData()) {
      clearInterval(interval);
      return;
    }
    
    if (attempts >= maxAttempts) {
      console.log('⏰ SSE: タイムアウト:', sessionId);
      res.write(`data: ${JSON.stringify({ error: 'timeout' })}\n\n`);
      res.end();
      clearInterval(interval);
    }
  }, 1000);
  
  // クライアント切断時のクリーンアップ
  req.on('close', () => {
    console.log('🔌 SSE: クライアント切断:', sessionId);
    clearInterval(interval);
  });
});

// Stripe価格情報取得API（商品IDまたは価格IDに対応・管理者専用）
app.get(`${API_PREFIX}/admin/stripe/product-price/:id`, authenticateToken, async (req: Request, res: Response): Promise<void> => {
  
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
      
      if (!stripe) {
        res.status(500).json({ error: 'Stripe not initialized' });
        return;
      }
      
      price = await stripe.prices.retrieve(id);
      priceAmount = price.unit_amount || 0;
      currency = price.currency.toUpperCase();
      
    } else if (id.startsWith('prod_')) {
      // 商品IDから価格を取得する場合
      
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
    
    console.log("Price info retrieved:", {
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
    console.error("Price retrieval error:", error);
    res.status(500).json({
      success: false,
      message: '価格情報の取得に失敗しました'
    });
  }
});


// 開発用：Session IDを使って手動でトークンを付与するAPI
app.post(`${API_PREFIX}/user/process-session`, authenticateToken, async (req: Request, res: Response): Promise<void> => {
  
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
          const currentModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
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
          
          console.log("Tokens added to user:", {
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
    res.status(500).json({
      success: false,
      message: 'Session processing failed'
    });
  }
});

// ユーザートークン残高更新API
app.post(`${API_PREFIX}/user/add-tokens`, authenticateToken, async (req: Request, res: Response): Promise<void> => {
  
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
      
      log.info("Admin token grant completed", {
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
    res.status(500).json({
      success: false,
      message: 'トークン残高の更新に失敗しました'
    });
  }
});

// 管理者用：ユーザー一覧取得
routeRegistry.define('GET', `${API_PREFIX}/admin/users`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  
  // Debug logging for admin check
  log.info('🔍 ADMIN CHECK DEBUG', {
    path: req.path,
    hasReqAdmin: !!req.admin,
    hasReqUser: !!req.user,
    reqUserIsAdmin: req.user ? (req.user as any).isAdmin : 'no user',
    reqAdminDetails: req.admin ? { id: req.admin._id, email: req.admin.email, role: req.admin.role } : 'no admin',
    reqUserDetails: req.user ? { id: req.user._id, email: req.user.email, isAdmin: (req.user as any).isAdmin } : 'no user'
  });
  
  // 管理者権限チェック（管理パスなのでreq.adminのみチェック）
  if (!req.admin) {
    log.warn('❌ ADMIN ACCESS DENIED for /admin/users', {
      reason: 'No admin access',
      hasReqAdmin: !!req.admin,
      hasReqUser: !!req.user,
      path: req.path,
      originalUrl: req.originalUrl,
      fullPath: req.originalUrl || req.url,
      cookies: Object.keys(req.cookies || {}),
      headers: {
        cookie: !!req.headers.cookie,
        authorization: !!req.headers.authorization
      }
    });
    res.status(403).json({ 
      error: 'INSUFFICIENT_PERMISSIONS',
      message: '権限が不足しています'
    });
    return;
  }

  const { page = 1, limit = 20, search, status } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  try {
    if (isMongoConnected) {
      // MongoDB実装
      
      const query: any = {
        // 管理者による論理削除のみ除外、その他は全て表示
        isActive: { $ne: false },
        // 削除済みアカウントも除外
        accountStatus: { $ne: 'deleted' }
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
      const UserTokenPack = require('../../models/UserTokenPack');
      const formattedUsers = await Promise.all(users.map(async (user) => {
        let actualTokenBalance = 0; // デフォルト値
        try {
          actualTokenBalance = await UserTokenPack.calculateUserTokenBalance(user._id);
          console.log(`🔍 User ${user.email}: UserTokenPack残高 = ${actualTokenBalance}`);
        } catch (error) {
          console.error(`❌ UserTokenPack計算エラー (${user.email}):`, error.message);
          // エラーの場合はUserModelの値を使わずに0を使用（正確性を優先）
          actualTokenBalance = 0;
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
      

      // 正確なトークン残高の集計（UserTokenPackを基準）
      let totalActualBalance = 0;
      for (const user of formattedUsers) {
        totalActualBalance += user.tokenBalance; // すでにUserTokenPack.calculateUserTokenBalanceで計算済み
      }

      const tokenStats = {
        totalTokenBalance: totalActualBalance,
        totalUsers: formattedUsers.length,
        averageBalance: formattedUsers.length > 0 ? totalActualBalance / formattedUsers.length : 0
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
    res.status(500).json({
      error: 'ユーザー一覧の取得に失敗しました'
    });
  }
});

// ⚠️ 管理者用：ユーザーのトークンをゼロにリセット（一時的機能）
app.post('/admin/users/:userId/reset-tokens', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  
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
      
      console.log("Token balance reset:", {
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
    res.status(500).json({
      success: false,
      message: 'トークンリセットに失敗しました'
    });
  }
});

// 管理者向けユーザー停止/復活（より具体的なルートを先に定義）
routeRegistry.define('PUT', `${API_PREFIX}/admin/users/:id/status`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    // Check if user has write permission (only super_admin can change user status)
    if (!hasWritePermission(req)) {
      res.status(403).json({ 
        error: 'Permission denied',
        message: 'モデレーターはユーザーのステータスを変更できません' 
      });
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
      updateData.violationCount = 0; // アカウント復活時に違反回数をリセット
      updateData.isActive = true; // アカウント復活時にisActiveも有効化
      
      // 違反記録も削除（完全な復活）
      try {
        await ViolationRecordModel.deleteMany({ userId: id });
        console.log(`Deleted violation records for user ${id} on account restoration`);
      } catch (violationDeleteError) {
        console.error('Error deleting violation records:', violationDeleteError);
        // 違反記録削除に失敗してもアカウント復活は続行
      }
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
    res.status(500).json({
      error: 'Server error',
      message: 'ユーザーステータスの更新に失敗しました'
    });
  }
});

// 管理者向けユーザー削除（論理削除）
routeRegistry.define('DELETE', `${API_PREFIX}/admin/users/:id`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    // Check if user has write permission (only super_admin can delete users)
    if (!hasWritePermission(req)) {
      res.status(403).json({ 
        error: 'Permission denied',
        message: 'モデレーターはユーザーを削除できません' 
      });
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
      }
      
      // トークン使用履歴を削除
      if (TokenUsage) {
        const deletedTokenUsage = await TokenUsage.deleteMany({ userId: id });
      }
    } catch (relatedDataError) {
      // 関連データの削除に失敗してもユーザー削除は続行
    }
    
    // ユーザーを物理削除
    await UserModel.findByIdAndDelete(id);


    res.json({
      success: true,
      message: `ユーザー ${user.name} を完全に削除しました`
    });

  } catch (error) {
    res.status(500).json({
      error: 'Server error',
      message: 'ユーザーの削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 管理者向けユーザー詳細取得（一般的なルートを最後に定義）
routeRegistry.define('GET', `${API_PREFIX}/admin/users/:id`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
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
      const UserTokenPack = require('../../models/UserTokenPack');
      actualTokenBalance = await UserTokenPack.calculateUserTokenBalance(user._id);
    } catch (error) {
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
    res.status(500).json({
      error: 'Server error',
      message: 'ユーザー詳細の取得に失敗しました'
    });
  }
});

app.get(`${API_PREFIX}/debug`, (_req: Request, res: Response): void => {
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
  } else {
  }
} catch (error) {
}

// 管理者作成API
app.post(`${API_PREFIX}/admin/create-admin`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  
  if (!req.admin) {
    sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED, 'Admin access required');
    return;
  }

  // Check if user has write permission (only super_admin can create admins)
  if (!hasWritePermission(req)) {
    sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Moderator cannot create admins');
    return;
  }

  const { name, email, password, role = 'moderator' } = req.body;

  // バリデーション
  if (!name || !email || !password) {
    sendErrorResponse(res, 400, ClientErrorCode.MISSING_REQUIRED_FIELD, 'Missing required fields: name, email, password');
    return;
  }

  if (password.length < 6) {
    sendErrorResponse(res, 400, ClientErrorCode.INVALID_INPUT, 'Password must be at least 6 characters');
    return;
  }

  try {
    if (isMongoConnected) {
      // 既存の管理者をチェック
      const existingAdmin = await AdminModel.findOne({ email });
      if (existingAdmin) {
        sendErrorResponse(res, 409, ClientErrorCode.ALREADY_EXISTS, 'Email already exists');
        return;
      }

      // パスワードをハッシュ化
      const bcrypt = require('bcryptjs');
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 新しい管理者を作成
      const newAdmin = new AdminModel({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role,
        isActive: true
      });

      const savedAdmin = await newAdmin.save();

      res.status(201).json({
        success: true,
        message: '管理者を作成しました',
        admin: {
          _id: savedAdmin._id,
          name: savedAdmin.name,
          email: savedAdmin.email,
          role: savedAdmin.role,
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
          isActive: true,
          createdAt: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    log.error('Admin creation error', error, {
      adminId: req.user?._id,
      email,
      role
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 管理者一覧取得API
app.get(`${API_PREFIX}/admin/admins`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  
  if (!req.admin) {
    sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED, 'Admin access required');
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
    log.error('Admin list fetch error', error, {
      adminId: req.user?._id,
      query: req.query
    });
    sendErrorResponse(res, 500, ClientErrorCode.OPERATION_FAILED, error);
  }
});

// 管理者個別取得API
app.get(`${API_PREFIX}/admin/admins/:id`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  // 管理者権限チェック
  if (!req.admin) {
    res.status(403).json({ 
      error: 'Admin access required',
      message: 'INSUFFICIENT_PERMISSIONS'
    });
    return;
  }

  const { id } = req.params;

  try {
    if (!isMongoConnected) {
      res.status(500).json({ error: 'Database not connected' });
      return;
    }

    const admin = await AdminModel.findById(id).select('-password');
    
    if (!admin) {
      res.status(404).json({
        error: 'Admin not found',
        message: '管理者が見つかりません'
      });
      return;
    }

    res.json({
      success: true,
      admin: admin
    });
  } catch (error) {
    console.error('Admin fetch error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '管理者情報の取得に失敗しました'
    });
  }
});

// 管理者更新API
routeRegistry.define('PUT', `${API_PREFIX}/admin/admins/:id`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  // 管理者権限チェック
  if (!req.admin) {
    res.status(403).json({ 
      error: 'Admin access required',
      message: 'INSUFFICIENT_PERMISSIONS'
    });
    return;
  }

  // Check if user has write permission (only super_admin can edit admins)
  if (!hasWritePermission(req)) {
    res.status(403).json({ 
      error: 'Permission denied',
      message: 'モデレーターは管理者を編集できません' 
    });
    return;
  }

  const { id } = req.params;
  const { name, email, role, isActive } = req.body;

  try {
    if (!isMongoConnected) {
      res.status(500).json({ error: 'Database not connected' });
      return;
    }

    // メールアドレスの重複チェック
    if (email) {
      const existingAdmin = await AdminModel.findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: id } 
      });
      
      if (existingAdmin) {
        res.status(400).json({
          error: 'Email already exists',
          message: 'このメールアドレスは既に使用されています'
        });
        return;
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedAdmin = await AdminModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, select: '-password', runValidators: true }
    );

    if (!updatedAdmin) {
      res.status(404).json({
        error: 'Admin not found',
        message: '管理者が見つかりません'
      });
      return;
    }

    console.log('Admin updated:', updatedAdmin._id);

    res.json({
      success: true,
      message: '管理者情報を更新しました',
      admin: updatedAdmin
    });
  } catch (error) {
    console.error('Admin update error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '管理者情報の更新に失敗しました'
    });
  }
});

// 管理者削除API
routeRegistry.define('DELETE', `${API_PREFIX}/admin/admins/:id`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  // 管理者権限チェック
  if (!req.admin) {
    res.status(403).json({ 
      error: 'Admin access required',
      message: 'INSUFFICIENT_PERMISSIONS'
    });
    return;
  }

  // Check if user has write permission (only super_admin can delete admins)
  if (!hasWritePermission(req)) {
    res.status(403).json({ 
      error: 'Permission denied',
      message: 'モデレーターは管理者を削除できません' 
    });
    return;
  }

  const { id } = req.params;

  try {
    if (!isMongoConnected) {
      res.status(500).json({ error: 'Database not connected' });
      return;
    }

    // 自分自身を削除できないようにする
    if (req.admin._id.toString() === id) {
      res.status(400).json({
        error: 'Cannot delete yourself',
        message: '自分自身を削除することはできません'
      });
      return;
    }

    // スーパー管理者が1人しかいない場合は削除を防ぐ
    const adminToDelete = await AdminModel.findById(id);
    if (adminToDelete?.role === 'super_admin') {
      const superAdminCount = await AdminModel.countDocuments({ 
        role: 'super_admin',
        isActive: true 
      });
      
      if (superAdminCount <= 1) {
        res.status(400).json({
          error: 'Cannot delete last super admin',
          message: '最後のスーパー管理者は削除できません'
        });
        return;
      }
    }

    const deletedAdmin = await AdminModel.findByIdAndDelete(id);

    if (!deletedAdmin) {
      res.status(404).json({
        error: 'Admin not found',
        message: '管理者が見つかりません'
      });
      return;
    }

    console.log('Admin deleted:', deletedAdmin._id);

    res.json({
      success: true,
      message: `管理者 ${deletedAdmin.name} を削除しました`
    });
  } catch (error) {
    console.error('Admin delete error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '管理者の削除に失敗しました'
    });
  }
});


// 🔄 リアルタイムセキュリティイベントストリーム（SSE）
app.get(`${API_PREFIX}/admin/security/events-stream`, async (req: Request, res: Response): Promise<void> => {
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
    const { getRedisSubscriber } = require('../../lib/redis');
    const subscriber = await getRedisSubscriber();

    // セキュリティイベント購読
    const handleSecurityEvent = (message: string, channel: string) => {
      try {
        const eventData = JSON.parse(message);
        
        // SSEフォーマットで送信
        res.write(`data: ${JSON.stringify({
          type: 'security_event',
          event: eventData,
          timestamp: new Date().toISOString()
        })}\n\n`);
      } catch (error) {
      }
    };

    await subscriber.subscribe('security:events', handleSecurityEvent);

    // 接続終了時のクリーンアップ
    req.on('close', async () => {
      try {
        await subscriber.unsubscribe('security:events', handleSecurityEvent);
      } catch (error) {
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
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'セキュリティストリームの開始に失敗しました'
    });
  }
});

// 🛡️ セキュリティ管理API（管理者専用）
app.get(`${API_PREFIX}/admin/security-events`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected) {
      res.status(500).json({ error: 'Database connection required' });
      return;
    }

    // ViolationRecordから最新のセキュリティイベントを取得
    const ViolationRecord = require('../../models/ViolationRecord');
    
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
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'セキュリティイベントの取得に失敗しました'
    });
  }
});

// 🔧 違反解決API
app.post(`${API_PREFIX}/admin/resolve-violation/:id`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected) {
      res.status(500).json({ error: 'Database connection required' });
      return;
    }

    const { id } = req.params;
    const { notes } = req.body;
    
    const ViolationRecord = require('../../models/ViolationRecord');
    
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
    res.status(500).json({ 
      error: 'Internal server error',
      message: '違反の解決処理に失敗しました'
    });
  }
});

// 📊 セキュリティ統計API
app.get(`${API_PREFIX}/admin/security-stats`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected) {
      res.status(500).json({ error: 'Database connection required' });
      return;
    }

    const ViolationRecord = require('../../models/ViolationRecord');
    
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
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'セキュリティ統計の取得に失敗しました'
    });
  }
});

// 📊 トークン使用量分析API群
// =================================

// 📈 包括的トークン使用量統計API
app.get(`${API_PREFIX}/admin/token-analytics/overview`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 管理者権限チェック
    if (!req.admin) {
      res.status(403).json({ 
        error: 'Admin access required',
        message: 'INSUFFICIENT_PERMISSIONS'
      });
      return;
    }

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
              $sum: { $cond: [{ $gte: ['$profitMargin', 0.99] }, 1, 0] }
            },
            lowProfitMessages: {
              $sum: { $cond: [{ $lt: ['$profitMargin', 0.99] }, 1, 0] }
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
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'トークン分析データの取得に失敗しました'
    });
  }
});

// 📊 利益分析詳細API
app.get(`${API_PREFIX}/admin/token-analytics/profit-analysis`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
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
            profitMargin: { $lt: 0.99 } // 99%利益率システム
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
    res.status(500).json({ 
      error: 'Internal server error',
      message: '利益分析データの取得に失敗しました'
    });
  }
});

// 📈 トークン使用量トレンドAPI
app.get(`${API_PREFIX}/admin/token-analytics/usage-trends`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
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
    res.status(500).json({ 
      error: 'Internal server error',
      message: '使用量トレンドデータの取得に失敗しました'
    });
  }
});

// 🔍 異常使用検知API
app.get(`${API_PREFIX}/admin/token-analytics/anomaly-detection`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
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
app.get(`${API_PREFIX}/admin/cache/performance`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    
    const timeframe = parseInt(req.query.timeframe as string) || 30; // デフォルト30日
    
    if (!isMongoConnected) {
      res.status(503).json({
        error: 'Database not connected',
        message: 'データベース接続が必要です'
      });
      return;
    }

    const metrics = await getCachePerformanceMetrics(timeframe);
    
    console.log("Cache performance metrics:", {
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
    res.status(500).json({
      error: 'Internal server error',
      message: 'キャッシュパフォーマンス取得に失敗しました'
    });
  }
});

/**
 * 📈 キャラクター別キャッシュ統計取得
 */
app.get(`${API_PREFIX}/admin/cache/characters`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    
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
    

    res.json({
      success: true,
      data: characterStats,
      timestamp: new Date(),
      timeframe: timeframe
    });

  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'キャラクター別キャッシュ統計取得に失敗しました'
    });
  }
});

/**
 * 🏆 トップパフォーマンスキャッシュ取得
 */
app.get(`${API_PREFIX}/admin/cache/top-performing`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    
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
    

    res.json({
      success: true,
      data: topCaches,
      timestamp: new Date(),
      limit: limit
    });

  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'トップパフォーマンスキャッシュ取得に失敗しました'
    });
  }
});

/**
 * 🗑️ キャッシュ無効化統計取得
 */
app.get(`${API_PREFIX}/admin/cache/invalidation-stats`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    
    const timeframe = parseInt(req.query.timeframe as string) || 30;
    
    if (!isMongoConnected) {
      res.status(503).json({
        error: 'Database not connected',
        message: 'データベース接続が必要です'
      });
      return;
    }

    const invalidationStats = await getCacheInvalidationStats(timeframe);
    

    res.json({
      success: true,
      data: invalidationStats,
      timestamp: new Date(),
      timeframe: timeframe
    });

  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'キャッシュ無効化統計取得に失敗しました'
    });
  }
});


/**
 * 💱 現在の為替レート取得
 */
app.get(`${API_PREFIX}/admin/exchange-rate`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    
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
app.get(`${API_PREFIX}/admin/error-stats`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 管理者権限チェック
    if (!req.admin) {
      res.status(403).json({ 
        error: 'Admin access required',
        message: 'INSUFFICIENT_PERMISSIONS'
      });
      return;
    }
    
    const timeRange = (req.query.range as string) || '24h';
    
    // デバッグ: APIErrorModelのドキュメント数を確認
    const totalErrorCount = await APIErrorModel.countDocuments();
    log.info('🔍 Error Stats Debug', {
      timeRange,
      totalErrorCount,
      adminId: req.admin._id
    });
    
    const errorStats = await (APIErrorModel as any).getErrorStats(timeRange);
    
    // ServerMonitorから全体的なパフォーマンス統計を取得
    const serverMonitor = ServerMonitor.getInstance();
    const performanceStats = serverMonitor.getPerformanceStats();
    
    // デバッグ: 統計情報をログ出力
    log.info('📊 Error Statistics', {
      errorStats,
      performanceStats: {
        totalRequests: performanceStats.totalRequests,
        totalErrors: performanceStats.totalErrors,
        averageResponseTime: performanceStats.avgResponseTime
      }
    });
    
    // エラー統計にtotalRequestsを追加
    const enhancedStats = {
      ...errorStats,
      totalRequests: performanceStats.totalRequests
    };
    
    res.json({
      success: true,
      data: {
        timeRange,
        stats: enhancedStats,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'APIエラー統計の取得に失敗しました'
    });
  }
});

/**
 * 🧪 テスト用エラー生成API（開発環境のみ）
 */
app.post(`${API_PREFIX}/admin/errors/test`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    // 開発環境でのみ許可
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ error: 'Test errors not allowed in production' });
      return;
    }

    // テスト用エラーを生成
    const testErrors = [
      {
        endpoint: '/api/v1/test/endpoint1',
        method: 'GET',
        statusCode: 404,
        errorType: 'not_found',
        errorMessage: 'Test endpoint not found',
        responseTime: 150,
        timestamp: new Date()
      },
      {
        endpoint: '/api/v1/test/endpoint2',
        method: 'POST',
        statusCode: 500,
        errorType: 'server_error',
        errorMessage: 'Test server error',
        responseTime: 250,
        timestamp: new Date(Date.now() - 3600000) // 1時間前
      },
      {
        endpoint: '/api/v1/test/auth',
        method: 'GET',
        statusCode: 401,
        errorType: 'authentication',
        errorMessage: 'Test authentication error',
        responseTime: 50,
        timestamp: new Date(Date.now() - 7200000) // 2時間前
      }
    ];

    // エラーを保存
    const savedErrors = await APIErrorModel.insertMany(testErrors);

    res.json({
      success: true,
      message: `${savedErrors.length} test errors created`,
      errors: savedErrors
    });

  } catch (error) {
    log.error('Test error creation failed', error);
    res.status(500).json({ error: 'Failed to create test errors' });
  }
});

/**
 * 📊 エラー一覧取得API
 */
app.get(`${API_PREFIX}/admin/errors`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(401).json({ error: 'Admin access required' });
      return;
    }

    const { range = '24h', limit = 50, offset = 0, resolved, errorType, statusCode } = req.query;
    
    // 時間範囲の計算
    let startDate: Date;
    switch (range) {
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
      default:
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    // フィルタ条件の構築
    const filter: any = { timestamp: { $gte: startDate } };
    if (resolved !== undefined) filter.resolved = resolved === 'true';
    if (errorType) filter.errorType = errorType;
    if (statusCode) filter.statusCode = parseInt(statusCode as string);

    // デバッグ: フィルタとドキュメント数を確認
    const totalDocs = await APIErrorModel.countDocuments();
    log.info('🔍 Error List Debug', {
      filter,
      totalDocs,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    const errors = await APIErrorModel
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string))
      .skip(parseInt(offset as string))
      .lean();

    const total = await APIErrorModel.countDocuments(filter);
    
    log.info('📋 Error List Results', {
      foundErrors: errors.length,
      totalMatching: total,
      sampleError: errors[0] || null
    });

    res.json({
      success: true,
      errors,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching errors:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'エラー一覧の取得に失敗しました'
    });
  }
});

/**
 * 🔧 エラー管理API - エラー解決マーク
 */
app.post(`${API_PREFIX}/admin/errors/resolve`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(401).json({ error: 'Admin access required' });
      return;
    }

    const { errorIds, resolutionCategory, notes } = req.body;
    
    if (!errorIds || !Array.isArray(errorIds) || errorIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'エラーIDの配列が必要です'
      });
      return;
    }

    const validCategories = ['fixed', 'duplicate', 'invalid', 'wont_fix', 'not_reproducible'];
    if (resolutionCategory && !validCategories.includes(resolutionCategory)) {
      res.status(400).json({
        success: false,
        message: '無効な解決カテゴリです'
      });
      return;
    }

    // エラーを解決済みにマーク
    const result = await (APIErrorModel as any).updateMany(
      { _id: { $in: errorIds }, resolved: false },
      {
        $set: {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: req.user._id,
          resolutionCategory: resolutionCategory || 'fixed',
          notes: notes || '管理者により手動解決'
        }
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount}件のエラーを解決済みにマークしました`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'エラー解決処理に失敗しました'
    });
  }
});

/**
 * 🔧 エラー管理API - エラー詳細取得
 */
app.get(`${API_PREFIX}/admin/errors/details`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(401).json({ error: 'Admin access required' });
      return;
    }

    const { page = 1, limit = 20, resolved, errorType, timeRange = '7d' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    // 時間範囲の計算
    let startDate: Date;
    switch (timeRange) {
      case '1h': startDate = new Date(Date.now() - 60 * 60 * 1000); break;
      case '24h': startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); break;
      case '7d': startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // フィルター条件
    const filter: any = {
      timestamp: { $gte: startDate }
    };

    if (resolved !== undefined) {
      filter.resolved = resolved === 'true';
    }

    if (errorType) {
      filter.errorType = errorType;
    }

    // エラー一覧取得
    const errors = await (APIErrorModel as any).find(filter)
      .sort({ timestamp: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .select('endpoint method statusCode errorType errorMessage timestamp resolved resolutionCategory notes resolvedAt')
      .lean();

    const totalErrors = await (APIErrorModel as any).countDocuments(filter);

    res.json({
      success: true,
      data: {
        errors,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalErrors,
          pages: Math.ceil(totalErrors / limitNum)
        },
        filter: {
          timeRange,
          resolved,
          errorType
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'エラー詳細取得に失敗しました'
    });
  }
});

/**
 * 📅 クーロンジョブ状態確認
 */
app.get(`${API_PREFIX}/admin/cron-status`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    
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
    res.status(500).json({
      error: 'Internal server error',
      message: 'クーロンジョブ状態取得に失敗しました'
    });
  }
});

/**
 * 📋 サーバーログ取得（管理者用）
 */
app.get(`${API_PREFIX}/admin/logs`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    
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
    res.status(500).json({
      error: 'Internal server error',
      message: 'サーバーログ取得に失敗しました'
    });
  }
});

/**
 * 🧹 キャッシュクリーンアップ実行
 */
app.post(`${API_PREFIX}/admin/cache/cleanup`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    
    if (!isMongoConnected) {
      res.status(503).json({
        error: 'Database not connected',
        message: 'データベース接続が必要です'
      });
      return;
    }

    const cleanupResult = await performCacheCleanup();
    

    res.json({
      success: true,
      data: cleanupResult,
      message: `${cleanupResult.deletedCount}個のキャッシュを削除し、${Math.round(cleanupResult.memoryFreed / 1024)}KBのメモリを解放しました`,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'キャッシュクリーンアップに失敗しました'
    });
  }
});

/**
 * 🎯 特定キャラクターのキャッシュ無効化
 */
routeRegistry.define('DELETE', `${API_PREFIX}/admin/cache/character/:characterId`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check if user has write permission (only super_admin can delete cache)
    if (!hasWritePermission(req)) {
      res.status(403).json({ 
        error: 'Permission denied',
        message: 'モデレーターはキャッシュを削除できません' 
      });
      return;
    }

    const { characterId } = req.params;
    const reason = req.body.reason || 'manual_admin_action';
    
    console.log("Cache invalidation request:", {
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
    

    res.json({
      success: true,
      data: invalidationResult,
      message: `${character.name?.ja || character.name}のキャッシュ${invalidationResult.deletedCount}個を無効化しました`,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'キャラクターキャッシュ無効化に失敗しました'
    });
  }
});


// ==================== ADMIN DASHBOARD ENDPOINTS ====================

// 管理者ダッシュボード統計情報API
app.get(`${API_PREFIX}/admin/dashboard/stats`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 管理者権限チェック
    if (!req.admin) {
      res.status(403).json({ 
        error: 'Admin access required',
        message: 'INSUFFICIENT_PERMISSIONS',
        details: '管理者権限が必要です'
      });
      return;
    }

    if (!isMongoConnected) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    // 現在の日時と比較日時を設定
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 基本統計の集計
    const [
      totalUsers,
      activeUsers,
      totalCharacters,
      activeCharacters,
      totalTokenUsage,
      recentErrors
    ] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ lastLoginAt: { $gte: sevenDaysAgo } }),
      CharacterModel.countDocuments(),
      CharacterModel.countDocuments({ isActive: true }),
      ChatModel.aggregate([
        { $unwind: '$messages' },
        { $match: { 'messages.role': 'assistant' } },
        { $group: { _id: null, total: { $sum: '$messages.tokensUsed' } } }
      ]),
      APIErrorModel.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } })
    ]);

    // 前期間との比較用データ取得
    const [
      prevTotalUsers,
      prevActiveUsers,
      prevTokenUsage,
      prevErrors
    ] = await Promise.all([
      UserModel.countDocuments({ createdAt: { $lt: thirtyDaysAgo } }),
      UserModel.countDocuments({ 
        lastLoginAt: { $gte: new Date(thirtyDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000), $lt: thirtyDaysAgo }
      }),
      ChatModel.aggregate([
        { $match: { createdAt: { $lt: thirtyDaysAgo } } },
        { $unwind: '$messages' },
        { $match: { 'messages.role': 'assistant' } },
        { $group: { _id: null, total: { $sum: '$messages.tokensUsed' } } }
      ]),
      APIErrorModel.countDocuments({ 
        createdAt: { 
          $gte: new Date(twentyFourHoursAgo.getTime() - 24 * 60 * 60 * 1000), 
          $lt: twentyFourHoursAgo 
        } 
      })
    ]);

    // トレンド計算
    const calculateTrend = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number(((current - previous) / previous * 100).toFixed(1));
    };

    // 財務情報の集計
    const totalRevenue = await PurchaseHistoryModel.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // システム健全性スコアの計算
    const calculateEvaluationScore = () => {
      let score = 0;
      let breakdown = { excellent: 0, good: 0, needsImprovement: 0 };
      
      // 1. アクティブユーザー率（40点満点）
      const activeUserRate = totalUsers > 0 ? (activeUsers / totalUsers) : 0;
      const activeUserScore = activeUserRate * 40;
      
      // 2. エラー率（30点満点 - エラーが多いほど減点）
      const serverMonitor = ServerMonitor.getInstance();
      const performanceStats = serverMonitor.getPerformanceStats();
      const errorRate = performanceStats.totalRequests > 0 
        ? (performanceStats.totalErrors / performanceStats.totalRequests) 
        : 0;
      const errorScore = Math.max(0, 30 - (errorRate * 300)); // エラー率10%で0点
      
      // 3. キャラクター利用率（30点満点）
      const characterUsageRate = totalCharacters > 0 ? (activeCharacters / totalCharacters) : 0;
      const characterScore = characterUsageRate * 30;
      
      score = Math.round(activeUserScore + errorScore + characterScore);
      
      // ブレークダウンの計算
      if (score >= 80) {
        breakdown.excellent = score - 60;
        breakdown.good = 40;
        breakdown.needsImprovement = 0;
      } else if (score >= 50) {
        breakdown.excellent = 0;
        breakdown.good = score - 30;
        breakdown.needsImprovement = 0;
      } else {
        breakdown.excellent = 0;
        breakdown.good = 0;
        breakdown.needsImprovement = 50 - score;
      }
      
      return { score: Math.max(0, Math.min(100, score)), breakdown };
    };

    const evaluation = calculateEvaluationScore();

    // デバッグログを追加
    console.log('🔍 Admin Dashboard Stats Debug:', {
      totalUsers,
      activeUsers,
      totalTokenUsage,
      totalTokenUsageValue: totalTokenUsage[0]?.total || 0,
      totalCharacters,
      apiErrors: recentErrors
    });

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        totalTokensUsed: totalTokenUsage[0]?.total || 0,
        totalCharacters,
        apiErrors: recentErrors
      },
      trends: {
        userGrowth: calculateTrend(totalUsers, prevTotalUsers),
        tokenUsageGrowth: calculateTrend(
          totalTokenUsage[0]?.total || 0,
          prevTokenUsage[0]?.total || 0
        ),
        apiErrorTrend: calculateTrend(recentErrors, prevErrors),
        characterPopularity: calculateTrend(activeCharacters, totalCharacters * 0.8)
      },
      financial: {
        totalRevenue: totalRevenue[0]?.total || 0,
        availableBalance: 1768, // TODO: 実際の残高計算を実装
        creditLimit: 3000, // TODO: 実際の上限を設定
        outstandingDebt: -1232, // TODO: 実際の債務計算を実装
        projectedBalance14Days: 1543 // TODO: 予測計算を実装
      },
      evaluation: {
        overallScore: evaluation.score,
        breakdown: evaluation.breakdown
      }
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'ダッシュボード統計の取得に失敗しました'
    });
  }
});

// キャラクター統計更新API
app.post(`${API_PREFIX}/admin/characters/update-stats`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 管理者権限チェック
    if (!req.admin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    if (!isMongoConnected) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }


    // 全キャラクターを取得
    let characters = [];
    try {
      characters = await CharacterModel.find({});
    } catch (charError) {
      throw new Error('Failed to fetch characters: ' + (charError instanceof Error ? charError.message : String(charError)));
    }
    
    let updatedCount = 0;
    let totalMessagesCount = 0;

    // 各キャラクターの統計を更新
    for (const character of characters) {
      
      // このキャラクターに関連するチャット統計を集計
      // ChatModelからデータを取得
      const chats = await ChatModel.find({ characterId: character._id });
      
      // チャット統計を手動で集計
      let totalMessages = 0;
      const uniqueUsers = new Set<string>();
      
      for (const chat of chats) {
        uniqueUsers.add(chat.userId);
        totalMessages += chat.messages.length;
      }
      
      // TokenUsageモデルからもこのキャラクターに関連するチャットを確認
      const tokenUsageData = await TokenUsage.find({
        'characterInfo.id': character._id.toString()
      });
      
      // トークン使用データからユーザーを追加
      for (const usage of tokenUsageData) {
        if (usage.userId) {
          uniqueUsers.add(usage.userId.toString());
        }
      }

      // このキャラクターのユーザーごとの親密度を集計
      let affinityStats = [];
      try {
        affinityStats = await UserModel.aggregate([
          { $unwind: '$affinities' },
          { $match: { 'affinities.character': character._id } },
          { $group: {
            _id: null,
            avgLevel: { $avg: '$affinities.level' },
            totalUsers: { $sum: 1 },
            maxLevel: { $max: '$affinities.level' }
          }}
        ]);
      } catch (affinityError) {
      }

      const affinityData = affinityStats[0] || { avgLevel: 0, totalUsers: 0, maxLevel: 0 };

      // キャラクターの統計を更新
      character.totalMessages = totalMessages;
      character.totalUsers = uniqueUsers.size;
      character.averageAffinityLevel = Number(affinityData.avgLevel.toFixed(1));
      
      
      // 総収益の計算（このキャラクターの購入履歴から）
      const revenueStats = await PurchaseHistoryModel.aggregate([
        { 
          $match: { 
            type: 'character',
            characterId: character._id,
            status: 'completed'
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      character.totalRevenue = revenueStats[0]?.total || 0;

      // 統計フィールドのみを更新（他のフィールドは変更しない）
      await CharacterModel.updateOne(
        { _id: character._id },
        {
          $set: {
            totalMessages: character.totalMessages,
            totalUsers: character.totalUsers,
            averageAffinityLevel: character.averageAffinityLevel,
            totalRevenue: character.totalRevenue
          }
        }
      );
      
      updatedCount++;
      totalMessagesCount += totalMessages;

    }

    res.json({
      success: true,
      updated: updatedCount,
      stats: {
        totalCharacters: characters.length,
        totalMessages: totalMessagesCount,
        averageMessages: characters.length > 0 ? Math.round(totalMessagesCount / characters.length) : 0
      }
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'キャラクター統計の更新に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// 為替レート取得API
app.get(`${API_PREFIX}/exchange-rate`, async (req: Request, res: Response): Promise<void> => {
  try {
    const rate = await ExchangeRateModel.getLatestValidRate('USD', 'JPY');
    res.json({ 
      success: true,
      usdToJpy: rate,
      jpyToUsd: 1 / rate
    });
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch exchange rate',
      fallback: {
        usdToJpy: 150,
        jpyToUsd: 1 / 150
      }
    });
  }
});

// ==================== USER SETTINGS ENDPOINTS ====================

// ユーザーのパスワード変更API
routeRegistry.define('PUT', `${API_PREFIX}/user/change-password`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { currentPassword, newPassword } = req.body;

  // バリデーション
  if (!currentPassword || !newPassword) {
    res.status(400).json({ 
      error: 'Missing required fields',
      message: '現在のパスワードと新しいパスワードが必要です'
    });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ 
      error: 'Password too short',
      message: 'パスワードは8文字以上である必要があります'
    });
    return;
  }

  try {
    if (!isMongoConnected) {
      res.status(500).json({ error: 'Database not connected' });
      return;
    }

    // ユーザーを取得（パスワードフィールドも含む）
    const user = await UserModel.findById(req.user._id).select('+password');
    if (!user) {
      res.status(404).json({ 
        error: 'User not found',
        message: 'ユーザーが見つかりません'
      });
      return;
    }

    // 現在のパスワードを確認
    const bcrypt = require('bcryptjs');
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      res.status(400).json({ 
        error: 'Invalid current password',
        message: '現在のパスワードが正しくありません'
      });
      return;
    }

    // 新しいパスワードをハッシュ化
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // パスワードを更新
    await UserModel.findByIdAndUpdate(req.user._id, {
      password: hashedNewPassword
    });

    res.json({
      success: true,
      message: 'パスワードが正常に変更されました'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'パスワードの変更に失敗しました'
    });
  }
});

// ユーザーのアカウント削除API
routeRegistry.define('DELETE', `${API_PREFIX}/user/delete-account`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { confirmDeletion } = req.body;

  // 削除確認が必要
  if (!confirmDeletion) {
    res.status(400).json({ 
      error: 'Confirmation required',
      message: 'アカウント削除の確認が必要です'
    });
    return;
  }

  try {
    if (!isMongoConnected) {
      res.status(500).json({ error: 'Database not connected' });
      return;
    }

    // ユーザーを取得
    const user = await UserModel.findById(req.user._id);
    if (!user) {
      res.status(404).json({ 
        error: 'User not found',
        message: 'ユーザーが見つかりません'
      });
      return;
    }

    // 論理削除を実行（物理削除ではなく、アクセス不可にする）
    await UserModel.findByIdAndUpdate(req.user._id, {
      isActive: false,
      accountStatus: 'deleted',
      email: `deleted_${Date.now()}_${user.email}`, // メールアドレスを無効化
      deletedAt: new Date()
    });

    // 関連データの無効化
    try {
      // チャット履歴を無効化
      await ChatModel.updateMany(
        { userId: req.user._id },
        { $set: { isActive: false } }
      );
      
      // 通知を無効化
      await UserNotificationReadStatusModel.updateMany(
        { userId: req.user._id },
        { $set: { isActive: false } }
      );
    } catch (cleanupError) {
      console.error('Account deletion cleanup error:', cleanupError);
      // クリーンアップエラーは無視して続行
    }

    res.json({
      success: true,
      message: 'アカウントが正常に削除されました'
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'アカウントの削除に失敗しました'
    });
  }
});

// ==================== DEBUG ENDPOINTS ====================

// デバッグ用：ユーザーの違反記録確認API（一時的）
app.get(`${API_PREFIX}/debug/user-violations/:userId`, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  // 管理者権限チェック
  if (!req.admin) {
    res.status(403).json({ 
      error: 'Admin access required',
      message: 'INSUFFICIENT_PERMISSIONS'
    });
    return;
  }

  const { userId } = req.params;

  try {
    const user = await UserModel.findById(userId);
    const violations = await ViolationRecordModel.find({ userId }).sort({ timestamp: -1 });
    const stats = await getViolationStats(new mongoose.Types.ObjectId(userId));

    res.json({
      user: {
        id: user?._id,
        name: user?.name,
        violationCount: user?.violationCount,
        accountStatus: user?.accountStatus,
        suspensionEndDate: user?.suspensionEndDate,
        lastViolationDate: user?.lastViolationDate
      },
      violations: violations.map(v => ({
        id: v._id,
        type: v.violationType,
        reason: v.reason,
        detectedWord: v.detectedWord,
        timestamp: v.timestamp,
        isResolved: v.isResolved
      })),
      stats,
      dbViolationCount: violations.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});




// グローバルエラーハンドリングミドルウェア（最後に設定）
app.use(errorLoggingMiddleware);

app.listen(PORT, async () => {
  
  // 🎭 MoodEngine Cronジョブを開始
  startAllMoodJobs();
  
  // 💱 為替レート更新Cronジョブを開始
  startExchangeRateJob();
  
  // 💱 初回起動時に為替レートを初期化
  await initializeExchangeRate();
});
