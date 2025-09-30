#!/usr/bin/env node

/**
 * Production startup script with compatibility checks
 * Ensures the application starts correctly on Railway and other platforms
 */

// Load polyfills first
require('./polyfills');

// Check Node.js version and warn if incompatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

console.log(`🚀 Starting Ilze Skrastiņa website...`);
console.log(`📋 Node.js version: ${nodeVersion}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 Port: ${process.env.PORT || 3000}`);

if (majorVersion < 18) {
    console.error('❌ Node.js version 18 or higher is required');
    process.exit(1);
}

if (majorVersion < 20) {
    console.warn('⚠️  Node.js 20+ recommended for best compatibility');
    console.log('   Using compatibility polyfills...');
}

// Set production defaults
if (process.env.NODE_ENV === 'production') {
    // Ensure required environment variables have defaults
    process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'railway-default-secret-change-in-production';
    
    console.log('🔒 Production mode enabled');
    console.log('   - Security headers active');
    console.log('   - Rate limiting enabled');
    console.log('   - Error logging enhanced');
}

// Start the main server
try {
    require('./server.js');
} catch (error) {
    console.error('❌ Failed to start server:', error);
    
    // Provide helpful error messages
    if (error.message.includes('File is not defined')) {
        console.error('💡 This appears to be a Node.js compatibility issue');
        console.error('   Try upgrading to Node.js 20+ or contact support');
    } else if (error.message.includes('EADDRINUSE')) {
        console.error('💡 Port is already in use');
        console.error('   Try a different port or stop other services');
    } else if (error.message.includes('EACCES')) {
        console.error('💡 Permission denied');
        console.error('   Check file permissions and user privileges');
    }
    
    process.exit(1);
}