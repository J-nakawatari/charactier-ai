import mongoose from 'mongoose';
import { AdminModel } from '../src/models/AdminModel';
import { hashPassword } from '../src/services/passwordHash';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config({ path: '.env' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function resetAdminPassword() {
  console.log('🔐 Admin Password Reset Tool\n');
  
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/charactier-ai';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    // List all admin accounts
    const admins = await AdminModel.find({}, 'email name role isActive');
    console.log('📋 Available admin accounts:');
    admins.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.email} (${admin.name}) - ${admin.role} - ${admin.isActive ? 'Active' : 'Inactive'}`);
    });
    
    if (admins.length === 0) {
      console.log('\n❌ No admin accounts found!');
      return;
    }
    
    // Ask which admin to reset
    const adminIndex = await question('\nEnter the number of the admin account to reset (or email address): ');
    
    let selectedAdmin;
    if (/^\d+$/.test(adminIndex)) {
      const index = parseInt(adminIndex) - 1;
      if (index >= 0 && index < admins.length) {
        selectedAdmin = admins[index];
      }
    } else {
      selectedAdmin = await AdminModel.findOne({ email: adminIndex });
    }
    
    if (!selectedAdmin) {
      console.log('❌ Invalid selection!');
      return;
    }
    
    console.log(`\n✅ Selected admin: ${selectedAdmin.email}`);
    
    // Ask for new password
    const newPassword = await question('\nEnter new password (min 8 characters): ');
    
    if (newPassword.length < 8) {
      console.log('❌ Password must be at least 8 characters!');
      return;
    }
    
    // Confirm password
    const confirmPassword = await question('Confirm new password: ');
    
    if (newPassword !== confirmPassword) {
      console.log('❌ Passwords do not match!');
      return;
    }
    
    // Hash the new password
    console.log('\n🔄 Hashing password with Argon2id...');
    const hashedPassword = await hashPassword(newPassword);
    
    // Update the admin password
    await AdminModel.updateOne(
      { _id: selectedAdmin._id },
      { $set: { password: hashedPassword } }
    );
    
    console.log('\n✅ Password reset successfully!');
    console.log(`   Admin: ${selectedAdmin.email}`);
    console.log(`   New password: ${newPassword}`);
    console.log('\n⚠️  Please save this password securely!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the reset tool
resetAdminPassword();