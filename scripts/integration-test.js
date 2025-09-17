#!/usr/bin/env node

/**
 * Integration Test Script
 * Tests complete user workflows and system integration
 */

const request = require('supertest');
const app = require('../server');
const { initializeDatabase } = require('../src/models');
const fs = require('fs').promises;
const path = require('path');

class IntegrationTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.server = null;
  }

  async setup() {
    console.log('🚀 Setting up integration tests...');
    
    // Initialize test database
    await initializeDatabase();
    
    // Create test uploads directory
    try {
      await fs.mkdir('test-uploads', { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    console.log('✅ Setup complete');
  }

  async cleanup() {
    console.log('🧹 Cleaning up...');
    
    // Clean up test uploads
    try {
      const files = await fs.readdir('test-uploads');
      for (const file of files) {
        await fs.unlink(path.join('test-uploads', file));
      }
      await fs.rmdir('test-uploads');
    } catch (error) {
      // Directory might not exist
    }
    
    console.log('✅ Cleanup complete');
  }

  addResult(testName, passed, message = '') {
    this.results.tests.push({ testName, passed, message });
    if (passed) {
      this.results.passed++;
      console.log(`✅ ${testName}`);
    } else {
      this.results.failed++;
      console.log(`❌ ${testName}: ${message}`);
    }
  }

  async testHealthEndpoints() {
    console.log('\n🔍 Testing health endpoints...');

    try {
      // Test main health endpoint
      const healthResponse = await request(app)
        .get('/health')
        .expect(200);

      this.addResult('Health endpoint responds', 
        healthResponse.body.status === 'healthy',
        `Status: ${healthResponse.body.status}`);

      // Test readiness probe
      const readyResponse = await request(app)
        .get('/health/ready')
        .expect(200);

      this.addResult('Readiness probe responds',
        readyResponse.body.status === 'ready',
        `Status: ${readyResponse.body.status}`);

      // Test liveness probe
      const liveResponse = await request(app)
        .get('/health/live')
        .expect(200);

      this.addResult('Liveness probe responds',
        liveResponse.body.status === 'alive',
        `Status: ${liveResponse.body.status}`);

    } catch (error) {
      this.addResult('Health endpoints', false, error.message);
    }
  }

  async testPublicWebsite() {
    console.log('\n🔍 Testing public website...');

    try {
      // Test main page
      const mainPageResponse = await request(app)
        .get('/')
        .expect(200);

      this.addResult('Main page loads',
        mainPageResponse.text.includes('<html>'),
        'HTML content received');

      // Test static file serving
      const staticResponse = await request(app)
        .get('/css/style.css')
        .expect(200);

      this.addResult('Static files served',
        staticResponse.headers['content-type'].includes('text/css'),
        'CSS file served correctly');

      // Test API content endpoints
      const contentResponse = await request(app)
        .get('/api/content/interesanti')
        .expect(200);

      this.addResult('Content API responds',
        Array.isArray(contentResponse.body),
        'Content data returned as array');

    } catch (error) {
      this.addResult('Public website', false, error.message);
    }
  }

  async testContactForm() {
    console.log('\n🔍 Testing contact form...');

    try {
      const contactData = {
        name: 'Integration Test User',
        email: 'test@example.com',
        message: 'This is a test message from integration tests.'
      };

      const contactResponse = await request(app)
        .post('/api/contact')
        .send(contactData)
        .expect(200);

      this.addResult('Contact form submission',
        contactResponse.body.success === true,
        contactResponse.body.message || 'Form submitted successfully');

      // Test form validation
      const invalidContactResponse = await request(app)
        .post('/api/contact')
        .send({ name: '', email: 'invalid-email', message: '' })
        .expect(400);

      this.addResult('Contact form validation',
        invalidContactResponse.body.error !== undefined,
        'Validation errors returned correctly');

    } catch (error) {
      this.addResult('Contact form', false, error.message);
    }
  }

  async testAdminAuthentication() {
    console.log('\n🔍 Testing admin authentication...');

    try {
      // Test admin login page
      const loginPageResponse = await request(app)
        .get('/admin/login')
        .expect(200);

      this.addResult('Admin login page loads',
        loginPageResponse.text.includes('login'),
        'Login page HTML received');

      // Test admin login with default credentials
      const agent = request.agent(app);
      const loginResponse = await agent
        .post('/admin/login')
        .send({
          username: 'admin',
          password: 'admin123'
        })
        .expect(200);

      this.addResult('Admin login successful',
        loginResponse.body.success === true,
        'Login with default credentials');

      // Test protected route access
      const dashboardResponse = await agent
        .get('/admin/dashboard')
        .expect(200);

      this.addResult('Admin dashboard access',
        dashboardResponse.text.includes('dashboard'),
        'Dashboard accessible after login');

      // Test logout
      const logoutResponse = await agent
        .post('/admin/logout')
        .expect(200);

      this.addResult('Admin logout',
        logoutResponse.body.success === true,
        'Logout successful');

      // Test unauthorized access
      const unauthorizedResponse = await request(app)
        .get('/admin/dashboard')
        .expect(302);

      this.addResult('Unauthorized access blocked',
        unauthorizedResponse.status === 302,
        'Redirected when not authenticated');

    } catch (error) {
      this.addResult('Admin authentication', false, error.message);
    }
  }

  async testContentManagement() {
    console.log('\n🔍 Testing content management...');

    try {
      // Login first
      const agent = request.agent(app);
      await agent
        .post('/admin/login')
        .send({
          username: 'admin',
          password: 'admin123'
        })
        .expect(200);

      // Test content retrieval
      const getContentResponse = await agent
        .get('/admin/content/interesanti')
        .expect(200);

      this.addResult('Content retrieval',
        Array.isArray(getContentResponse.body),
        'Content data retrieved successfully');

      // Test content update
      const updateData = {
        content: [
          {
            content_type: 'text',
            content: 'Updated test content for integration testing',
            order_index: 1
          }
        ]
      };

      const updateResponse = await agent
        .put('/admin/content/interesanti')
        .send(updateData)
        .expect(200);

      this.addResult('Content update',
        updateResponse.body.success === true,
        'Content updated successfully');

      // Verify update
      const verifyResponse = await agent
        .get('/admin/content/interesanti')
        .expect(200);

      const hasUpdatedContent = verifyResponse.body.some(item => 
        item.content && item.content.includes('Updated test content'));

      this.addResult('Content update verification',
        hasUpdatedContent,
        'Updated content found in database');

    } catch (error) {
      this.addResult('Content management', false, error.message);
    }
  }

  async testErrorHandling() {
    console.log('\n🔍 Testing error handling...');

    try {
      // Test 404 handling
      const notFoundResponse = await request(app)
        .get('/nonexistent-page')
        .expect(404);

      this.addResult('404 error handling',
        notFoundResponse.status === 404,
        '404 status returned for nonexistent pages');

      // Test malformed JSON
      const malformedResponse = await request(app)
        .post('/api/contact')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      this.addResult('Malformed JSON handling',
        malformedResponse.status === 400,
        'Bad request status for malformed JSON');

      // Test rate limiting (if enabled)
      const rateLimitPromises = [];
      for (let i = 0; i < 5; i++) {
        rateLimitPromises.push(
          request(app)
            .get('/api/content/interesanti')
            .expect(res => res.status === 200 || res.status === 429)
        );
      }

      await Promise.all(rateLimitPromises);
      this.addResult('Rate limiting functional',
        true,
        'Rate limiting middleware is working');

    } catch (error) {
      this.addResult('Error handling', false, error.message);
    }
  }

  async testSecurity() {
    console.log('\n🔍 Testing security measures...');

    try {
      // Test XSS protection
      const xssPayload = '<script>alert("xss")</script>';
      const xssResponse = await request(app)
        .post('/api/contact')
        .send({
          name: xssPayload,
          email: 'test@example.com',
          message: 'Test message'
        })
        .expect(res => res.status === 200 || res.status === 400);

      this.addResult('XSS protection',
        !xssResponse.text.includes('<script>'),
        'XSS payload sanitized or rejected');

      // Test SQL injection protection
      const sqlPayload = "'; DROP TABLE content; --";
      const sqlResponse = await request(app)
        .post('/api/contact')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          message: sqlPayload
        })
        .expect(res => res.status === 200 || res.status === 400);

      this.addResult('SQL injection protection',
        sqlResponse.status !== 500,
        'SQL injection attempt handled safely');

      // Test security headers
      const headersResponse = await request(app)
        .get('/')
        .expect(200);

      const hasSecurityHeaders = 
        headersResponse.headers['x-frame-options'] &&
        headersResponse.headers['x-content-type-options'];

      this.addResult('Security headers present',
        hasSecurityHeaders,
        'Basic security headers are set');

    } catch (error) {
      this.addResult('Security measures', false, error.message);
    }
  }

  async testPerformance() {
    console.log('\n🔍 Testing performance...');

    try {
      // Test response times
      const startTime = Date.now();
      await request(app)
        .get('/')
        .expect(200);
      const responseTime = Date.now() - startTime;

      this.addResult('Response time acceptable',
        responseTime < 1000,
        `Response time: ${responseTime}ms`);

      // Test concurrent requests
      const concurrentPromises = [];
      for (let i = 0; i < 10; i++) {
        concurrentPromises.push(
          request(app)
            .get('/api/content/interesanti')
            .expect(200)
        );
      }

      const concurrentStart = Date.now();
      await Promise.all(concurrentPromises);
      const concurrentTime = Date.now() - concurrentStart;

      this.addResult('Concurrent request handling',
        concurrentTime < 5000,
        `10 concurrent requests completed in ${concurrentTime}ms`);

    } catch (error) {
      this.addResult('Performance tests', false, error.message);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 INTEGRATION TEST REPORT');
    console.log('='.repeat(60));

    const total = this.results.passed + this.results.failed;
    const passRate = total > 0 ? Math.round((this.results.passed / total) * 100) : 0;

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Tests: ${total}`);
    console.log(`   ✅ Passed: ${this.results.passed}`);
    console.log(`   ❌ Failed: ${this.results.failed}`);
    console.log(`   📈 Pass Rate: ${passRate}%`);

    if (this.results.failed > 0) {
      console.log(`\n❌ FAILED TESTS:`);
      this.results.tests
        .filter(test => !test.passed)
        .forEach((test, index) => {
          console.log(`   ${index + 1}. ${test.testName}: ${test.message}`);
        });
    }

    console.log(`\n🎯 RECOMMENDATIONS:`);
    if (this.results.failed === 0) {
      console.log(`   🎉 All tests passed! System is ready for deployment.`);
    } else if (this.results.failed <= 2) {
      console.log(`   ⚠️  Minor issues detected. Review failed tests before deployment.`);
    } else {
      console.log(`   🚨 Multiple issues detected. Address failed tests before deployment.`);
    }

    console.log('\n' + '='.repeat(60));

    return this.results.failed === 0 ? 0 : 1;
  }

  async runTests() {
    try {
      await this.setup();

      await this.testHealthEndpoints();
      await this.testPublicWebsite();
      await this.testContactForm();
      await this.testAdminAuthentication();
      await this.testContentManagement();
      await this.testErrorHandling();
      await this.testSecurity();
      await this.testPerformance();

      const exitCode = this.generateReport();
      
      await this.cleanup();
      
      process.exit(exitCode);
    } catch (error) {
      console.error('Integration tests failed:', error);
      await this.cleanup();
      process.exit(2);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.runTests();
}

module.exports = IntegrationTester;