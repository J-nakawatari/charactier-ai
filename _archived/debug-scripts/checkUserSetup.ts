import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserModel } from '../src/models/UserModel';

dotenv.config({ path: './.env' });

async function checkUserSetup() {
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

    // 特定のユーザーを確認（designroommaster@gmail.com）
    const user = await UserModel.findOne({ 
      email: 'designroommaster@gmail.com' 
    }).select('_id name email isSetupComplete tokenBalance');

    if (user) {
      console.log('👤 User found:');
      console.log('  - ID:', user._id.toString());
      console.log('  - Name:', user.name);
      console.log('  - Email:', user.email);
      console.log('  - isSetupComplete:', user.isSetupComplete);
      console.log('  - Token Balance:', user.tokenBalance);
      
      // isSetupCompleteがundefinedの場合、trueに設定
      if (user.isSetupComplete === undefined || user.isSetupComplete === null) {
        console.log('⚠️ isSetupComplete is undefined/null, updating to true...');
        await UserModel.findByIdAndUpdate(user._id, { isSetupComplete: true });
        console.log('✅ Updated isSetupComplete to true');
      }
    } else {
      console.log('❌ User not found');
    }

    await mongoose.disconnect();
    console.log('📝 チェック完了');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

checkUserSetup();