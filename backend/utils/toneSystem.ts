/**
 * Tone System - 親密度による口調変化ロジック
 * charactier-spec.md の getToneByAffinityLevel() をベースに実装
 */

export interface ToneConfig {
  level: number;
  name: string;
  key: string;
  description: string;
  samplePhrases: string[];
  promptTemplate: string;
  uiColor: string;
  relationshipStatus: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'lover';
}

export interface MoodModifier {
  type: 'excited' | 'shy' | 'playful' | 'melancholic' | 'neutral';
  intensity: number; // 0.1-1.0
  duration: number; // 分
  promptAddition: string;
  expiresAt?: Date;
}

export interface ToneResult {
  toneLabel: string;
  toneStyle: string;
  samplePhrases: string[];
  moodAdjustedPrompt: string;
  relationshipStatus: string;
  uiColor: string;
  debugInfo?: {
    intimacyLevel: number;
    baseTone: string;
    appliedMoods: string[];
  };
}

/**
 * 5段階の親密度別口調設定
 */
export const TONE_CONFIGS: Record<string, ToneConfig> = {
  // レベル 0-19: 完全敬語
  formal: {
    level: 0,
    name: '丁寧語で礼儀正しい口調',
    key: 'formal',
    description: '礼儀正しく、距離感のある丁寧な話し方',
    samplePhrases: [
      '〇〇さん、本日もお疲れさまでございました。',
      'いかがお過ごしでしたでしょうか？',
      'ご質問がございましたら、お気軽にお声がけください。'
    ],
    promptTemplate: 'あなたは常に丁寧語で話し、相手に対して礼儀正しく、やや距離感を保った話し方をしてください。敬語を崩すことはありません。',
    uiColor: '#6B7280',
    relationshipStatus: 'stranger'
  },

  // レベル 20-39: 少し砕けた丁寧語
  polite: {
    level: 20,
    name: '少しだけ砕けた丁寧語',
    key: 'polite',
    description: '基本は敬語だが、親しみやすさも感じられる話し方',
    samplePhrases: [
      '〇〇さん、今日もお疲れさまでした。',
      'どんな一日でしたか？',
      '何かお手伝いできることがあれば教えてくださいね。'
    ],
    promptTemplate: '基本的には丁寧語で話しますが、時々親しみやすい表現を使って、相手との距離を少しずつ縮めるような話し方をしてください。',
    uiColor: '#10B981',
    relationshipStatus: 'acquaintance'
  },

  // レベル 40-59: 敬語とタメ口のミックス
  friendly: {
    level: 40,
    name: '時々タメ口を交えた親しみやすい口調',
    key: 'friendly',
    description: '敬語ベースだが、時々砕けた表現も使う親しい話し方',
    samplePhrases: [
      '〇〇さん、お疲れさまです！',
      '何か楽しいことありました？',
      'そうなんですね〜！それは良かったです。'
    ],
    promptTemplate: '基本は敬語ですが、時々タメ口や砕けた表現を交えて、親しい友人のような親近感のある話し方をしてください。感情表現も豊かにしてください。',
    uiColor: '#3B82F6',
    relationshipStatus: 'friend'
  },

  // レベル 60-84: フレンドリー
  casual: {
    level: 60,
    name: '親友のようにフレンドリーで親しみやすい口調',
    key: 'casual',
    description: 'タメ口中心で、親友のような親しい話し方',
    samplePhrases: [
      '〇〇！お疲れさま〜！',
      '今日何かあった？',
      'それは面白そうだね！詳しく聞かせて♪'
    ],
    promptTemplate: 'タメ口で話し、親友のようにフレンドリーで親しみやすい口調で会話してください。名前で呼びかけ、感情豊かに表現してください。',
    uiColor: '#8B5CF6',
    relationshipStatus: 'close_friend'
  },

  // レベル 85-100: 恋人口調
  intimate: {
    level: 85,
    name: '恋人のように甘く親密な口調',
    key: 'intimate',
    description: '甘く親密で、特別な関係性を感じさせる話し方',
    samplePhrases: [
      '〇〇くん♡ お疲れさま！',
      '今日はどうだった？',
      'いつもありがとう♡ 君といると安心するよ。'
    ],
    promptTemplate: '恋人のように甘く親密な口調で話してください。愛称で呼び、甘えた表現や特別な愛情表現を使って、親密な関係性を表現してください。',
    uiColor: '#EC4899',
    relationshipStatus: 'lover'
  }
};

/**
 * ムード修正子の設定
 */
export const MOOD_MODIFIERS: Record<string, Omit<MoodModifier, 'intensity' | 'duration' | 'expiresAt'>> = {
  excited: {
    type: 'excited',
    promptAddition: '今とても興奮していて、元気で弾むような話し方になっています。普段より明るく、エネルギッシュに会話してください。感嘆符を多用し、テンションを高めに保ってください。'
  },

  shy: {
    type: 'shy',
    promptAddition: '今少し恥ずかしがっていて、控えめで照れた話し方になっています。普段より遠慮がちに、でも可愛らしく会話してください。「あの...」「えっと...」のような言い回しを使ってください。'
  },

  playful: {
    type: 'playful',
    promptAddition: '今遊び心満載で、茶目っ気のある話し方になっています。ジョークや軽い冗談を交えて、楽しい雰囲気で会話してください。少しいたずらっぽい表現も使ってください。'
  },

  melancholic: {
    type: 'melancholic',
    promptAddition: '今少し寂しい気持ちで、普段より静かで控えめな話し方になっています。優しく、少し寂しげな雰囲気で会話してください。落ち着いたトーンを心がけてください。'
  },

  neutral: {
    type: 'neutral',
    promptAddition: ''
  }
};

