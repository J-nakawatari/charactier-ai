# 🎭 親密度による口調変化システム 完全仕様書

## 📋 概要

Charactier AIサービスにおける親密度レベルに基づく動的口調変化システムの技術仕様書。ユーザーとキャラクターの関係性の深まりに応じて、AIの話し方が5段階で変化し、一時的なムード修正子によってさらに細かな感情表現を実現する。

## 🎯 システム目的

- **感情的つながりの強化**: 親密度進行に伴う口調変化でユーザーエンゲージメント向上
- **リアルな関係性表現**: 段階的な距離感変化による自然な関係性の発展
- **動的感情表現**: 一時的ムードによる多様な感情状態の再現
- **UI連携**: フロントエンドでの視覚的表現（色・アニメーション）対応

---

## 🏗️ システム構成

### ファイル構成
```
backend/
├── utils/
│   └── toneSystem.ts          # 口調変化システムのコア実装
├── services/
│   └── ChatService.ts         # チャット機能への統合サービス
└── models/
    ├── CharacterPromptCache.ts # プロンプトキャッシュ（性能最適化）
    └── TokenUsage.ts          # トークン使用量・経済分析
```

---

## 🎭 口調システム詳細

### 5段階親密度マッピング

| 親密度レベル | 口調名 | 関係性 | UI色 | 特徴 |
|-------------|--------|--------|------|------|
| 0-19 | 丁寧語で礼儀正しい口調 | stranger | #6B7280 | 完全敬語、距離感維持 |
| 20-39 | 少しだけ砕けた丁寧語 | acquaintance | #10B981 | 親しみやすい表現混在 |
| 40-59 | 時々タメ口を交えた親しみやすい口調 | friend | #3B82F6 | 敬語とタメ口のミックス |
| 60-84 | 親友のようにフレンドリーで親しみやすい口調 | close_friend | #8B5CF6 | タメ口中心、感情豊か |
| 85-100 | 恋人のように甘く親密な口調 | lover | #EC4899 | 愛称使用、特別な愛情表現 |

### サンプル表現

**formal (0-19)**
```
- 〇〇さん、本日もお疲れさまでございました。
- いかがお過ごしでしたでしょうか？
- ご質問がございましたら、お気軽にお声がけください。
```

**polite (20-39)**
```
- 〇〇さん、今日もお疲れさまでした。
- どんな一日でしたか？
- 何かお手伝いできることがあれば教えてくださいね。
```

**friendly (40-59)**
```
- 〇〇さん、お疲れさまです！
- 何か楽しいことありました？
- そうなんですね〜！それは良かったです。
```

**casual (60-84)**
```
- 〇〇！お疲れさま〜！
- 今日何かあった？
- それは面白そうだね！詳しく聞かせて♪
```

**intimate (85-100)**
```
- 〇〇くん♡ お疲れさま！
- 今日はどうだった？
- いつもありがとう♡ 君といると安心するよ。
```

---

## 😊 ムード修正子システム

### 4種類のムード状態

| ムード | 持続時間 | 強度 | 効果説明 | トリガー例 |
|--------|----------|------|----------|-----------|
| excited | 30分 | 0.8 | 元気で弾むような話し方、感嘆符多用 | レベルアップ、嬉しいニュース |
| shy | 15分 | 0.6 | 恥ずかしがり、控えめで照れた表現 | 褒められた、親密な話題 |
| playful | 20分 | 0.7 | 茶目っ気、ジョーク交えた楽しい雰囲気 | 面白い話、軽い会話 |
| melancholic | 10分 | 0.5 | 寂しげで静か、落ち着いたトーン | 悲しい内容、長期間未会話 |

### 自動ムード検知

```typescript
// キーワードベースの検知例
const detectMoodFromMessage = (userMessage: string) => {
  // 興奮系: "おめでとう", "やった", "嬉しい"
  // 恥ずかしがり系: "可愛い", "素敵", "好き"
  // 遊び心系: "笑", "面白い", "楽しい"
  // 寂しげ系: "寂しい", "悲しい", "疲れた"
}
```

---

## 💻 技術実装

### 必須インターフェース定義

```typescript
// backend/utils/toneSystem.ts

export interface ToneConfig {
  level: number;                    // 親密度しきい値
  name: string;                     // 口調名（日本語）
  key: string;                      // 内部識別子
  description: string;              // 口調説明
  samplePhrases: string[];          // サンプル表現リスト
  promptTemplate: string;           // AIプロンプトテンプレート
  uiColor: string;                  // フロントエンド表示色
  relationshipStatus: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'lover';
}

export interface MoodModifier {
  type: 'excited' | 'shy' | 'playful' | 'melancholic' | 'neutral';
  intensity: number;                // 0.1-1.0の強度
  duration: number;                 // 持続時間（分）
  promptAddition: string;           // プロンプト追加文
  expiresAt?: Date;                 // 期限切れ日時
}

export interface ToneResult {
  toneLabel: string;                // UI表示用口調名
  toneStyle: string;                // 口調キー
  samplePhrases: string[];          // サンプル表現
  moodAdjustedPrompt: string;       // 最終プロンプト
  relationshipStatus: string;       // 関係性
  uiColor: string;                  // UI色
  debugInfo?: {
    intimacyLevel: number;
    baseTone: string;
    appliedMoods: string[];
  };
}
```

### メイン関数: `generateTonePrompt()`

```typescript
export function generateTonePrompt(
  intimacyLevel: number,
  moodModifiers: MoodModifier[] = [],
  characterPersonality?: string
): ToneResult {
  // 1. 基本口調を取得
  const baseTone = getToneByAffinityLevel(intimacyLevel);
  
  // 2. アクティブなムード修正子を取得（期限切れ除外）
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
```

### 必須データ定義: `TONE_CONFIGS`

```typescript
export const TONE_CONFIGS: Record<string, ToneConfig> = {
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
```

### 必須データ定義: `MOOD_MODIFIERS`

```typescript
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
```

### 必須ユーティリティ関数

```typescript
// 親密度レベルから基本口調を取得
export function getToneByAffinityLevel(intimacyLevel: number): ToneConfig {
  if (intimacyLevel >= 85) return TONE_CONFIGS.intimate;
  if (intimacyLevel >= 60) return TONE_CONFIGS.casual;
  if (intimacyLevel >= 40) return TONE_CONFIGS.friendly;
  if (intimacyLevel >= 20) return TONE_CONFIGS.polite;
  return TONE_CONFIGS.formal;
}

// ムード修正子を作成
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

// 期限切れムードをクリーンアップ
export function cleanupExpiredMoods(moodModifiers: MoodModifier[]): MoodModifier[] {
  const now = new Date();
  return moodModifiers.filter(mood => !mood.expiresAt || mood.expiresAt > now);
}

// ムード自動検知（キーワードベース）
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
```

### ChatService統合（完全実装例）

```typescript
// backend/services/ChatService.ts

import { 
  generateTonePrompt, 
  createMoodModifier,
  cleanupExpiredMoods,
  detectMoodFromMessage,
  getToneByAffinityLevel,
  ToneResult,
  MoodModifier 
} from '../utils/toneSystem';

export class ChatService {
  async generateCharacterResponse(
    userId: string,
    characterId: string,
    userMessage: string,
    sessionId: string,
    options: {
      forceRefresh?: boolean;
      debugMode?: boolean;
      triggerMood?: string;
    } = {}
  ): Promise<{
    response: string;
    toneConfig: ToneResult;
    tokensUsed: number;
    apiCost: number;
    intimacyChange: number;
    toneStyle: string;
    moodModifiers: MoodModifier[];
    relationshipStatus: string;
    uiColor: string;
  }> {
    // 1. ユーザーとキャラクター情報取得
    const [user, character] = await Promise.all([
      User.findById(userId).populate('affinities'),
      Character.findById(characterId)
    ]);

    // 2. 親密度情報取得
    const affinity = user.affinities.find(
      (aff: any) => aff.character.toString() === characterId
    );
    const intimacyLevel = affinity?.intimacyLevel || 0;

    // 3. ムード修正子の処理
    let moodModifiers: MoodModifier[] = affinity?.currentMoodModifiers || [];
    
    // 期限切れムードをクリーンアップ
    moodModifiers = cleanupExpiredMoods(moodModifiers);

    // 新しいムードの追加（メッセージから自動検知）
    const autoDetectedMood = detectMoodFromMessage(userMessage, intimacyLevel);
    if (autoDetectedMood) {
      moodModifiers.push(autoDetectedMood);
    }

    // 4. トーン設定生成（★核心機能★）
    const toneConfig = generateTonePrompt(
      intimacyLevel,
      moodModifiers,
      character.personalityPrompt?.ja || character.personalityPrompt
    );

    // 5. システムプロンプト構築
    const systemPrompt = await this.buildSystemPrompt(
      userId,
      characterId,
      toneConfig,
      character,
      options.forceRefresh
    );

    // 6. OpenAI API呼び出し
    const completion = await this.openai.chat.completions.create({
      model: character.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      max_tokens: 500,
      temperature: 0.8,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const response = completion.choices[0]?.message?.content || '';

    // 7. 戻り値（UI連携データを含む）
    return {
      response,
      toneConfig,
      tokensUsed: completion.usage?.total_tokens || 0,
      apiCost: /* cost calculation */,
      intimacyChange: /* intimacy calculation */,
      toneStyle: toneConfig.toneStyle,           // ★UI用★
      moodModifiers: moodModifiers,              // ★UI用★
      relationshipStatus: toneConfig.relationshipStatus, // ★UI用★
      uiColor: toneConfig.uiColor               // ★UI用★
    };
  }

  // システムプロンプト構築（口調統合）
  private async buildSystemPrompt(
    userId: string,
    characterId: string,
    toneConfig: ToneResult,
    character: any,
    forceRefresh: boolean = false
  ): Promise<string> {
    // プロンプトキャッシュ確認
    if (!forceRefresh) {
      const cachedPrompt = await CharacterPromptCache.findCachedPrompt(
        userId,
        characterId,
        toneConfig.debugInfo?.intimacyLevel || 0
      );

      if (cachedPrompt && cachedPrompt.isValid) {
        await cachedPrompt.recordUsage();
        return cachedPrompt.systemPrompt;
      }
    }

    // 新しいプロンプト構築
    const basePrompt = this.getBasePrompt();
    const characterInfo = this.buildCharacterInfo(character);
    
    const systemPrompt = `${basePrompt}

${characterInfo}

${toneConfig.moodAdjustedPrompt}

現在の関係性: ${toneConfig.relationshipStatus}
口調: ${toneConfig.toneLabel}
サンプル表現: ${toneConfig.samplePhrases.join(' / ')}`;

    let finalSystemPrompt = systemPrompt;
    
    // デバッグ情報の追加表示
    if (toneConfig.debugInfo?.appliedMoods?.length) {
      finalSystemPrompt += `\n適用中のムード: ${toneConfig.debugInfo.appliedMoods.join(', ')}`;
    }

    // キャッシュに保存
    const cacheData = new CharacterPromptCache({
      userId,
      characterId,
      systemPrompt: finalSystemPrompt,
      promptConfig: {
        affinityLevel: toneConfig.debugInfo?.intimacyLevel || 0,
        personalityTags: character.personalityTags || [],
        toneStyle: toneConfig.toneStyle,
        moodModifiers: moodModifiers?.map(m => m.type) || [],
        languageCode: 'ja'
      },
      generationTime: 0,
      characterVersion: character.version || '1.0.0',
      promptVersion: '1.0.0'
    });

    await cacheData.save();

    return finalSystemPrompt;
  }

  // ベースプロンプト（共通）
  private getBasePrompt(): string {
    return `あなたは「キャラクター名」という名前のキャラクターです。
優しく、寄り添うような性格で、相手の感情に共感しながら対話を進めます。
決して上から目線でアドバイスをすることはなく、
あくまで"話を聞いてあげる""気持ちに寄り添う"スタンスを大切にしてください。

