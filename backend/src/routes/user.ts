import type { AuthRequest } from '../types/express';
import { Router, Response } from 'express';
import { UserModel } from '../models/UserModel';
import { CharacterModel } from '../models/CharacterModel';
import { ChatModel } from '../models/ChatModel';
import { authenticateToken } from '../middleware/auth';
import { sendErrorResponse, ClientErrorCode, mapErrorToClientCode } from '../utils/errorResponse';
import log from '../utils/logger';

const router: Router = Router();

// ユーザープロフィール取得
router.get('/profile', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      sendErrorResponse(res, 401, ClientErrorCode.AUTH_FAILED);
      return;
    }

    const user = await UserModel.findById(userId)
      .select('-password')
      .populate('purchasedCharacters', '_id name')
      .populate('selectedCharacter', '_id name')
      .populate('affinities.character', '_id name');
      
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
router.get('/dashboard', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
    
    // 親密度データが取得できない場合は、別のクエリで取得を試みる
    if (!user.affinities || user.affinities.length === 0) {
      log.info('No affinities in user object, trying separate query');
      const userWithAffinities = await UserModel.findById(userId)
        .select('affinities')
        .populate('affinities.character', '_id name imageCharacterSelect imageChatAvatar')
        .lean();
      
      if (userWithAffinities && userWithAffinities.affinities) {
        log.info('Found affinities in separate query:', {
          count: userWithAffinities.affinities.length
        });
        user.affinities = userWithAffinities.affinities;
      }
    }

    // 購入済みキャラクター取得
    const purchasedCharacters = await CharacterModel.find({
      _id: { $in: user.purchasedCharacters || [] }
    }).select('name imageChatAvatar purchasePrice');

    // 最近のチャット取得（最新5件）
    const recentChats = await ChatModel.find({ userId })
      .sort({ lastActivityAt: -1 })
      .limit(5)
      .populate('characterId', 'name imageChatAvatar');

    // チャット統計を計算
    const chats = await ChatModel.find({ userId });
    let totalMessages = 0;
    let totalTokensUsed = 0;
    const characterMessageCount: { [key: string]: number } = {};
    
    chats.forEach(chat => {
      totalMessages += chat.messages.length;
      totalTokensUsed += chat.totalTokensUsed;
      const charId = chat.characterId.toString();
      characterMessageCount[charId] = (characterMessageCount[charId] || 0) + chat.messages.length;
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
      affinities: user.affinities ? user.affinities.map((affinity: any) => ({
        character: affinity.character ? {
          _id: affinity.character._id || affinity.character,
          name: affinity.character.name || { ja: 'Unknown', en: 'Unknown' },
          imageCharacterSelect: affinity.character.imageCharacterSelect || affinity.character.imageChatAvatar || '/images/default-avatar.png'
        } : null,
        level: affinity.level || 0,
        experience: affinity.experience || 0,
        experienceToNext: affinity.experienceToNext || 100,
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
        nextRewardLevel: affinity.nextRewardLevel || 10
      })) : [],
      notifications: [], // TODO: 実装が必要
      badges: [], // TODO: 実装が必要
      analytics: {
        chatCountPerDay: [],
        tokenUsagePerDay: [],
        affinityProgress: []
      }, // TODO: 実装が必要
      recentChats: recentChats.map(chat => ({
        _id: chat._id,
        character: {
          _id: (chat.characterId as any)._id || chat.characterId,
          name: (chat.characterId as any).name || { ja: 'Unknown', en: 'Unknown' },
          imageCharacterSelect: (chat.characterId as any).imageChatAvatar || '/images/default-avatar.png'
        },
        lastMessage: chat.messages && chat.messages.length > 0 
          ? chat.messages[chat.messages.length - 1].content 
          : 'チャットを開始しましょう',
        lastMessageAt: chat.lastActivityAt,
        messageCount: chat.messages.length
      })),
      purchasedCharacters: purchasedCharacters.map(char => ({
        _id: char._id,
        name: char.name,
        displayName: char.name,
        profileImage: (char as any).imageChatAvatar,
        price: (char as any).purchasePrice || 0
      }))
    };

    res.json(dashboardData);

  } catch (error) {
    log.error('Dashboard API error:', error);
    const errorCode = mapErrorToClientCode(error);
    sendErrorResponse(res, 500, errorCode, error);
  }
});

export default router;