import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import OpenAI from 'openai';
import { LocalizedString } from './types';
import { TokenPackModel, ITokenPack } from './models/TokenPackModel';
import { getRedisClient } from '../lib/redis';
import { UserModel, IUser } from './models/UserModel';
import { AdminModel, IAdmin } from './models/AdminModel';
import { ChatModel, IChat, IMessage } from './models/ChatModel';
import { CharacterModel, ICharacter } from './models/CharacterModel';
import { authenticateToken, AuthRequest } from './middleware/auth';
import authRoutes from './routes/auth';
import characterRoutes from './routes/characters';
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

dotenv.config({ path: './.env' });

const app = express();
const PORT = process.env.PORT || 3004;


// GPT-4.1 mini原価モデル定数（利益率80%設計）
const TOKEN_COST_PER_UNIT = 0.0003; // 1トークンあたり¥0.0003の原価（GPT-4.1 mini）
const PROFIT_MARGIN = 0.8; // 利益率80%
const COST_RATIO = 1 - PROFIT_MARGIN; // 原価率20%
const TOKENS_PER_YEN = 1 / (TOKEN_COST_PER_UNIT / COST_RATIO); // 約666.67トークン/円

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
    
    systemPrompt = `あなたは${character.name.ja}というキャラクターです。
性格: ${character.personalityPreset || '優しい'}
特徴: ${character.personalityTags?.join(', ') || '親しみやすい'}
説明: ${character.description.ja}

以下の特徴に従って、一人称と話し方でユーザーと自然な会話をしてください：
- ${character.personalityTags?.join('\n- ') || '優しく親しみやすい会話'}
- 約50-150文字程度で返答してください
- 絵文字を適度に使用してください`;

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

// JSON body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS設定
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-auth-token']
}));

// 認証ルート
app.use('/api/auth', authRoutes);

// 静的ファイル配信（アップロードされた画像）
app.use('/uploads', express.static(path.join(__dirname, '../../uploads'), {
  maxAge: '365d', // 1年キャッシュ
  etag: true
}));

// キャラクタールート
app.use('/api/characters', characterRoutes);

// ユーザープロフィール更新
app.put('/api/user/profile', authenticateToken, async (req: Request, res: Response): Promise<void> => {
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
        console.log('💳 Checkout session completed:', session.id);
        
        const userId = session.metadata?.userId;
        const priceId = session.metadata?.priceId;
        
        if (!userId) {
          console.error('❌ No userId in session metadata');
          break;
        }
        
        let tokenPack: ITokenPack | null = null;
        if (isMongoConnected && priceId) {
          tokenPack = await TokenPackModel.findOne({ priceId }).lean();
          console.log('🔍 MongoDB TokenPack lookup:', {
            priceId,
            found: !!tokenPack,
            tokenPack: tokenPack ? {
              _id: tokenPack._id,
              name: tokenPack.name,
              tokens: tokenPack.tokens,
              price: tokenPack.price,
              priceId: tokenPack.priceId
            } : null
          });
        }
        
        let tokensToAdd = 0;
        if (tokenPack) {
          tokensToAdd = tokenPack.tokens;
          console.log('🎁 Using token pack from MongoDB:', { 
            name: tokenPack.name, 
            tokens: tokensToAdd,
            priceId: tokenPack.priceId,
            price: tokenPack.price 
          });
        } else {
          const amountInYen = session.amount_total || 0;
          tokensToAdd = Math.floor(amountInYen * TOKENS_PER_YEN);
          console.log('🎁 Calculated tokens from session amount:', { 
            sessionId: session.id,
            amountTotal: session.amount_total,
            amountInYen, 
            tokensToAdd,
            TOKENS_PER_YEN,
            priceId: priceId || 'not found'
          });
        }
        
        if (tokensToAdd > 0) {
          if (!isMongoConnected) {
            console.error('❌ MongoDB not connected');
            break;
          }
          
          {
            // MongoDB ObjectIDとして有効かチェック
            const mongoose = require('mongoose');
            const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
            
            let user;
            if (isValidObjectId) {
              user = await UserModel.findById(userId);
            } else {
              // 無効なObjectIDの場合は、文字列検索で代替
              user = await UserModel.findOne({ email: `user_${userId}@example.com` });
            }
            
            if (!user) {
              // 新しいユーザーを作成（有効なObjectIDを生成）
              const newObjectId = isValidObjectId ? userId : new mongoose.Types.ObjectId();
              user = new UserModel({
                _id: newObjectId,
                email: `user_${userId}@example.com`,
                name: `User ${userId}`,
                tokenBalance: tokensToAdd
              });
            } else {
              user.tokenBalance += tokensToAdd;
            }
            await user.save();
            
            console.log('✅ MongoDB: Tokens added successfully', {
              userId,
              isValidObjectId,
              actualUserId: user._id,
              tokensAdded: tokensToAdd,
              newBalance: user.tokenBalance
            });
            
            // Redisに購入完了通知を保存（SSE用）
            try {
              const redis = await getRedisClient();
              const purchaseData = {
                addedTokens: tokensToAdd,
                newBalance: user.tokenBalance,
                timestamp: new Date().toISOString()
              };
              
              await redis.set(
                `purchase:${session.id}`, 
                JSON.stringify(purchaseData), 
                { EX: 60 } // 60秒で期限切れ
              );
              
              console.log('🔔 通知保存成功 (Redis/Memory):', {
                sessionId: session.id,
                data: purchaseData
              });
            } catch (redisError) {
              console.error('❌ 通知保存エラー:', redisError);
            }
          }
        }
        break;
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('💰 Payment succeeded:', paymentIntent.id);
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('❌ Payment failed:', paymentIntent.id);
        break;
      }
      
      default:
        console.log('ℹ️ Unhandled event type:', { eventType: event.type });
    }

    res.json({ received: true, eventType: event.type });
    
  } catch (error) {
    console.error('❌ Webhook処理エラー:', error);
    res.status(400).send(`Webhook Error: ${(error as Error).message}`);
  }
});

// 通常のJSONミドルウェア（Webhookの後に配置）
app.use(express.json());

// Extend Request interface
declare module 'express-serve-static-core' {
  interface Request {
    user?: IUser;
  }
}

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

app.patch('/api/users/me/use-character', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  console.log('🔄 selectedCharacter更新:', req.body);
  const { characterId } = req.body;
  
  if (!req.user) {
    res.status(401).json({ msg: 'Unauthorized' });
    return;
  }
  
  if (!characterId) {
    res.status(400).json({ msg: 'Character ID is required' });
    return;
  }
  
  try {
    // キャラクターが存在するかチェック
    const character = await CharacterModel.findById(characterId);
    if (!character || !character.isActive) {
      res.status(404).json({ msg: 'Character not found' });
      return;
    }
    
    // ユーザーのselectedCharacterを更新
    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user._id,
      { 
        selectedCharacter: {
          _id: characterId,
          name: character.name
        }
      },
      { new: true }
    );
    
    if (!updatedUser) {
      res.status(404).json({ msg: 'User not found' });
      return;
    }
    
    console.log('✅ selectedCharacter updated:', characterId, character.name);
    
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      tokenBalance: updatedUser.tokenBalance,
      selectedCharacter: updatedUser.selectedCharacter
    });
  } catch (error) {
    console.error('❌ Error updating selected character:', error);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

// Chat API endpoints
app.get('/api/chats/:characterId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  console.log('💬 Chat history API called');
  
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

    // キャラクター情報を多言語対応で返す
    const localizedCharacter = {
      _id: character._id,
      name: character.name,
      description: character.description,
      personality: character.personalityPreset,
      model: character.aiModel,
      imageChatAvatar: character.imageChatAvatar,
      themeColor: character.themeColor
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
        experience: characterAffinity?.experience || chatData.totalTokensUsed || 0
      },
      unlockedGalleryImages: characterAffinity?.unlockedRewards || []
    };

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
    const validation = await validateMessage(req.user._id, message.trim(), req);
    if (!validation.allowed) {
      console.log('🚫 Content violation detected:', validation.reason);
      res.status(403).json({
        error: validation.reason,
        code: 'CONTENT_VIOLATION',
        violationType: validation.violationType,
        detectedWord: validation.detectedWord,
        sanctionInfo: validation.sanctionInfo
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
              currentAffinity: Math.floor(Math.random() * 3) + 1 // 1-3ポイント増加
            },
            $set: { lastActivityAt: new Date() }
          },
          { 
            new: true, 
            upsert: true // 存在しない場合は新規作成
          }
        );

        const affinityIncrease = Math.floor(Math.random() * 3) + 1;
        const newAffinity = Math.min(100, updatedChat.currentAffinity);

        console.log('✅ Chat messages saved to MongoDB:', {
          character: character.name.ja,
          tokensUsed: aiResponse.tokensUsed,
          newBalance,
          affinityIncrease,
          totalMessages: updatedChat.messages.length,
          cacheHit: aiResponse.cacheHit
        });

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
app.get('/api/user/dashboard', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  console.log('📊 Dashboard API called');
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Get actual token balance from MongoDB
  let actualBalance = req.user.tokenBalance; // fallback
  let totalPurchased = 15000; // fallback
  
  console.log('🔍 isMongoConnected:', isMongoConnected);
  if (isMongoConnected) {
    console.log('🔄 Attempting to get actual token balance from MongoDB');
    try {
      // Get actual user data from MongoDB
      // Convert mock user ID to actual MongoDB ObjectId
      const actualUserId = req.user._id === '507f1f77bcf86cd799439011' ? '6847b690be4f1d49db302358' : req.user._id;
      const user = await UserModel.findById(actualUserId).lean();
      console.log('🔍 Found user:', { _id: actualUserId, tokenBalance: user?.tokenBalance });
      if (user) {
        actualBalance = user.tokenBalance || 0;
        console.log('✅ Updated actualBalance to:', actualBalance);
      }
      
      // Get actual token pack data
      const UserTokenPack = require('../models/UserTokenPack');
      const tokenPacks = await UserTokenPack.find({ userId: actualUserId }).lean();
      totalPurchased = tokenPacks.reduce((sum: number, pack: any) => sum + (pack.tokensPurchased || 0), 0);
    } catch (error) {
      console.error('❌ Failed to get actual token balance:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    }
  }

  if (!isMongoConnected) {
    res.status(500).json({ error: 'Database not connected' });
    return;
  }

  try {
    // Get actual user data from MongoDB
    const user = await UserModel.findById(req.user._id).lean();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Basic dashboard data - needs to be implemented properly with real queries
    const dashboardData = {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        tokenBalance: user.tokenBalance,
        selectedCharacter: user.selectedCharacter,
        isSetupComplete: user.isSetupComplete,
        createdAt: user.createdAt || new Date(),
        lastLoginAt: new Date()
      },
      tokens: {
        balance: user.tokenBalance || 0,
        totalPurchased: 0, // TODO: Implement proper calculation
        totalUsed: 0, // TODO: Implement proper calculation
        recentUsage: [] // TODO: Implement proper usage tracking
      },
      affinities: [], // TODO: Implement character affinity system
      recentChats: [], // TODO: Implement recent chat history
      badges: [], // TODO: Implement badge system
      notifications: [] // TODO: Implement notification system
    };

    console.log('✅ Dashboard data retrieved');
    res.json(dashboardData);
  } catch (error) {
    console.error('❌ Dashboard API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Token Analytics API
app.get('/api/analytics/tokens', authenticateToken, (req: Request, res: Response): void => {
  console.log('📊 Token Analytics API called');
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const range = (req.query.range as string) || 'month';
  
  // TODO: Implement proper token analytics with real database queries
  // For now, return empty data
  const analyticsData = {
    usage: [],
    summary: {
      totalUsed: 0,
      averagePerDay: 0,
      peakUsage: 0
    }
  };

  res.json(analyticsData);
});

// Purchase History API
app.get('/api/user/purchase-history', authenticateToken, (req: Request, res: Response): void => {
  console.log('📋 Purchase History API called');
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // TODO: Implement proper purchase history with real database queries
  // For now, return empty data
  const purchaseHistory = {
    purchases: [],
    summary: {
      totalSpent: 0,
      totalPurchases: 0
    }
  };

  res.json(purchaseHistory);
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

// Conversation Statistics API - TODO: Implement
app.get('/api/analytics/conversations', authenticateToken, (req: Request, res: Response): void => {
  console.log('📊 Conversation Analytics API called');
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  // TODO: 実装待ち
  res.json({
    message: 'Conversation analytics - 実装待ち'
  });
});

// Token Analytics API
app.get('/api/analytics/tokens', authenticateToken, (req: Request, res: Response): void => {
  console.log('📊 Token Analytics API called');
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const range = (req.query.range as string) || 'month';
  
  // Generate mock data based on range
  const generateDailyUsage = (days: number) => {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().slice(0, 10),
        amount: Math.floor(Math.random() * 500) + 200,
        count: Math.floor(Math.random() * 15) + 5
      });
    }
    return data;
  };

  const generateWeeklyTrend = () => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      data.push({
        week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        amount: Math.floor(Math.random() * 3000) + 1500,
        efficiency: Math.floor(Math.random() * 30) + 40
      });
    }
    return data;
  };

  const generateMonthlyTrend = () => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthlyAmount = Math.floor(Math.random() * 8000) + 6000;
      data.push({
        month: `${month.getFullYear()}/${month.getMonth() + 1}`,
        amount: monthlyAmount,
        averageDaily: Math.floor(monthlyAmount / 30)
      });
    }
    return data;
  };

  const generateHourlyPattern = () => {
    const data = [];
    for (let hour = 0; hour < 24; hour++) {
      const baseAmount = hour >= 19 && hour <= 23 ? 200 : 
                       hour >= 12 && hour <= 18 ? 150 : 
                       hour >= 7 && hour <= 11 ? 100 : 50;
      data.push({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        amount: baseAmount + Math.floor(Math.random() * 100),
        sessions: Math.floor((baseAmount / 50) * (Math.random() * 2 + 1))
      });
    }
    return data;
  };

  const characterUsage = [
    { characterName: 'ルナ', amount: 4850, percentage: 45, color: '#E91E63' },
    { characterName: 'ミコ', amount: 3240, percentage: 30, color: '#9C27B0' },
    { characterName: 'ゼン', amount: 1620, percentage: 15, color: '#2196F3' },
    { characterName: 'アリス', amount: 1080, percentage: 10, color: '#4CAF50' }
  ];

  const efficiency = {
    tokensPerMessage: 23.4,
    averageSessionLength: 18.7,
    peakHour: '21:00',
    mostEfficientCharacter: 'ゼン'
  };

  const days = range === 'week' ? 7 : range === 'month' ? 30 : 90;

  const analyticsData = {
    dailyUsage: generateDailyUsage(days),
    weeklyTrend: generateWeeklyTrend(),
    monthlyTrend: generateMonthlyTrend(),
    characterUsage,
    hourlyPattern: generateHourlyPattern(),
    efficiency
  };

  console.log('✅ Token analytics data generated successfully');
  res.json(analyticsData);
});

// Chat Analytics API
app.get('/api/analytics/chats', authenticateToken, (req: Request, res: Response): void => {
  console.log('📊 Chat Analytics API called');
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const range = (req.query.range as string) || 'month';
  
  // Generate mock conversation statistics
  const conversationStats = {
    totalConversations: 124,
    averageLength: 17.3,
    longestStreak: 12,
    currentStreak: 5,
    totalMessages: 2148,
    averageDaily: 4.1
  };

  // Generate daily activity data
  const generateDailyActivity = (days: number) => {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().slice(0, 10),
        conversations: Math.floor(Math.random() * 8) + 2,
        messages: Math.floor(Math.random() * 40) + 10,
        duration: Math.floor(Math.random() * 60) + 15
      });
    }
    return data;
  };

  // Character interaction data
  const characterInteraction = [
    { 
      characterName: 'ルナ', 
      conversations: 45, 
      averageLength: 18.5, 
      emotionalState: 'happy',
      color: '#E91E63' 
    },
    { 
      characterName: 'ミコ', 
      conversations: 32, 
      averageLength: 15.2, 
      emotionalState: 'excited',
      color: '#9C27B0' 
    },
    { 
      characterName: 'ゼン', 
      conversations: 28, 
      averageLength: 22.1, 
      emotionalState: 'loving',
      color: '#2196F3' 
    },
    { 
      characterName: 'アリス', 
      conversations: 19, 
      averageLength: 12.8, 
      emotionalState: 'curious',
      color: '#4CAF50' 
    }
  ];

  // Generate time patterns
  const generateTimePatterns = () => {
    const data = [];
    for (let hour = 0; hour < 24; hour++) {
      const baseConv = hour >= 19 && hour <= 23 ? 8 : 
                      hour >= 12 && hour <= 18 ? 6 : 
                      hour >= 7 && hour <= 11 ? 4 : 2;
      data.push({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        conversations: baseConv + Math.floor(Math.random() * 3),
        averageLength: Math.floor(Math.random() * 10) + 15
      });
    }
    return data;
  };

  // Generate emotional journey
  const generateEmotionalJourney = (days: number) => {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().slice(0, 10),
        happiness: Math.floor(Math.random() * 30) + 70,
        excitement: Math.floor(Math.random() * 40) + 60,
        affection: Math.floor(Math.random() * 25) + 65
      });
    }
    return data;
  };

  // Generate streak history
  const generateStreakHistory = (days: number) => {
    const data = [];
    let currentStreakValue = 0;
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const hasActivity = Math.random() > 0.2;
      
      if (hasActivity) {
        currentStreakValue++;
      } else {
        currentStreakValue = 0;
      }
      
      data.push({
        date: date.toISOString().slice(0, 10),
        streak: currentStreakValue,
        active: hasActivity
      });
    }
    return data;
  };

  // Conversation depth distribution
  const conversationDepth = [
    { range: '1-5メッセージ', count: 15, percentage: 25 },
    { range: '6-15メッセージ', count: 25, percentage: 42 },
    { range: '16-30メッセージ', count: 12, percentage: 20 },
    { range: '31+メッセージ', count: 8, percentage: 13 }
  ];

  const days = range === 'week' ? 7 : range === 'month' ? 30 : 90;

  const analyticsData = {
    conversationStats,
    dailyActivity: generateDailyActivity(days),
    characterInteraction,
    timePatterns: generateTimePatterns(),
    emotionalJourney: generateEmotionalJourney(days),
    streakHistory: generateStreakHistory(days),
    conversationDepth
  };

  console.log('✅ Chat analytics data generated successfully');
  res.json(analyticsData);
});

// Affinity Analytics API
app.get('/api/analytics/affinity', authenticateToken, (req: Request, res: Response): void => {
  console.log('📊 Affinity Analytics API called');
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const range = (req.query.range as string) || 'quarter';
  const character = (req.query.character as string) || 'all';
  
  // Mock character data
  const characters = [
    { name: 'ルナ', color: '#E91E63' },
    { name: 'ミコ', color: '#9C27B0' },
    { name: 'ゼン', color: '#2196F3' },
    { name: 'アリス', color: '#4CAF50' }
  ];

  // Character progress data
  const characterProgress = characters.map((char, index) => ({
    characterName: char.name,
    level: [67, 43, 28, 15][index],
    trustLevel: [85, 72, 45, 32][index],
    intimacyLevel: [78, 65, 38, 25][index],
    experience: [6700, 4300, 2800, 1500][index],
    relationshipType: ['close_friend', 'friend', 'acquaintance', 'stranger'][index],
    emotionalState: ['loving', 'happy', 'excited', 'curious'][index],
    color: char.color,
    firstInteraction: new Date(2024, index + 1, 15).toISOString(),
    lastInteraction: new Date().toISOString(),
    totalConversations: [156, 89, 67, 34][index],
    currentStreak: [8, 3, 1, 0][index],
    maxStreak: [15, 7, 5, 2][index]
  }));

  // Generate level progression over time
  const generateLevelProgression = (days: number) => {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const entry: any = { date: date.toISOString().slice(0, 10) };
      
      characters.forEach((char, index) => {
        const baseLevel = characterProgress[index].level;
        const variation = Math.floor(Math.random() * 5) - 2;
        entry[char.name] = Math.max(0, baseLevel - Math.floor(i / 3) + variation);
      });
      
      data.push(entry);
    }
    return data;
  };

  // Trust correlation data
  const trustCorrelation = characters.map(char => {
    const charProgress = characterProgress.find(cp => cp.characterName === char.name)!;
    return {
      trust: charProgress.trustLevel,
      intimacy: charProgress.intimacyLevel,
      level: charProgress.level,
      characterName: char.name
    };
  });

  // Memory timeline
  const memoryTimeline = [
    {
      date: '2025-01-05',
      event: 'ルナとの初めてのデート',
      characterName: 'ルナ',
      importance: 5,
      type: 'special'
    },
    {
      date: '2025-01-03',
      event: 'ミコへのプレゼント',
      characterName: 'ミコ',
      importance: 4,
      type: 'gift'
    },
    {
      date: '2024-12-25',
      event: 'ゼンとのクリスマス',
      characterName: 'ゼン',
      importance: 5,
      type: 'milestone'
    },
    {
      date: '2024-12-20',
      event: 'アリスとの深い会話',
      characterName: 'アリス',
      importance: 3,
      type: 'conversation'
    }
  ];

  // Gift history
  const giftHistory = [
    {
      date: '2025-01-03',
      characterName: 'ミコ',
      giftType: 'flower',
      giftName: 'バラの花束',
      value: 500,
      impact: 8
    },
    {
      date: '2024-12-24',
      characterName: 'ルナ',
      giftType: 'jewelry',
      giftName: 'ネックレス',
      value: 1200,
      impact: 12
    },
    {
      date: '2024-12-15',
      characterName: 'ゼン',
      giftType: 'book',
      giftName: '詩集',
      value: 300,
      impact: 6
    }
  ];

  // Emotional development
  const emotionalDevelopment = characters.map(char => ({
    character: char.name,
    happy: Math.floor(Math.random() * 30) + 70,
    excited: Math.floor(Math.random() * 25) + 65,
    loving: Math.floor(Math.random() * 35) + 60,
    shy: Math.floor(Math.random() * 20) + 40,
    curious: Math.floor(Math.random() * 30) + 50
  }));

  // Relationship milestones
  const relationshipMilestones = [
    {
      characterName: 'ルナ',
      milestone: '親友レベル到達',
      achievedAt: '2024-11-15',
      level: 50,
      description: 'ルナとの関係が親友レベルに到達しました'
    },
    {
      characterName: 'ミコ',
      milestone: '信頼関係確立',
      achievedAt: '2024-10-20',
      level: 30,
      description: 'ミコからの信頼を得ることができました'
    },
    {
      characterName: 'ゼン',
      milestone: '初回ロック解除',
      achievedAt: '2024-09-10',
      level: 10,
      description: 'ゼンの特別な画像をアンロックしました'
    }
  ];

  const days = range === 'month' ? 30 : range === 'quarter' ? 90 : 365;

  const analyticsData = {
    overallStats: {
      totalCharacters: characters.length,
      averageLevel: Math.floor(characterProgress.reduce((sum, char) => sum + char.level, 0) / characterProgress.length),
      highestLevel: Math.max(...characterProgress.map(char => char.level)),
      totalGiftsGiven: giftHistory.length,
      totalInteractionDays: 127,
      relationshipMilestones: relationshipMilestones.length
    },
    characterProgress: character === 'all' ? characterProgress : characterProgress.filter(cp => cp.characterName.toLowerCase().includes(character)),
    levelProgression: generateLevelProgression(days),
    trustCorrelation,
    memoryTimeline,
    giftHistory,
    emotionalDevelopment,
    relationshipMilestones
  };

  console.log('✅ Affinity analytics data generated successfully');
  res.json(analyticsData);
});

