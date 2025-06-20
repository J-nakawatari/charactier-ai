/**
 * API Error Analysis Script
 * Comprehensive analysis of API errors from the APIError collection
 * Safe read-only analysis with detailed breakdown and recommendations
 */

const mongoose = require('mongoose');
require('dotenv').config();

// APIError model definition
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

class APIErrorAnalyzer {
  constructor() {
    this.results = {
      summary: {},
      errorTypeBreakdown: {},
      statusCodeDistribution: {},
      topFailingEndpoints: [],
      timeBasedTrends: {},
      userImpactAnalysis: {},
      performanceMetrics: {},
      criticalIssues: [],
      recommendations: []
    };
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }

  // 1. Overall Summary Statistics
  async getSummaryStats() {
    console.log('\n📊 Getting summary statistics...');
    
    const totalErrors = await APIError.countDocuments();
    const unresolvedErrors = await APIError.countDocuments({ resolved: false });
    const resolvedErrors = await APIError.countDocuments({ resolved: true });
    
    // Recent errors (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentErrors = await APIError.countDocuments({ 
      timestamp: { $gte: last24Hours } 
    });
    
    // Average response time
    const avgResponseTimeResult = await APIError.aggregate([
      { $group: { _id: null, avgResponseTime: { $avg: '$responseTime' } } }
    ]);
    const avgResponseTime = avgResponseTimeResult[0]?.avgResponseTime || 0;
    
    // Date range of errors
    const dateRange = await APIError.aggregate([
      {
        $group: {
          _id: null,
          firstError: { $min: '$timestamp' },
          lastError: { $max: '$timestamp' }
        }
      }
    ]);
    
    this.results.summary = {
      totalErrors,
      unresolvedErrors,
      resolvedErrors,
      recentErrors,
      avgResponseTime: Math.round(avgResponseTime),
      resolutionRate: totalErrors > 0 ? ((resolvedErrors / totalErrors) * 100).toFixed(2) : 0,
      dateRange: dateRange[0] || { firstError: null, lastError: null }
    };
    
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Unresolved: ${unresolvedErrors} (${((unresolvedErrors/totalErrors)*100).toFixed(1)}%)`);
    console.log(`Recent (24h): ${recentErrors}`);
  }

  // 2. Error Type Breakdown
  async getErrorTypeBreakdown() {
    console.log('\n🔍 Analyzing error types...');
    
    const errorTypes = await APIError.aggregate([
      {
        $group: {
          _id: '$errorType',
          count: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' },
          unresolvedCount: {
            $sum: { $cond: [{ $eq: ['$resolved', false] }, 1, 0] }
          },
          recentCount: {
            $sum: {
              $cond: [
                { $gte: ['$timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                1,
                0
              ]
            }
          },
          sampleMessages: { $push: '$errorMessage' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    this.results.errorTypeBreakdown = errorTypes.map(type => ({
      errorType: type._id,
      count: type.count,
      percentage: ((type.count / this.results.summary.totalErrors) * 100).toFixed(2),
      avgResponseTime: Math.round(type.avgResponseTime),
      unresolvedCount: type.unresolvedCount,
      recentCount: type.recentCount,
      sampleMessages: type.sampleMessages.slice(0, 3) // Top 3 sample messages
    }));

    console.log('Error Type Distribution:');
    this.results.errorTypeBreakdown.forEach(type => {
      console.log(`- ${type.errorType}: ${type.count} (${type.percentage}%)`);
    });
  }

  // 3. Status Code Distribution
  async getStatusCodeDistribution() {
    console.log('\n📈 Analyzing status codes...');
    
    const statusCodes = await APIError.aggregate([
      {
        $group: {
          _id: '$statusCode',
          count: { $sum: 1 },
          errorTypes: { $addToSet: '$errorType' },
          topEndpoints: { $push: '$endpoint' },
          avgResponseTime: { $avg: '$responseTime' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    this.results.statusCodeDistribution = statusCodes.map(status => ({
      statusCode: status._id,
      count: status.count,
      percentage: ((status.count / this.results.summary.totalErrors) * 100).toFixed(2),
      errorTypes: status.errorTypes,
      avgResponseTime: Math.round(status.avgResponseTime),
      // Get top 3 endpoints for this status code
      topEndpoints: [...new Set(status.topEndpoints)].slice(0, 3)
    }));

    console.log('Status Code Distribution:');
    this.results.statusCodeDistribution.forEach(status => {
      console.log(`- ${status.statusCode}: ${status.count} (${status.percentage}%)`);
    });
  }

  // 4. Top Failing Endpoints
  async getTopFailingEndpoints() {
    console.log('\n🎯 Identifying top failing endpoints...');
    
    const endpoints = await APIError.aggregate([
      {
        $group: {
          _id: {
            endpoint: '$endpoint',
            method: '$method'
          },
          count: { $sum: 1 },
          errorTypes: { $addToSet: '$errorType' },
          statusCodes: { $addToSet: '$statusCode' },
          avgResponseTime: { $avg: '$responseTime' },
          unresolvedCount: {
            $sum: { $cond: [{ $eq: ['$resolved', false] }, 1, 0] }
          },
          recentCount: {
            $sum: {
              $cond: [
                { $gte: ['$timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                1,
                0
              ]
            }
          },
          uniqueUsers: { $addToSet: '$userId' },
          sampleErrors: { $push: '$errorMessage' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    this.results.topFailingEndpoints = endpoints.map(endpoint => ({
      endpoint: endpoint._id.endpoint,
      method: endpoint._id.method,
      count: endpoint.count,
      percentage: ((endpoint.count / this.results.summary.totalErrors) * 100).toFixed(2),
      errorTypes: endpoint.errorTypes,
      statusCodes: endpoint.statusCodes.sort((a, b) => a - b),
      avgResponseTime: Math.round(endpoint.avgResponseTime),
      unresolvedCount: endpoint.unresolvedCount,
      recentCount: endpoint.recentCount,
      affectedUsers: endpoint.uniqueUsers.filter(id => id).length,
      sampleErrors: endpoint.sampleErrors.slice(0, 2)
    }));

    console.log('Top 10 Failing Endpoints:');
    this.results.topFailingEndpoints.slice(0, 10).forEach((endpoint, index) => {
      console.log(`${index + 1}. ${endpoint.method} ${endpoint.endpoint}: ${endpoint.count} errors`);
    });
  }

  // 5. Time-based Trends
  async getTimeBasedTrends() {
    console.log('\n📅 Analyzing time-based trends...');
    
    // Errors by hour of day
    const hourlyTrends = await APIError.aggregate([
      {
        $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Errors by day of week
    const dailyTrends = await APIError.aggregate([
      {
        $group: {
          _id: { $dayOfWeek: '$timestamp' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Recent 7 days trend
    const last7Days = await APIError.aggregate([
      {
        $match: {
          timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          count: { $sum: 1 },
          uniqueEndpoints: { $addToSet: '$endpoint' },
          errorTypes: { $addToSet: '$errorType' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    this.results.timeBasedTrends = {
      hourlyDistribution: hourlyTrends,
      dailyDistribution: dailyTrends,
      last7DaysTrend: last7Days
    };

    console.log('Peak error hours:', 
      hourlyTrends.sort((a, b) => b.count - a.count).slice(0, 3)
        .map(h => `${h._id}:00 (${h.count} errors)`).join(', ')
    );
  }

  // 6. User Impact Analysis
  async getUserImpactAnalysis() {
    console.log('\n👥 Analyzing user impact...');
    
    const userImpact = await APIError.aggregate([
      {
        $match: { userId: { $exists: true, $ne: null } }
      },
      {
        $group: {
          _id: '$userId',
          errorCount: { $sum: 1 },
          uniqueEndpoints: { $addToSet: '$endpoint' },
          errorTypes: { $addToSet: '$errorType' },
          lastError: { $max: '$timestamp' }
        }
      },
      { $sort: { errorCount: -1 } },
      { $limit: 50 }
    ]);

    const totalUsersAffected = userImpact.length;
    const totalErrorsWithUsers = await APIError.countDocuments({ 
      userId: { $exists: true, $ne: null } 
    });

    this.results.userImpactAnalysis = {
      totalUsersAffected,
      totalErrorsWithUsers,
      topAffectedUsers: userImpact.slice(0, 10).map(user => ({
        userId: user._id,
        errorCount: user.errorCount,
        uniqueEndpoints: user.uniqueEndpoints.length,
        errorTypes: user.errorTypes,
        lastError: user.lastError
      })),
      averageErrorsPerUser: totalUsersAffected > 0 ? 
        Math.round(totalErrorsWithUsers / totalUsersAffected) : 0
    };

    console.log(`Users affected: ${totalUsersAffected}`);
    console.log(`Avg errors per user: ${this.results.userImpactAnalysis.averageErrorsPerUser}`);
  }

  // 7. Performance Metrics
  async getPerformanceMetrics() {
    console.log('\n⚡ Analyzing performance metrics...');
    
    const performanceStats = await APIError.aggregate([
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' },
          minResponseTime: { $min: '$responseTime' },
          maxResponseTime: { $max: '$responseTime' },
          slowRequests: {
            $sum: { $cond: [{ $gt: ['$responseTime', 5000] }, 1, 0] }
          },
          verySlowRequests: {
            $sum: { $cond: [{ $gt: ['$responseTime', 10000] }, 1, 0] }
          }
        }
      }
    ]);

    // Slowest endpoints
    const slowestEndpoints = await APIError.aggregate([
      {
        $group: {
          _id: {
            endpoint: '$endpoint',
            method: '$method'
          },
          avgResponseTime: { $avg: '$responseTime' },
          maxResponseTime: { $max: '$responseTime' },
          count: { $sum: 1 }
        }
      },
      { $sort: { avgResponseTime: -1 } },
      { $limit: 10 }
    ]);

    this.results.performanceMetrics = {
      overall: performanceStats[0] || {},
      slowestEndpoints: slowestEndpoints.map(endpoint => ({
        endpoint: endpoint._id.endpoint,
        method: endpoint._id.method,
        avgResponseTime: Math.round(endpoint.avgResponseTime),
        maxResponseTime: Math.round(endpoint.maxResponseTime),
        count: endpoint.count
      }))
    };

    console.log(`Avg response time: ${Math.round(performanceStats[0]?.avgResponseTime || 0)}ms`);
    console.log(`Slow requests (>5s): ${performanceStats[0]?.slowRequests || 0}`);
  }

  // 8. Critical Issues Identification
  async identifyCriticalIssues() {
    console.log('\n🚨 Identifying critical issues...');
    
    const issues = [];

    // High volume endpoints with errors
    const highVolumeErrors = this.results.topFailingEndpoints
      .filter(endpoint => endpoint.count > 20)
      .map(endpoint => ({
        type: 'HIGH_VOLUME_ERRORS',
        severity: 'HIGH',
        description: `${endpoint.method} ${endpoint.endpoint} has ${endpoint.count} errors`,
        details: endpoint
      }));

    // Authentication/Authorization issues
    const authErrors = this.results.errorTypeBreakdown
      .filter(type => ['authentication', 'authorization'].includes(type.errorType) && type.count > 10)
      .map(type => ({
        type: 'AUTH_ISSUES',
        severity: 'HIGH',
        description: `High number of ${type.errorType} errors: ${type.count}`,
        details: type
      }));

    // Server errors
    const serverErrors = this.results.errorTypeBreakdown
      .filter(type => type.errorType === 'server_error')
      .map(type => ({
        type: 'SERVER_ERRORS',
        severity: 'CRITICAL',
        description: `Server errors detected: ${type.count}`,
        details: type
      }));

    // Performance issues
    const slowEndpoints = this.results.performanceMetrics.slowestEndpoints
      .filter(endpoint => endpoint.avgResponseTime > 3000)
      .map(endpoint => ({
        type: 'PERFORMANCE_ISSUE',
        severity: 'MEDIUM',
        description: `Slow endpoint: ${endpoint.method} ${endpoint.endpoint} (${endpoint.avgResponseTime}ms avg)`,
        details: endpoint
      }));

    // High unresolved rate
    const unresolvedRate = (this.results.summary.unresolvedErrors / this.results.summary.totalErrors) * 100;
    if (unresolvedRate > 80) {
      issues.push({
        type: 'HIGH_UNRESOLVED_RATE',
        severity: 'HIGH',
        description: `High unresolved error rate: ${unresolvedRate.toFixed(1)}%`,
        details: { unresolvedRate, total: this.results.summary.totalErrors }
      });
    }

    this.results.criticalIssues = [
      ...highVolumeErrors,
      ...authErrors,
      ...serverErrors,
      ...slowEndpoints,
      ...issues
    ].sort((a, b) => {
      const severityOrder = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    console.log(`Critical issues identified: ${this.results.criticalIssues.length}`);
  }

  // 9. Generate Recommendations
  generateRecommendations() {
    console.log('\n💡 Generating recommendations...');
    
    const recommendations = [];

    // Based on error types
    const topErrorType = this.results.errorTypeBreakdown[0];
    if (topErrorType) {
      switch (topErrorType.errorType) {
        case 'authentication':
          recommendations.push({
            priority: 'HIGH',
            category: 'Authentication',
            issue: `High authentication failures (${topErrorType.count} errors)`,
            recommendation: 'Review authentication middleware, token validation logic, and session management',
            actionItems: [
              'Check JWT token expiration and refresh logic',
              'Verify authentication middleware is properly configured',
              'Implement better error messages for auth failures',
              'Add rate limiting for login attempts'
            ]
          });
          break;
        case 'authorization':
          recommendations.push({
            priority: 'HIGH',
            category: 'Authorization',
            issue: `High authorization failures (${topErrorType.count} errors)`,
            recommendation: 'Review permission checking and role-based access control',
            actionItems: [
              'Audit user roles and permissions',
              'Check middleware execution order',
              'Implement proper error handling for unauthorized access',
              'Review API endpoint access controls'
            ]
          });
          break;
        case 'server_error':
          recommendations.push({
            priority: 'CRITICAL',
            category: 'Server Stability',
            issue: `Server errors detected (${topErrorType.count} errors)`,
            recommendation: 'Immediate investigation of server-side issues required',
            actionItems: [
              'Review application logs for stack traces',
              'Check database connection stability',
              'Monitor server resources (CPU, memory, disk)',
              'Implement proper error handling and graceful degradation'
            ]
          });
          break;
        case 'validation':
          recommendations.push({
            priority: 'MEDIUM',
            category: 'Input Validation',
            issue: `High validation errors (${topErrorType.count} errors)`,
            recommendation: 'Improve client-side validation and API documentation',
            actionItems: [
              'Enhance frontend form validation',
              'Provide clearer API documentation with examples',
              'Implement better error messages for validation failures',
              'Add input sanitization middleware'
            ]
          });
          break;
      }
    }

    // Performance recommendations
    if (this.results.performanceMetrics.overall.avgResponseTime > 2000) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Performance',
        issue: `High average response time (${Math.round(this.results.performanceMetrics.overall.avgResponseTime)}ms)`,
        recommendation: 'Optimize slow endpoints and implement caching',
        actionItems: [
          'Identify and optimize database queries',
          'Implement Redis caching for frequently accessed data',
          'Add database indexing for common queries',
          'Consider API response pagination',
          'Implement request/response compression'
        ]
      });
    }

    // Endpoint-specific recommendations
    const topFailingEndpoint = this.results.topFailingEndpoints[0];
    if (topFailingEndpoint && topFailingEndpoint.count > 50) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Endpoint Reliability',
        issue: `${topFailingEndpoint.method} ${topFailingEndpoint.endpoint} has ${topFailingEndpoint.count} errors`,
        recommendation: 'Focus on fixing the most problematic endpoint first',
        actionItems: [
          'Review endpoint implementation for bugs',
          'Add comprehensive input validation',
          'Implement proper error handling',
          'Add monitoring and alerting for this endpoint',
          'Consider implementing circuit breaker pattern'
        ]
      });
    }

    // Resolution rate recommendation
    if (this.results.summary.resolutionRate < 20) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Error Management',
        issue: `Low error resolution rate (${this.results.summary.resolutionRate}%)`,
        recommendation: 'Establish error triage and resolution process',
        actionItems: [
          'Implement error dashboard for monitoring',
          'Establish SLA for error resolution',
          'Create automated error categorization',
          'Set up alerting for critical errors',
          'Regular error review meetings'
        ]
      });
    }

    this.results.recommendations = recommendations;
    console.log(`Recommendations generated: ${recommendations.length}`);
  }

  // 10. Generate Detailed Report
  generateReport() {
    const report = `
═══════════════════════════════════════════════════════════════
🔍 API ERROR ANALYSIS REPORT
Generated: ${new Date().toISOString()}
═══════════════════════════════════════════════════════════════

📊 EXECUTIVE SUMMARY
────────────────────────────────────────────────────────────────
Total Errors: ${this.results.summary.totalErrors}
Unresolved Errors: ${this.results.summary.unresolvedErrors} (${((this.results.summary.unresolvedErrors/this.results.summary.totalErrors)*100).toFixed(1)}%)
Resolution Rate: ${this.results.summary.resolutionRate}%
Recent Errors (24h): ${this.results.summary.recentErrors}
Average Response Time: ${this.results.summary.avgResponseTime}ms
Date Range: ${this.results.summary.dateRange.firstError ? new Date(this.results.summary.dateRange.firstError).toLocaleDateString() : 'N/A'} - ${this.results.summary.dateRange.lastError ? new Date(this.results.summary.dateRange.lastError).toLocaleDateString() : 'N/A'}

🔍 ERROR TYPE BREAKDOWN
────────────────────────────────────────────────────────────────
${this.results.errorTypeBreakdown.map(type => 
  `${type.errorType.toUpperCase().padEnd(15)} | ${type.count.toString().padStart(4)} (${type.percentage}%) | Unresolved: ${type.unresolvedCount} | Recent: ${type.recentCount}`
).join('\n')}

📈 STATUS CODE DISTRIBUTION
────────────────────────────────────────────────────────────────
${this.results.statusCodeDistribution.map(status => 
  `${status.statusCode.toString().padEnd(3)} | ${status.count.toString().padStart(4)} (${status.percentage}%) | Avg Response: ${status.avgResponseTime}ms`
).join('\n')}

🎯 TOP FAILING ENDPOINTS
────────────────────────────────────────────────────────────────
${this.results.topFailingEndpoints.slice(0, 10).map((endpoint, i) => 
  `${(i+1).toString().padStart(2)}. ${endpoint.method} ${endpoint.endpoint}
     Errors: ${endpoint.count} (${endpoint.percentage}%) | Unresolved: ${endpoint.unresolvedCount}
     Users Affected: ${endpoint.affectedUsers} | Avg Response: ${endpoint.avgResponseTime}ms
     Status Codes: ${endpoint.statusCodes.join(', ')}
     Error Types: ${endpoint.errorTypes.join(', ')}`
).join('\n\n')}

🚨 CRITICAL ISSUES (${this.results.criticalIssues.length})
────────────────────────────────────────────────────────────────
${this.results.criticalIssues.slice(0, 5).map(issue => 
  `[${issue.severity}] ${issue.type}: ${issue.description}`
).join('\n')}

⚡ PERFORMANCE METRICS
────────────────────────────────────────────────────────────────
Average Response Time: ${Math.round(this.results.performanceMetrics.overall.avgResponseTime || 0)}ms
Max Response Time: ${Math.round(this.results.performanceMetrics.overall.maxResponseTime || 0)}ms
Slow Requests (>5s): ${this.results.performanceMetrics.overall.slowRequests || 0}
Very Slow Requests (>10s): ${this.results.performanceMetrics.overall.verySlowRequests || 0}

Slowest Endpoints:
${this.results.performanceMetrics.slowestEndpoints.slice(0, 5).map(endpoint => 
  `• ${endpoint.method} ${endpoint.endpoint}: ${endpoint.avgResponseTime}ms avg (${endpoint.count} errors)`
).join('\n')}

💡 RECOMMENDATIONS
────────────────────────────────────────────────────────────────
${this.results.recommendations.map((rec, i) => 
  `${i+1}. [${rec.priority}] ${rec.category}: ${rec.issue}
   Recommendation: ${rec.recommendation}
   Action Items:
   ${rec.actionItems.map(item => `   • ${item}`).join('\n')}`
).join('\n\n')}

═══════════════════════════════════════════════════════════════
Report completed at ${new Date().toISOString()}
═══════════════════════════════════════════════════════════════
    `;

    return report;
  }

  // Main analysis method
  async analyze() {
    console.log('🔍 Starting comprehensive API error analysis...\n');
    
    try {
      await this.connect();
      
      // Run all analysis methods
      await this.getSummaryStats();
      await this.getErrorTypeBreakdown();
      await this.getStatusCodeDistribution();
      await this.getTopFailingEndpoints();
      await this.getTimeBasedTrends();
      await this.getUserImpactAnalysis();
      await this.getPerformanceMetrics();
      await this.identifyCriticalIssues();
      this.generateRecommendations();
      
      // Generate and display report
      const report = this.generateReport();
      console.log(report);
      
      // Save detailed results to file
      const fs = require('fs');
      const detailedResults = {
        generatedAt: new Date().toISOString(),
        ...this.results
      };
      
      fs.writeFileSync(
        'api-error-analysis-detailed.json', 
        JSON.stringify(detailedResults, null, 2)
      );
      
      fs.writeFileSync(
        'api-error-analysis-report.txt', 
        report
      );
      
      console.log('\n✅ Analysis complete!');
      console.log('📄 Detailed results saved to: api-error-analysis-detailed.json');
      console.log('📄 Report saved to: api-error-analysis-report.txt');
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
    } finally {
      await this.disconnect();
    }
  }
}

// Run analysis if called directly
if (require.main === module) {
  const analyzer = new APIErrorAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = APIErrorAnalyzer;