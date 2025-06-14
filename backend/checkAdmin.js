const mongoose = require('mongoose');
require('dotenv').config();

// AdminModelとUserModelを読み込み
const { AdminModel } = require('./src/models/AdminModel.ts');
const { UserModel } = require('./src/models/UserModel.ts');

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔍 MongoDB接続成功');
    
    const email = 'designroommaster@gmail.com';
    
    const admin = await AdminModel.findOne({ email });
    const user = await UserModel.findOne({ email });
    
    console.log('📧 メールアドレス:', email);
    console.log('👤 UserModelに存在:', !!user);
    console.log('👑 AdminModelに存在:', !!admin);
    
    if (user) {
      console.log('📄 UserModel情報:', {
        _id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      });
    }
    
    if (admin) {
      console.log('👑 AdminModel情報:', {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive
      });
    }
    
    // 全ての管理者を表示
    const allAdmins = await AdminModel.find({});
    console.log('🎯 全管理者アカウント数:', allAdmins.length);
    allAdmins.forEach(admin => {
      console.log(`  - ${admin.email} (${admin.role})`);
    });
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkAdmin();