#!/usr/bin/env node

/**
 * Railway deployment preparation script
 * Ensures the environment is ready for deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Preparing for Railway deployment...');

// Check Node.js version
const nodeVersion = process.version;
console.log(`📋 Node.js version: ${nodeVersion}`);

const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion < 20) {
    console.warn(`⚠️  Warning: Node.js ${nodeVersion} detected. Recommended: Node.js 20+`);
    console.log('   Railway deployment may encounter compatibility issues.');
    console.log('   The deployment includes polyfills to handle this.');
}

// Check required files
const requiredFiles = [
    'server.js',
    'package.json',
    '.nvmrc',
    'railway.toml',
    'polyfills.js'
];

console.log('\n📁 Checking required files...');
let allFilesPresent = true;

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`   ✅ ${file}`);
    } else {
        console.log(`   ❌ ${file} - MISSING`);
        allFilesPresent = false;
    }
});

// Check environment variables
console.log('\n🔧 Checking environment configuration...');
const requiredEnvVars = [
    'NODE_ENV',
    'SESSION_SECRET'
];

const optionalEnvVars = [
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASS',
    'EMAIL_FROM'
];

requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
        console.log(`   ✅ ${envVar} is set`);
    } else {
        console.log(`   ⚠️  ${envVar} is not set (will use default)`);
    }
});

console.log('\n📧 Optional email configuration:');
optionalEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
        console.log(`   ✅ ${envVar} is configured`);
    } else {
        console.log(`   ⚪ ${envVar} not configured (email features may not work)`);
    }
});

// Check people data directory
console.log('\n👥 Checking people data...');
const peopleDir = path.join(__dirname, '..', 'public', 'media', 'people');
if (fs.existsSync(peopleDir)) {
    try {
        const people = fs.readdirSync(peopleDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory());
        console.log(`   ✅ People directory found with ${people.length} profiles`);
        
        if (people.length > 0) {
            console.log('   📋 People profiles:');
            people.slice(0, 5).forEach((person, index) => {
                console.log(`      ${index + 1}. ${person.name}`);
            });
            if (people.length > 5) {
                console.log(`      ... and ${people.length - 5} more`);
            }
        }
    } catch (error) {
        console.log(`   ⚠️  Error reading people directory: ${error.message}`);
    }
} else {
    console.log(`   ⚠️  People directory not found at ${peopleDir}`);
    console.log('      Interesanti section may not work properly');
}

// Summary
console.log('\n📊 Deployment Readiness Summary:');
console.log(`   Files: ${allFilesPresent ? '✅ All present' : '❌ Missing files'}`);
console.log(`   Node.js: ${majorVersion >= 20 ? '✅ Compatible' : '⚠️  May need polyfills'}`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

if (allFilesPresent) {
    console.log('\n🎉 Ready for Railway deployment!');
    console.log('\n📝 Deployment checklist:');
    console.log('   1. Ensure Railway project is configured');
    console.log('   2. Set environment variables in Railway dashboard');
    console.log('   3. Deploy using: railway up');
    console.log('   4. Monitor deployment logs');
    console.log('   5. Test health endpoint: /health');
} else {
    console.log('\n❌ Deployment preparation incomplete');
    console.log('   Please ensure all required files are present');
    process.exit(1);
}

console.log('\n🔗 Useful Railway commands:');
console.log('   railway login');
console.log('   railway link');
console.log('   railway up');
console.log('   railway logs');
console.log('   railway status');

console.log('\n✨ Deployment preparation complete!');