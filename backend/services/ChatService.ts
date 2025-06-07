import { 
  generateTonePrompt, 
  createMoodModifier,
  cleanupExpiredMoods,
  detectMoodFromMessage,
  getToneByAffinityLevel,
  ToneResult,
  MoodModifier 
} from '../utils/toneSystem';
import User from '../models/User';
import Character from '../models/Character';
import CharacterPromptCache from '../models/CharacterPromptCache';
import TokenUsage from '../models/TokenUsage';
import { OpenAI } from 'openai';

/**
 * ChatService - チャット機能とトーン管理の統合サービス
 */
export class ChatService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * キャラクター応答生成（トーン自動適用）
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
  }> {
    try {
      // 1. ユーザーとキャラクター情報取得
      const [user, character] = await Promise.all([
        User.findById(userId).populate('affinities'),
        Character.findById(characterId)
      ]);

      if (!user || !character) {
        throw new Error('User or Character not found');
      }

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

      // 4. トーン設定生成（新しいgenerateTonePrompt使用）
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

      // 5. システムプロンプト構築（キャッシュ優先）
      const systemPrompt = await this.buildSystemPrompt(
        userId,
        characterId,
        toneConfig,
        character,
        options.forceRefresh
      );

      // 6. OpenAI API呼び出し
      const startTime = Date.now();
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

      const generationTime = Date.now() - startTime;
      const response = completion.choices[0]?.message?.content || '';

      // 7. トークン使用量・費用計算
      const tokensUsed = completion.usage?.total_tokens || 0;
      const inputTokens = completion.usage?.prompt_tokens || 0;
      const outputTokens = completion.usage?.completion_tokens || 0;
      
      const { apiCost, apiCostYen, profitMargin } = this.calculateCosts(
        character.model || 'gpt-3.5-turbo',
        inputTokens,
        outputTokens
      );

      // 8. 親密度変化計算
      const intimacyChange = this.calculateIntimacyChange(
        userMessage,
        response,
        intimacyLevel,
        moodModifiers
      );

      // 9. TokenUsage記録
      await this.recordTokenUsage({
        userId,
        characterId,
        sessionId,
        tokensUsed,
        inputTokens,
        outputTokens,
        messageContent: userMessage,
        responseContent: response,
        model: character.model || 'gpt-3.5-turbo',
        apiCost,
        apiCostYen,
        profitMargin,
        intimacyBefore: intimacyLevel,
        intimacyAfter: intimacyLevel + intimacyChange,
        affinityChange: intimacyChange,
        userAgent: 'ChatService',
        ipAddress: '127.0.0.1', // 実際の実装では req.ip を使用
        platform: 'web'
      });

      // 10. 親密度・ムード修正子の更新
      await this.updateAffinityAndMoods(
        userId,
        characterId,
        intimacyChange,
        moodModifiers
      );

      return {
        response,
        toneConfig,
        tokensUsed,
        apiCost: apiCostYen,
        intimacyChange,
        toneStyle: toneConfig.toneStyle,
        moodModifiers: moodModifiers,
        relationshipStatus: toneConfig.relationshipStatus,
        uiColor: toneConfig.uiColor
      };

    } catch (error) {
      console.error('Chat generation error:', error);
      throw error;
    }
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

    // 新しいプロンプト構築（generateTonePromptの結果を使用）
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
    try {
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
    } catch (cacheError) {
      console.warn('Failed to save prompt cache:', cacheError);
    }

    return finalSystemPrompt;
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
    
    if (character.age) {
      info.push(`年齢: ${character.age}`);
    }
    
    if (character.occupation) {
      info.push(`職業: ${character.occupation}`);
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
    // 簡単なキーワードベースの検知
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

    // ムード修正子による調整
    const excitedMood = moodModifiers.find(m => m.type === 'excited');
    if (excitedMood) baseChange += 0.3;

    // 親密度レベルによる減衰
    if (currentIntimacy > 80) baseChange *= 0.5;
    else if (currentIntimacy > 60) baseChange *= 0.7;
    else if (currentIntimacy > 40) baseChange *= 0.9;

    return Math.max(0, Math.min(5, baseChange)); // 0-5の範囲に制限
  }

  /**
   * コスト計算
   */
  private calculateCosts(model: string, inputTokens: number, outputTokens: number) {
    const pricing = {
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }, // per 1K tokens
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 }
    };

    const rates = pricing[model as keyof typeof pricing] || pricing['gpt-3.5-turbo'];
    const apiCost = (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
    const apiCostYen = apiCost * 150; // USD to JPY (概算)
    
    // 50%利益ルール（仮の売上設定）
    const assumedRevenue = apiCostYen * 2.5; // 想定売上
    const profitMargin = (assumedRevenue - apiCostYen) / assumedRevenue;

    return { apiCost, apiCostYen, profitMargin };
  }

  /**
   * TokenUsage記録
   */
  private async recordTokenUsage(data: any) {
    try {
      const tokenUsage = new TokenUsage({
        ...data,
        tokenType: 'chat_message',
        experienceGained: Math.floor(data.affinityChange * 10), // 親密度変化 × 10
        createdAt: new Date(),
        processedAt: new Date()
      });

      await tokenUsage.save();
    } catch (error) {
      console.error('Failed to record token usage:', error);
    }
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
   * トーン変化通知生成（フロントエンド用）
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