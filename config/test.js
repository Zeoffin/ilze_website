/**
 * Test Configuration
 * This file contains test-specific settings for the Latvian Author Website
 */

module.exports = {
  // Server Configuration
  server: {
    port: 0, // Use random port for testing
    host: 'localhost',
    nodeEnv: 'test'
  },

  // Database Configuration (in-memory for tests)
  database: {
    type: 'sqlite',
    filename: ':memory:', // In-memory database for tests
    options: {
      mode: 'READWRITE',
      foreignKeys: true,
      busyTimeout: 5000,
      journalMode: 'MEMORY',
      synchronous: 'OFF'
    }
  },

  // Security Configuration (minimal for testing)
  security: {
    // Session configuration
    session: {
      secret: 'test-secret-key',
      name: 'test-session',
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 60 * 60 * 1000, // 1 hour for tests
        sameSite: 'lax'
      },
      resave: false,
      saveUninitialized: false
    },

    // Very lenient rate limiting for tests
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 10000, // Very high limit for tests
      skip: () => true // Skip rate limiting in tests
    },

    // Brute force protection (disabled for tests)
    bruteForce: {
      freeRetries: 1000,
      minWait: 1,
      maxWait: 1,
      failuresBeforeDelay: 1000
    },

    // CORS settings
    cors: {
      origin: true,
      credentials: true,
      optionsSuccessStatus: 200
    },

    // Minimal helmet configuration for tests
    helmet: {
      contentSecurityPolicy: false,
      hsts: false
    }
  },

  // Email Configuration (mock for tests)
  email: {
    host: 'localhost',
    port: 1025,
    secure: false,
    auth: false,
    from: 'test@latvianauthor.test',
    // No retries in tests
    maxRetries: 0,
    retryDelay: 0,
    // Mock email sending
    mock: true
  },

  // File Upload Configuration
  upload: {
    maxFileSize: 1 * 1024 * 1024, // 1MB for tests
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    uploadDir: './test-uploads',
    maxFiles: 5
  },

  // Logging Configuration (minimal for tests)
  logging: {
    level: 'error', // Only log errors during tests
    format: 'dev',
    console: false, // Disable console logging in tests
    silent: true
  },

  // Performance Configuration (disabled for tests)
  performance: {
    compression: false,
    staticCache: {
      maxAge: '0',
      etag: false,
      lastModified: false
    }
  },

  // Health Check Configuration
  healthCheck: {
    endpoint: '/health',
    checks: {
      database: true,
      email: false,
      filesystem: false
    }
  }
};