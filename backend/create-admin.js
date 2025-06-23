const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import AdminModel
const { AdminModel } = require('./dist/src/models/AdminModel');

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/charactier-ai');
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await AdminModel.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('Admin already exists!');
      process.exit(0);
    }

    // Create admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = new AdminModel({
      name: 'Test Admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'super_admin',
      isActive: true,
      createdAt: new Date(),
      lastLogin: new Date()
    });

    await admin.save();
    console.log('✅ Admin created successfully!');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();