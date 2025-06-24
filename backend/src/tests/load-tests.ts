/**
 * Load Testing Script for Charactier AI
 * Tests system performance under various load conditions
 */

import axios, { AxiosInstance } from 'axios';
import { performance } from 'perf_hooks';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

interface LoadTestResult {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: { [key: string]: number };
}

interface TestScenario {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: any;
  concurrentUsers: number;
  requestsPerUser: number;
  delayBetweenRequests?: number;
}

class LoadTester {
  private results: LoadTestResult[] = [];
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      validateStatus: () => true // Don't throw on any status
    });
  }

  /**
   * Execute a single request and measure performance
   */
  private async executeRequest(scenario: TestScenario): Promise<{
    success: boolean;
    responseTime: number;
    statusCode: number;
    error?: string;
  }> {
    const startTime = performance.now();
    
    try {
      const response = await this.axiosInstance({
        method: scenario.method,
        url: scenario.endpoint,
        data: scenario.body,
        headers: scenario.headers
      });

      const responseTime = performance.now() - startTime;
      
      return {
        success: response.status < 400,
        responseTime,
        statusCode: response.status,
        error: response.status >= 400 ? `HTTP ${response.status}` : undefined
      };
    } catch (error: any) {
      const responseTime = performance.now() - startTime;
      
      return {
        success: false,
        responseTime,
        statusCode: 0,
        error: error.code || error.message
      };
    }
  }

  /**
   * Run load test for a specific scenario
   */
  async runScenario(scenario: TestScenario): Promise<LoadTestResult> {
    console.log(`\n🚀 Running scenario: ${scenario.name}`);
    console.log(`   Endpoint: ${scenario.method} ${scenario.endpoint}`);
    console.log(`   Concurrent users: ${scenario.concurrentUsers}`);
    console.log(`   Requests per user: ${scenario.requestsPerUser}`);
    
    const totalRequests = scenario.concurrentUsers * scenario.requestsPerUser;
    const results: Array<{
      success: boolean;
      responseTime: number;
      statusCode: number;
      error?: string;
    }> = [];
    
    const startTime = performance.now();
    
    // Create promises for all users
    const userPromises = [];
    
    for (let user = 0; user < scenario.concurrentUsers; user++) {
      const userRequests = async () => {
        const userResults = [];
        
        for (let req = 0; req < scenario.requestsPerUser; req++) {
          if (scenario.delayBetweenRequests && req > 0) {
            await new Promise(resolve => setTimeout(resolve, scenario.delayBetweenRequests));
          }
          
          const result = await this.executeRequest(scenario);
          userResults.push(result);
          
          // Progress indicator
          if ((user * scenario.requestsPerUser + req + 1) % 100 === 0) {
            process.stdout.write('.');
          }
        }
        
        return userResults;
      };
      
      userPromises.push(userRequests());
    }
    
    // Execute all user requests concurrently
    const allUserResults = await Promise.all(userPromises);
    
    // Flatten results
    for (const userResults of allUserResults) {
      results.push(...userResults);
    }
    
    const totalTime = (performance.now() - startTime) / 1000; // Convert to seconds
    
    // Calculate statistics
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = results.filter(r => !r.success).length;
    const responseTimes = results.map(r => r.responseTime);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    const requestsPerSecond = totalRequests / totalTime;
    
    // Count errors by type
    const errors: { [key: string]: number } = {};
    results.forEach(r => {
      if (r.error) {
        errors[r.error] = (errors[r.error] || 0) + 1;
      }
    });
    
    const result: LoadTestResult = {
      endpoint: `${scenario.method} ${scenario.endpoint}`,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: Math.round(averageResponseTime),
      minResponseTime: Math.round(minResponseTime),
      maxResponseTime: Math.round(maxResponseTime),
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      errors
    };
    
    this.results.push(result);
    console.log('\n✅ Scenario completed');
    
    return result;
  }

  /**
   * Print detailed results for a scenario
   */
  private printScenarioResults(result: LoadTestResult) {
    console.log(`\n📊 Results for ${result.endpoint}:`);
    console.log(`   Total requests: ${result.totalRequests}`);
    console.log(`   Successful: ${result.successfulRequests} (${Math.round(result.successfulRequests / result.totalRequests * 100)}%)`);
    console.log(`   Failed: ${result.failedRequests} (${Math.round(result.failedRequests / result.totalRequests * 100)}%)`);
    console.log(`   Requests/second: ${result.requestsPerSecond}`);
    console.log(`   Response times:`);
    console.log(`     Average: ${result.averageResponseTime}ms`);
    console.log(`     Min: ${result.minResponseTime}ms`);
    console.log(`     Max: ${result.maxResponseTime}ms`);
    
    if (Object.keys(result.errors).length > 0) {
      console.log(`   Errors:`);
      Object.entries(result.errors).forEach(([error, count]) => {
        console.log(`     ${error}: ${count}`);
      });
    }
  }

  /**
   * Generate summary report
   */
  generateReport() {
    console.log('\n================================================');
    console.log('📈 LOAD TEST SUMMARY REPORT');
    console.log('================================================\n');
    
    this.results.forEach(result => {
      this.printScenarioResults(result);
    });
    
    // Overall statistics
    const totalRequests = this.results.reduce((sum, r) => sum + r.totalRequests, 0);
    const totalSuccessful = this.results.reduce((sum, r) => sum + r.successfulRequests, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failedRequests, 0);
    const overallSuccessRate = Math.round(totalSuccessful / totalRequests * 100);
    
    console.log('\n🎯 Overall Statistics:');
    console.log(`   Total requests: ${totalRequests}`);
    console.log(`   Overall success rate: ${overallSuccessRate}%`);
    console.log(`   Total failures: ${totalFailed}`);
    
    // Performance recommendations
    console.log('\n💡 Performance Analysis:');
    
    this.results.forEach(result => {
      const successRate = result.successfulRequests / result.totalRequests * 100;
      
      if (successRate < 95) {
        console.log(`   ⚠️  ${result.endpoint}: Low success rate (${Math.round(successRate)}%)`);
      }
      
      if (result.averageResponseTime > 1000) {
        console.log(`   ⚠️  ${result.endpoint}: High average response time (${result.averageResponseTime}ms)`);
      }
      
      if (result.maxResponseTime > 5000) {
        console.log(`   ⚠️  ${result.endpoint}: Very high max response time (${result.maxResponseTime}ms)`);
      }
    });
    
    // System capacity estimation
    const avgRPS = this.results.reduce((sum, r) => sum + r.requestsPerSecond, 0) / this.results.length;
    console.log(`\n📊 Estimated System Capacity:`);
    console.log(`   Average requests/second: ${Math.round(avgRPS)}`);
    console.log(`   Estimated daily capacity: ${Math.round(avgRPS * 86400)} requests`);
    
    // Recommendations
    console.log('\n🔧 Recommendations:');
    
    if (overallSuccessRate < 99) {
      console.log('   - Consider implementing request queuing or scaling horizontally');
    }
    
    const hasHighResponseTime = this.results.some(r => r.averageResponseTime > 500);
    if (hasHighResponseTime) {
      console.log('   - Optimize slow endpoints or implement caching');
    }
    
    const hasRateLimitErrors = this.results.some(r => r.errors['HTTP 429'] > 0);
    if (hasRateLimitErrors) {
      console.log('   - Rate limiting is working but may need adjustment for production load');
    }
  }
}

// Test scenarios
const testScenarios: TestScenario[] = [
  // 1. Health check endpoint (baseline)
  {
    name: 'Health Check - Light Load',
    endpoint: `/api/${process.env.API_VERSION || 'v1'}/health`,
    method: 'GET',
    concurrentUsers: 10,
    requestsPerUser: 100
  },
  
  // 2. Health check endpoint (heavy load)
  {
    name: 'Health Check - Heavy Load',
    endpoint: `/api/${process.env.API_VERSION || 'v1'}/health`,
    method: 'GET',
    concurrentUsers: 100,
    requestsPerUser: 50
  },
  
  // 3. Authentication endpoint (normal load)
  {
    name: 'Login Endpoint - Normal Load',
    endpoint: `/api/auth/login`,
    method: 'POST',
    body: {
      email: 'loadtest@example.com',
      password: 'TestPassword123!'
    },
    concurrentUsers: 10,
    requestsPerUser: 10,
    delayBetweenRequests: 100 // Rate limit protection
  },
  
  // 4. Character list (authenticated users)
  {
    name: 'Character List - Authenticated Load',
    endpoint: `/api/${process.env.API_VERSION || 'v1'}/characters`,
    method: 'GET',
    headers: {
      'Authorization': 'Bearer mock-token-for-load-test'
    },
    concurrentUsers: 50,
    requestsPerUser: 20
  },
  
  // 5. Chat endpoint (simulated conversation)
  {
    name: 'Chat API - Conversation Simulation',
    endpoint: `/api/${process.env.API_VERSION || 'v1'}/chat/send`,
    method: 'POST',
    body: {
      characterId: 'mock-character-id',
      message: 'こんにちは！今日はどんな一日でしたか？'
    },
    headers: {
      'Authorization': 'Bearer mock-token-for-load-test'
    },
    concurrentUsers: 20,
    requestsPerUser: 5,
    delayBetweenRequests: 500 // Simulate typing delay
  },
  
  // 6. Static file serving
  {
    name: 'Static Files - Image Loading',
    endpoint: '/uploads/characters/default.jpg',
    method: 'GET',
    concurrentUsers: 100,
    requestsPerUser: 10
  },
  
  // 7. API under rate limiting
  {
    name: 'Rate Limit Test',
    endpoint: `/api/auth/register`,
    method: 'POST',
    body: {
      name: 'Load Test User',
      email: `loadtest${Date.now()}@example.com`,
      password: 'TestPassword123!'
    },
    concurrentUsers: 5,
    requestsPerUser: 30, // Should trigger rate limit
    delayBetweenRequests: 10
  }
];

// Main execution
async function runLoadTests() {
  console.log('🏋️  Starting Load Tests for Charactier AI');
  console.log(`Testing against: ${BASE_URL}`);
  console.log('================================================\n');
  
  const tester = new LoadTester();
  
  // Run each scenario
  for (const scenario of testScenarios) {
    await tester.runScenario(scenario);
    
    // Cool down period between scenarios
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Generate final report
  tester.generateReport();
  
  console.log('\n✅ Load testing completed!');
}

// Run tests if executed directly
if (require.main === module) {
  runLoadTests().catch(console.error);
}

export { runLoadTests, LoadTester, TestScenario };