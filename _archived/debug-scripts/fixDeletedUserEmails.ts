import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserModel } from '../src/models/UserModel';

dotenv.config({ path: './.env' });

async function fixDeletedUserEmails() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('🍃 MongoDB connected');

    // 削除されたユーザー（isActive: false）を検索
    const deletedUsers = await UserModel.find({ 
      isActive: false 
    });

    console.log(`🔍 Found ${deletedUsers.length} deleted users`);

    if (deletedUsers.length === 0) {
      console.log('✅ No deleted users found');
      await mongoose.disconnect();
      return;
    }

    // 各削除されたユーザーのメールアドレスを変更
    for (const user of deletedUsers) {
      const timestamp = Date.now();
      const newEmail = `deleted_${timestamp}_${user._id}@deleted.local`;
      
      await UserModel.findByIdAndUpdate(user._id, {
        email: newEmail
      });
      
      console.log(`✅ Updated user ${user.name || 'Unknown'}: ${user.email} → ${newEmail}`);
    }

    console.log(`✅ Fixed ${deletedUsers.length} deleted user emails`);
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixDeletedUserEmails();