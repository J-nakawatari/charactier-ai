/**
 * バックエンド用コンテンツフィルター（TypeScript版）
 */

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
}

/**
 * 禁止用語チェック
 */
export function checkBlockedWords(message: string): ContentFilterResult {
  const normalizedMessage = message.toLowerCase();
  const allWords = [...BLOCKED_WORDS.japanese, ...BLOCKED_WORDS.english];
  
  for (let word of allWords) {
    if (normalizedMessage.includes(word.toLowerCase())) {
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
 * メッセージバリデーション（統合チェック）
 */
export function validateMessage(message: string): {
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
  const blockedCheck = checkBlockedWords(message);
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