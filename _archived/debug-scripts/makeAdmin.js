const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// AdminModelとUserModelを読み込み
const { AdminModel } = require('./src/models/AdminModel.ts');
const { UserModel } = require('./src/models/UserModel.ts');

async function makeAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔍 MongoDB接続成功');
    
    const email = 'designroommaster@gmail.com';
    
    // 既存の管理者チェック
    const existingAdmin = await AdminModel.findOne({ email });
    if (existingAdmin) {
      console.log('✅ 既に管理者アカウントが存在します');
      return;
    }
    
    // ユーザー情報を取得
    const user = await UserModel.findOne({ email });
    if (!user) {
      console.log('❌ ユーザーが見つかりません');
      return;
    }
    
    // ランダムパスワードを生成してハッシュ化
    const randomPassword = Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    
    // 管理者アカウント作成
    const admin = new AdminModel({
      name: user.name || 'スーパー管理者',
      email: user.email,
      password: hashedPassword,
      role: 'super_admin',
      isActive: true
    });
    
    await admin.save();
    
    console.log('🎉 管理者アカウントが作成されました！');
    console.log('📧 メールアドレス:', admin.email);
    console.log('👑 権限:', admin.role);
    console.log('🔐 一時パスワード:', randomPassword);
    console.log('');
    console.log('✨ 次回ログイン時に管理者として認識されます');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

makeAdmin();