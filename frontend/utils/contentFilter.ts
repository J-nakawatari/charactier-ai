/**
 * フロントエンド用コンテンツフィルター
 * バックエンドと同じ禁止用語リストを使用してクライアント側でも事前チェック
 */

// 禁止用語リスト（バックエンドと同期）
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
  suggestion?: string;
}

/**
 * メッセージの禁止用語チェック
 */
export function checkBlockedWords(message: string): ContentFilterResult {
  if (!message || !message.trim()) {
    return { isBlocked: false };
  }

  const normalizedMessage = message.toLowerCase();
  const allWords = [...BLOCKED_WORDS.japanese, ...BLOCKED_WORDS.english];
  
  for (let word of allWords) {
    if (normalizedMessage.includes(word.toLowerCase())) {
      return {
        isBlocked: true,
        detectedWord: word,
        reason: 'このメッセージには不適切な内容が含まれています',
        suggestion: 'メッセージを修正してから送信してください'
      };
    }
  }
  
  return { isBlocked: false };
}

/**
 * リアルタイム入力チェック（文字入力時）
 */
export function checkMessageRealtime(message: string): {
  hasWarning: boolean;
  warningMessage?: string;
} {
  const result = checkBlockedWords(message);
  
  if (result.isBlocked) {
    return {
      hasWarning: true,
      warningMessage: '不適切な用語が含まれています。送信前に修正してください。'
    };
  }
  
  return { hasWarning: false };
}

/**
 * 送信前の最終チェック
 */
export function validateMessageBeforeSend(message: string): {
  canSend: boolean;
  errorMessage?: string;
  detectedWord?: string;
} {
  const result = checkBlockedWords(message);
  
  if (result.isBlocked) {
    return {
      canSend: false,
      errorMessage: result.reason || 'メッセージに不適切な内容が含まれています',
      detectedWord: result.detectedWord
    };
  }
  
  // 文字数制限チェック
  if (message.length > 2000) {
    return {
      canSend: false,
      errorMessage: 'メッセージが長すぎます（2000文字以内にしてください）'
    };
  }
  
  // 空メッセージチェック
  if (!message.trim()) {
    return {
      canSend: false,
      errorMessage: 'メッセージを入力してください'
    };
  }
  
  return { canSend: true };
}