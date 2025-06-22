import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { UserModel } from '../src/models/UserModel';

dotenv.config({ path: './.env' });

async function updateUserPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('🍃 MongoDB connected');

    const userId = '68488ffcc1a58e482d8f3cd9';
    const newPassword = 'test123';

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the user's password
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    );
    
    if (user) {
      console.log('✅ Updated password for user:');
      console.log('  - Email:', user.email);
      console.log('  - New password:', newPassword);
      console.log('  - isSetupComplete:', user.isSetupComplete);
    } else {
      console.log('❌ User not found');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateUserPassword();