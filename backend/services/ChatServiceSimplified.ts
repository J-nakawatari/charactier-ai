import { 
  generateTonePrompt, 
  createMoodModifier,
  cleanupExpiredMoods,
  detectMoodFromMessage,
  getToneByAffinityLevel,
  ToneResult,
  MoodModifier 
} from '../utils/toneSystem';
import { UserModel } from '../src/models/UserModel';
import { CharacterModel } from '../src/models/CharacterModel';
import { OpenAI } from 'openai';
const TokenService = require('../services/tokenService');

/**
 * ChatService - 簡素化版（50%利益保証対応）
 * GPT-4固定でシンプルなトークン管理を実現
 */
export class ChatServiceSimplified {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * キャラクター応答生成（簡素化版）
   * @param userId ユーザーID
   * @param characterId キャラクターID
   * @param userMessage ユーザーメッセージ
   * @param sessionId セッションID
   * @param options オプション
   * @returns 応答結果
   */
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
    userTokenBalance: number;
  }> {
    try {
      // 1. 事前トークン残高確認
      const initialTokenBalance = await TokenService.getUserTokenBalance(userId);
      if (initialTokenBalance <= 0) {
        throw new Error('トークンが不足しています。追加購入してください。');
      }

      // 2. ユーザーとキャラクター情報取得
      const [user, character] = await Promise.all([
        User.findById(userId).populate('affinities'),
        Character.findById(characterId)
      ]);

      if (!user || !character) {
        throw new Error('User or Character not found');
      }

      // 3. 親密度情報取得
      const affinity = user.affinities.find(
        (aff: any) => aff.character.toString() === characterId
      );
      const intimacyLevel = affinity?.intimacyLevel || 0;

      // 4. ムード修正子の処理
      let moodModifiers: MoodModifier[] = affinity?.currentMoodModifiers || [];
      
      // 期限切れムードをクリーンアップ
      moodModifiers = cleanupExpiredMoods(moodModifiers);

      // 新しいムードの追加（メッセージから自動検知）
      const autoDetectedMood = detectMoodFromMessage(userMessage, intimacyLevel);
      if (autoDetectedMood) {
        moodModifiers.push(autoDetectedMood);
      }

      // 手動トリガーでムード追加
      if (options.triggerMood) {
        const newMood = this.detectAndCreateMood(
          options.triggerMood, 
          userMessage, 
          intimacyLevel
        );
        if (newMood) {
          moodModifiers.push(newMood);
        }
      }

      // 5. トーン設定生成
      const toneConfig = generateTonePrompt(
        intimacyLevel,
        moodModifiers,
        character.personalityPrompt?.ja || character.personalityPrompt
      );

      if (options.debugMode) {
        console.log('=== Chat Tone Debug ===');
        console.log(`User: ${userId}, Character: ${characterId}`);
        console.log(`Intimacy: ${intimacyLevel}, Tone: ${toneConfig.toneStyle}`);
        console.log(`Moods: ${moodModifiers.map(m => m.type).join(', ')}`);
        console.log(`Relationship: ${toneConfig.relationshipStatus}`);
      }

      // 6. システムプロンプト構築
      const systemPrompt = await this.buildSystemPrompt(
        userId,
        characterId,
        toneConfig,
        character,
        options.forceRefresh
      );

      // 7. OpenAI API呼び出し（GPT-4固定）
      const startTime = Date.now();
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4', // GPT-4に固定（利益計算の簡素化）
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

      const generationTime = Date.now() - startTime;
      const response = completion.choices[0]?.message?.content || '';

      // 8. トークン使用量・費用計算（簡素化版）
      const tokensUsed = completion.usage?.total_tokens || 0;
      const gpt4CostPerTokenYen = parseFloat(process.env.GPT4_COST_PER_TOKEN_YEN || '0.216');
      const apiCost = tokensUsed * gpt4CostPerTokenYen;

      // 9. 親密度変化計算
      const intimacyChange = this.calculateIntimacyChange(
        userMessage,
        response,
        intimacyLevel,
        moodModifiers
      );

      // 10. トークン使用処理（TokenService統合）
      await TokenService.useTokens(
        userId,
        characterId,
        tokensUsed,
        userMessage
      );

      // 11. 親密度・ムード修正子の更新
      await this.updateAffinityAndMoods(
        userId,
        characterId,
        intimacyChange,
        moodModifiers
      );

      // 12. 最新のトークン残高を取得
      const finalTokenBalance = await TokenService.getUserTokenBalance(userId);

      return {
        response,
        toneConfig,
        tokensUsed,
        apiCost,
        intimacyChange,
        toneStyle: toneConfig.toneStyle,
        moodModifiers: moodModifiers,
        relationshipStatus: toneConfig.relationshipStatus,
        uiColor: toneConfig.uiColor,
        userTokenBalance: finalTokenBalance
      };

    } catch (error) {
      console.error('Chat generation error:', error);
      throw error;
    }
  }

  /**
   * シンプル版メッセージ送信（基本機能のみ）
   * @param userId ユーザーID
   * @param characterId キャラクターID
   * @param message メッセージ
   * @returns 送信結果
   */
  async sendMessage(
    userId: string,
    characterId: string,
    message: string
  ): Promise<{
    reply: string;
    tokensUsed: number;
    remainingBalance: number;
    intimacyChange: number;
    relationshipStatus: string;
  }> {
    try {
      // 1. トークン残高確認
      const userBalance = await TokenService.getUserTokenBalance(userId);
      
      if (userBalance <= 0) {
        throw new Error('トークンが不足しています。追加購入してください。');
      }

      // 2. キャラクター情報取得
      const character = await Character.findById(characterId);
      if (!character) {
        throw new Error('Character not found');
      }

      // 3. 基本的なキャラクタープロンプト構築
      const characterPrompt = this.buildBasicCharacterPrompt(character);

      // 4. GPT-4でメッセージ処理
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4', // 固定
        messages: [
          { role: 'system', content: characterPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 300,
        temperature: 0.8
      });

      // 5. 使用トークン数を計算
      const tokensUsed = response.usage?.total_tokens || 0;

      // 6. トークンを消費
      await TokenService.useTokens(userId, characterId, tokensUsed, message);

      // 7. 簡単な親密度変化計算
      const intimacyChange = this.calculateSimpleIntimacyChange(message);

      return {
        reply: response.choices[0]?.message?.content || '',
        tokensUsed,
        remainingBalance: userBalance - tokensUsed,
        intimacyChange,
        relationshipStatus: 'normal'
      };

    } catch (error) {
      console.error('❌ チャット処理エラー:', error);
      throw error;
    }
  }

  /**
   * 基本的なキャラクタープロンプト構築
   */
  private buildBasicCharacterPrompt(character: any): string {
    const info = [];
    
    info.push(`あなたは「${character.name?.ja || character.name}」という名前のキャラクターです。`);
    
    if (character.description?.ja || character.description) {
      info.push(`説明: ${character.description?.ja || character.description}`);
    }
    
    if (character.personalityPreset) {
      info.push(`性格タイプ: ${character.personalityPreset}`);
    }
    
    info.push('優しく、寄り添うような性格で、相手の感情に共感しながら対話を進めます。');
    info.push('決して上から目線でアドバイスをすることはなく、');
    info.push('あくまで"話を聞いてあげる""気持ちに寄り添う"スタンスを大切にしてください。');

    return info.join('\n');
  }

  /**
   * システムプロンプト構築（キャッシュ活用）
   */
  private async buildSystemPrompt(
    userId: string,
    characterId: string,
    toneConfig: ToneResult,
    character: any,
    forceRefresh: boolean = false
  ): Promise<string> {
    if (!forceRefresh) {
      // キャッシュ検索
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

    // キャッシュに保存
    try {
      const cacheData = new CharacterPromptCache({
        userId,
        characterId,
        systemPrompt: systemPrompt,
        promptConfig: {
          affinityLevel: toneConfig.debugInfo?.intimacyLevel || 0,
          personalityTags: character.personalityTags || [],
          toneStyle: toneConfig.toneStyle,
          moodModifiers: [],
          languageCode: 'ja'
        },
        generationTime: 0,
        characterVersion: character.version || '1.0.0',
        promptVersion: '1.0.0'
      });

      await cacheData.save();
    } catch (cacheError) {
      console.warn('Failed to save prompt cache:', cacheError);
    }

    return systemPrompt;
  }

  /**
   * ベースプロンプト取得
   */
  private getBasePrompt(): string {
    return `あなたは「キャラクター名」という名前のキャラクターです。
優しく、寄り添うような性格で、相手の感情に共感しながら対話を進めます。
決して上から目線でアドバイスをすることはなく、
あくまで"話を聞いてあげる""気持ちに寄り添う"スタンスを大切にしてください。

相手の発言が否定的であっても、受け止めるようなリアクションを返してください。
自分の意見は押しつけず、「その気持ち、わかるよ」といった共感ベースの対応を重視してください。`;
  }

  /**
   * キャラクター情報構築
   */
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

    return info.join('\n');
  }

  /**
   * ムード検知・作成
   */
  private detectAndCreateMood(
    trigger: string,
    userMessage: string,
    intimacyLevel: number
  ): MoodModifier | null {
    const message = userMessage.toLowerCase();
    
    if (trigger === 'level_up' || message.includes('おめでとう')) {
      return createMoodModifier('excited', 0.8, 30);
    }
    
    if (trigger === 'compliment' || message.includes('可愛い') || message.includes('素敵')) {
      return createMoodModifier('shy', 0.6, 15);
    }
    
    if (trigger === 'joke' || message.includes('笑') || message.includes('面白い')) {
      return createMoodModifier('playful', 0.7, 20);
    }
    
    if (trigger === 'sad' || message.includes('寂しい') || message.includes('悲しい')) {
      return createMoodModifier('melancholic', 0.5, 10);
    }

    return null;
  }

  /**
   * 親密度変化計算
   */
  private calculateIntimacyChange(
    userMessage: string,
    aiResponse: string,
    currentIntimacy: number,
    moodModifiers: MoodModifier[]
  ): number {
    let baseChange = 1; // 基本変化量

    // メッセージ長による調整
    if (userMessage.length > 100) baseChange += 0.5;
    if (userMessage.length > 300) baseChange += 0.5;

    // 感情的な内容による調整
    const positiveWords = ['ありがとう', '嬉しい', '好き', '素敵', '可愛い'];
    const negativeWords = ['嫌い', '怒り', 'むかつく', '最悪'];
    
    const positiveCount = positiveWords.filter(word => userMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => userMessage.includes(word)).length;
    
    baseChange += positiveCount * 0.5;
    baseChange -= negativeCount * 0.3;

    // 親密度レベルによる減衰
    if (currentIntimacy > 80) baseChange *= 0.5;
    else if (currentIntimacy > 60) baseChange *= 0.7;
    else if (currentIntimacy > 40) baseChange *= 0.9;

    return Math.max(0, Math.min(5, baseChange)); // 0-5の範囲に制限
  }

  /**
   * 簡単な親密度変化計算
   */
  private calculateSimpleIntimacyChange(message: string): number {
    let change = 1;

    // 長いメッセージはより親密度が上がる
    if (message.length > 50) change += 0.5;
    if (message.length > 100) change += 0.5;

    // ポジティブな単語
    const positiveWords = ['ありがとう', '嬉しい', '好き', '楽しい'];
    const positiveCount = positiveWords.filter(word => message.includes(word)).length;
    change += positiveCount * 0.3;

    return Math.min(3, change); // 最大3まで
  }

  /**
   * 親密度・ムード更新
   */
  private async updateAffinityAndMoods(
    userId: string,
    characterId: string,
    intimacyChange: number,
    moodModifiers: MoodModifier[]
  ) {
    try {
      await User.findOneAndUpdate(
        { 
          _id: userId,
          'affinities.character': characterId
        },
        {
          $inc: { 'affinities.$.intimacyLevel': intimacyChange },
          $set: { 
            'affinities.$.currentMoodModifiers': moodModifiers,
            'affinities.$.lastInteraction': new Date()
          }
        }
      );
    } catch (error) {
      console.error('Failed to update affinity:', error);
    }
  }

  /**
   * トーン変化通知生成
   */
  async getToneChangeNotification(
    userId: string,
    characterId: string,
    oldIntimacy: number,
    newIntimacy: number
  ) {
    const oldTone = getToneByAffinityLevel(oldIntimacy);
    const newTone = getToneByAffinityLevel(newIntimacy);

    if (oldTone.level !== newTone.level) {
      return {
        hasChanged: true,
        message: `関係性が深まりました！ ${newTone.name}になりました♡`,
        oldTone: oldTone.name,
        newTone: newTone.name,
        newColor: newTone.uiColor,
        animation: 'heartUp'
      };
    }

    return { hasChanged: false };
  }
}

// デフォルトエクスポート（既存システムとの互換性）
export { ChatServiceSimplified as ChatService };