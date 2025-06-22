const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config({ path: '.env' });

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI not found in environment');
  process.exit(1);
}

const APIErrorSchema = new mongoose.Schema({
  endpoint: { type: String, required: true },
  method: { type: String, required: true },
  statusCode: { type: Number, required: true },
  errorType: { type: String, required: true },
  errorMessage: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userAgent: String,
  ipAddress: String,
  responseTime: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false }
}, { collection: 'api_errors' });

const APIError = mongoose.model('APIError', APIErrorSchema);

async function analyzeErrors() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Total error count
    const totalErrors = await APIError.countDocuments({
      timestamp: { $gte: twentyFourHoursAgo }
    });
    console.log('📊 Total errors in last 24h:', totalErrors);
    
    // Errors by type
    const errorsByType = await APIError.aggregate([
      { $match: { timestamp: { $gte: twentyFourHoursAgo } } },
      { $group: { _id: '$errorType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('📈 Errors by type:', errorsByType);
    
    // Errors by status code
    const errorsByStatus = await APIError.aggregate([
      { $match: { timestamp: { $gte: twentyFourHoursAgo } } },
      { $group: { _id: '$statusCode', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('🔢 Errors by status code:', errorsByStatus);
    
    // Top error endpoints
    const errorsByEndpoint = await APIError.aggregate([
      { $match: { timestamp: { $gte: twentyFourHoursAgo } } },
      { $group: { _id: '$endpoint', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    console.log('🎯 Top 10 error endpoints:', errorsByEndpoint);
    
    // Recent error messages (sample)
    const recentErrors = await APIError.find({
      timestamp: { $gte: twentyFourHoursAgo }
    })
    .sort({ timestamp: -1 })
    .limit(5)
    .select('endpoint method statusCode errorMessage timestamp');
    
    console.log('🚨 Recent errors (sample):');
    recentErrors.forEach(error => {
      console.log(`  ${error.timestamp.toISOString()} - ${error.method} ${error.endpoint} (${error.statusCode}): ${error.errorMessage}`);
    });
    
  } catch (error) {
    console.error('❌ Error analyzing errors:', error);
  } finally {
    await mongoose.disconnect();
  }
}

analyzeErrors();