import mongoose from 'mongoose';
import { AdminModel } from '../src/models/AdminModel';
import { getHashInfo } from '../src/services/passwordHash';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

async function checkAdminPassword() {
  console.log('🔍 Checking Admin Password Hash...\n');
  
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/charactier-ai';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    // Get the actual admin account
    const adminEmail = 'charactier.ai@gmail.com';
    const admin = await AdminModel.findOne({ email: adminEmail });
    
    if (!admin) {
      console.log('❌ Admin account not found!');
      return;
    }
    
    console.log('✅ Admin account found');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Active: ${admin.isActive}`);
    console.log(`   Last Login: ${admin.lastLogin || 'Never'}\n`);
    
    // Check password hash format
    console.log('🔐 Password Hash Analysis:');
    console.log(`   Hash prefix: ${admin.password.substring(0, 10)}...`);
    console.log(`   Full hash length: ${admin.password.length} characters`);
    
    const hashInfo = getHashInfo(admin.password);
    console.log(`   Algorithm: ${hashInfo.algorithm}`);
    console.log(`   Needs upgrade: ${hashInfo.needsUpgrade}`);
    
    // Check if it's bcrypt or argon2
    if (admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$')) {
      console.log('\n⚠️  Password is using legacy bcrypt format');
      console.log('   It will be automatically upgraded to Argon2id on next successful login');
    } else if (admin.password.startsWith('$argon2')) {
      console.log('\n✅ Password is using modern Argon2id format');
    } else {
      console.log('\n❌ Unknown password hash format!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the check
checkAdminPassword();