相手の発言が否定的であっても、受け止めるようなリアクションを返してください。
自分の意見は押しつけず、「その気持ち、わかるよ」といった共感ベースの対応を重視してください。`;
  }

  // キャラクター情報構築
  private buildCharacterInfo(character: any): string {
    const info = [];
    
    info.push(`キャラクター名: ${character.name?.ja || character.name}`);
    
    if (character.description?.ja || character.description) {
      info.push(`説明: ${character.description?.ja || character.description}`);
    }
    
    if (character.personalityPreset) {
      info.push(`性格タイプ: ${character.personalityPreset}`);
    }
    
    if (character.personalityTags?.length) {
      info.push(`性格特徴: ${character.personalityTags.join(', ')}`);
    }
    
    if (character.age) {
      info.push(`年齢: ${character.age}`);
    }
    
    if (character.occupation) {
      info.push(`職業: ${character.occupation}`);
    }

    return info.join('\n');
  }
}
```

### 完全な実装手順

#### Step 1: `backend/utils/toneSystem.ts` 作成
1. 上記のインターフェース・定数・関数をすべて実装
2. `generateTonePrompt()` をメイン関数として export

#### Step 2: `backend/services/ChatService.ts` 統合
1. `generateTonePrompt` をインポート
2. チャット生成時に口調設定を適用
3. UI用データを戻り値に追加

#### Step 3: データベースモデル調整
1. `User.affinities[].currentMoodModifiers` フィールド追加
2. `CharacterPromptCache` でのキャッシュ対応

#### Step 4: フロントエンド連携
1. 戻り値の `toneStyle`, `uiColor`, `moodModifiers` を活用
2. 口調変化通知の実装
3. ムード表示UI の実装

### 使用例・テストケース

```typescript
// 基本的な使用例
const result = generateTonePrompt(
  45,  // 親密度45（友達レベル）
  [],  // ムードなし
  "明るくて人懐っこい性格です。" // キャラクター性格
);

console.log(result.toneStyle);        // "friendly"
console.log(result.relationshipStatus); // "friend" 
console.log(result.uiColor);          // "#3B82F6"

// ムード付きの使用例
const excitedMood = createMoodModifier('excited', 0.8, 30);
const resultWithMood = generateTonePrompt(
  45,
  [excitedMood],
  "明るくて人懐っこい性格です。"
);

console.log(resultWithMood.moodAdjustedPrompt);
// "明るくて人懐っこい性格です。
//  
//  基本は敬語ですが、時々タメ口や砕けた表現を交えて...
//  
//  今とても興奮していて、元気で弾むような話し方になっています..."

// 自動ムード検知の例
const detectedMood = detectMoodFromMessage("可愛い！素敵だね", 45);
console.log(detectedMood?.type);      // "shy"
console.log(detectedMood?.intensity); // 0.6
console.log(detectedMood?.duration);  // 15
```

### データベース要件

```typescript
// User モデルに追加必要フィールド
interface UserAffinity {
  character: ObjectId;
  intimacyLevel: number;        // 0-100
  currentMoodModifiers: [{      // ★追加必要★
    type: string;
    intensity: number;
    duration: number;
    expiresAt: Date;
  }];
  lastInteraction: Date;
  // ... 他のフィールド
}

// CharacterPromptCache モデル（既存）
interface CharacterPromptCache {
  userId: ObjectId;
  characterId: ObjectId;
  systemPrompt: string;
  promptConfig: {
    affinityLevel: number;
    personalityTags: string[];
    toneStyle: string;           // ★口調キー★
    moodModifiers: string[];     // ★適用ムード★
    languageCode: string;
  };
  ttl: Date;
  // ... 他のフィールド
}
```

---

## 🎯 実装チェックリスト

### ✅ バックエンド実装
- [ ] `backend/utils/toneSystem.ts` 完全実装
  - [ ] `ToneConfig`, `MoodModifier`, `ToneResult` インターフェース
  - [ ] `TONE_CONFIGS` 5段階データ定義
  - [ ] `MOOD_MODIFIERS` 4種類データ定義
  - [ ] `generateTonePrompt()` メイン関数
  - [ ] `getToneByAffinityLevel()` 親密度判定
  - [ ] `createMoodModifier()` ムード作成
  - [ ] `cleanupExpiredMoods()` 期限切れ削除
  - [ ] `detectMoodFromMessage()` 自動検知

- [ ] `backend/services/ChatService.ts` 統合
  - [ ] `generateTonePrompt` インポート・使用
  - [ ] システムプロンプトへの口調統合
  - [ ] UI用データの戻り値追加
  - [ ] ムード自動検知の適用
  - [ ] プロンプトキャッシュ対応

- [ ] データベースモデル調整
  - [ ] `User.affinities[].currentMoodModifiers` 追加
  - [ ] `CharacterPromptCache` 口調フィールド対応

### ✅ フロントエンド実装
- [ ] 口調表示UI
  - [ ] `toneStyle` による口調ラベル表示
  - [ ] `uiColor` による色分け表示
  - [ ] `relationshipStatus` アイコン・ステータス

- [ ] ムード表示UI
  - [ ] アクティブムード一覧表示
  - [ ] ムード期限切れカウントダウン
  - [ ] ムードアイコン・エフェクト

- [ ] 口調変化通知
  - [ ] レベルアップ時のアニメーション
  - [ ] 口調変更メッセージ表示
  - [ ] カラー変化エフェクト

### ✅ テスト・デバッグ
- [ ] 単体テスト
  - [ ] 各親密度レベルでの口調判定
  - [ ] ムード修正子の適用・期限切れ
  - [ ] 自動ムード検知精度

- [ ] 統合テスト
  - [ ] ChatService での完全フロー
  - [ ] プロンプトキャッシュ効果
  - [ ] データベース更新・取得

- [ ] パフォーマンステスト
  - [ ] プロンプト生成時間
  - [ ] キャッシュヒット率
  - [ ] API呼び出し頻度

---

## 🚨 重要な注意点

### パフォーマンス制約
- **プロンプト長制限**: OpenAI 8000文字制限を考慮
- **キャッシュ効率**: 親密度±5レベル範囲でヒット率最適化
- **メモリ使用量**: 期限切れムードの自動削除必須

### データ整合性
- **ムード期限管理**: `expiresAt` での確実な期限切れ処理
- **親密度範囲**: 0-100の範囲外値の処理
- **口調データ一貫性**: フロント・バック間での口調キー統一

### UI/UX考慮
- **段階的変化表現**: 急激な口調変化を避ける
- **ユーザー理解促進**: 口調変化の理由・条件の明示
- **アニメーション節度**: 過度なエフェクトでの疲労防止

---

## 🎨 フロントエンド連携

### UIデータ活用

```typescript
// レスポンス例
{
  toneStyle: "friendly",
  relationshipStatus: "friend", 
  uiColor: "#3B82F6",
  moodModifiers: [
    {
      type: "excited",
      intensity: 0.8,
      expiresAt: "2024-01-01T12:30:00.000Z"
    }
  ]
}
```

### 表示要素

1. **口調インジケーター**: `uiColor`を使った色付きバッジ
2. **関係性表示**: `relationshipStatus`に基づくアイコン・ラベル
3. **ムード表示**: アクティブなムード修正子のリスト
4. **口調変化通知**: レベルアップ時のアニメーション

### 口調変化通知

```typescript
// レベルアップ時の通知生成
{
  hasChanged: true,
  message: "関係性が深まりました！ 時々タメ口を交えた親しみやすい口調になりました♡",
  oldTone: "少しだけ砕けた丁寧語",
  newTone: "時々タメ口を交えた親しみやすい口調",
  newColor: "#3B82F6",
  animation: "heartUp"
}
```

---

## 🚀 パフォーマンス最適化

### プロンプトキャッシュシステム

```typescript
// CharacterPromptCache の活用
const cachedPrompt = await CharacterPromptCache.findCachedPrompt(
  userId,
  characterId,
  intimacyLevel
);

// キャッシュヒット時はAPI生成をスキップ
if (cachedPrompt && cachedPrompt.isValid) {
  return cachedPrompt.systemPrompt;
}
```

### キャッシュ戦略

- **TTL**: 30日間の自動期限切れ
- **バージョン管理**: キャラクター更新時の自動無効化
- **使用頻度**: 利用回数に基づくTTL延長
- **親密度範囲**: ±5レベル許容でヒット率向上

---

## 📊 データ分析・監視

### ムード統計

```typescript
// ムード発生頻度の分析
const moodStats = {
  excited: 45%,    // レベルアップ・ギフト時
  shy: 25%,        // 褒め言葉・親密な話題
  playful: 20%,    // ジョーク・軽い会話
  melancholic: 10% // ネガティブ内容・長期離脱
};
```

### 口調進行分析

```typescript
// 親密度レベル分布
const intimacyDistribution = {
  formal: 30%,      // 新規ユーザー・初期段階
  polite: 25%,      // 慣れ始めの段階
  friendly: 25%,    // 定期利用ユーザー
  casual: 15%,      // ヘビーユーザー
  intimate: 5%      // 長期継続ユーザー
};
```

---

## 🔧 設定・カスタマイズ

### 口調テンプレート追加

```typescript
// 新しい口調レベルの追加例
export const TONE_CONFIGS = {
  // 既存の5段階 + 拡張可能
  newTone: {
    level: 50,
    name: "カスタム口調",
    promptTemplate: "カスタムプロンプト...",
    // その他設定...
  }
};
```

### ムード修正子のカスタマイズ

```typescript
// 新しいムードタイプの追加
export const MOOD_MODIFIERS = {
  // 既存の4種類 + 拡張可能
  romantic: {
    type: 'romantic',
    promptAddition: 'ロマンチックで甘い雰囲気...'
  }
};
```

---

## 🧪 テスト・デバッグ

### デバッグ機能

```typescript
// デバッグモードでの詳細ログ
if (options.debugMode) {
  console.log('=== Chat Tone Debug ===');
  console.log(`Intimacy: ${intimacyLevel}, Tone: ${toneConfig.toneStyle}`);
  console.log(`Moods: ${moodModifiers.map(m => m.type).join(', ')}`);
  console.log(`Relationship: ${toneConfig.relationshipStatus}`);
}
```

### テストケース例

```typescript
// 口調変化のテスト
describe('Tone System', () => {
  it('should return formal tone for intimacy level 0', () => {
    const result = generateTonePrompt(0, []);
    expect(result.toneStyle).toBe('formal');
    expect(result.relationshipStatus).toBe('stranger');
  });
  
  it('should apply excited mood modifier', () => {
    const mood = createMoodModifier('excited', 0.8, 30);
    const result = generateTonePrompt(50, [mood]);
    expect(result.moodAdjustedPrompt).toContain('元気で弾むような');
  });
});
```

---

## 📈 今後の拡張予定

### Phase 1: 基本機能強化
- [ ] より複雑なキーワード検知（自然言語処理活用）
- [ ] 個別キャラクター固有の口調カスタマイズ
- [ ] ムード組み合わせ（複数同時適用）

### Phase 2: AI学習活用
- [ ] ユーザー会話履歴からのムード自動学習
- [ ] 個人化された口調進行パターン
- [ ] 感情分析AIとの統合

### Phase 3: 高度な関係性表現
- [ ] 季節・時間帯による口調変化
- [ ] 特別イベント時の限定口調
- [ ] グループチャットでの関係性管理

---

## ⚠️ 注意事項・制約

### パフォーマンス
- **プロンプト長制限**: OpenAI制限（8000文字）を考慮
- **キャッシュ効率**: 親密度±5レベル範囲でのヒット率最適化
- **メモリ使用量**: ムード修正子の期限切れ自動削除

### セキュリティ
- **入力検証**: ムードタイプ・親密度レベルの範囲チェック
- **異常検知**: 極端な親密度変化の監視
- **不適切内容**: ムード修正による不適切プロンプト生成の防止

### 経済性
- **API費用**: 口調変化による追加トークン使用量の監視
- **キャッシュROI**: プロンプトキャッシュによる費用削減効果測定
- **50%利益ルール**: 口調強化機能でも利益率維持

---

## 📚 参考資料

- [charactier-spec.md](./charactier-spec.md) - 全体仕様書
- [Character Model Schema](../backend/models/Character.js) - キャラクターデータ構造
- [User Affinity System](../backend/models/User.js) - 親密度管理
- [OpenAI API Documentation](https://platform.openai.com/docs) - API制限・仕様

---

**最終更新**: 2024年12月 | **バージョン**: 1.0.0 | **担当**: Backend Team