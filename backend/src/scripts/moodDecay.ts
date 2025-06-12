import cron from 'node-cron';
import dayjs from 'dayjs';
import { cleanupExpiredMoodModifiers, applyMoodTrigger } from '../services/moodEngine';
import { UserModel } from '../models/UserModel';

/**
 * 気分の自然減衰とクリーンアップを実行するCronジョブ
 * 10分毎に実行される
 */
export function startMoodDecayJob(): void {
  console.log('🎭 Starting Mood Decay Cron Job (every 10 minutes)...');

  // 10分毎に実行
  cron.schedule('*/10 * * * *', async () => {
    try {
      console.log('🧹 Running mood decay cleanup...');
      
      // 失効済みの気分修飾子をクリーンアップ
      await cleanupExpiredMoodModifiers();
      
      console.log('✅ Mood decay cleanup completed');
      
    } catch (error) {
      console.error('❌ Error in mood decay job:', error);
    }
  });

  console.log('✅ Mood Decay Cron Job started successfully');
}

/**
 * 非アクティブユーザーの憂鬱トリガーを実行するCronジョブ
 * 毎日午前9時に実行される
 */
export function startInactivityMoodJob(): void {
  console.log('🎭 Starting Inactivity Mood Cron Job (daily at 9:00 AM)...');

  // 毎日午前9時に実行
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('😔 Checking for inactive users...');
      
      const sevenDaysAgo = dayjs().subtract(7, 'day').toDate();
      
      // 7日以上ログインしていないユーザーを検索
      const inactiveUsers = await UserModel.find({
        lastLogin: { $lt: sevenDaysAgo },
        isActive: true,
        affinities: { $exists: true, $not: { $size: 0 } }
      });

      let processedCount = 0;

      for (const user of inactiveUsers) {
        try {
          const daysSinceLastLogin = dayjs().diff(user.lastLogin, 'day');
          
          // 各キャラクターに対して非アクティブトリガーを適用
          for (const affinity of user.affinities) {
            await applyMoodTrigger(
              user._id.toString(),
              affinity.character.toString(),
              { kind: 'INACTIVITY', days: daysSinceLastLogin }
            );
          }
          
          processedCount++;
        } catch (userError) {
          console.error(`❌ Failed to process inactivity for user ${user._id}:`, userError);
        }
      }

      console.log(`✅ Inactivity mood check completed: ${processedCount} users processed`);
      
    } catch (error) {
      console.error('❌ Error in inactivity mood job:', error);
    }
  });

  console.log('✅ Inactivity Mood Cron Job started successfully');
}

/**
 * 全ての気分関連Cronジョブを開始
 */
export function startAllMoodJobs(): void {
  startMoodDecayJob();
  startInactivityMoodJob();
}