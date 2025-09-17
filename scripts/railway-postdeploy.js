#!/usr/bin/env node

/**
 * Railway Post-Deployment Script
 * Runs after successful deployment to verify functionality
 */

const http = require('http');
const https = require('https');

console.log('🔍 Running post-deployment verification...');

// Get the Railway service URL
const serviceUrl = process.env.RAILWAY_STATIC_URL || 
                  process.env.RAILWAY_PUBLIC_DOMAIN ||
                  `http://localhost:${process.env.PORT || 3000}`;

console.log(`Testing service at: ${serviceUrl}`);

// Test health endpoint
const testHealthEndpoint = () => {
  return new Promise((resolve, reject) => {
    const client = serviceUrl.startsWith('https') ? https : http;
    const healthUrl = `${serviceUrl}/api/health`;
    
    console.log(`Testing health endpoint: ${healthUrl}`);
    
    const req = client.get(healthUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const healthData = JSON.parse(data);
          console.log('✅ Health check passed:', healthData);
          resolve(healthData);
        } else {
          reject(new Error(`Health check failed with status ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Health check timeout'));
    });
  });
};

// Test main page
const testMainPage = () => {
  return new Promise((resolve, reject) => {
    const client = serviceUrl.startsWith('https') ? https : http;
    
    console.log(`Testing main page: ${serviceUrl}`);
    
    const req = client.get(serviceUrl, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Main page accessible');
        resolve();
      } else {
        reject(new Error(`Main page failed with status ${res.statusCode}`));
      }
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Main page test timeout'));
    });
  });
};

// Test admin login page
const testAdminPage = () => {
  return new Promise((resolve, reject) => {
    const client = serviceUrl.startsWith('https') ? https : http;
    const adminUrl = `${serviceUrl}/admin/login`;
    
    console.log(`Testing admin page: ${adminUrl}`);
    
    const req = client.get(adminUrl, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Admin login page accessible');
        resolve();
      } else {
        reject(new Error(`Admin page failed with status ${res.statusCode}`));
      }
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Admin page test timeout'));
    });
  });
};

// Run all tests
const runTests = async () => {
  try {
    await testHealthEndpoint();
    await testMainPage();
    await testAdminPage();
    
    console.log('🎉 All post-deployment tests passed!');
    console.log('📝 Deployment verification complete');
    console.log(`🌐 Service is live at: ${serviceUrl}`);
    
  } catch (error) {
    console.error('❌ Post-deployment test failed:', error.message);
    process.exit(1);
  }
};

// Wait a moment for the service to fully start, then run tests
setTimeout(runTests, 5000);