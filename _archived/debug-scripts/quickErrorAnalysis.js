/**
 * Quick API Error Analysis Script
 * Safe read-only analysis using existing MongoDB setup
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');

// Import the APIError model
const APIErrorSchema = new mongoose.Schema({
  endpoint: { type: String, required: true },
  method: { type: String, required: true },
  statusCode: { type: Number, required: true },
  errorType: { type: String, required: true },
  errorMessage: { type: String, required: true },
  userId: mongoose.Schema.Types.ObjectId,
  userAgent: String,
  ipAddress: String,
  requestBody: mongoose.Schema.Types.Mixed,
  stackTrace: String,
  responseTime: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
  resolvedAt: Date,
  resolvedBy: mongoose.Schema.Types.ObjectId,
  notes: String
}, { 
  collection: 'api_errors',
  timestamps: true 
});

const APIError = mongoose.model('APIError', APIErrorSchema);

async function quickAnalysis() {
  try {
    console.log('🔍 Starting quick API error analysis...\n');
    
    // Connect to MongoDB
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI not found in environment variables');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // 1. Basic counts
    console.log('📊 BASIC STATISTICS');
    console.log('═══════════════════════════════════════');
    
    const totalErrors = await APIError.countDocuments();
    const unresolvedErrors = await APIError.countDocuments({ resolved: false });
    const resolvedErrors = await APIError.countDocuments({ resolved: true });
    
    // Recent errors (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentErrors = await APIError.countDocuments({ 
      timestamp: { $gte: last24Hours } 
    });
    
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Unresolved: ${unresolvedErrors} (${((unresolvedErrors/totalErrors)*100).toFixed(1)}%)`);
    console.log(`Resolved: ${resolvedErrors} (${((resolvedErrors/totalErrors)*100).toFixed(1)}%)`);
    console.log(`Recent (24h): ${recentErrors}`);
    
    // 2. Error type breakdown
    console.log('\n🔍 ERROR TYPE BREAKDOWN');
    console.log('═══════════════════════════════════════');
    
    const errorTypes = await APIError.aggregate([
      {
        $group: {
          _id: '$errorType',
          count: { $sum: 1 },
          unresolvedCount: {
            $sum: { $cond: [{ $eq: ['$resolved', false] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    errorTypes.forEach(type => {
      const percentage = ((type.count / totalErrors) * 100).toFixed(1);
      console.log(`${type._id.padEnd(15)} | ${type.count.toString().padStart(4)} (${percentage}%) | Unresolved: ${type.unresolvedCount}`);
    });
    
    // 3. Status code breakdown
    console.log('\n📈 STATUS CODE BREAKDOWN');
    console.log('═══════════════════════════════════════');
    
    const statusCodes = await APIError.aggregate([
      {
        $group: {
          _id: '$statusCode',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    statusCodes.forEach(status => {
      const percentage = ((status.count / totalErrors) * 100).toFixed(1);
      console.log(`${status._id.toString().padEnd(3)} | ${status.count.toString().padStart(4)} (${percentage}%)`);
    });
    
    // 4. Top failing endpoints
    console.log('\n🎯 TOP 10 FAILING ENDPOINTS');
    console.log('═══════════════════════════════════════');
    
    const endpoints = await APIError.aggregate([
      {
        $group: {
          _id: {
            endpoint: '$endpoint',
            method: '$method'
          },
          count: { $sum: 1 },
          unresolvedCount: {
            $sum: { $cond: [{ $eq: ['$resolved', false] }, 1, 0] }
          },
          statusCodes: { $addToSet: '$statusCode' },
          errorTypes: { $addToSet: '$errorType' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    endpoints.forEach((endpoint, index) => {
      const percentage = ((endpoint.count / totalErrors) * 100).toFixed(1);
      console.log(`${(index + 1).toString().padStart(2)}. ${endpoint._id.method} ${endpoint._id.endpoint}`);
      console.log(`    Errors: ${endpoint.count} (${percentage}%) | Unresolved: ${endpoint.unresolvedCount}`);
      console.log(`    Status Codes: ${endpoint.statusCodes.sort((a, b) => a - b).join(', ')}`);
      console.log(`    Error Types: ${endpoint.errorTypes.join(', ')}`);
      console.log('');
    });
    
    // 5. Sample error messages for top error types
    console.log('💬 SAMPLE ERROR MESSAGES');
    console.log('═══════════════════════════════════════');
    
    for (const errorType of errorTypes.slice(0, 3)) {
      console.log(`\n--- ${errorType._id.toUpperCase()} ERRORS ---`);
      const samples = await APIError.find({ errorType: errorType._id })
        .select('errorMessage endpoint method statusCode timestamp')
        .sort({ timestamp: -1 })
        .limit(3);
      
      samples.forEach((sample, index) => {
        console.log(`${index + 1}. [${sample.statusCode}] ${sample.method} ${sample.endpoint}`);
        console.log(`   "${sample.errorMessage}"`);
        console.log(`   Time: ${sample.timestamp.toISOString()}`);
      });
    }
    
    // 6. Recent error patterns
    console.log('\n⏰ RECENT ERROR PATTERNS (Last 24 hours)');
    console.log('═══════════════════════════════════');
    
    const recentPatterns = await APIError.aggregate([
      {
        $match: {
          timestamp: { $gte: last24Hours }
        }
      },
      {
        $group: {
          _id: {
            endpoint: '$endpoint',
            method: '$method',
            statusCode: '$statusCode'
          },
          count: { $sum: 1 },
          latestError: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    if (recentPatterns.length > 0) {
      recentPatterns.forEach((pattern, index) => {
        console.log(`${index + 1}. ${pattern._id.method} ${pattern._id.endpoint} [${pattern._id.statusCode}]`);
        console.log(`   Count: ${pattern.count} | Latest: ${pattern.latestError.toISOString()}`);
      });
    } else {
      console.log('No errors in the last 24 hours');
    }
    
    // 7. Critical alerts
    console.log('\n🚨 CRITICAL ALERTS');
    console.log('═══════════════════════════════════');
    
    const criticalIssues = [];
    
    // High volume single endpoint
    const highVolumeEndpoint = endpoints[0];
    if (highVolumeEndpoint && highVolumeEndpoint.count > 50) {
      criticalIssues.push(`HIGH VOLUME: ${highVolumeEndpoint._id.method} ${highVolumeEndpoint._id.endpoint} has ${highVolumeEndpoint.count} errors`);
    }
    
    // High unresolved rate
    const unresolvedRate = (unresolvedErrors / totalErrors) * 100;
    if (unresolvedRate > 80) {
      criticalIssues.push(`HIGH UNRESOLVED RATE: ${unresolvedRate.toFixed(1)}% of errors are unresolved`);
    }
    
    // Server errors
    const serverErrorType = errorTypes.find(type => type._id === 'server_error');
    if (serverErrorType && serverErrorType.count > 10) {
      criticalIssues.push(`SERVER ERRORS: ${serverErrorType.count} server errors detected`);
    }
    
    // Authentication issues
    const authErrorType = errorTypes.find(type => type._id === 'authentication');
    if (authErrorType && authErrorType.count > 20) {
      criticalIssues.push(`AUTH ISSUES: ${authErrorType.count} authentication errors detected`);
    }
    
    if (criticalIssues.length > 0) {
      criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    } else {
      console.log('No critical issues detected');
    }
    
    console.log('\n✅ Quick analysis completed!');
    console.log('═══════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run analysis
quickAnalysis().catch(console.error);