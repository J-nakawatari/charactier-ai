import { Router, Response } from 'express';
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
import { sendErrorResponse, ClientErrorCode } from '../utils/errorResponse';

const router = Router();

// レートリミッターを作成
const adminRateLimit = createRateLimiter('admin');

// 管理者用チャットシステム診断エンドポイント
router.get('/:characterId', adminRateLimit, authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 管理者権限チェック
    if (!req.admin) {
      sendErrorResponse(res, 403, ClientErrorCode.INSUFFICIENT_PERMISSIONS, 'Admin access required');
      return;
    }

    const { characterId } = req.params;
    const { userId } = req.query;
    
    // 1. キャラクター情報とモデル設定
    const character = await CharacterModel.findById(characterId);
    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    // 基本的な診断情報を準備
    let diagnosticsData: any = {
      character: {
        id: character._id,
        name: character.name,
        aiModel: character.aiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini',
        isActive: character.isActive,
        updatedAt: character.updatedAt
      },
      chat: {
        exists: false,
        messageCount: 0,
        totalTokensUsed: 0,
        lastActivity: null,
        createdAt: null,
        recentMessages: [],
        conversationHistory: {
          description: 'AI記憶システム: 最新10件のメッセージ（各120文字まで）を会話コンテキストとして送信',
          sentToAI: [],
          totalMessagesInDB: 0,
          messagesUsedForContext: 0,
          contextWindowSize: '最大10メッセージ',
          truncationLimit: '120文字/メッセージ'
        }
      },
      cache: { enabled: true, exists: false, data: null, count: 0 },
      tokenUsage: null,
      prompt: {
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
      },
      system: {
        mongoConnected: mongoose.connection.readyState === 1,
        redisConnected: !!(await getRedisClient()),
        currentModel: character.aiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini'
      }
    };

    // 特定のユーザーが指定されている場合
    if (userId && typeof userId === 'string') {
      // 2. チャット履歴確認
      const chat = await ChatModel.findOne({ userId, characterId })
        .select('messages totalTokensUsed lastActivityAt createdAt');
      
      if (chat) {
        diagnosticsData.chat = {
          exists: true,
          messageCount: chat.messages?.length || 0,
          totalTokensUsed: chat.totalTokensUsed || 0,
          lastActivity: chat.lastActivityAt,
          createdAt: chat.createdAt,
          recentMessages: chat.messages?.slice(-5).map(m => ({
            role: m.role,
            timestamp: m.timestamp,
            tokensUsed: m.tokensUsed,
            contentPreview: m.content.substring(0, 50) + '...'
          })) || [],
          conversationHistory: {
            description: 'AI記憶システム: 最新10件のメッセージ（各120文字まで）を会話コンテキストとして送信',
            sentToAI: chat.messages?.slice(-10).map(msg => ({
              role: msg.role,
              content: msg.content.length > 120 ? msg.content.substring(0, 120) + '...' : msg.content,
              originalLength: msg.content.length,
              timestamp: msg.timestamp
            })) || [],
            totalMessagesInDB: chat.messages?.length || 0,
            messagesUsedForContext: Math.min(10, chat.messages?.length || 0),
            contextWindowSize: '最大10メッセージ',
            truncationLimit: '120文字/メッセージ'
          }
        };
      }

      // 3. キャッシュ状態確認
      try {
        const user = await UserModel.findById(userId);
        let userAffinityLevel = 0;
        if (user) {
          const affinity = user.affinities.find(
            aff => aff.character.toString() === characterId
          );
          userAffinityLevel = affinity?.level || 0;
        }
        
        const affinityRange = 5;
        const cachedPrompts = await CharacterPromptCache.find({
          userId: userId,
          characterId: characterId,
          'promptConfig.affinityLevel': {
            $gte: Math.max(0, userAffinityLevel - affinityRange),
            $lte: Math.min(100, userAffinityLevel + affinityRange)
          },
          'promptConfig.languageCode': 'ja',
          ttl: { $gt: new Date() },
          characterVersion: '1.0.0'
        }).sort({ 
          useCount: -1,
          lastUsed: -1
        }).limit(1);
        
        const cachedPrompt = cachedPrompts[0];
        diagnosticsData.cache = {
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
        diagnosticsData.cache.enabled = false;
      }

      // 4. 最新のトークン使用状況
      const recentTokenUsage = await TokenUsage.findOne({
        userId,
        characterId
      }).sort({ createdAt: -1 });

      if (recentTokenUsage) {
        diagnosticsData.tokenUsage = {
          lastUsed: recentTokenUsage.createdAt,
          tokensUsed: recentTokenUsage.tokensUsed,
          aiModel: recentTokenUsage.aiModel,
          cacheHit: !!(recentTokenUsage as any).cacheHit,
          apiCost: recentTokenUsage.apiCost
        };
      }
    } else {
      // ユーザーが指定されていない場合は、このキャラクターを使用している全ユーザーのリストを取得
      const users = await UserModel.find({
        'affinities.character': characterId
      }).select('_id name email affinities');

      const userStats = await Promise.all(users.map(async (user) => {
        const affinity = user.affinities.find(
          aff => aff.character.toString() === characterId
        );
        
        const chat = await ChatModel.findOne({ 
          userId: user._id, 
          characterId 
        }).select('messages totalTokensUsed lastActivityAt');

        return {
          userId: user._id.toString(),
          userName: user.name || 'Unknown',
          userEmail: user.email,
          affinityLevel: affinity?.level || 0,
          lastInteraction: affinity?.lastInteraction || chat?.lastActivityAt,
          messageCount: chat?.messages?.length || 0,
          totalTokensUsed: chat?.totalTokensUsed || 0
        };
      }));

      // アクティビティでソート
      userStats.sort((a, b) => {
        const dateA = new Date(a.lastInteraction || 0);
        const dateB = new Date(b.lastInteraction || 0);
        return dateB.getTime() - dateA.getTime();
      });

      diagnosticsData.users = userStats;
    }

    res.json({
      diagnostics: diagnosticsData
    });
  } catch (error) {
    log.error('Admin chat diagnostics error', error);
    res.status(500).json({ 
      error: 'Diagnostics failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;