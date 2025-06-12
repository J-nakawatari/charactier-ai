import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserModel } from '../src/models/UserModel';

dotenv.config({ path: './.env' });

async function checkOriginalUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('🍃 MongoDB connected');

    // Find the original user from the console logs
    const user = await UserModel.findById('68488ffcc1a58e482d8f3cd9');
    
    if (user) {
      console.log('👤 Found original user:');
      console.log('  - ID:', user._id);
      console.log('  - Name:', user.name);
      console.log('  - Email:', user.email);
      console.log('  - isSetupComplete:', user.isSetupComplete);
      console.log('  - isSetupComplete type:', typeof user.isSetupComplete);
      
      // Check if the field actually exists in the document
      const userDoc = user.toObject();
      console.log('🔍 Has isSetupComplete in document:', 'isSetupComplete' in userDoc);
      console.log('🔍 Raw document isSetupComplete:', userDoc.isSetupComplete);

      // Test what happens when we create a response object
      const userResponse = {
        _id: user._id,
        name: user.name,
        email: user.email,
        tokenBalance: user.tokenBalance,
        isSetupComplete: user.isSetupComplete
      };
      
      console.log('🔍 Response object:');
      console.log(JSON.stringify(userResponse, null, 2));
      
    } else {
      console.log('❌ Original user not found');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkOriginalUser();