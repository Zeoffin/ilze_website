#!/usr/bin/env node

/**
 * Generate secure credentials for Railway deployment
 */

const crypto = require('crypto');

function generateSecurePassword(length = 16) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function generateSessionSecret() {
  return crypto.randomBytes(32).toString('hex');
}

console.log('🔐 Secure Credentials for Railway Deployment');
console.log('='.repeat(50));
console.log();

console.log('📋 Copy these environment variables to Railway:');
console.log();

console.log('NODE_ENV=production');
console.log(`SESSION_SECRET=${generateSessionSecret()}`);
console.log('ADMIN_USERNAME=admin');
console.log(`ADMIN_PASSWORD=${generateSecurePassword(16)}`);
console.log('ADMIN_EMAIL=admin@yourdomain.com');

console.log();
console.log('⚠️  Important Security Notes:');
console.log('• Save these credentials in a secure password manager');
console.log('• Never commit these values to git');
console.log('• Change ADMIN_EMAIL to your actual email address');
console.log('• Consider using a different ADMIN_USERNAME for security');
console.log();

console.log('🚀 Railway Deployment Commands:');
console.log('railway variables set NODE_ENV=production');
console.log(`railway variables set SESSION_SECRET=${generateSessionSecret()}`);
console.log('railway variables set ADMIN_USERNAME=admin');
console.log(`railway variables set ADMIN_PASSWORD=${generateSecurePassword(16)}`);
console.log('railway variables set ADMIN_EMAIL=admin@yourdomain.com');
console.log();

console.log('📖 For detailed deployment instructions, see: RAILWAY_DEPLOYMENT.md');