#!/usr/bin/env node

/**
 * Integration Test Runner
 * Runs comprehensive integration tests and generates reports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class IntegrationTestRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        duration: 0
      }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }

  async runTestSuite(suiteName, command) {
    this.log(`Running ${suiteName} tests...`);
    const startTime = Date.now();

    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60000 // 1 minute timeout
      });

      const duration = Date.now() - startTime;
      
      this.results.tests[suiteName] = {
        status: 'passed',
        duration: duration,
        output: output
      };

      this.results.summary.passed++;
      this.log(`${suiteName} tests PASSED (${duration}ms)`, 'info');
      
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.tests[suiteName] = {
        status: 'failed',
        duration: duration,
        error: error.message,
        output: error.stdout || '',
        stderr: error.stderr || ''
      };

      this.results.summary.failed++;
      this.log(`${suiteName} tests FAILED (${duration}ms)`, 'error');
      this.log(`Error: ${error.message}`, 'error');
      
      return false;
    }
  }

  async runAllTests() {
    this.log('Starting comprehensive integration test suite...');
    const overallStartTime = Date.now();

    // Test suites to run
    const testSuites = [
      {
        name: 'Unit Tests',
        command: 'npm run test:unit'
      },
      {
        name: 'Integration Tests',
        command: 'npm run test:integration'
      },
      {
        name: 'Security Tests',
        command: 'npm run test:security'
      },
      {
        name: 'Email Functionality',
        command: 'npm run test:email'
      },
      {
        name: 'Content Management',
        command: 'npm run test:content'
      },
      {
        name: 'Error Handling',
        command: 'npm run test:errors'
      },
      {
        name: 'Complete Integration',
        command: 'npx jest tests/complete-integration.test.js --runInBand --forceExit'
      }
    ];

    // Run each test suite
    for (const suite of testSuites) {
      await this.runTestSuite(suite.name, suite.command);
      this.results.summary.total++;
    }

    // Calculate overall duration
    this.results.summary.duration = Date.now() - overallStartTime;

    // Generate coverage report
    try {
      this.log('Generating coverage report...');
      execSync('npm run test:coverage', { stdio: 'pipe' });
      this.log('Coverage report generated successfully');
    } catch (error) {
      this.log('Failed to generate coverage report', 'warn');
    }

    return this.generateReport();
  }

  generateReport() {
    // Calculate success rate
    const successRate = this.results.summary.total > 0 
      ? (this.results.summary.passed / this.results.summary.total * 100).toFixed(2)
      : 0;

    this.results.summary.successRate = `${successRate}%`;
    this.results.summary.overallStatus = this.results.summary.failed === 0 ? 'PASSED' : 'FAILED';

    // Write detailed report
    const reportPath = 'integration-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

    // Generate human-readable summary
    console.log('\n' + '='.repeat(60));
    console.log('INTEGRATION TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Overall Status: ${this.results.summary.overallStatus}`);
    console.log(`Success Rate: ${this.results.summary.successRate}`);
    console.log(`Total Tests: ${this.results.summary.total}`);
    console.log(`Passed: ${this.results.summary.passed}`);
    console.log(`Failed: ${this.results.summary.failed}`);
    console.log(`Total Duration: ${this.results.summary.duration}ms`);
    console.log(`Report saved to: ${reportPath}`);

    // Show failed tests
    if (this.results.summary.failed > 0) {
      console.log('\nFAILED TEST SUITES:');
      Object.entries(this.results.tests).forEach(([name, result]) => {
        if (result.status === 'failed') {
          console.log(`- ${name}: ${result.error}`);
        }
      });
    }

    // Show coverage information if available
    const coverageDir = 'coverage';
    if (fs.existsSync(coverageDir)) {
      console.log(`\nCoverage report available in: ${coverageDir}/`);
    }

    console.log('\n' + '='.repeat(60));

    return this.results;
  }

  async runHealthCheck() {
    this.log('Running application health check...');

    try {
      // Start server in background for health check
      const { spawn } = require('child_process');
      const server = spawn('node', ['server.js'], {
        env: { ...process.env, NODE_ENV: 'test', PORT: '3001' },
        stdio: 'pipe'
      });

      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check health endpoint
      const http = require('http');
      const healthCheck = new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3001/api/health', (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const health = JSON.parse(data);
              if (health.status === 'healthy') {
                resolve(health);
              } else {
                reject(new Error(`Health check failed: ${health.status}`));
              }
            } catch (error) {
              reject(error);
            }
          });
        });

        req.on('error', reject);
        req.setTimeout(5000, () => reject(new Error('Health check timeout')));
      });

      const healthResult = await healthCheck;
      this.log(`Health check PASSED: ${healthResult.status}`, 'info');

      // Clean up server
      server.kill();

      return healthResult;
    } catch (error) {
      this.log(`Health check FAILED: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Performance test function
async function runPerformanceTest() {
  console.log('Running basic performance test...');
  
  try {
    const { spawn } = require('child_process');
    
    // Start server
    const server = spawn('node', ['server.js'], {
      env: { ...process.env, NODE_ENV: 'test', PORT: '3002' },
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Simple load test using curl
    const startTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < 10; i++) {
      promises.push(
        new Promise((resolve, reject) => {
          const http = require('http');
          const req = http.get('http://localhost:3002/', (res) => {
            const requestTime = Date.now() - startTime;
            resolve({ statusCode: res.statusCode, time: requestTime });
          });
          req.on('error', reject);
          req.setTimeout(5000, () => reject(new Error('Request timeout')));
        })
      );
    }

    const results = await Promise.all(promises);
    const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
    
    console.log(`Performance test completed: Average response time ${avgTime.toFixed(2)}ms`);
    
    // Clean up
    server.kill();
    
    return { averageResponseTime: avgTime, requests: results.length };
  } catch (error) {
    console.error('Performance test failed:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  const runner = new IntegrationTestRunner();

  try {
    // Run health check first
    await runner.runHealthCheck();

    // Run all integration tests
    const testResults = await runner.runAllTests();

    // Run performance test
    const perfResults = await runPerformanceTest();
    testResults.performance = perfResults;

    // Exit with appropriate code
    if (testResults.summary.overallStatus === 'PASSED') {
      console.log('\n✅ All integration tests passed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Some integration tests failed. Please review the results.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Integration test suite failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = IntegrationTestRunner;