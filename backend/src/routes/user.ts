import type { AuthRequest } from '../types/express';
import { Router, Response } from 'express';
import { UserModel } from '../models/UserModel';
import { CharacterModel } from '../models/CharacterModel';
import { ChatModel } from '../models/ChatModel';
import { PurchaseHistoryModel } from '../models/PurchaseHistoryModel';
import { authenticateToken } from '../middleware/auth';
import { sendErrorResponse, ClientErrorCode, mapErrorToClientCode } from '../utils/errorResponse';
import log from '../utils/logger';
import { createRateLimiter } from '../middleware/rateLimiter';
import mongoose from 'mongoose';

const router: Router = Router();

// レートリミッターを作成
const generalRateLimit = createRateLimiter('general');

// ユーザープロフィール取得
router.get('/profile', generalRateLimit, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
    }

    const user = await UserModel.findById(userId)
      .select('-password')
      .populate('purchasedCharacters', '_id name')
      .populate('affinities.character', '_id name')
      .populate('selectedCharacter', '_id name');
      
    if (!user) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND);
      return;
    }

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        tokenBalance: user.tokenBalance,
        preferredLanguage: user.preferredLanguage,
        emailVerified: user.emailVerified,
        isSetupComplete: user.isSetupComplete,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        purchasedCharacters: user.purchasedCharacters || [],
        affinities: user.affinities || [],
        selectedCharacter: user.selectedCharacter || null
      }
    });

  } catch (error) {
    const errorCode = mapErrorToClientCode(error);
    sendErrorResponse(res, 500, errorCode, error);
  }
});

