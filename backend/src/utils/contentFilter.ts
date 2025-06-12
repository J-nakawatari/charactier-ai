import { OpenAI } from 'openai';
import { Request } from 'express';
import { publishSecurityEvent } from '../../lib/redis';

// 禁止用語リスト
const BLOCKED_WORDS = {
  japanese: [
    // 性的内容
    'エロ', 'えろ', '性的', 'セックス', 'セクス', 'AV', 'アダルト',
    // 暴力・自傷
    '殺', 'ころす', '殺す', '死ね', '自殺', '首吊り',
    // ヘイト・犯罪
    'ヘイト', '差別', '暴力', '犯す', 'レイプ', '援交',
    // 薬物・犯罪
    '麻薬', '覚醒剤', '大麻', '薬物', '爆弾', 'テロ',
    // 児童保護
    '児童', '小学生', '中学生', '未成年', 'ロリ', 'ショタ'
  ],
  english: [
    // 性的内容
    'sex', 'sexual', 'erotic', 'porn', 'adult', 'xxx', 'nude',
    // 暴力
    'kill', 'murder', 'suicide', 'die', 'death', 'violence',
    // ヘイト・犯罪
    'hate', 'racism', 'rape', 'assault', 'abuse',
    // 薬物・犯罪
    'drug', 'marijuana', 'cocaine', 'bomb', 'terror', 'weapon',
    // 児童保護
    'child', 'minor', 'loli', 'shota', 'underage', 'kid'
  ]
};

// OpenAI インスタンス（環境変数がある場合のみ初期化）
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

/**
 * 禁止用語チェック
 * @param message - チェック対象メッセージ
 * @returns チェック結果
 */
export function checkBlockedWords(message: string) {
  const normalizedMessage = message.toLowerCase();
  const allWords = [...BLOCKED_WORDS.japanese, ...BLOCKED_WORDS.english];
  
  for (let word of allWords) {
    if (normalizedMessage.includes(word.toLowerCase())) {
      return {
        isBlocked: true,
        detectedWord: word,
        reason: 'カスタム禁止用語検出'
      };
    }
  }
  
  return { isBlocked: false };
}

/**
 * OpenAI Moderation API チェック
 * @param message - チェック対象メッセージ
 * @returns チェック結果
 */
export async function checkOpenAIModeration(message: string) {
  try {
    if (!openai) {
      console.log('OpenAI API key not available, skipping moderation check');
      return { isFlagged: false };
    }

    const response = await openai.moderations.create({
      input: message
    });
    
    if (response.results[0].flagged) {
      return {
        isFlagged: true,
        categories: response.results[0].categories,
        reason: 'OpenAI Moderation API検出'
      };
    }
    
    return { isFlagged: false };
  } catch (error) {
    console.error('OpenAI Moderation API failed:', error);
    // フォールバック: OpenAI失敗時はカスタムチェック結果のみを使用
    return { isFlagged: false };
  }
}

/**
 * メッセージバリデーション（統合チェック）
 * @param userId - ユーザーID
 * @param message - チェック対象メッセージ
 * @param req - リクエストオブジェクト
 * @returns バリデーション結果
 */
export async function validateMessage(userId: string, message: string, req: Request) {
  try {
    // 制裁システムがある場合のチェック（動的インポート）
    try {
      const { checkChatPermission, recordViolation, applySanction } = require('../../utils/sanctionSystem');
      
      // 1. 制裁状況チェック
      const permissionCheck = await checkChatPermission(userId);
      if (!permissionCheck.allowed) {
        return {
          allowed: false,
          reason: permissionCheck.reason,
          sanctionInfo: {
            type: permissionCheck.sanctionType,
            expiresAt: permissionCheck.expiresAt,
            violationCount: permissionCheck.violationCount
          }
        };
      }

      // 2. 禁止用語チェック
      const blockedCheck = checkBlockedWords(message);
      if (blockedCheck.isBlocked) {
        const violationData = {
          detectedWord: blockedCheck.detectedWord,
          reason: blockedCheck.reason,
          messageContent: message,
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown'
        };

        await recordViolation(userId, 'blocked_word', violationData);
        
        // 🛡️ リアルタイムセキュリティイベント発行
        await publishSecurityEvent({
          type: 'content_violation',
          severity: 'medium',
          userId,
          violationType: 'blocked_word',
          detectedWord: blockedCheck.detectedWord,
          messageContent: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
          ipAddress: violationData.ipAddress,
          userAgent: violationData.userAgent,
          action: 'recorded_violation'
        });
        
        await applySanction(userId);
        
        return {
          allowed: false,
          reason: 'メッセージに不適切な内容が含まれています',
          violationType: 'blocked_word',
          detectedWord: blockedCheck.detectedWord
        };
      }
      
      // 3. OpenAI Moderationチェック（フォールバック対応）
      const moderationCheck = await checkOpenAIModeration(message);
      if (moderationCheck.isFlagged) {
        const violationData = {
          reason: moderationCheck.reason,
          messageContent: message,
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          moderationCategories: moderationCheck.categories
        };

        await recordViolation(userId, 'openai_moderation', violationData);
        
        // 🛡️ リアルタイムセキュリティイベント発行
        await publishSecurityEvent({
          type: 'ai_moderation',
          severity: 'high',
          userId,
          violationType: 'openai_moderation',
          messageContent: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
          ipAddress: violationData.ipAddress,
          userAgent: violationData.userAgent,
          moderationCategories: moderationCheck.categories,
          action: 'recorded_violation'
        });
        
        await applySanction(userId);
        
        return {
          allowed: false,
          reason: 'メッセージが利用規約に違反しています',
          violationType: 'openai_moderation',
          categories: moderationCheck.categories
        };
      }
    } catch (sanctionError) {
      console.log('Sanction system not available, using basic content filtering only');
      
      // 制裁システムがない場合は基本的なチェックのみ
      const blockedCheck = checkBlockedWords(message);
      if (blockedCheck.isBlocked) {
        console.log(`🚫 違反記録: User ${userId}, Type: blocked_word, Word: ${blockedCheck.detectedWord}`);
        return {
          allowed: false,
          reason: 'メッセージに不適切な内容が含まれています',
          violationType: 'blocked_word',
          detectedWord: blockedCheck.detectedWord
        };
      }
      
      const moderationCheck = await checkOpenAIModeration(message);
      if (moderationCheck.isFlagged) {
        console.log(`🚫 違反記録: User ${userId}, Type: openai_moderation, Categories:`, moderationCheck.categories);
        return {
          allowed: false,
          reason: 'メッセージが利用規約に違反しています',
          violationType: 'openai_moderation',
          categories: moderationCheck.categories
        };
      }
    }
    
    return { allowed: true };
    
  } catch (error) {
    console.error('Content moderation failed:', error);
    // 緊急フォールバック: エラー時はメッセージを通す（UX断絶防止）
    return {
      allowed: true,
      warning: 'Moderation check failed - message allowed by fallback'
    };
  }
}