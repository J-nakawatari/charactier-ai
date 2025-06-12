import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserModel } from '../src/models/UserModel';

dotenv.config({ path: './.env' });

async function updateExistingUsers() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is required');
    }

    mongoose.set('bufferCommands', false);
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 30000
    });
    console.log('🍃 MongoDB connected successfully');

    // 名前が設定されているユーザー（既にセットアップ完了と見なす）
    const usersWithNames = await UserModel.find({
      name: { $exists: true, $ne: '' },
      isSetupComplete: { $ne: true }
    });

    console.log(`🔍 Found ${usersWithNames.length} users with names but incomplete setup`);

    if (usersWithNames.length > 0) {
      // 名前があるユーザーのisSetupCompleteをtrueに更新
      const updateResult = await UserModel.updateMany(
        {
          name: { $exists: true, $ne: '' },
          isSetupComplete: { $ne: true }
        },
        {
          isSetupComplete: true
        }
      );

      console.log(`✅ Updated ${updateResult.modifiedCount} users to setup complete`);
    }

    // セットアップ未完了ユーザーも確認
    const incompleteUsers = await UserModel.find({
      $or: [
        { name: { $exists: false } },
        { name: '' },
        { name: null },
        { isSetupComplete: false }
      ]
    }).select('_id name email isSetupComplete');

    console.log(`📊 Users still needing setup: ${incompleteUsers.length}`);
    incompleteUsers.forEach(user => {
      console.log(`  - ${user.email}: name="${user.name}", setupComplete=${user.isSetupComplete}`);
    });

    await mongoose.disconnect();
    console.log('📝 マイグレーション完了');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

updateExistingUsers();