// ダッシュボード情報取得
router.get('/dashboard', generalRateLimit, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    log.info('🚀 USER ROUTES DASHBOARD API CALLED');
    const userId = req.user?._id;
    if (!userId) {
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
    }

    // ユーザー情報取得 - lean()を使用して生のJavaScriptオブジェクトとして取得
    const user = await UserModel.findById(userId)
      .select('-password')
      .lean();
    
    if (!user) {
      sendErrorResponse(res, 404, ClientErrorCode.NOT_FOUND);
      return;
    }
    
    // affinitiesフィールドの検証
    if (!user.affinities) {
      log.warn('User affinities field is missing:', {
        userId: user._id.toString(),
        userFields: Object.keys(user)
      });
      user.affinities = [];
    }
    
    // 親密度データを常に別のクエリで取得（populate含む）
    log.info('Fetching affinities with populate');
    const userWithAffinities = await UserModel.findById(userId)
      .select('affinities')
      .populate('affinities.character', '_id name imageCharacterSelect imageChatAvatar')
      .lean();
    
    if (userWithAffinities && userWithAffinities.affinities) {
      log.info('Found affinities in separate query:', {
        count: userWithAffinities.affinities.length,
        firstAffinity: userWithAffinities.affinities[0],
        hasCharacterData: !!(userWithAffinities.affinities[0]?.character && typeof userWithAffinities.affinities[0].character === 'object')
      });
      user.affinities = userWithAffinities.affinities;
    }

    // 購入済みキャラクター取得
    const purchasedCharacters = await CharacterModel.find({
      _id: { $in: user.purchasedCharacters || [] }
    }).select('name imageChatAvatar purchasePrice');

    // 購入履歴を取得（最新20件）
    const purchaseHistory = await PurchaseHistoryModel.getUserPurchaseHistory(
      new mongoose.Types.ObjectId(userId),
      { limit: 20, status: 'completed', sortOrder: 'desc' }
    );

    // 最近のチャット取得（最新5件）
    let recentChats = [];
    try {
      recentChats = await ChatModel.find({ userId })
        .sort({ lastActivityAt: -1 })
        .limit(5)
        .populate('characterId', 'name imageChatAvatar');
      
      // populateが失敗したチャットをフィルタリング
      recentChats = recentChats.filter(chat => chat && chat.characterId);
    } catch (chatError) {
      log.error('Failed to fetch recent chats:', chatError);
      recentChats = [];
    }

    // チャット統計を計算
    const chats = await ChatModel.find({ userId });
    let totalMessages = 0;
    let totalTokensUsed = 0;
    const characterMessageCount: { [key: string]: number } = {};
    const characterTokensUsed: { [key: string]: number } = {}; // キャラクターごとのトークン使用量
    
    chats.forEach(chat => {
      totalMessages += chat.messages.length;
      totalTokensUsed += chat.totalTokensUsed;
      const charId = chat.characterId.toString();
      characterMessageCount[charId] = (characterMessageCount[charId] || 0) + chat.messages.length;
      characterTokensUsed[charId] = (characterTokensUsed[charId] || 0) + chat.totalTokensUsed;
    });

    // お気に入りキャラクター（最も多くメッセージを送ったキャラクター）
    let favoriteCharacterId = null;
    let maxMessages = 0;
    for (const [charId, count] of Object.entries(characterMessageCount)) {
      if (count > maxMessages) {
        maxMessages = count;
        favoriteCharacterId = charId;
      }
    }
    
    // デバッグログ：affinities データを確認
    log.info('Dashboard - Final affinities data:', {
      userId: user._id.toString(),
      affinitiesCount: user.affinities?.length || 0,
      affinitiesData: user.affinities
    });

    let favoriteCharacter = null;
    if (favoriteCharacterId) {
      favoriteCharacter = await CharacterModel.findById(favoriteCharacterId)
        .select('name imageChatAvatar');
    }

    // アクティブなチャット数
    const activeChatsCount = await ChatModel.countDocuments({ 
      userId,
      lastActivity: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 過去7日間
    });

    // レスポンス構築
    const dashboardData = {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        tokenBalance: user.tokenBalance,
        isSetupComplete: user.isSetupComplete
      },
      tokens: {
        balance: user.tokenBalance || 0,
        totalPurchased: 0, // TODO: 実装が必要
        totalUsed: totalTokensUsed,
        recentUsage: [] // TODO: 実装が必要
      },
      stats: {
        totalMessages: totalMessages,
        totalTokensUsed: totalTokensUsed,
        favoriteCharacter: favoriteCharacter ? {
          _id: favoriteCharacter._id,
          name: favoriteCharacter.name,
          displayName: favoriteCharacter.name,
          profileImage: (favoriteCharacter as any).imageChatAvatar
        } : null,
        activeChats: activeChatsCount
      },
      affinities: user.affinities ? user.affinities.map((affinity: any) => {
        // デバッグ: affinity.characterの内容を確認
        log.info('Processing affinity:', {
          characterId: affinity.character?._id || affinity.character,
          characterType: typeof affinity.character,
          hasName: !!affinity.character?.name,
          characterData: affinity.character
        });
        
        // キャラクターIDを取得
        const charId = affinity.character?._id || affinity.character;
        const charIdString = charId?.toString();
        
        // このキャラクターの実際のトークン使用量を経験値として使用
        const actualExperience = charIdString && characterTokensUsed[charIdString] 
          ? characterTokensUsed[charIdString] 
          : (affinity.experience || 0);
        
        return {
          character: affinity.character ? {
            _id: affinity.character._id || affinity.character,
            name: affinity.character.name || { ja: 'Unknown', en: 'Unknown' },
            imageCharacterSelect: affinity.character.imageCharacterSelect || affinity.character.imageChatAvatar || '/uploads/placeholder.png'
          } : null,
        level: affinity.level || 0,
        experience: actualExperience, // 実際のトークン使用量を経験値として使用
        experienceToNext: affinity.experienceToNext || 10,
        maxExperience: 1000, // チャット画面と統一（固定値）
        emotionalState: affinity.emotionalState || 'neutral',
        relationshipType: affinity.relationshipType || 'stranger',
        trustLevel: affinity.trustLevel || 0,
        intimacyLevel: affinity.intimacyLevel || 0,
        totalConversations: affinity.totalConversations || 0,
        totalMessages: affinity.totalMessages || 0,
        lastInteraction: affinity.lastInteraction || null,
        currentStreak: affinity.currentStreak || 0,
        maxStreak: affinity.maxStreak || 0,
        unlockedRewards: affinity.unlockedRewards || [],
        unlockedImages: affinity.unlockedImages || [], // 解放済み画像のリスト
        nextRewardLevel: affinity.nextRewardLevel || 10,
        nextUnlockLevel: Math.floor((affinity.level || 0) / 10 + 1) * 10 // 次の画像解放レベル
        };
      }) : [],
      notifications: [], // TODO: 実装が必要
      badges: [], // TODO: 実装が必要
      recentChats: recentChats.map(chat => {
        const character = chat.characterId as any;
        if (!character) {
          log.warn('Chat has no characterId:', { chatId: chat._id });
          return null;
        }
        return {
          _id: chat._id,
          character: {
            _id: character._id || chat.characterId,
            name: character.name || { ja: 'Unknown', en: 'Unknown' },
            imageCharacterSelect: character.imageChatAvatar || '/uploads/placeholder.png'
          },
          lastMessage: chat.messages && chat.messages.length > 0 
            ? chat.messages[chat.messages.length - 1].content 
            : 'チャットを開始しましょう',
          lastMessageAt: chat.lastActivityAt,
          messageCount: chat.messages?.length || 0
        };
      }).filter(chat => chat !== null),
      purchasedCharacters: purchasedCharacters.map(char => ({
        _id: char._id,
        name: char.name,
        displayName: char.name,
        profileImage: (char as any).imageChatAvatar,
        price: (char as any).purchasePrice || 0
      })),
      purchaseHistory: purchaseHistory.map(purchase => ({
        type: purchase.type,
        amount: purchase.amount,
        date: purchase.createdAt,
        details: purchase.details,
        price: purchase.price,
        status: purchase.status
      }))
    };

    res.json(dashboardData);

  } catch (error) {
    log.error('Dashboard API error:', error, {
      userId: req.user?._id,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    });
    const errorCode = mapErrorToClientCode(error);
    sendErrorResponse(res, 500, errorCode, error);
  }
});

export default router;