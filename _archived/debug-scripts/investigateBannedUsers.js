/**
 * Investigation script for banned users causing authorization errors
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');

// User model schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  isActive: { type: Boolean, default: true },
  accountStatus: { 
    type: String, 
    enum: ['active', 'inactive', 'suspended', 'banned'], 
    default: 'active' 
  },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
}, { collection: 'users' });

const User = mongoose.model('User', UserSchema);

async function investigateBannedUsers() {
  try {
    console.log('🔍 Investigating banned users causing authorization errors...\n');
    
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI not found in environment variables');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get user account status distribution
    console.log('👤 USER ACCOUNT STATUS DISTRIBUTION');
    console.log('═══════════════════════════════════════');
    
    const statusDistribution = await User.aggregate([
      {
        $group: {
          _id: '$accountStatus',
          count: { $sum: 1 },
          isActiveTrue: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          isActiveFalse: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    let totalUsers = 0;
    statusDistribution.forEach(status => {
      totalUsers += status.count;
      console.log(`${(status._id || 'undefined').padEnd(12)} | ${status.count.toString().padStart(4)} users | Active: ${status.isActiveTrue} | Inactive: ${status.isActiveFalse}`);
    });
    
    console.log(`${'TOTAL'.padEnd(12)} | ${totalUsers.toString().padStart(4)} users`);
    
    // Get banned/suspended users details
    console.log('\n🚫 BANNED/SUSPENDED USERS DETAILS');
    console.log('═══════════════════════════════════');
    
    const problematicUsers = await User.find({
      $or: [
        { accountStatus: 'banned' },
        { accountStatus: 'suspended' },
        { isActive: false }
      ]
    }).select('email name accountStatus isActive createdAt lastLogin').sort({ createdAt: -1 });
    
    if (problematicUsers.length > 0) {
      console.log(`Found ${problematicUsers.length} problematic users:\n`);
      
      problematicUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email || 'No email'}`);
        console.log(`   Name: ${user.name || 'No name'}`);
        console.log(`   Status: ${user.accountStatus} | Active: ${user.isActive}`);
        console.log(`   Created: ${user.createdAt ? user.createdAt.toISOString() : 'Unknown'}`);
        console.log(`   Last Login: ${user.lastLogin ? user.lastLogin.toISOString() : 'Never'}`);
        console.log('');
      });
    } else {
      console.log('No banned or suspended users found');
    }
    
    // Check for users with mismatched status
    console.log('⚠️  STATUS MISMATCH CHECK');
    console.log('═══════════════════════════════════');
    
    const mismatchedUsers = await User.find({
      $or: [
        { accountStatus: 'active', isActive: false },
        { accountStatus: { $in: ['banned', 'suspended'] }, isActive: true }
      ]
    }).select('email accountStatus isActive');
    
    if (mismatchedUsers.length > 0) {
      console.log(`Found ${mismatchedUsers.length} users with status mismatches:\n`);
      
      mismatchedUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   accountStatus: ${user.accountStatus} | isActive: ${user.isActive}`);
        console.log('   🚨 MISMATCH: These fields should be consistent');
        console.log('');
      });
    } else {
      console.log('No status mismatches found');
    }
    
    // Recent login attempts by banned users
    console.log('🔐 RECENT LOGIN PATTERNS');
    console.log('═══════════════════════════════════');
    
    const recentLogins = await User.find({
      lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).select('email accountStatus isActive lastLogin').sort({ lastLogin: -1 });
    
    console.log(`Users with logins in last 7 days: ${recentLogins.length}`);
    
    const bannedWithRecentLogins = recentLogins.filter(user => 
      user.accountStatus === 'banned' || user.accountStatus === 'suspended' || !user.isActive
    );
    
    if (bannedWithRecentLogins.length > 0) {
      console.log(`🚨 Banned/suspended users with recent logins: ${bannedWithRecentLogins.length}`);
      bannedWithRecentLogins.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} - Last login: ${user.lastLogin.toISOString()}`);
      });
    } else {
      console.log('✅ No banned/suspended users have recent logins');
    }
    
    console.log('\n✅ Investigation completed!');
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

investigateBannedUsers().catch(console.error);