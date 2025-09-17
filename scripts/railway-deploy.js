#!/usr/bin/env node

/**
 * Railway Deployment Script
 * Handles pre-deployment tasks and environment setup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Railway deployment preparation...');

// Check if we're in Railway environment
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.DATABASE_URL;

if (!isRailway) {
  console.log('❌ Not in Railway environment. This script should only run on Railway.');
  process.exit(1);
}

console.log('✅ Railway environment detected');

// Verify required environment variables
const requiredEnvVars = [
  'SESSION_SECRET',
  'EMAIL_HOST',
  'EMAIL_USER',
  'EMAIL_PASS',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.log(`   - ${varName}`));
  console.log('\nPlease set these variables in Railway dashboard.');
  process.exit(1);
}

console.log('✅ All required environment variables are set');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('✅ Created logs directory');
}

// Run security audit
try {
  console.log('🔍 Running security audit...');
  execSync('npm audit --audit-level moderate', { stdio: 'inherit' });
  console.log('✅ Security audit passed');
} catch (error) {
  console.log('⚠️  Security audit found issues, but continuing deployment');
}

// Test database connection
console.log('🔗 Testing database connection...');
try {
  const { initializeDatabase } = require('../src/models');
  await initializeDatabase();
  console.log('✅ Database connection successful');
} catch (error) {
  console.log('❌ Database connection failed:', error.message);
  process.exit(1);
}

console.log('🎉 Railway deployment preparation completed successfully!');
console.log('📝 Next steps:');
console.log('   1. Verify all environment variables in Railway dashboard');
console.log('   2. Monitor deployment logs for any issues');
console.log('   3. Test the health endpoint after deployment');
console.log('   4. Verify admin login functionality');