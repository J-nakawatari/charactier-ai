const mongoose = require('mongoose');
require('dotenv').config();

const { AdminModel } = require('./src/models/AdminModel.ts');
const { UserModel } = require('./src/models/UserModel.ts');

async function findCorrectAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔍 MongoDB接続成功');
    
    // charactier.ai@gmail.com の正しい情報を取得
    const targetEmail = 'charactier.ai@gmail.com';
    
    const admin = await AdminModel.findOne({ email: targetEmail });
    const user = await UserModel.findOne({ email: targetEmail });
    
    console.log('📧 対象メールアドレス:', targetEmail);
    console.log('👑 AdminModel:', admin ? {
      _id: admin._id,
      email: admin.email,
      role: admin.role
    } : 'null');
    console.log('👤 UserModel:', user ? {
      _id: user._id,
      email: user.email
    } : 'null');
    
    console.log('');
    console.log('🔄 現在のトークンが指すユーザー:');
    const currentUser = await UserModel.findById('684b12fedcd9521713306082');
    console.log('ID 684b12fedcd9521713306082 =', currentUser ? currentUser.email : 'not found');
    
    // 必要に応じて正しいuserIDでAdminModelを作成
    if (admin && !user) {
      console.log('⚠️ AdminModelのみ存在、UserModelがありません');
    } else if (!admin && user) {
      console.log('⚠️ UserModelのみ存在、AdminModelがありません');
    } else if (admin && user && admin._id.toString() !== user._id.toString()) {
      console.log('⚠️ AdminModelとUserModelのIDが異なります');
      console.log('Admin ID:', admin._id);
      console.log('User ID:', user._id);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

findCorrectAdmin();