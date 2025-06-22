import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { AdminModel } from '../backend/src/models/AdminModel';

dotenv.config({ path: './backend/.env' });

async function createAdminUser() {
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

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required');
    }

    // パスワードをハッシュ化
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // 既存の管理者をチェック
    const existingAdmin = await AdminModel.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('⚠️  管理者は既に存在します:', adminEmail);
      
      // パスワードを新しいものに更新
      existingAdmin.password = hashedPassword;
      existingAdmin.isActive = true;
      
      await existingAdmin.save();
      console.log('✅ 管理者パスワードを更新しました');
    } else {

      // 管理者を作成
      const adminUser = new AdminModel({
        name: '管理者',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        permissions: [
          'users.read',
          'users.write',
          'characters.read',
          'characters.write',
          'tokens.read',
          'tokens.write',
          'system.read',
          'system.write'
        ],
        isActive: true
      });

      await adminUser.save();
      console.log('✅ 管理者を作成しました');
      console.log('📧 Email:', adminEmail);
      console.log('🔐 Password: [環境変数から設定済み]');
    }

    await mongoose.disconnect();
    console.log('📝 完了しました');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

createAdminUser();