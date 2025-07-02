import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import log from '../utils/logger';
import { UserModel } from '../models/UserModel';
import { CharacterModel } from '../models/CharacterModel';
import { ChatModel } from '../models/ChatModel';
import { createRateLimiter } from '../middleware/rateLimiter';
import CharacterPromptCache from '../../models/CharacterPromptCache';
import TokenUsage from '../../models/TokenUsage';
import { getRedisClient } from '../../lib/redis';
import mongoose from 'mongoose';

const router = Router();

// レートリミッターを作成
const generalRateLimit = createRateLimiter('general');

// Debug endpoint to check authentication and cookies
router.get('/auth-status', generalRateLimit, (req: Request, res: Response) => {
  log.info('🔍 AUTH STATUS CHECK', {
    cookies: req.cookies,
    headers: {
      cookie: req.headers.cookie,
      origin: req.headers.origin,
      referer: req.headers.referer,
      host: req.headers.host,
      'x-forwarded-host': req.headers['x-forwarded-host'],
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'x-real-ip': req.headers['x-real-ip']
    }
  });

  res.json({
    cookies: req.cookies,
    hasCookies: !!req.cookies && Object.keys(req.cookies).length > 0,
    hasAdminToken: !!req.cookies?.adminAccessToken,
    hasUserToken: !!req.cookies?.userAccessToken,
    headers: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      host: req.headers.host
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      cookieDomain: process.env.COOKIE_DOMAIN
    }
  });
});

// Test authenticated endpoint
router.get('/auth-test', generalRateLimit, authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    authenticated: true,
    user: req.user ? {
      id: req.user._id,
      email: req.user.email,
      isAdmin: (req.user as any).isAdmin
    } : null,
    admin: req.admin ? {
      id: req.admin._id,
      email: req.admin.email,
      role: req.admin.role
    } : null
  });
});

// 管理者認証テスト用エンドポイント（/admin/パスを含む）
router.get('/admin/auth-test', generalRateLimit, authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    authenticated: true,
    path: req.path,
    isAdminPath: req.path.includes('/admin/'),
    user: req.user ? {
      id: req.user._id,
      email: req.user.email,
      isAdmin: (req.user as any).isAdmin
    } : null,
    admin: req.admin ? {
      id: req.admin._id,
      email: req.admin.email,
      role: req.admin.role
    } : null
  });
});

// デバッグ用のルート一覧
router.get('/routes', generalRateLimit, (req: Request, res: Response) => {
  const routes: any[] = [];
  
  const extractRoutes = (app: any, basePath = '') => {
    if (app._router && app._router.stack) {
      app._router.stack.forEach((middleware: any) => {
        if (middleware.route) {
          // ルートが定義されている場合
          const path = basePath + middleware.route.path;
          const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
          routes.push({ path, methods });
        } else if (middleware.name === 'router' && middleware.handle.stack) {
          // サブルーターの場合
          const subPath = basePath + (middleware.regexp.source.replace(/\\/g, '').replace(/\^|\$/g, '').replace(/\(\?\:\/\)/g, '/') || '');
          middleware.handle.stack.forEach((handler: any) => {
            if (handler.route) {
              const path = subPath + handler.route.path;
              const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
              routes.push({ path, methods });
            }
          });
        }
      });
    }
  };
  
  // Express appからルートを抽出
  const app = req.app;
  extractRoutes(app);
  
  res.json({
    totalRoutes: routes.length,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path))
  });
});

