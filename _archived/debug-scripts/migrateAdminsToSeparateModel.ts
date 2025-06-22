import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { UserModel } from '../backend/src/models/UserModel';
import { AdminModel } from '../backend/src/models/AdminModel';

dotenv.config({ path: './backend/.env' });

async function migrateAdminsToSeparateModel() {
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

    // 既存の管理者ユーザーを検索
    const adminUsers = await UserModel.find({ isAdmin: true });
    console.log(`📋 Found ${adminUsers.length} admin users to migrate`);

    if (adminUsers.length === 0) {
      console.log('ℹ️  No admin users found to migrate');
      await mongoose.disconnect();
      return;
    }

    // 各管理者をAdminModelに移行
    for (const adminUser of adminUsers) {
      console.log(`🔄 Migrating admin: ${adminUser.email}`);

      // 既存のAdminModelをチェック
      const existingAdmin = await AdminModel.findOne({ email: adminUser.email });
      
      if (existingAdmin) {
        console.log(`⚠️  Admin already exists in AdminModel: ${adminUser.email}`);
        continue;
      }

      // AdminModelに新しい管理者を作成
      const newAdmin = new AdminModel({
        name: adminUser.name || '管理者',
        email: adminUser.email,
        password: adminUser.password, // 既にハッシュ化済み
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
        isActive: adminUser.isActive || true,
        lastLogin: adminUser.lastLogin
      });

      await newAdmin.save();
      console.log(`✅ Created admin in AdminModel: ${adminUser.email}`);

      // UserModelから管理者を削除
      await UserModel.findByIdAndDelete(adminUser._id);
      console.log(`🗑️  Removed admin from UserModel: ${adminUser.email}`);
    }

    console.log('🎉 Admin migration completed successfully');
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateAdminsToSeparateModel();