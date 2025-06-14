const mongoose = require('mongoose');
require('dotenv').config();

const { AdminModel } = require('./src/models/AdminModel.ts');
const { UserModel } = require('./src/models/UserModel.ts');

async function createUserForAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔍 MongoDB接続成功');
    
    const admin = await AdminModel.findOne({ email: 'charactier.ai@gmail.com' });
    if (!admin) {
      console.log('❌ AdminModelが見つかりません');
      return;
    }
    
    // 同じIDでUserModelを作成
    const existingUser = await UserModel.findById(admin._id);
    if (existingUser) {
      console.log('✅ 既にUserModelが存在します');
      return;
    }
    
    const user = new UserModel({
      _id: admin._id, // 同じIDを使用
      name: admin.name,
      email: admin.email,
      password: admin.password, // 同じパスワードハッシュを使用
      isActive: true,
      accountStatus: 'active'
    });
    
    await user.save();
    
    console.log('🎉 UserModelが作成されました！');
    console.log('📧 メール:', user.email);
    console.log('🆔 ID:', user._id);
    console.log('');
    console.log('✨ これで charactier.ai@gmail.com でログインできるようになります');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createUserForAdmin();