// Purchase History API
app.get('/api/user/purchase-history', authenticateToken, (req: Request, res: Response): void => {
  console.log('🛒 Purchase History API called');
  
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Generate mock purchase history data
  const mockPurchases = [
    {
      _id: 'purchase_001',
      type: 'token',
      amount: 5000,
      price: 1000,
      currency: 'JPY',
      status: 'completed',
      paymentMethod: 'Credit Card',
      date: new Date('2025-01-05T10:15:00Z'),
      details: 'トークンパック: 5,000トークン',
      description: '5,000トークンパック（ボーナス+500トークン）',
      transactionId: 'txn_1234567890',
      invoiceUrl: '/invoices/001'
    },
    {
      _id: 'purchase_002',
      type: 'character',
      amount: 1,
      price: 500,
      currency: 'JPY',
      status: 'completed',
      paymentMethod: 'Credit Card',
      date: new Date('2024-12-20T14:30:00Z'),
      details: 'キャラクター: ルナ',
      description: 'プレミアムキャラクター「ルナ」のアンロック',
      transactionId: 'txn_1234567891',
      invoiceUrl: '/invoices/002'
    },
    {
      _id: 'purchase_003',
      type: 'token',
      amount: 10000,
      price: 1800,
      currency: 'JPY',
      status: 'completed',
      paymentMethod: 'PayPal',
      date: new Date('2024-12-01T09:00:00Z'),
      details: 'トークンパック: 10,000トークン（ボーナス付き）',
      description: '10,000トークンパック（限定ボーナス+2000トークン）',
      transactionId: 'txn_1234567892',
      invoiceUrl: '/invoices/003'
    },
    {
      _id: 'purchase_004',
      type: 'character',
      amount: 1,
      price: 500,
      currency: 'JPY',
      status: 'completed',
      paymentMethod: 'Credit Card',
      date: new Date('2024-11-15T16:45:00Z'),
      details: 'キャラクター: ミコ',
      description: 'プレミアムキャラクター「ミコ」のアンロック',
      transactionId: 'txn_1234567893',
      invoiceUrl: '/invoices/004'
    },
    {
      _id: 'purchase_005',
      type: 'token',
      amount: 2500,
      price: 500,
      currency: 'JPY',
      status: 'completed',
      paymentMethod: 'Bank Transfer',
      date: new Date('2024-11-01T11:20:00Z'),
      details: 'トークンパック: 2,500トークン',
      description: '2,500トークンパック（スタンダード）',
      transactionId: 'txn_1234567894',
      invoiceUrl: '/invoices/005'
    },
    {
      _id: 'purchase_006',
      type: 'token',
      amount: 1000,
      price: 200,
      currency: 'JPY',
      status: 'refunded',
      paymentMethod: 'Credit Card',
      date: new Date('2024-10-20T08:30:00Z'),
      details: 'トークンパック: 1,000トークン（返金済み）',
      description: '1,000トークンパック - 返金処理完了',
      transactionId: 'txn_1234567895',
      invoiceUrl: '/invoices/006'
    }
  ];

  // Calculate summary statistics
  const completedPurchases = mockPurchases.filter(p => p.status === 'completed');
  const totalSpent = completedPurchases.reduce((sum, purchase) => sum + purchase.price, 0);
  
  const tokenPurchases = completedPurchases.filter(p => p.type === 'token');
  const characterPurchases = completedPurchases.filter(p => p.type === 'character');
  const subscriptionPurchases = completedPurchases.filter(p => p.type === 'subscription');

  const summary = {
    tokens: {
      count: tokenPurchases.length,
      amount: tokenPurchases.reduce((sum, p) => sum + p.price, 0)
    },
    characters: {
      count: characterPurchases.length,
      amount: characterPurchases.reduce((sum, p) => sum + p.price, 0)
    },
    subscriptions: {
      count: subscriptionPurchases.length,
      amount: subscriptionPurchases.reduce((sum, p) => sum + p.price, 0)
    }
  };

  const purchaseHistoryData = {
    purchases: mockPurchases,
    totalSpent,
    totalPurchases: mockPurchases.length,
    summary
  };

  console.log('✅ Purchase history data generated successfully');
  res.json(purchaseHistoryData);
});

// GPT-4.1 mini原価モデルバリデーション関数（利益率80%）
const validateTokenPriceRatio = (tokens: number, price: number): boolean => {
  // GPT-4.1 mini原価モデル: 1円あたり約666.67トークンが基準（利益率80%）
  const expectedTokens = Math.floor(price * TOKENS_PER_YEN);
  const tolerance = 0.05; // 5%の許容範囲
  const minTokens = expectedTokens * (1 - tolerance);
  const maxTokens = expectedTokens * (1 + tolerance);
  
  return tokens >= minTokens && tokens <= maxTokens;
};

// Token Packs CRUD API endpoints
app.get('/api/admin/token-packs', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('📦 Token Packs 一覧取得 API called');
  
  if (!req.user || !(req.user as any).isAdmin) {
    res.status(401).json({ error: 'Admin access required' });
    return;
  }

  try {
    // Query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    
    if (isMongoConnected) {
      // MongoDB実装
      console.log('🍃 Using MongoDB for token packs');
      
      // フィルター条件構築
      const filter: any = {};
      if (isActive !== undefined) {
        filter.isActive = isActive;
      }
      
      // ページネーション計算
      const skip = (page - 1) * limit;
      
      // データ取得（並行実行）
      const [tokenPacks, total] = await Promise.all([
        TokenPackModel.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        TokenPackModel.countDocuments(filter)
      ]);
      
      const pagination = {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

      console.log('✅ MongoDB Token Packs 取得完了:', {
        totalPacks: total,
        returnedPacks: tokenPacks.length,
        page,
        isActiveFilter: isActive
      });

      res.json({
        tokenPacks,
        pagination
      });
      
    } else {
      // モック実装（従来通り）
      console.log('🎭 Using mock data for token packs');
      
      // データベースからトークンパックを取得（フィルタリング付き）
      const query: any = {};
      if (isActive !== undefined) {
        query.isActive = isActive;
      }
      const tokenPacks = await TokenPackModel.find(query).sort({ tokens: 1 });
      
      // Pagination
      const total = tokenPacks.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPacks = tokenPacks.slice(startIndex, endIndex);
      
      // Calculate profit margin and token per yen for each pack
      const enrichedPacks = paginatedPacks.map(pack => ({
        ...pack,
        profitMargin: ((pack.tokens - pack.price * 2) / pack.tokens * 100),
        tokenPerYen: pack.tokens / pack.price
      }));
      
      const pagination = {
        total: total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

      console.log('✅ Token Packs データ取得完了:', {
        totalPacks: total,
        returnedPacks: enrichedPacks.length,
        page,
        isActiveFilter: isActive
      });

      res.json({
        tokenPacks: enrichedPacks,
        pagination
      });
    }
    
  } catch (error) {
    console.error('❌ Token Packs 取得エラー:', error);
    console.error('Error details:', {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    res.status(500).json({
      success: false,
      message: 'トークンパック一覧の取得に失敗しました',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// SSE用エンドポイント (購入完了のリアルタイム通知)
app.get('/api/purchase/events/:sessionId', async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;
  
  console.log('🌊 SSE接続開始:', sessionId);
  
  // SSEヘッダー設定
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
  
  try {
    const redis = await getRedisClient();
    let intervalId: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;
    
    // 1秒ごとにRedisをチェック
    intervalId = setInterval(async () => {
      try {
        const purchaseData = await redis.get(`purchase:${sessionId}`);
        
        if (purchaseData) {
          console.log('✅ SSE: 購入データ発見:', purchaseData);
          
          // クライアントにデータを送信
          res.write(`data: ${purchaseData}\n\n`);
          
          // クリーンアップ
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          res.end();
          
          // Redisからデータを削除
          await redis.del(`purchase:${sessionId}`);
          
          return;
        }
      } catch (error) {
        console.error('❌ SSE Redis取得エラー:', error);
      }
    }, 1000);
    
    // 30秒でタイムアウト
    timeoutId = setTimeout(() => {
      console.log('⏰ SSE タイムアウト:', sessionId);
      clearInterval(intervalId);
      res.write(`data: {"error": "timeout"}\n\n`);
      res.end();
    }, 30000);
    
    // クライアント接続が閉じられた場合のクリーンアップ
    req.on('close', () => {
      console.log('🔌 SSE接続終了:', sessionId);
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    });
    
  } catch (error) {
    console.error('❌ SSE初期化エラー:', error);
    res.status(500).json({ error: 'SSE connection failed' });
  }
});

// セッション情報取得API (購入トークン数確認用)
app.get('/api/purchase/session/:sessionId', (req: Request, res: Response): void => {
  const { sessionId } = req.params;
  
  console.log('🔍 Stripe セッション情報取得:', sessionId);
  
  try {
    // セッション情報から商品情報を取得してトークン数を推定
    // 実際の実装では Stripe.checkout.sessions.retrieve(sessionId) を使用
    
    // モック実装: セッションIDからトークン数を推定
    // 実際のトークンパックのpriceIdから逆算
    const tokenPackMap: { [key: string]: number } = {
      'price_1QbxZCJGaR4OtJ6FQlMEHOkn': 833333,    // 5,000円 → 833,333トークン
      'price_1QbxZCJGaR4OtJ6FQlMEHOko': 1666666,   // 10,000円 → 1,666,666トークン  
      'price_1QbxZCJGaR4OtJ6FQlMEHOkp': 3333333,   // 20,000円 → 3,333,333トークン
      'price_1QbxZCJGaR4OtJ6FQlMEHOkq': 5000000    // 30,000円 → 5,000,000トークン
    };
    
    // セッションIDからpriceIdを推定（実装では実際のStripe APIから取得）
    let estimatedTokens = 833333; // デフォルト値
    
    // セッションIDにテスト用のマッピングがある場合はそれを使用
    if (sessionId.includes('test')) {
      estimatedTokens = 833333; // テストセッション用のデフォルト値
    }
    
    console.log('📋 推定購入トークン数:', estimatedTokens);
    
    res.json({
      sessionId,
      tokens: estimatedTokens,
      status: 'completed'
    });
    
  } catch (error) {
    console.error('❌ セッション情報取得エラー:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve session information',
      sessionId
    });
  }
});

app.post('/api/admin/token-packs', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('📦 Token Pack 作成 API called:', req.body);
  
  if (!req.user || !(req.user as any).isAdmin) {
    res.status(401).json({ error: 'Admin access required' });
    return;
  }

  const { 
    name, 
    description, 
    tokens, 
    price, 
    purchaseAmountYen,
    tokensPurchased,
    priceId, 
    isActive = true 
  } = req.body;
  
  // Support both new and legacy field names
  const finalTokens = tokensPurchased || tokens;
  const finalPrice = purchaseAmountYen || price;
  
  // Required fields validation
  if (!name || !finalTokens || !finalPrice) {
    res.status(400).json({ 
      success: false,
      message: '必須フィールドが不足しています (name, tokens/tokensPurchased, price/purchaseAmountYen)' 
    });
    return;
  }
  
  // Type validation
  if (typeof finalTokens !== 'number' || typeof finalPrice !== 'number' || finalTokens <= 0 || finalPrice <= 0) {
    res.status(400).json({ 
      success: false,
      message: 'tokens と price は正の数値である必要があります' 
    });
    return;
  }
  
  // GPT-4.1 mini原価モデルのバリデーション（利益率80%）
  if (!validateTokenPriceRatio(finalTokens, finalPrice)) {
    const expectedTokens = Math.floor(finalPrice * TOKENS_PER_YEN);
    res.status(400).json({ 
      success: false,
      message: `GPT-4.1 mini原価モデル違反: ${finalPrice}円に対して${finalTokens}トークンは適切ではありません。推奨トークン数: 約${expectedTokens.toLocaleString()}トークン（利益率80%設計）` 
    });
    return;
  }

  try {
    if (isMongoConnected) {
      // MongoDB実装
      console.log('🍃 Using MongoDB for token pack creation');
      
      // priceId重複チェック（MongoDB）
      if (priceId) {
        const existingPack = await TokenPackModel.findOne({ priceId });
        if (existingPack) {
          res.status(400).json({ 
            success: false,
            message: 'この priceId は既に使用されています' 
          });
          return;
        }
      }
      
      // MongoDB用データ準備
      const tokenPackData = {
        name,
        description: description || '',
        tokens: finalTokens,
        price: finalPrice,
        priceId: priceId || `price_${Date.now()}`,
        isActive
      };
      
      // MongoDBに保存
      const newTokenPack = new TokenPackModel(tokenPackData);
      const savedPack = await newTokenPack.save();
      
      console.log('✅ MongoDB Token Pack 作成完了:', {
        id: savedPack._id,
        name: savedPack.name,
        profitMargin: savedPack.profitMargin
      });

      res.status(201).json({
        success: true,
        created: savedPack
      });
      
    } else {
      // データベース実装
      console.log('💾 Creating token pack in database');
      
      // Check if priceId already exists
      if (priceId) {
        const existingPack = await TokenPackModel.findOne({ priceId });
        if (existingPack) {
          res.status(400).json({ 
            success: false,
            message: 'この priceId は既に使用されています' 
          });
          return;
        }
      }
      
      // Create new token pack
      const newTokenPack = new TokenPackModel({
        name,
        description: description || '',
        tokens: finalTokens,
        price: finalPrice,
        priceId: priceId || `price_${Date.now()}`,
        isActive
      });
      
      const savedPack = await newTokenPack.save();
      
      console.log('✅ Token Pack 作成完了:', {
        id: savedPack._id,
        name: savedPack.name,
        tokens: savedPack.tokens,
        price: savedPack.price
      });

      res.status(201).json({
        success: true,
        created: savedPack
      });
    }
    
  } catch (error) {
    console.error('❌ Token Pack 作成エラー:', error);
    res.status(500).json({
      success: false,
      message: 'トークンパックの作成に失敗しました'
    });
  }
});

app.get('/api/admin/token-packs/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('📦 Token Pack 詳細取得 API called:', { tokenPackId: req.params.id });
  
  if (!req.user || !(req.user as any).isAdmin) {
    res.status(401).json({ error: 'Admin access required' });
    return;
  }

  const { id } = req.params;
  
  try {
    if (isMongoConnected) {
      // MongoDB実装
      console.log('🍃 Using MongoDB for token pack retrieval');
      
      const tokenPack = await TokenPackModel.findById(id).lean();
      
      if (!tokenPack) {
        res.status(404).json({ 
          success: false,
          message: 'トークンパックが見つかりません' 
        });
        return;
      }

      console.log('✅ MongoDB Token Pack 詳細取得完了:', tokenPack.name);
      res.json(tokenPack);
      
    } else {
      // データベース実装
      console.log('💾 Retrieving token pack from database');
      
      const tokenPack = await TokenPackModel.findById(id);
      
      if (!tokenPack) {
        res.status(404).json({ 
          success: false,
          message: 'トークンパックが見つかりません' 
        });
        return;
      }

      console.log('✅ Token Pack 詳細取得完了:', tokenPack.name);
      res.json(tokenPack);
    }
    
  } catch (error) {
    console.error('❌ Token Pack 詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'トークンパック詳細の取得に失敗しました'
    });
  }
});

app.put('/api/admin/token-packs/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('📦 Token Pack 更新 API called:', { tokenPackId: req.params.id, body: req.body });
  
  if (!req.user || !(req.user as any).isAdmin) {
    res.status(401).json({ error: 'Admin access required' });
    return;
  }

  const { id } = req.params;
  const { name, description, tokens, price, priceId, isActive } = req.body;
  
  try {
    if (isMongoConnected) {
      // MongoDB実装
      console.log('🍃 Using MongoDB for token pack update');
      
      // 既存パック取得
      const existingPack = await TokenPackModel.findById(id);
      if (!existingPack) {
        res.status(404).json({ 
          success: false,
          message: 'トークンパックが見つかりません' 
        });
        return;
      }
      
      // Validate tokens and price if provided
      const newTokens = tokens !== undefined ? tokens : existingPack.tokens;
      const newPrice = price !== undefined ? price : existingPack.price;
      
      if (typeof newTokens !== 'number' || typeof newPrice !== 'number' || newTokens <= 0 || newPrice <= 0) {
        res.status(400).json({ 
          success: false,
          message: 'tokens と price は正の数値である必要があります' 
        });
        return;
      }
      
      // GPT-4.1 mini原価モデルのバリデーション（利益率80%）
      if (!validateTokenPriceRatio(newTokens, newPrice)) {
        const expectedTokens = Math.floor(newPrice * TOKENS_PER_YEN);
        res.status(400).json({ 
          success: false,
          message: `GPT-4.1 mini原価モデル違反: ${newPrice}円に対して${newTokens}トークンは適切ではありません。推奨トークン数: 約${expectedTokens.toLocaleString()}トークン（利益率80%設計）` 
        });
        return;
      }
      
      // priceId重複チェック（MongoDB）
      if (priceId && priceId !== existingPack.priceId) {
        const duplicatePack = await TokenPackModel.findOne({ 
          priceId, 
          _id: { $ne: id } 
        });
        if (duplicatePack) {
          res.status(400).json({ 
            success: false,
            message: 'この priceId は既に他のパックで使用されています' 
          });
          return;
        }
      }
      
      // 更新データ準備
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (tokens !== undefined) updateData.tokens = newTokens;
      if (price !== undefined) updateData.price = newPrice;
      if (priceId !== undefined) updateData.priceId = priceId;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      // MongoDB更新（pre-saveミドルウェアで利益率等を自動計算）
      const updatedPack = await TokenPackModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
      
      console.log('✅ MongoDB Token Pack 更新完了:', {
        id: updatedPack!._id,
        name: updatedPack!.name,
        profitMargin: updatedPack!.profitMargin
      });

      res.json(updatedPack);
      
    } else {
      // データベース実装
      console.log('💾 Updating token pack in database');
      
      const existingPack = await TokenPackModel.findById(id);
      if (!existingPack) {
        res.status(404).json({ 
          success: false,
          message: 'トークンパックが見つかりません' 
        });
        return;
      }
      
      // Validate tokens and price if provided
      const newTokens = tokens !== undefined ? tokens : existingPack.tokens;
      const newPrice = price !== undefined ? price : existingPack.price;
      
      if (typeof newTokens !== 'number' || typeof newPrice !== 'number' || newTokens <= 0 || newPrice <= 0) {
        res.status(400).json({ 
          success: false,
          message: 'tokens と price は正の数値である必要があります' 
        });
        return;
      }
      
      // GPT-4.1 mini原価モデルのバリデーション（利益率80%）
      if (!validateTokenPriceRatio(newTokens, newPrice)) {
        const expectedTokens = Math.floor(newPrice * TOKENS_PER_YEN);
        res.status(400).json({ 
          success: false,
          message: `GPT-4.1 mini原価モデル違反: ${newPrice}円に対して${newTokens}トークンは適切ではありません。推奨トークン数: 約${expectedTokens.toLocaleString()}トークン（利益率80%設計）` 
        });
        return;
      }
      
      // Check if priceId is being changed and already exists elsewhere
      if (priceId && priceId !== existingPack.priceId) {
        const duplicatePack = await TokenPackModel.findOne({ priceId, _id: { $ne: id } });
        if (duplicatePack) {
          res.status(400).json({ 
            success: false,
            message: 'この priceId は既に他のパックで使用されています' 
          });
          return;
        }
      }
      
      // Update token pack
      const updatedPack = await TokenPackModel.findByIdAndUpdate(
        id,
        {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          tokens: newTokens,
          price: newPrice,
          ...(priceId !== undefined && { priceId }),
          ...(isActive !== undefined && { isActive })
        },
        { new: true, runValidators: true }
      );
      
      console.log('✅ Token Pack 更新完了:', {
        id: updatedPack!._id,
        name: updatedPack!.name,
        tokens: updatedPack!.tokens,
        price: updatedPack!.price
      });

      res.json(updatedPack);
    }
    
  } catch (error) {
    console.error('❌ Token Pack 更新エラー:', error);
    res.status(500).json({
      success: false,
      message: 'トークンパックの更新に失敗しました'
    });
  }
});

app.delete('/api/admin/token-packs/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('📦 Token Pack 削除 API called:', { tokenPackId: req.params.id });
  
  if (!req.user || !(req.user as any).isAdmin) {
    res.status(401).json({ error: 'Admin access required' });
    return;
  }

  const { id } = req.params;
  
  try {
    if (isMongoConnected) {
      // MongoDB実装
      console.log('🍃 Using MongoDB for token pack deletion');
      
      const deletedPack = await TokenPackModel.findByIdAndDelete(id);
      
      if (!deletedPack) {
        res.status(404).json({ 
          success: false,
          message: 'トークンパックが見つかりません' 
        });
        return;
      }
      
      console.log('✅ MongoDB Token Pack 削除完了:', deletedPack.name);

      res.json({
        success: true,
        message: `トークンパック「${deletedPack.name}」を削除しました`,
        deletedPack: {
          _id: deletedPack._id,
          name: deletedPack.name
        }
      });
      
    } else {
      // データベース実装
      console.log('💾 Deleting token pack from database');
      
      const tokenPack = await TokenPackModel.findById(id);
      
      if (!tokenPack) {
        res.status(404).json({ 
          success: false,
          message: 'トークンパックが見つかりません' 
        });
        return;
      }
      
      await TokenPackModel.findByIdAndDelete(id);
      
      console.log('✅ Token Pack 削除完了:', tokenPack.name);

      res.json({
        success: true,
        message: `トークンパック「${tokenPack.name}」を削除しました`,
        deletedPack: {
          _id: tokenPack._id,
          name: tokenPack.name
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Token Pack 削除エラー:', error);
    res.status(500).json({
      success: false,
      message: 'トークンパックの削除に失敗しました'
    });
  }
});

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
      
      // GPT-4.1 mini原価モデルに基づくトークン数計算（利益率80%）
      const calculatedTokens = Math.floor(priceInMainUnit * TOKENS_PER_YEN);
      
      // 実際の利益率計算
      const totalCost = calculatedTokens * TOKEN_COST_PER_UNIT; // 総原価
      const profitMargin = ((priceInMainUnit - totalCost) / priceInMainUnit) * 100; // 実際の利益率
      const tokenPerYen = TOKENS_PER_YEN; // 166.66トークン/円
      
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

// Stripe Webhook endpoint for payment completion
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response): Promise<void> => {
  console.log('🔔 Stripe Webhook received');
  
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
        console.log('💳 Checkout session completed:', session.id);
        
        // Extract metadata
        const userId = session.metadata?.userId;
        const priceId = session.metadata?.priceId;
        
        if (!userId) {
          console.error('❌ No userId in session metadata');
          break;
        }
        
        // Get token pack information
        let tokenPack: ITokenPack | null = null;
        if (isMongoConnected && priceId) {
          tokenPack = await TokenPackModel.findOne({ priceId }).lean();
        }
        
        // Calculate tokens based on amount or token pack
        let tokensToAdd = 0;
        if (tokenPack) {
          tokensToAdd = tokenPack.tokens;
          console.log('🎁 Using token pack:', { name: tokenPack.name, tokens: tokensToAdd });
        } else {
          // Fallback: calculate based on amount using GPT-4 cost model
          const amountInYen = session.amount_total || 0;
          tokensToAdd = Math.floor(amountInYen * TOKENS_PER_YEN);
          console.log('🎁 Calculated tokens from amount:', { amountInYen, tokensToAdd });
        }
        
        if (tokensToAdd > 0) {
          // Add tokens to user account
          if (isMongoConnected) {
            let user = await UserModel.findById(userId);
            if (!user) {
              // Create user if doesn't exist
              user = new UserModel({
                _id: userId,
                email: `user_${userId}@example.com`,
                name: `User ${userId}`,
                tokenBalance: tokensToAdd
              });
            } else {
              user.tokenBalance += tokensToAdd;
            }
            await user.save();
            
            console.log('✅ MongoDB: Tokens added successfully', {
              userId,
              tokensAdded: tokensToAdd,
              newBalance: user.tokenBalance
            });
          }
        }
        
        break;
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('💰 Payment succeeded:', paymentIntent.id);
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('❌ Payment failed:', paymentIntent.id);
        break;
      }
      
      default:
        console.log('ℹ️ Unhandled event type:', { eventType: event.type });
    }

    res.json({ received: true, eventType: event.type });
    
  } catch (error) {
    console.error('❌ Webhook処理エラー:', error);
    res.status(400).send(`Webhook Error: ${(error as Error).message}`);
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
          tokensToAdd = Math.floor(amountInYen * TOKENS_PER_YEN);
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
      
      // ユーザーデータを管理画面用の形式に変換
      const formattedUsers = users.map(user => ({
        id: user._id.toString(),
        _id: user._id.toString(),
        name: user.name || 'Unknown User',
        email: user.email || 'no-email@example.com',
        tokenBalance: user.tokenBalance || 0,
        totalSpent: user.totalSpent || 0,
        chatCount: user.totalChatMessages || 0,
        avgIntimacy: user.affinities && user.affinities.length > 0 
          ? user.affinities.reduce((sum: number, aff: any) => sum + (aff.level || 0), 0) / user.affinities.length 
          : 0,
        lastLogin: user.lastLogin || user.createdAt || new Date(),
        status: user.accountStatus || 'active',
        isTrialUser: (user.tokenBalance === 10000 && user.totalSpent === 0),
        violationCount: user.violationCount || 0,
        isActive: user.isActive !== false,
        createdAt: user.createdAt || new Date()
      }));
      
      console.log('✅ MongoDB Users retrieved:', formattedUsers.length);

      res.json({
        users: formattedUsers,
        pagination: {
          total: totalUsers,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalUsers / limitNum)
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
app.put('/api/admin/users/:id/status', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
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
app.delete('/api/admin/users/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
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
      .populate('purchasedCharacters', 'name');

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'ユーザーが見つかりません'
      });
      return;
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      tokenBalance: user.tokenBalance,
      chatCount: user.totalChatMessages,
      avgIntimacy: user.affinities.length > 0 
        ? user.affinities.reduce((sum, aff) => sum + aff.level, 0) / user.affinities.length 
        : 0,
      totalSpent: user.totalSpent,
      status: user.accountStatus,
      isTrialUser: user.tokenBalance === 10000 && user.totalSpent === 0,
      loginStreak: user.loginStreak,
      maxLoginStreak: user.maxLoginStreak,
      violationCount: user.violationCount,
      registrationDate: user.registrationDate,
      lastLogin: user.lastLogin,
      suspensionEndDate: user.suspensionEndDate,
      banReason: user.banReason,
      unlockedCharacters: user.purchasedCharacters,
      affinities: user.affinities.map(aff => ({
        characterId: aff.character,
        level: aff.level,
        totalConversations: aff.totalConversations,
        relationshipType: aff.relationshipType,
        trustLevel: aff.trustLevel
      }))
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

const swaggerDocument = YAML.load(path.resolve(__dirname, '../../docs/openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

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
app.delete('/api/admin/cache/character/:characterId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
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

app.listen(PORT, () => {
  console.log('✅ Server is running on:', { port: PORT, url: `http://localhost:${PORT}` });
});