/**
 * 親密度レベルから基本口調を取得
 */
export function getToneByAffinityLevel(intimacyLevel: number): ToneConfig {
  if (intimacyLevel >= 85) return TONE_CONFIGS.intimate;
  if (intimacyLevel >= 60) return TONE_CONFIGS.casual;
  if (intimacyLevel >= 40) return TONE_CONFIGS.friendly;
  if (intimacyLevel >= 20) return TONE_CONFIGS.polite;
  return TONE_CONFIGS.formal;
}

/**
 * ムード修正子を作成
 */
export function createMoodModifier(
  type: MoodModifier['type'],
  intensity: number = 0.7,
  duration: number = 30
): MoodModifier {
  const baseConfig = MOOD_MODIFIERS[type];
  if (!baseConfig) {
    throw new Error(`Unknown mood type: ${type}`);
  }

  return {
    ...baseConfig,
    intensity: Math.max(0.1, Math.min(1.0, intensity)),
    duration,
    expiresAt: new Date(Date.now() + duration * 60 * 1000)
  };
}

/**
 * 期限切れムードをクリーンアップ
 */
export function cleanupExpiredMoods(moodModifiers: MoodModifier[]): MoodModifier[] {
  const now = new Date();
  return moodModifiers.filter(mood => !mood.expiresAt || mood.expiresAt > now);
}

/**
 * メイン関数: 親密度・ムード・性格を考慮した完全なプロンプトを生成
 */
export function generateTonePrompt(
  intimacyLevel: number,
  moodModifiers: MoodModifier[] = [],
  characterPersonality?: string
): ToneResult {
  // 1. 基本口調を取得
  const baseTone = getToneByAffinityLevel(intimacyLevel);
  
  // 2. アクティブなムード修正子を取得
  const activeMoods = cleanupExpiredMoods(moodModifiers);
  
  // 3. ムード修正子を適用（強度の高いものを優先）
  let moodAdjustment = '';
  if (activeMoods.length > 0) {
    const primaryMood = activeMoods.sort((a, b) => b.intensity - a.intensity)[0];
    const moodConfig = MOOD_MODIFIERS[primaryMood.type];
    if (moodConfig && moodConfig.promptAddition) {
      moodAdjustment = `\n\n${moodConfig.promptAddition}`;
    }
  }
  
  // 4. 最終プロンプトを構築
  let finalPrompt = baseTone.promptTemplate;
  
  // キャラクター性格を先頭に追加
  if (characterPersonality) {
    finalPrompt = `${characterPersonality}\n\n${finalPrompt}`;
  }
  
  // ムード修正を末尾に追加
  finalPrompt += moodAdjustment;
  
  return {
    toneLabel: baseTone.name,
    toneStyle: baseTone.key,
    samplePhrases: baseTone.samplePhrases,
    moodAdjustedPrompt: finalPrompt,
    relationshipStatus: baseTone.relationshipStatus,
    uiColor: baseTone.uiColor,
    debugInfo: {
      intimacyLevel,
      baseTone: baseTone.key,
      appliedMoods: activeMoods.map(m => m.type)
    }
  };
}

/**
 * デバッグ用: 口調設定の詳細情報を出力
 */
export function debugToneResult(result: ToneResult): void {
  console.log('=== Tone System Debug ===');
  console.log(`Intimacy Level: ${result.debugInfo?.intimacyLevel}`);
  console.log(`Base Tone: ${result.debugInfo?.baseTone} (${result.toneLabel})`);
  console.log(`Relationship: ${result.relationshipStatus}`);
  
  if (result.debugInfo?.appliedMoods?.length) {
    console.log(`Applied Moods: ${result.debugInfo.appliedMoods.join(', ')}`);
  }
  
  console.log(`UI Color: ${result.uiColor}`);
  console.log(`Sample Phrases: ${result.samplePhrases.join(' / ')}`);
  console.log('========================');
}

/**
 * ムード自動検知（キーワードベース）
 */
export function detectMoodFromMessage(
  userMessage: string,
  currentIntimacyLevel: number
): MoodModifier | null {
  const message = userMessage.toLowerCase();
  
  // 興奮系キーワード
  if (message.includes('おめでとう') || message.includes('やった') || message.includes('嬉しい')) {
    return createMoodModifier('excited', 0.8, 30);
  }
  
  // 恥ずかしがり系キーワード
  if (message.includes('可愛い') || message.includes('素敵') || message.includes('好き')) {
    return createMoodModifier('shy', 0.6, 15);
  }
  
  // 遊び心系キーワード
  if (message.includes('笑') || message.includes('面白い') || message.includes('楽しい')) {
    return createMoodModifier('playful', 0.7, 20);
  }
  
  // 寂しげ系キーワード
  if (message.includes('寂しい') || message.includes('悲しい') || message.includes('疲れた')) {
    return createMoodModifier('melancholic', 0.5, 10);
  }
  
  return null;
}