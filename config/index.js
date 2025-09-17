/**
 * Configuration Manager
 * This file loads the appropriate configuration based on NODE_ENV
 */

const path = require('path');

// Determine environment
const env = process.env.NODE_ENV || 'development';

// Load environment-specific configuration
let config;
try {
  config = require(`./${env}.js`);
} catch (error) {
  console.warn(`Configuration file for environment '${env}' not found, falling back to development`);
  config = require('./development.js');
}

// Merge with environment variables
const mergedConfig = {
  ...config,
  env,
  
  // Override with environment variables where applicable
  server: {
    ...config.server,
    port: process.env.PORT || config.server.port,
    host: process.env.HOST || config.server.host
  },

  database: {
    ...config.database,
    filename: process.env.DATABASE_PATH || config.database.filename
  },

  security: {
    ...config.security,
    session: {
      ...config.security.session,
      secret: process.env.SESSION_SECRET || config.security.session.secret
    }
  },

  email: {
    ...config.email,
    host: process.env.EMAIL_HOST || config.email.host,
    port: parseInt(process.env.EMAIL_PORT) || config.email.port,
    secure: process.env.EMAIL_SECURE === 'true' || config.email.secure,
    auth: process.env.EMAIL_USER ? {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    } : config.email.auth,
    from: process.env.EMAIL_FROM || config.email.from
  },

  upload: {
    ...config.upload,
    uploadDir: process.env.UPLOAD_DIR || config.upload.uploadDir
  }
};

// Validation function
function validateConfig() {
  const errors = [];

  // Validate required production settings
  if (env === 'production') {
    if (!mergedConfig.security.session.secret || mergedConfig.security.session.secret === 'dev-secret-key') {
      errors.push('SESSION_SECRET must be set in production');
    }
    
    if (!mergedConfig.email.host) {
      errors.push('EMAIL_HOST must be set in production');
    }
    
    if (!mergedConfig.email.auth || !mergedConfig.email.auth.user) {
      errors.push('EMAIL_USER must be set in production');
    }
  }

  // Validate database configuration
  if (!mergedConfig.database.filename) {
    errors.push('Database filename must be specified');
  }

  // Validate upload directory
  if (!mergedConfig.upload.uploadDir) {
    errors.push('Upload directory must be specified');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Create directories if they don't exist
function ensureDirectories() {
  const fs = require('fs');
  
  const directories = [
    mergedConfig.upload.uploadDir,
    path.dirname(mergedConfig.logging?.errorLog || './logs/error.log'),
    path.dirname(mergedConfig.logging?.accessLog || './logs/access.log')
  ];

  directories.forEach(dir => {
    if (dir && dir !== '.' && !fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (error) {
        console.warn(`Failed to create directory ${dir}:`, error.message);
      }
    }
  });
}

// Initialize configuration
try {
  validateConfig();
  ensureDirectories();
} catch (error) {
  console.error('Configuration error:', error.message);
  if (env === 'production') {
    process.exit(1);
  }
}

module.exports = mergedConfig;