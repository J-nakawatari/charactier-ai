#!/usr/bin/env node

/**
 * 🔍 チャット数統計分析スクリプト
 * 
 * 目的: 管理画面でのチャット数表示問題を調査・分析
 */

const mongoose = require('mongoose');
require('dotenv').config();

// ChatModelの定義
const MessageSchema = new mongoose.Schema({
  _id: String,
  role: { type: String, enum: ['user', 'assistant'] },
  content: String,
  timestamp: { type: Date, default: Date.now },
  tokensUsed: { type: Number, default: 0 }
}, { _id: false });

const ChatSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character', required: true },
  messages: [MessageSchema],
  totalTokensUsed: { type: Number, default: 0 },
  currentAffinity: { type: Number, default: 0 },
  lastActivityAt: { type: Date, default: Date.now }
}, { timestamps: true });

const ChatModel = mongoose.model('Chat', ChatSchema);

// UserModelの簡略版
const UserSchema = new mongoose.Schema({
  email: String,
  totalChatMessages: Number
});

const UserModel = mongoose.model('User', UserSchema);

async function analyzeChatCounts() {
  try {
    console.log('🔍 チャット数統計分析開始...');
    
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      throw new Error('環境変数MONGO_URIが設定されていません');
    }
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ データベース接続成功');

    console.log('\n📊 現在のチャット統計...');

    // 1. ChatModelから直接統計を取得
    const totalChats = await ChatModel.countDocuments();
    console.log(`💬 総チャット数: ${totalChats}件`);

    // 2. 総メッセージ数（Chat内のメッセージ配列の合計）
    const messageStats = await ChatModel.aggregate([
      {
        $project: {
          messageCount: { $size: '$messages' },
          userId: 1,
          characterId: 1,
          lastActivityAt: 1
        }
      },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: '$messageCount' },
          totalChats: { $sum: 1 },
          averageMessagesPerChat: { $avg: '$messageCount' }
        }
      }
    ]);

    if (messageStats.length > 0) {
      const stats = messageStats[0];
      console.log(`📝 総メッセージ数: ${stats.totalMessages}件`);
      console.log(`💬 チャット数 (集計): ${stats.totalChats}件`);
      console.log(`📈 平均メッセージ数/チャット: ${stats.averageMessagesPerChat.toFixed(1)}件`);
    }

    // 3. ユーザー別のチャット統計
    const userChatStats = await ChatModel.aggregate([
      {
        $group: {
          _id: '$userId',
          chatCount: { $sum: 1 },
          totalMessages: { $sum: { $size: '$messages' } },
          lastActivity: { $max: '$lastActivityAt' }
        }
      },
      {
        $sort: { totalMessages: -1 }
      },
      {
        $limit: 10
      }
    ]);

    console.log('\n👥 ユーザー別チャット統計 (上位10件):');
    userChatStats.forEach((user, index) => {
      console.log(`  ${index + 1}. ユーザー: ${user._id}`);
      console.log(`     チャット数: ${user.chatCount}件`);
      console.log(`     メッセージ数: ${user.totalMessages}件`);
      console.log(`     最終活動: ${user.lastActivity.toISOString().substring(0, 10)}`);
    });

    // 4. キャラクター別のチャット統計
    const characterChatStats = await ChatModel.aggregate([
      {
        $group: {
          _id: '$characterId',
          chatCount: { $sum: 1 },
          totalMessages: { $sum: { $size: '$messages' } },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          chatCount: 1,
          totalMessages: 1,
          uniqueUserCount: { $size: '$uniqueUsers' }
        }
      },
      {
        $sort: { totalMessages: -1 }
      },
      {
        $limit: 5
      }
    ]);

    console.log('\n🎭 キャラクター別チャット統計 (上位5件):');
    characterChatStats.forEach((char, index) => {
      console.log(`  ${index + 1}. キャラクターID: ${char._id}`);
      console.log(`     チャット数: ${char.chatCount}件`);
      console.log(`     メッセージ数: ${char.totalMessages}件`);
      console.log(`     ユニークユーザー数: ${char.uniqueUserCount}人`);
    });

    // 5. UserModelのtotalChatMessagesとの比較
    console.log('\n🔍 UserModel統計との比較...');
    const userModelStats = await UserModel.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalChatMessagesSum: { $sum: '$totalChatMessages' },
          avgChatMessages: { $avg: '$totalChatMessages' }
        }
      }
    ]);

    if (userModelStats.length > 0) {
      const userStats = userModelStats[0];
      console.log(`👥 総ユーザー数: ${userStats.totalUsers}人`);
      console.log(`📝 UserModel総チャットメッセージ: ${userStats.totalChatMessagesSum || 0}件`);
      console.log(`📈 UserModel平均チャットメッセージ: ${(userStats.avgChatMessages || 0).toFixed(1)}件`);
      
      // 差異の確認
      const chatModelMessages = messageStats[0]?.totalMessages || 0;
      const userModelMessages = userStats.totalChatMessagesSum || 0;
      const difference = chatModelMessages - userModelMessages;
      
      console.log('\n⚖️ 統計の差異:');
      console.log(`ChatModel総メッセージ: ${chatModelMessages}件`);
      console.log(`UserModel総メッセージ: ${userModelMessages}件`);
      console.log(`差異: ${difference}件`);
      
      if (Math.abs(difference) > 10) {
        console.log('⚠️ 大きな差異が検出されました。データ同期が必要な可能性があります。');
      } else {
        console.log('✅ 統計データは概ね一致しています。');
      }
    }

    // 6. 管理画面で表示すべき推奨統計
    console.log('\n📋 管理画面推奨統計:');
    console.log(`  📊 総チャット数: ${totalChats}件`);
    console.log(`  💬 総メッセージ数: ${messageStats[0]?.totalMessages || 0}件`);
    console.log(`  👥 アクティブユーザー数: ${userChatStats.length}人`);
    console.log(`  🎭 アクティブキャラクター数: ${characterChatStats.length}体`);

    // 7. 24時間以内のアクティビティ
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = await ChatModel.aggregate([
      {
        $match: { lastActivityAt: { $gte: twentyFourHoursAgo } }
      },
      {
        $group: {
          _id: null,
          recentChats: { $sum: 1 },
          recentMessages: { $sum: { $size: '$messages' } }
        }
      }
    ]);

    if (recentActivity.length > 0) {
      const recent = recentActivity[0];
      console.log('\n🕐 24時間以内のアクティビティ:');
      console.log(`  💬 アクティブチャット: ${recent.recentChats}件`);
      console.log(`  📝 新規メッセージ: ${recent.recentMessages}件`);
    }

  } catch (error) {
    console.error('❌ 分析エラーが発生:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 分析完了');
  }
}

// 直接実行の場合
if (require.main === module) {
  analyzeChatCounts();
}

module.exports = { analyzeChatCounts };