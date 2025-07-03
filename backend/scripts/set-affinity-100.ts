#!/usr/bin/env ts-node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserModel } from '../src/models/UserModel';
import { ChatModel } from '../src/models/ChatModel';

dotenv.config();

async function setAffinityTo100(userEmail: string, characterId: string) {
  try {
    // MongoDB接続
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('Connected to MongoDB');

    // ユーザーを検索
    const user = await UserModel.findOne({ email: userEmail });
    if (!user) {
      console.error('User not found');
      return;
    }

    console.log(`Found user: ${user.name} (${user._id})`);

    // 親密度データを更新
    const affinityIndex = user.affinities.findIndex(
      a => a.character.toString() === characterId
    );

    if (affinityIndex === -1) {
      // 新規作成
      user.affinities.push({
        character: new mongoose.Types.ObjectId(characterId),
        characterId: new mongoose.Types.ObjectId(characterId),
        level: 100,
        experience: 0,
        experienceToNext: 0,
        maxExperience: 100,
        emotionalState: 'happy',
        relationshipType: 'lover',
        trustLevel: 100,
        intimacyLevel: 100,
        totalConversations: 10,
        totalMessages: 100,
        lastInteraction: new Date(),
        currentStreak: 1,
        maxStreak: 10,
        consecutiveDays: 1,
        favoriteTopics: [],
        specialMemories: [],
        personalNotes: '',
        giftsReceived: [],
        totalGiftsValue: 0,
        unlockedRewards: [],
        unlockedImages: [
          { imageId: 'level10', unlockedAt: new Date() },
          { imageId: 'level20', unlockedAt: new Date() },
          { imageId: 'level30', unlockedAt: new Date() },
          { imageId: 'level40', unlockedAt: new Date() },
          { imageId: 'level50', unlockedAt: new Date() },
          { imageId: 'level60', unlockedAt: new Date() },
          { imageId: 'level70', unlockedAt: new Date() },
          { imageId: 'level80', unlockedAt: new Date() },
          { imageId: 'level90', unlockedAt: new Date() },
          { imageId: 'level100', unlockedAt: new Date() }
        ],
        nextRewardLevel: 110,
        nextUnlockLevel: 110,
        moodHistory: [],
        currentMoodModifiers: []
      } as any);
    } else {
      // 既存を更新
      user.affinities[affinityIndex].level = 100;
      user.affinities[affinityIndex].relationshipType = 'lover';
      user.affinities[affinityIndex].trustLevel = 100;
      user.affinities[affinityIndex].intimacyLevel = 100;
    }

    await user.save();
    console.log('User affinity updated');

    // チャットドキュメントを更新または作成
    await ChatModel.findOneAndUpdate(
      {
        userId: user._id.toString(),
        characterId: new mongoose.Types.ObjectId(characterId)
      },
      {
        $set: {
          currentAffinity: 100,
          totalTokensUsed: 0,
          lastActivityAt: new Date(),
          updatedAt: new Date()
        },
        $setOnInsert: {
          messages: [],
          createdAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    console.log('Chat document updated');
    console.log('✅ Successfully set affinity to 100');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// コマンドライン引数から取得
const [,, userEmail, characterId] = process.argv;

if (!userEmail || !characterId) {
  console.log('Usage: npm run set-affinity <userEmail> <characterId>');
  console.log('Example: npm run set-affinity user@example.com 68642318db24e0c091c044af');
  process.exit(1);
}

setAffinityTo100(userEmail, characterId);