// Auth関連のルートを確認するエンドポイント
router.get('/auth-routes', generalRateLimit, (req: Request, res: Response) => {
  const routes: any[] = [];
  
  const extractRoutes = (app: any, basePath = '') => {
    if (app._router && app._router.stack) {
      app._router.stack.forEach((middleware: any) => {
        if (middleware.route) {
          const path = basePath + middleware.route.path;
          const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
          if (path.includes('auth')) {
            routes.push({ path, methods });
          }
        } else if (middleware.name === 'router' && middleware.handle.stack) {
          const subPath = basePath + (middleware.regexp.source.replace(/\\/g, '').replace(/\^|\$/g, '').replace(/\(\?\:\/\)/g, '/') || '');
          middleware.handle.stack.forEach((handler: any) => {
            if (handler.route) {
              const path = subPath + handler.route.path;
              const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
              if (path.includes('auth')) {
                routes.push({ path, methods });
              }
            }
          });
        }
      });
    }
  };
  
  const app = req.app;
  extractRoutes(app);
  
  res.json({
    message: 'Auth routes found in the application',
    totalAuthRoutes: routes.length,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
    expectedVerifyEmailRoute: '/api/v1/auth/verify-email'
  });
});

// デバッグ用：親密度詳細情報取得
router.get('/affinity-details/:userId', generalRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    const user = await UserModel.findOne({ _id: { $eq: new mongoose.Types.ObjectId(userId) } })
      .select('affinities')
      .populate({
        path: 'affinities.character',
        select: '_id name imageCharacterSelect themeColor galleryImages'
      })
      .lean();
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    // 各親密度の詳細情報を整形
    const detailedAffinities = (user.affinities || []).map((affinity: any) => {
      const unlockedImages = [];
      if (affinity.character && affinity.character.galleryImages) {
        // レベルに基づいて解放された画像を計算
        for (const image of affinity.character.galleryImages) {
          if (image.unlockLevel <= affinity.level) {
            unlockedImages.push(image);
          }
        }
      }
      
      return {
        characterId: affinity.character?._id || affinity.character,
        characterName: affinity.character?.name || 'Unknown',
        characterImage: affinity.character?.imageCharacterSelect || '/uploads/placeholder.png',
        themeColor: affinity.character?.themeColor || '#8B5CF6',
        level: affinity.level || 0,
        experience: affinity.experience || 0,
        experienceToNext: affinity.experienceToNext || 10,
        maxExperience: 100, // 固定値
        unlockedImagesCount: unlockedImages.length,
        unlockedImages: unlockedImages,
        nextUnlockLevel: Math.floor((affinity.level || 0) / 10 + 1) * 10,
        rawCharacterData: affinity.character
      };
    });
    
    res.json({
      userId,
      affinitiesCount: user.affinities?.length || 0,
      affinities: detailedAffinities
    });
    
  } catch (error) {
    console.error('Debug affinity details error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 管理者用チャットシステム診断エンドポイント
router.get('/admin/chat-diagnostics/:characterId', generalRateLimit, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 管理者権限チェック
    const isAdminPath = req.originalUrl?.includes('/admin/');
    if (!isAdminPath || !req.admin) {
      res.status(403).json({ 
        error: 'Forbidden',
        message: '管理者権限が必要です'
      });
      return;
    }

    const { characterId } = req.params;
    const { userId } = req.query; // オプション：特定ユーザーの診断
    
    // パラメータのサニタイズと検証
    if (!mongoose.Types.ObjectId.isValid(characterId)) {
      res.status(400).json({ error: 'Invalid character ID' });
      return;
    }
    
    if (userId && !mongoose.Types.ObjectId.isValid(userId as string)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }
    
    const character = await CharacterModel.findOne({ _id: { $eq: new mongoose.Types.ObjectId(characterId) } });
    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    // MongoDBとRedisの接続状態を確認
    const isMongoConnected = mongoose.connection.readyState === 1;
    
    // ユーザーごとのチャット統計を取得
    let users = [];
    if (!userId) {
      // 全ユーザーの統計を取得
      const chatsWithUsers = await ChatModel.find({ 
        characterId: new mongoose.Types.ObjectId(characterId) 
      })
        .populate({
          path: 'userId',
          select: 'name email',
          model: UserModel
        })
        .sort({ lastActivityAt: -1 })
        .limit(50); // 最新50件まで
        
      log.info('Chats with users populated', {
        characterId,
        totalChats: chatsWithUsers.length,
        sampleChat: chatsWithUsers[0] ? {
          hasUserId: !!chatsWithUsers[0].userId,
          userIdType: typeof chatsWithUsers[0].userId,
          hasName: !!(chatsWithUsers[0].userId as any)?.name
        } : null
      });
        
      // userIdがnullやundefinedのチャットを除外
      const validChats = chatsWithUsers.filter(chat => chat.userId != null);
      
      users = await Promise.all(validChats.map(async (chat) => {
        // populateされたuserIdオブジェクトを安全に扱う
        const userDoc = chat.userId as any;
        
        // userIdがnullやundefinedの場合はスキップ
        if (!userDoc) {
          log.warn('Chat with null userId found', { chatId: chat._id });
          return null;
        }
        
        const userIdStr = typeof userDoc === 'string' ? userDoc : (userDoc._id?.toString() || userDoc.toString());
        
        // populateが失敗している場合は手動で取得
        let userName = 'Unknown';
        let userEmail = 'Unknown';
        
        if (typeof userDoc === 'object' && userDoc.name) {
          // populateが成功している場合
          userName = userDoc.name || 'Unknown';
          userEmail = userDoc.email || 'Unknown';
        } else {
          // populateが失敗している場合、手動でユーザー情報を取得
          try {
            const userInfo = await UserModel.findOne({ _id: { $eq: new mongoose.Types.ObjectId(userIdStr) } }).select('name email');
            if (userInfo) {
              userName = userInfo.name || 'Unknown';
              userEmail = userInfo.email || 'Unknown';
            }
          } catch (err) {
            log.warn('Failed to fetch user info', { userIdStr, error: err });
          }
        }
        
        // UserModelからaffinity情報を取得
        const user = await UserModel.findOne({ _id: { $eq: new mongoose.Types.ObjectId(userIdStr) } });
        const affinity = user?.affinities?.find(
          (aff: any) => aff.character?.toString() === characterId
        );
        
        return {
          userId: userIdStr,
          userName: userName,
          userEmail: userEmail,
          affinityLevel: affinity?.level || 0,
          lastInteraction: chat.lastActivityAt,
          messageCount: chat.messages?.length || 0,
          totalTokensUsed: chat.messages?.reduce((sum: number, msg: any) => 
            sum + (msg.tokensUsed || 0), 0) || 0
        };
      }));
      
      // nullをフィルタリング
      users = users.filter(user => user !== null);
    }

    // 特定ユーザーまたは全体のチャット情報を取得
    // MongoDBのObjectIdとして安全にクエリを構築
    const chatQuery: any = { 
      characterId: new mongoose.Types.ObjectId(characterId) 
    };
    
    if (userId) {
      chatQuery.userId = new mongoose.Types.ObjectId(userId as string);
    }
    
    const chat = await ChatModel.findOne(chatQuery).sort({ createdAt: -1 });
    
    // キャッシュ状態を確認（MongoDBとRedis両方チェック）
    let cacheStatus = {
      enabled: true,
      exists: false,
      data: null as any,
      count: 0,
      mongoCache: null as any,
      redisCache: null as any
    };

    try {
      // デバッグログ
      log.info('Cache check start', { userId, characterId });
      
      // 1. MongoDBキャッシュをチェック（優先）
      if (userId) {
        // ユーザーの親密度レベルを取得
        // userIdは既に検証済み（mongoose.Types.ObjectId.isValid）
        const user = await UserModel.findOne({ _id: { $eq: new mongoose.Types.ObjectId(userId as string) } });
        let userAffinityLevel = 0;
        if (user) {
          const affinity = user.affinities?.find(
            (aff: any) => aff.character?.toString() === characterId
          );
          userAffinityLevel = affinity?.level || 0;
        }
        
        log.info('User affinity level', { userId, characterId, userAffinityLevel });
        
        // まず、TTLを無視して全キャッシュを確認（デバッグ用）
        const allCaches = await CharacterPromptCache.find({
          userId: { $eq: userId },
          characterId: { $eq: characterId }
        }).limit(5);
        
        log.info('All caches for user/character (ignoring TTL)', {
          userId,
          characterId,
          totalFound: allCaches.length,
          caches: allCaches.map(c => ({
            affinityLevel: c.promptConfig?.affinityLevel,
            ttl: c.ttl,
            expired: c.ttl < new Date(),
            useCount: c.useCount,
            lastUsed: c.lastUsed
          }))
        });
        
        // キャッシュ検索（親密度レベル±10で検索、範囲を広げる）
        const affinityRange = 10;
        const cachedPrompts = await CharacterPromptCache.find({
          userId: { $eq: userId },
          characterId: { $eq: characterId },
          'promptConfig.affinityLevel': {
            $gte: Math.max(0, userAffinityLevel - affinityRange),
            $lte: Math.min(100, userAffinityLevel + affinityRange)
          },
          ttl: { $gt: new Date() } // TTL未期限切れ
        }).sort({ 
          useCount: -1, // 使用回数順
          lastUsed: -1  // 最終使用日順
        }).limit(1);
        
        log.info('MongoDB cache search result', { 
          userId, 
          characterId, 
          found: cachedPrompts.length,
          searchCriteria: {
            affinityRange: [Math.max(0, userAffinityLevel - affinityRange), Math.min(100, userAffinityLevel + affinityRange)]
          }
        });
        
        const cachedPrompt = cachedPrompts[0];
        if (cachedPrompt) {
          cacheStatus.exists = true;
          cacheStatus.mongoCache = {
            useCount: cachedPrompt.useCount || 0,
            lastUsed: cachedPrompt.lastUsed,
            ttl: cachedPrompt.ttl,
            affinityLevel: cachedPrompt.promptConfig?.affinityLevel || userAffinityLevel,
            promptLength: cachedPrompt.systemPrompt?.length || 0,
            languageCode: cachedPrompt.promptConfig?.languageCode || 'ja'
          };
          cacheStatus.data = cacheStatus.mongoCache;
        }
      } else {
        // ユーザーIDがない場合は、キャラクターの全キャッシュから最新のものを取得
        const cachedPrompts = await CharacterPromptCache.find({
          characterId: { $eq: characterId },
          ttl: { $gt: new Date() }
        }).sort({ 
          lastUsed: -1  // 最終使用日順
        }).limit(5); // 最新5件
        
        log.info('MongoDB cache search without userId', { 
          characterId, 
          found: cachedPrompts.length 
        });
        
        if (cachedPrompts.length > 0) {
          const cachedPrompt = cachedPrompts[0];
          cacheStatus.exists = true;
          cacheStatus.mongoCache = {
            useCount: cachedPrompts.reduce((sum, p) => sum + (p.useCount || 0), 0),
            lastUsed: cachedPrompt.lastUsed,
            ttl: cachedPrompt.ttl,
            affinityLevel: cachedPrompt.promptConfig?.affinityLevel || 0,
            promptLength: cachedPrompt.systemPrompt?.length || 0,
            languageCode: cachedPrompt.promptConfig?.languageCode || 'ja',
            recentCaches: cachedPrompts.length
          };
          cacheStatus.data = cacheStatus.mongoCache;
        }
      }
      
      // 全体のMongoDBキャッシュ数を取得
      cacheStatus.count = await CharacterPromptCache.countDocuments({
        characterId: { $eq: characterId },
        ttl: { $gt: new Date() }
      });
      
      log.info('Total cache count', { characterId, count: cacheStatus.count });
      
      // 2. Redisキャッシュもチェック（フォールバック）
      const redisClient = await getRedisClient();
      if (redisClient) {
        if (userId) {
          const cacheKey = `prompt:${userId}:${characterId}`;
          const cachedPrompt = await redisClient.get(cacheKey);
          if (cachedPrompt) {
            const parsed = JSON.parse(cachedPrompt);
            cacheStatus.redisCache = {
              useCount: parsed.useCount || 0,
              lastUsed: parsed.lastUsed || 'N/A',
              ttl: await redisClient.ttl(cacheKey),
              affinityLevel: parsed.affinityLevel || 0,
              promptLength: parsed.prompt?.length || 0
            };
            // MongoDBキャッシュがない場合はRedisを使用
            if (!cacheStatus.exists) {
              cacheStatus.exists = true;
              cacheStatus.data = cacheStatus.redisCache;
            }
          }
        }
      }
    } catch (cacheError) {
      log.warn('Cache check failed', cacheError);
    }

    // 最新のトークン使用情報を取得
    const recentTokenUsageQuery: any = { 
      characterId: new mongoose.Types.ObjectId(characterId) 
    };
    
    if (userId) {
      recentTokenUsageQuery.userId = new mongoose.Types.ObjectId(userId as string);
    }
    
    const recentTokenUsage = await TokenUsage.findOne(recentTokenUsageQuery)
      .sort({ createdAt: -1 });

    // プロンプト情報を取得
    const promptInfo = {
      personalityPrompt: character.personalityPrompt || null,
      characterInfo: {
        age: character.age || 'N/A',
        occupation: character.occupation || 'N/A',
        personalityPreset: character.personalityPreset || 'default',
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
          isActive: character.isActive || false,
          updatedAt: character.updatedAt
        },
        chat: {
          exists: !!chat,
          messageCount: chat?.messages?.length || 0,
          totalTokensUsed: chat?.messages?.reduce((sum: number, msg: any) => 
            sum + (msg.tokensUsed || 0), 0) || 0,
          lastActivity: chat?.lastActivityAt || 'N/A',
          createdAt: chat?.createdAt || 'N/A',
          recentMessages: chat?.messages?.slice(-5).map((msg: any) => ({
            role: msg.role,
            timestamp: msg.timestamp,
            tokensUsed: msg.tokensUsed || 0,
            contentPreview: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '')
          })) || [],
          conversationHistory: {
            description: 'AI記憶システム（最新10メッセージ）',
            sentToAI: chat?.messages?.slice(-10).map((msg: any) => ({
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
        },
        users: users // 管理者用：全ユーザーリスト
      }
    });
  } catch (error) {
    log.error('Admin chat diagnostics error', error);
    res.status(500).json({ 
      error: 'Diagnostics failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 実際に送信されるプロンプトのプレビューを取得
router.get('/admin/prompt-preview/:characterId', generalRateLimit, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { characterId } = req.params;
    const { userId, message = 'こんにちは！今日はどんな一日でしたか？' } = req.query;

    // キャラクター情報を取得
    const character = await CharacterModel.findOne({ _id: { $eq: new mongoose.Types.ObjectId(characterId) } });
    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    // ユーザー情報と親密度を取得
    let affinityLevel = 0;
    let userName = 'ゲスト';
    if (userId) {
      const user = await UserModel.findOne({ _id: { $eq: new mongoose.Types.ObjectId(userId as string) } });
      if (user) {
        const affinity = user.affinities?.find(
          (aff: any) => aff.character?.toString() === characterId
        );
        affinityLevel = affinity?.level || 0;
        userName = user.name || 'ユーザー';
      }
    }

    // トーンとムード設定を取得
    const { generateTonePrompt } = await import('../../utils/toneSystem');
    const toneConfig = generateTonePrompt(affinityLevel, [], '');

    // 実際のチャットAPIと同じプロンプト生成ロジックを使用
    const personalityPrompt = character.personalityPrompt?.ja || character.personalityPrompt || '';
    
    // キャラクターの基本プロンプト
    let systemPrompt = `あなたは「${character.name?.ja || character.name}」という名前のAIキャラクターです。

【基本設定】
- 年齢: ${character.age || '不明'}
- 職業: ${character.occupation || '不明'}
- 性格: ${character.personalityTags?.join(', ') || 'なし'}

【パーソナリティ】
${personalityPrompt}

【話し相手について】
あなたが会話している相手の名前は「${userName}」です。会話の中で自然に名前を呼んであげてください。

【親密度と口調】
現在の親密度レベル: ${affinityLevel}
${affinityLevel >= 85 ? '恋人のように甘く親密な口調で話してください。愛情表現や特別な呼び方を使ってください。' :
  affinityLevel >= 60 ? '親友のようにフレンドリーで親しみやすい口調で話してください。冗談を交えたり、タメ口を使ってください。' :
  affinityLevel >= 40 ? '時々タメ口を交えた親しみやすい口調で話してください。距離感が縮まってきた感じを表現してください。' :
  affinityLevel >= 20 ? '少しだけ砕けた丁寧語で話してください。堅苦しさを減らしつつ、まだ適度な距離感を保ってください。' :
  '丁寧語で礼儀正しい口調で話してください。初対面の相手に接するような適切な距離感を保ってください。'}

【会話スタンス】
- 自然で人間らしい会話を心がけてください
- 相手の感情に寄り添い、共感的に応答してください
- 長すぎる応答は避け、会話のキャッチボールを意識してください
- 適度に質問を投げかけて、会話を盛り上げてください

【応答の指針】
1. メッセージは2-3文程度を目安にしてください
2. 絵文字や顔文字を適度に使ってください
3. ユーザーの名前を自然に呼んでください
4. 親密度に応じた適切な距離感を保ってください

会話を楽しんでください！`;

    // OpenAI APIに送信される実際のメッセージ配列
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: message as string
      }
    ];

    // プロンプトのトークン数を概算（1文字 ≈ 0.5トークン for Japanese）
    const estimatedTokens = {
      systemPrompt: Math.ceil(systemPrompt.length * 0.5),
      userMessage: Math.ceil((message as string).length * 0.5),
      total: Math.ceil((systemPrompt.length + (message as string).length) * 0.5)
    };

    res.json({
      preview: {
        character: {
          id: character._id,
          name: character.name,
          model: character.aiModel || 'gpt-4o-mini'
        },
        user: {
          id: userId || null,
          name: userName,
          affinityLevel
        },
        tone: {
          style: toneConfig.toneStyle,
          label: toneConfig.toneLabel,
          relationshipStatus: toneConfig.relationshipStatus,
          uiColor: toneConfig.uiColor
        },
        prompt: {
          system: systemPrompt,
          systemLength: systemPrompt.length,
          messages: messages,
          totalLength: systemPrompt.length + (message as string).length
        },
        tokens: estimatedTokens,
        cost: {
          model: character.aiModel || 'gpt-4o-mini',
          estimatedInputTokens: estimatedTokens.total,
          estimatedCost: `約 $${(estimatedTokens.total * 0.00015).toFixed(4)}` // GPT-4o-mini pricing
        }
      }
    });
  } catch (error) {
    log.error('Prompt preview error', error);
    res.status(500).json({ 
      error: 'Failed to generate prompt preview',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ユーザー用チャットシステム診断エンドポイント（既存）
router.get('/chat-diagnostics/:characterId', generalRateLimit, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { characterId } = req.params;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // 1. キャラクター情報とモデル設定
    const character = await CharacterModel.findOne({ _id: { $eq: new mongoose.Types.ObjectId(characterId) } });
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
      const user = userId ? await UserModel.findOne({ _id: { $eq: new mongoose.Types.ObjectId(userId) } }) : null;
      let userAffinityLevel = 0;
      if (user) {
        const affinity = user.affinities.find(
          aff => aff.character.toString() === characterId
        );
        userAffinityLevel = affinity?.level || 0;
      }
      
      // キャッシュ検索（親密度レベル±5で検索）
      const affinityRange = 5; // API消費を抑えるため範囲を広めに設定
      const cachedPrompts = await CharacterPromptCache.find({
        userId: { $eq: userId },
        characterId: { $eq: characterId },
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
          characterId: { $eq: characterId },
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

    // MongoDB接続状態を確認
    const isMongoConnected = mongoose.connection.readyState === 1;

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

export default router;