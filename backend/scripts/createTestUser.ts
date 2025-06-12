import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { UserModel } from '../src/models/UserModel';

dotenv.config({ path: './.env' });

async function createTestUser() {
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

    const testEmail = 'test@example.com';
    const testPassword = 'test123';

    // Check if test user already exists
    const existingUser = await UserModel.findOne({ email: testEmail });
    if (existingUser) {
      console.log('👤 Test user already exists');
      console.log('  - Email:', testEmail);
      console.log('  - Password:', testPassword);
      console.log('  - isSetupComplete:', existingUser.isSetupComplete);
      await mongoose.disconnect();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(testPassword, 12);

    // Create test user
    const testUser = new UserModel({
      name: 'Test User',
      email: testEmail,
      password: hashedPassword,
      tokenBalance: 10000,
      isActive: true,
      isSetupComplete: true // Set as already setup
    });

    await testUser.save();
    console.log('✅ Test user created successfully:');
    console.log('  - Email:', testEmail);
    console.log('  - Password:', testPassword);
    console.log('  - isSetupComplete:', true);

    await mongoose.disconnect();
    console.log('📝 Script completed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestUser();