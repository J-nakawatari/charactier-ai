import OpenAI from 'openai';
import log from '../utils/logger';

// OpenAI クライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * OpenAI Moderation APIの結果インターフェース
 */
interface ModerationResult {
  flagged: boolean;
  categories: {
    sexual: boolean;
    hate: boolean;
    harassment: boolean;
    'self-harm': boolean;
    'sexual/minors': boolean;
    'hate/threatening': boolean;
    'violence/graphic': boolean;
    'self-harm/intent': boolean;
    'self-harm/instructions': boolean;
    'harassment/threatening': boolean;
    violence: boolean;
  };
  category_scores: {
    sexual: number;
    hate: number;
    harassment: number;
    'self-harm': number;
    'sexual/minors': number;
    'hate/threatening': number;
    'violence/graphic': number;
    'self-harm/intent': number;
    'self-harm/instructions': number;
    'harassment/threatening': number;
    violence: number;
  };
}

/**
 * コンテンツモデレーション結果
 */
export interface ContentModerationResult {
  safe: boolean;
  flagged: boolean;
  categories: string[];
  scores: Record<string, number>;
  message?: string;
}

/**
 * OpenAI Moderation APIを使用してコンテンツをチェック
 */
export async function checkContentWithOpenAI(content: string): Promise<ContentModerationResult> {
  try {
    // OpenAI Moderation APIを呼び出し
    const moderation = await openai.moderations.create({
      input: content,
      model: 'text-moderation-latest'
    });

    const result = moderation.results[0];
    
    // フラグが立ったカテゴリーを収集
    const flaggedCategories: string[] = [];
    Object.entries(result.categories).forEach(([category, flagged]) => {
      if (flagged) {
        flaggedCategories.push(category);
      }
    });

    // スコアが高いカテゴリーも記録（0.5以上）
    const highScoreCategories: string[] = [];
    Object.entries(result.category_scores).forEach(([category, score]) => {
      if (score >= 0.5) {
        highScoreCategories.push(`${category} (${(score * 100).toFixed(1)}%)`);
      }
    });

    const moderationResult: ContentModerationResult = {
      safe: !result.flagged,
      flagged: result.flagged,
      categories: flaggedCategories,
      scores: { ...result.category_scores } as Record<string, number>,
      message: result.flagged 
        ? `このメッセージは不適切なコンテンツを含む可能性があります: ${flaggedCategories.join(', ')}`
        : undefined
    };

    // フラグが立った場合はログに記録
    if (result.flagged) {
      log.warn('OpenAI Moderation: Flagged content detected', {
        content: content.substring(0, 100) + '...', // 最初の100文字のみログ
        categories: flaggedCategories,
        scores: highScoreCategories
      });
    }

    return moderationResult;

  } catch (error) {
    log.error('OpenAI Moderation API error', error);
    
    // エラー時は安全側に倒す（通過させる）
    return {
      safe: true,
      flagged: false,
      categories: [],
      scores: {},
      message: undefined
    };
  }
}

/**
 * バッチでコンテンツをチェック（複数メッセージの同時チェック）
 */
export async function checkContentBatch(contents: string[]): Promise<ContentModerationResult[]> {
  try {
    const moderation = await openai.moderations.create({
      input: contents,
      model: 'text-moderation-latest'
    });

    return moderation.results.map((result, index) => {
      const flaggedCategories: string[] = [];
      Object.entries(result.categories).forEach(([category, flagged]) => {
        if (flagged) {
          flaggedCategories.push(category);
        }
      });

      return {
        safe: !result.flagged,
        flagged: result.flagged,
        categories: flaggedCategories,
        scores: { ...result.category_scores } as Record<string, number>,
        message: result.flagged 
          ? `メッセージ${index + 1}は不適切なコンテンツを含む可能性があります`
          : undefined
      };
    });
  } catch (error) {
    log.error('OpenAI Moderation Batch API error', error);
    
    // エラー時は全て安全として扱う
    return contents.map(() => ({
      safe: true,
      flagged: false,
      categories: [],
      scores: {},
      message: undefined
    }));
  }
}

/**
 * 日本語の不適切な表現も考慮したカスタムチェック
 * OpenAI Moderationと組み合わせて使用
 */
export function enhanceJapaneseModeration(result: ContentModerationResult, content: string): ContentModerationResult {
  // 日本語特有の不適切な表現パターン
  const japanesePatterns = [
    { pattern: /死ね|殺す|自殺/gi, category: 'violence' },
    { pattern: /バカ|アホ|クズ/gi, category: 'harassment' },
    { pattern: /援助交際|援交|パパ活/gi, category: 'sexual' }
  ];

  let additionalFlags = false;
  const additionalCategories: string[] = [];

  japanesePatterns.forEach(({ pattern, category }) => {
    if (pattern.test(content)) {
      additionalFlags = true;
      if (!additionalCategories.includes(category)) {
        additionalCategories.push(category);
      }
    }
  });

  if (additionalFlags) {
    return {
      safe: false,
      flagged: true,
      categories: [...new Set([...result.categories, ...additionalCategories])],
      scores: result.scores,
      message: result.message || '不適切な表現が含まれています'
    };
  }

  return result;
}