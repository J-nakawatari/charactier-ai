const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is required');
    }

    mongoose.set('bufferCommands', false);
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 30000
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// User Schema (simplified for promotion)
const UserSchema = new mongoose.Schema({
  email: String,
  name: String,
  isAdmin: {
    type: Boolean,
    default: false
  },
  role: String
}, {
  timestamps: true
});

const UserModel = mongoose.model('User', UserSchema);

// Promote user to admin
const promoteToAdmin = async (email) => {
  try {
    await connectDB();
    
    console.log(`🔍 ユーザー検索中: ${email}`);
    const user = await UserModel.findOne({ email: email });
    
    if (!user) {
      console.log(`❌ ユーザーが見つかりません: ${email}`);
      return;
    }
    
    console.log(`👤 ユーザー情報:`, {
      _id: user._id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      role: user.role
    });
    
    // 管理者権限を付与
    const updatedUser = await UserModel.findByIdAndUpdate(
      user._id,
      { 
        isAdmin: true,
        role: 'admin'
      },
      { new: true }
    );
    
    console.log(`✅ 管理者権限を付与しました:`, {
      _id: updatedUser._id,
      email: updatedUser.email,
      name: updatedUser.name,
      isAdmin: updatedUser.isAdmin,
      role: updatedUser.role
    });
    
  } catch (error) {
    console.error('❌ 管理者権限付与エラー:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📝 MongoDB接続を終了しました');
  }
};

// Execute the script
const targetEmail = process.argv[2] || 'designroommaster@gmail.com';
console.log(`🚀 管理者権限付与を開始: ${targetEmail}`);

promoteToAdmin(targetEmail).catch(console.error);