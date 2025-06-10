import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { UserModel } from '../backend/src/models/UserModel';

dotenv.config({ path: './.env' });

async function createAdminUser() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is required');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('🍃 MongoDB connected successfully');

    const adminEmail = 'admin@charactier.ai';
    const adminPassword = 'admin123';

    // 既存の管理者ユーザーをチェック
    const existingAdmin = await UserModel.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('⚠️  管理者ユーザーは既に存在します:', adminEmail);
      
      // 管理者権限を確認・更新
      if (!existingAdmin.isAdmin) {
        existingAdmin.isAdmin = true;
        await existingAdmin.save();
        console.log('✅ 既存ユーザーに管理者権限を付与しました');
      }
    } else {
      // パスワードをハッシュ化
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

      // 管理者ユーザーを作成
      const adminUser = new UserModel({
        name: '管理者',
        email: adminEmail,
        password: hashedPassword,
        isAdmin: true,
        tokenBalance: 0,
        isActive: true,
        preferredLanguage: 'ja'
      });

      await adminUser.save();
      console.log('✅ 管理者ユーザーを作成しました');
      console.log('📧 Email:', adminEmail);
      console.log('🔐 Password:', adminPassword);
    }

    await mongoose.disconnect();
    console.log('📝 完了しました');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

createAdminUser();