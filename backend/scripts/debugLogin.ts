import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserModel } from '../src/models/UserModel';

dotenv.config({ path: './.env' });

async function debugLogin() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('🍃 MongoDB connected');

    // Find the test user
    const user = await UserModel.findOne({ email: 'test@example.com' });
    
    if (user) {
      console.log('👤 Found user:');
      console.log('  - ID:', user._id);
      console.log('  - Name:', user.name);
      console.log('  - Email:', user.email);
      console.log('  - isSetupComplete:', user.isSetupComplete);
      console.log('  - isSetupComplete type:', typeof user.isSetupComplete);
      console.log('  - All fields:', Object.keys(user.toObject()));

      // Create response object exactly like in the login route
      const userResponse = {
        _id: user._id,
        name: user.name,
        email: user.email,
        tokenBalance: user.tokenBalance,
        isSetupComplete: user.isSetupComplete
      };
      
      console.log('🔍 Response object:');
      console.log(JSON.stringify(userResponse, null, 2));

      // Check if the field actually exists in the document
      const userDoc = user.toObject();
      console.log('🔍 Has isSetupComplete in document:', 'isSetupComplete' in userDoc);
      console.log('🔍 Raw document isSetupComplete:', userDoc.isSetupComplete);
    } else {
      console.log('❌ User not found');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugLogin();