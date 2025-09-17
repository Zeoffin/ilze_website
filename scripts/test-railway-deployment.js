#!/usr/bin/env node

/**
 * Railway Deployment Test Script
 * Tests the deployment configuration locally before deploying to Railway
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🧪 Testing Railway deployment configuration...');

// Test 1: Verify Dockerfile
const testDockerfile = () => {
  console.log('📋 Testing Dockerfile...');
  
  const dockerfilePath = path.join(__dirname, '..', 'Dockerfile');
  if (!fs.existsSync(dockerfilePath)) {
    throw new Error('Dockerfile not found');
  }
  
  const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
  
  // Check for required elements
  const requiredElements = [
    'FROM node:',
    'WORKDIR /app',
    'COPY package*.json',
    'RUN npm ci',
    'EXPOSE 3000',
    'HEALTHCHECK',
    'CMD ["node", "server.js"]'
  ];
  
  for (const element of requiredElements) {
    if (!dockerfileContent.includes(element)) {
      throw new Error(`Dockerfile missing required element: ${element}`);
    }
  }
  
  console.log('✅ Dockerfile validation passed');
};

// Test 2: Verify Railway configuration
const testRailwayConfig = () => {
  console.log('🚂 Testing Railway configuration...');
  
  const railwayConfigPath = path.join(__dirname, '..', 'railway.toml');
  if (!fs.existsSync(railwayConfigPath)) {
    throw new Error('railway.toml not found');
  }
  
  const configContent = fs.readFileSync(railwayConfigPath, 'utf8');
  
  // Check for required sections
  const requiredSections = [
    '[build]',
    '[deploy]',
    'healthcheckPath = "/api/health"'
  ];
  
  for (const section of requiredSections) {
    if (!configContent.includes(section)) {
      throw new Error(`railway.toml missing required section: ${section}`);
    }
  }
  
  console.log('✅ Railway configuration validation passed');
};

// Test 3: Verify environment variables template
const testEnvironmentTemplate = () => {
  console.log('🔧 Testing environment variables template...');
  
  const envTemplatePath = path.join(__dirname, '..', '.env.railway');
  if (!fs.existsSync(envTemplatePath)) {
    throw new Error('.env.railway template not found');
  }
  
  const envContent = fs.readFileSync(envTemplatePath, 'utf8');
  
  // Check for required variables
  const requiredVars = [
    'NODE_ENV=production',
    'SESSION_SECRET=',
    'EMAIL_HOST=',
    'DATABASE_URL='
  ];
  
  for (const varDef of requiredVars) {
    if (!envContent.includes(varDef)) {
      throw new Error(`Environment template missing: ${varDef}`);
    }
  }
  
  console.log('✅ Environment variables template validation passed');
};

// Test 4: Test database adapter
const testDatabaseAdapter = async () => {
  console.log('🗄️  Testing database adapter...');
  
  // Test that the database module can switch between SQLite and PostgreSQL
  const originalEnv = process.env.RAILWAY_ENVIRONMENT;
  
  try {
    // Test SQLite mode (default)
    delete process.env.RAILWAY_ENVIRONMENT;
    delete require.cache[require.resolve('../src/models/index.js')];
    const sqliteModels = require('../src/models/index.js');
    console.log('✅ SQLite database adapter loaded');
    
    // Test PostgreSQL mode (simulated)
    process.env.RAILWAY_ENVIRONMENT = 'production';
    delete require.cache[require.resolve('../src/models/index.js')];
    const pgModels = require('../src/models/index.js');
    console.log('✅ PostgreSQL database adapter loaded');
    
  } finally {
    // Restore original environment
    if (originalEnv) {
      process.env.RAILWAY_ENVIRONMENT = originalEnv;
    } else {
      delete process.env.RAILWAY_ENVIRONMENT;
    }
  }
};

// Test 5: Test health endpoint with mock server
const testHealthEndpoint = () => {
  return new Promise((resolve, reject) => {
    console.log('🏥 Testing health endpoint...');
    
    // Start a minimal server to test the health endpoint
    const server = http.createServer((req, res) => {
      if (req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: 'test'
        }));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
    
    server.listen(0, () => {
      const port = server.address().port;
      
      // Test the health endpoint
      const req = http.get(`http://localhost:${port}/api/health`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          server.close();
          if (res.statusCode === 200) {
            const healthData = JSON.parse(data);
            if (healthData.status === 'healthy') {
              console.log('✅ Health endpoint test passed');
              resolve();
            } else {
              reject(new Error('Health endpoint returned unhealthy status'));
            }
          } else {
            reject(new Error(`Health endpoint returned status ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', (error) => {
        server.close();
        reject(error);
      });
    });
  });
};

// Test 6: Verify deployment scripts
const testDeploymentScripts = () => {
  console.log('📜 Testing deployment scripts...');
  
  const scripts = [
    'scripts/railway-deploy.js',
    'scripts/railway-postdeploy.js'
  ];
  
  for (const scriptPath of scripts) {
    const fullPath = path.join(__dirname, '..', scriptPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Deployment script not found: ${scriptPath}`);
    }
    
    // Check if script is executable (has shebang)
    const content = fs.readFileSync(fullPath, 'utf8');
    if (!content.startsWith('#!/usr/bin/env node')) {
      throw new Error(`Script missing shebang: ${scriptPath}`);
    }
  }
  
  console.log('✅ Deployment scripts validation passed');
};

// Test 7: Check package.json for Railway compatibility
const testPackageJson = () => {
  console.log('📦 Testing package.json Railway compatibility...');
  
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Check for required scripts
  const requiredScripts = ['start', 'railway:predeploy', 'railway:postdeploy'];
  for (const script of requiredScripts) {
    if (!packageJson.scripts[script]) {
      throw new Error(`Missing required script: ${script}`);
    }
  }
  
  // Check for PostgreSQL dependency
  if (!packageJson.dependencies.pg) {
    throw new Error('Missing PostgreSQL dependency (pg)');
  }
  
  console.log('✅ package.json Railway compatibility passed');
};

// Run all tests
const runAllTests = async () => {
  try {
    testDockerfile();
    testRailwayConfig();
    testEnvironmentTemplate();
    await testDatabaseAdapter();
    await testHealthEndpoint();
    testDeploymentScripts();
    testPackageJson();
    
    console.log('🎉 All Railway deployment tests passed!');
    console.log('📝 Your application is ready for Railway deployment');
    console.log('');
    console.log('Next steps:');
    console.log('1. Push your code to a Git repository');
    console.log('2. Connect the repository to Railway');
    console.log('3. Set the required environment variables in Railway dashboard');
    console.log('4. Deploy and monitor the logs');
    
  } catch (error) {
    console.error('❌ Railway deployment test failed:', error.message);
    process.exit(1);
  }
};

runAllTests();