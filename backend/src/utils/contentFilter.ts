/**
 * バックエンド用コンテンツフィルター（TypeScript版）
 */

import { createBlockedWordNotification } from './adminNotificationCreator';
import { checkContentWithOpenAI, enhanceJapaneseModeration } from '../services/openaiModeration';
import log from './logger';

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

export interface ContentFilterResult {
  isBlocked: boolean;
  detectedWord?: string;
  reason?: string;
  violationType?: 'blocked_word' | 'openai_moderation';
  moderationCategories?: string[];
  moderationScores?: Record<string, number>;
}

/**
 * 禁止用語チェック
 */
export function checkBlockedWords(message: string, userId?: string, username?: string): ContentFilterResult {
  const normalizedMessage = message.toLowerCase();
  const allWords = [...BLOCKED_WORDS.japanese, ...BLOCKED_WORDS.english];
  
  for (const word of allWords) {
    if (normalizedMessage.includes(word.toLowerCase())) {
      // 管理者向け通知を作成（非同期で実行、エラーは無視）
      if (userId && username) {
        createBlockedWordNotification(userId, username, word).catch(error => {
          console.error('管理者通知作成エラー:', error);
        });
      }
      
      return {
        isBlocked: true,
        detectedWord: word,
        reason: 'メッセージに不適切な内容が含まれています',
        violationType: 'blocked_word'
      };
    }
  }
  
  return { isBlocked: false };
}

/**
 * OpenAI Moderation APIチェック
 */
export async function checkOpenAIModeration(message: string): Promise<ContentFilterResult> {
  try {
    // OpenAI Moderation APIでチェック
    const moderationResult = await checkContentWithOpenAI(message);
    
    // 日本語特有のパターンでチェックを強化
    const enhancedResult = enhanceJapaneseModeration(moderationResult, message);
    
    if (!enhancedResult.safe) {
      return {
        isBlocked: true,
        reason: enhancedResult.message || 'メッセージに不適切な内容が含まれています',
        violationType: 'openai_moderation',
        moderationCategories: enhancedResult.categories,
        moderationScores: enhancedResult.scores
      };
    }
    
    return { isBlocked: false };
  } catch (error) {
    log.error('OpenAI Moderation check failed', error);
    // エラー時は安全側に倒す（通過させる）
    return { isBlocked: false };
  }
}

/**
 * メッセージバリデーション（統合チェック）
 * 同期版（後方互換性のため残す）
 */
export function validateMessage(message: string, userId?: string, username?: string): {
  allowed: boolean;
  reason?: string;
  violationType?: string;
  detectedWord?: string;
} {
  // 1. 基本バリデーション
  if (!message || !message.trim()) {
    return {
      allowed: false,
      reason: 'メッセージが空です'
    };
  }

  if (message.length > 2000) {
    return {
      allowed: false,
      reason: 'メッセージが長すぎます（2000文字以内）'
    };
  }

  // 2. 禁止用語チェック
  const blockedCheck = checkBlockedWords(message, userId, username);
  if (blockedCheck.isBlocked) {
    return {
      allowed: false,
      reason: blockedCheck.reason || 'メッセージに不適切な内容が含まれています',
      violationType: blockedCheck.violationType,
      detectedWord: blockedCheck.detectedWord
    };
  }
  
  return { allowed: true };
}

/**
 * メッセージバリデーション（非同期版）
 * OpenAI Moderation APIを含む完全なチェック
 */
export async function validateMessageAsync(message: string, userId?: string, username?: string): Promise<{
  allowed: boolean;
  reason?: string;
  violationType?: string;
  detectedWord?: string;
  moderationCategories?: string[];
  moderationScores?: Record<string, number>;
}> {
  // 1. 同期チェック（基本バリデーション + 禁止用語）
  const syncResult = validateMessage(message, userId, username);
  if (!syncResult.allowed) {
    return syncResult;
  }
  
  // 2. OpenAI Moderation APIチェック
  const moderationResult = await checkOpenAIModeration(message);
  if (moderationResult.isBlocked) {
    return {
      allowed: false,
      reason: moderationResult.reason,
      violationType: moderationResult.violationType,
      moderationCategories: moderationResult.moderationCategories,
      moderationScores: moderationResult.moderationScores
    };
  }
  
  return { allowed: true };
}