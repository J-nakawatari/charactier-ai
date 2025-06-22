const mongoose = require('mongoose');
require('dotenv').config();

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);
const ChatSchema = new mongoose.Schema({}, { strict: false });
const Chat = mongoose.model('Chat', ChatSchema);

async function syncAffinityData() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const userId = '684b12fedcd9521713306082';
  const characterId = '68489ca4a91145fdd86f4a49'; // yotugi
  
  console.log('🔄 ChatModelとUserModelの親密度を同期します...');
  
  // ChatModelから実際の親密度を取得
  const chat = await Chat.findOne({
    userId: userId,
    characterId: characterId
  });
  
  if (!chat) {
    console.log('❌ チャット履歴が見つかりません');
    return;
  }
  
  console.log(`🔍 ChatModelの親密度: ${chat.currentAffinity}`);
  
  // UserModelの親密度を更新
  const user = await User.findById(userId);
  
  if (!user) {
    console.log('❌ ユーザーが見つかりません');
    return;
  }
  
  // yotugiの親密度データを見つけて更新
  const affinityIndex = user.affinities.findIndex(aff => {
    const charId = aff.character || aff.characterId;
    return charId && charId.toString() === characterId;
  });
  
  if (affinityIndex !== -1) {
    console.log(`🔍 更新前 UserModel親密度: ${user.affinities[affinityIndex].level}`);
    
    user.affinities[affinityIndex].level = chat.currentAffinity;
    user.affinities[affinityIndex].experience = chat.currentAffinity * 10; // 適当な経験値設定
    user.affinities[affinityIndex].totalMessages = chat.messagesCount || 0;
    user.affinities[affinityIndex].lastInteraction = chat.lastActivityAt;
    
    await user.save();
    
    console.log(`✅ UserModel親密度を更新: ${chat.currentAffinity}`);
    console.log(`✅ 経験値: ${chat.currentAffinity * 10}`);
  } else {
    console.log('❌ UserModelでyotugiの親密度データが見つかりません');
  }
  
  await mongoose.disconnect();
}

syncAffinityData().catch(console.error);