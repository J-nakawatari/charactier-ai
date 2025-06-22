#!/usr/bin/env node

/**
 * 🔧 キャラクター統計更新スクリプト
 * 
 * 目的: キャラクター別のチャット数・ユーザー数・親密度を正確に計算・更新
 */

const mongoose = require('mongoose');
require('dotenv').config();

// モデルの定義
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

const CharacterSchema = new mongoose.Schema({
  name: {
    ja: String,
    en: String
  },
  totalMessages: { type: Number, default: 0 },
  totalUsers: { type: Number, default: 0 },
  averageAffinityLevel: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
});

const CharacterModel = mongoose.model('Character', CharacterSchema);

const UserSchema = new mongoose.Schema({
  affinities: [{
    character: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
    level: Number
  }]
});

const UserModel = mongoose.model('User', UserSchema);

async function updateCharacterStats() {
  try {
    console.log('🔧 キャラクター統計更新開始...');
    
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      throw new Error('環境変数MONGO_URIが設定されていません');
    }
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ データベース接続成功');

    // 全キャラクターを取得
    const characters = await CharacterModel.find({});
    console.log(`📊 ${characters.length}体のキャラクターを処理中...`);

    let updatedCount = 0;

    for (const character of characters) {
      console.log(`\n🎭 ${character.name?.ja || character.name || 'Unnamed'} (${character._id})`);

      // 1. このキャラクターに関連するチャット統計を集計
      const chats = await ChatModel.find({ characterId: character._id });
      console.log(`  💬 チャット件数: ${chats.length}件`);

      // 2. チャット統計を手動で集計
      let totalMessages = 0;
      const uniqueUsers = new Set();
      
      for (const chat of chats) {
        uniqueUsers.add(chat.userId);
        totalMessages += chat.messages.length;
      }

      console.log(`  📝 総メッセージ数: ${totalMessages}件`);
      console.log(`  👥 ユニークユーザー数: ${uniqueUsers.size}人`);

      // 3. ユーザーごとの親密度を集計
      let affinityStats = [];
      try {
        affinityStats = await UserModel.aggregate([
          { $unwind: '$affinities' },
          { $match: { 'affinities.character': character._id } },
          { $group: {
            _id: null,
            avgLevel: { $avg: '$affinities.level' },
            totalUsers: { $sum: 1 },
            maxLevel: { $max: '$affinities.level' }
          }}
        ]);
      } catch (affinityError) {
        console.log(`  ⚠️ 親密度データ取得エラー: ${affinityError.message}`);
      }

      const affinityData = affinityStats[0] || { avgLevel: 0, totalUsers: 0, maxLevel: 0 };
      console.log(`  💖 平均親密度: ${affinityData.avgLevel.toFixed(1)}`);

      // 4. キャラクターの統計を更新
      const updateResult = await CharacterModel.updateOne(
        { _id: character._id },
        {
          $set: {
            totalMessages: totalMessages,
            totalUsers: uniqueUsers.size,
            averageAffinityLevel: Number(affinityData.avgLevel.toFixed(1))
          }
        }
      );

      if (updateResult.modifiedCount > 0) {
        console.log(`  ✅ 統計更新完了`);
        updatedCount++;
      } else {
        console.log(`  ⏭️ 更新スキップ（変更なし）`);
      }
    }

    // 5. 更新結果をサマリー
    console.log('\n📋 更新サマリー:');
    console.log(`  📊 処理対象: ${characters.length}体`);
    console.log(`  ✅ 更新完了: ${updatedCount}体`);
    console.log(`  ⏭️ スキップ: ${characters.length - updatedCount}体`);

    // 6. 更新後の全体統計
    const totalStats = await CharacterModel.aggregate([
      {
        $group: {
          _id: null,
          totalCharacters: { $sum: 1 },
          totalMessages: { $sum: '$totalMessages' },
          totalUsers: { $sum: '$totalUsers' },
          avgAffinity: { $avg: '$averageAffinityLevel' },
          activeCharacters: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      }
    ]);

    if (totalStats.length > 0) {
      const stats = totalStats[0];
      console.log('\n🎉 全体統計:');
      console.log(`  🎭 総キャラクター数: ${stats.totalCharacters}体`);
      console.log(`  📝 総メッセージ数: ${stats.totalMessages}件`);
      console.log(`  👥 総ユーザー数: ${stats.totalUsers}人`);
      console.log(`  💖 平均親密度: ${stats.avgAffinity.toFixed(1)}`);
      console.log(`  🟢 アクティブキャラクター: ${stats.activeCharacters}体`);
    }

    // 7. 管理画面でのキャラクター統計API呼び出しのテスト
    console.log('\n🔍 キャラクター統計API更新テスト...');
    
    // API呼び出しをシミュレート（実際のHTTPリクエストではなく直接データベース操作）
    const simulatedApiResult = {
      success: true,
      updated: updatedCount,
      stats: {
        totalCharacters: characters.length,
        totalMessages: totalStats[0]?.totalMessages || 0,
        averageMessages: characters.length > 0 ? Math.round((totalStats[0]?.totalMessages || 0) / characters.length) : 0
      }
    };

    console.log('📊 シミュレートされたAPI結果:');
    console.log(JSON.stringify(simulatedApiResult, null, 2));

  } catch (error) {
    console.error('❌ 処理エラーが発生:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 処理完了');
  }
}

// 直接実行の場合
if (require.main === module) {
  updateCharacterStats();
}

module.exports = { updateCharacterStats };