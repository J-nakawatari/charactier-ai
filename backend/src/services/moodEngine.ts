import { UserModel } from '../models/UserModel';
import dayjs from 'dayjs';
import log from '../utils/logger';

// MoodTrigger型定義
export type MoodTrigger =
  | { kind: 'GIFT'; value: number }
  | { kind: 'LEVEL_UP'; newLevel: number }
  | { kind: 'INACTIVITY'; days: number }
  | { kind: 'USER_SENTIMENT'; sentiment: 'pos' | 'neg' };

/**
 * 気分トリガーを適用してキャラクターの感情状態を更新
 * @param userId ユーザーID
 * @param characterId キャラクターID
 * @param trigger 気分トリガー
 */
export async function applyMoodTrigger(
  userId: string,
  characterId: string,
  trigger: MoodTrigger
): Promise<void> {
  try {
    log.info('Applying mood trigger', { userId, characterId, trigger });

    // ユーザーとキャラクターの親密度データを取得
    const user = await UserModel.findById(userId);
    if (!user) {
      log.error('User not found for mood trigger', { userId });
      return;
    }

    // キャラクターに対する親密度を検索
    const affinityIndex = user.affinities.findIndex(
      aff => aff.character.toString() === characterId
    );

    if (affinityIndex === -1) {
      log.error('Affinity not found for character', { characterId });
      return;
    }

    const affinity = user.affinities[affinityIndex];
    const now = new Date();

    // 履歴追加用ヘルパー関数
    const pushHistory = (mood: string, intensity: number, triggeredBy: string, duration: number) => {
      affinity.moodHistory.push({
        mood,
        intensity,
        triggeredBy,
        duration,
        createdAt: now
      });
    };

    // トリガー種別による処理
    switch (trigger.kind) {
      case 'GIFT':
        if (trigger.value >= 500) {
          // 高額ギフト（500円以上）で興奮状態に
          const strength = Math.min(trigger.value / 1000, 1); // 1000円で最大強度
          affinity.currentMoodModifiers.push({
            type: 'excited',
            strength,
            expiresAt: dayjs(now).add(30, 'minute').toDate()
          });
          pushHistory('happy', 8, 'gift', 30);
          log.debug('Gift mood applied', { type: 'excited', strength, duration: '30 minutes' });
        }
        break;

      case 'LEVEL_UP':
        // レベルアップで興奮状態に
        affinity.currentMoodModifiers.push({
          type: 'excited',
          strength: 0.8,
          expiresAt: dayjs(now).add(30, 'minute').toDate()
        });
        pushHistory('happy', 7, 'level_up', 30);
        log.debug('Level up mood applied', { type: 'excited', strength: 0.8, duration: '30 minutes' });
        break;

      case 'INACTIVITY':
        if (trigger.days >= 7) {
          // 7日以上の非アクティブで憂鬱状態に
          affinity.currentMoodModifiers.push({
            type: 'melancholic',
            strength: 0.6,
            expiresAt: dayjs(now).add(10, 'minute').toDate()
          });
          pushHistory('sad', 6, 'inactivity', 10);
          log.debug('Inactivity mood applied', { type: 'melancholic', strength: 0.6, duration: '10 minutes' });
        }
        break;

      case 'USER_SENTIMENT':
        if (trigger.sentiment === 'neg') {
          // ネガティブな感情で憂鬱状態に
          affinity.currentMoodModifiers.push({
            type: 'melancholic',
            strength: 0.4,
            expiresAt: dayjs(now).add(10, 'minute').toDate()
          });
          pushHistory('sad', 4, 'neg_msg', 10);
          log.debug('Negative sentiment mood applied', { type: 'melancholic', strength: 0.4, duration: '10 minutes' });
        }
        break;

      default:
        log.warn('Unknown mood trigger kind', { trigger });
        return;
    }

    // 失効済みのmodifierを除去
    affinity.currentMoodModifiers = affinity.currentMoodModifiers.filter(modifier =>
      dayjs(modifier.expiresAt).isAfter(now)
    );

    // 現在の気分を決定（最も強いmodifierに基づく）
    const activeModifiers = affinity.currentMoodModifiers
      .filter(modifier => dayjs(modifier.expiresAt).isAfter(now))
      .sort((a, b) => b.strength - a.strength);

    const strongestModifier = activeModifiers[0];
    const newEmotionalState = strongestModifier ? strongestModifier.type : 'neutral';
    
    // emotionalStateを更新
    if (affinity.emotionalState !== newEmotionalState) {
      log.info('Emotional state changed', {
        from: affinity.emotionalState,
        to: newEmotionalState,
        userId,
        characterId
      });
      affinity.emotionalState = newEmotionalState as 'happy' | 'excited' | 'calm' | 'sad' | 'angry' | 'neutral' | 'melancholic';
    }

    // 履歴を最新50件に制限
    if (affinity.moodHistory.length > 50) {
      affinity.moodHistory = affinity.moodHistory.slice(-50);
    }

    // データベースに保存
    await user.save();
    log.info('Mood trigger applied successfully', { userId, characterId });

  } catch (error) {
    log.error('Error applying mood trigger', error as Error, { userId, characterId });
    throw error;
  }
}

/**
 * 失効済みの気分修飾子をクリーンアップ
 * @param userId ユーザーID（省略時は全ユーザー）
 */
export async function cleanupExpiredMoodModifiers(userId?: string): Promise<void> {
  try {
    const now = new Date();
    const query = userId ? { _id: userId } : {};
    
    // 失効済みmodifierを持つユーザーを検索
    const usersWithExpiredModifiers = await UserModel.find({
      ...query,
      'affinities.currentMoodModifiers.expiresAt': { $lte: now }
    });

    let cleanedCount = 0;

    for (const user of usersWithExpiredModifiers) {
      let userChanged = false;

      for (const affinity of user.affinities) {
        const beforeCount = affinity.currentMoodModifiers.length;
        
        // 失効済みmodifierを除去
        affinity.currentMoodModifiers = affinity.currentMoodModifiers.filter(modifier =>
          dayjs(modifier.expiresAt).isAfter(now)
        );

        const afterCount = affinity.currentMoodModifiers.length;

        if (beforeCount !== afterCount) {
          userChanged = true;
          
          // 残っているmodifierがない場合はneutralに戻す
          if (affinity.currentMoodModifiers.length === 0 && affinity.emotionalState !== 'neutral') {
            log.debug('Resetting mood to neutral', {
              userId: user._id.toString(),
              characterId: affinity.character.toString()
            });
            affinity.emotionalState = 'neutral';
          }
        }
      }

      if (userChanged) {
        await user.save();
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      log.info('Cleaned up expired mood modifiers', { userCount: cleanedCount });
    }

  } catch (error) {
    log.error('Error cleaning up expired mood modifiers', error as Error);
    throw error;
  }
}

/**
 * ユーザーの現在の感情状態を取得
 * @param userId ユーザーID
 * @param characterId キャラクターID
 * @returns 現在の感情状態、またはnullが見つからない場合
 */
export async function getCurrentMood(userId: string, characterId: string): Promise<string | null> {
  try {
    const user = await UserModel.findById(userId);
    if (!user) return null;

    const affinity = user.affinities.find(
      aff => aff.character.toString() === characterId
    );

    return affinity ? affinity.emotionalState : null;
  } catch (error) {
    log.error('Error getting current mood', error as Error, { userId, characterId });
    return null;
  }
}