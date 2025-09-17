/**
 * Development Configuration
 * This file contains development-specific settings for the Latvian Author Website
 */

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    nodeEnv: 'development'
  },

  // Database Configuration
  database: {
    type: 'sqlite',
    filename: process.env.DATABASE_PATH || './database.sqlite',
    options: {
      // More lenient settings for development
      mode: 'READWRITE',
      foreignKeys: true,
      busyTimeout: 10000,
      journalMode: 'DELETE',
      synchronous: 'OFF'
    }
  },

  // Security Configuration (more lenient for development)
  security: {
    // Session configuration
    session: {
      secret: process.env.SESSION_SECRET || 'dev-secret-key',
      name: 'latvian-author-dev-session',
      cookie: {
        secure: false, // HTTP allowed in development
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
      },
      resave: false,
      saveUninitialized: false
    },

    // More lenient rate limiting for development
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Higher limit for development
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 15 * 60
      }
    },

    // Brute force protection (more lenient)
    bruteForce: {
      freeRetries: 10,
      minWait: 1 * 60 * 1000, // 1 minute
      maxWait: 5 * 60 * 1000, // 5 minutes
      failuresBeforeDelay: 10
    },

    // CORS settings (allow all origins in development)
    cors: {
      origin: true,
      credentials: true,
      optionsSuccessStatus: 200
    },

    // Helmet security headers (more lenient)
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:", "http:"],
          fontSrc: ["'self'", "https:", "data:"],
          connectSrc: ["'self'"],
          mediaSrc: ["'self'"],
          objectSrc: ["'none'"],
          childSrc: ["'none'"],
          workerSrc: ["'none'"],
          frameSrc: ["'none'"]
        }
      },
      hsts: false // Disable HSTS in development
    }
  },

  // Email Configuration (mock in development)
  email: {
    host: process.env.EMAIL_HOST || 'localhost',
    port: parseInt(process.env.EMAIL_PORT) || 1025, // MailHog default port
    secure: false,
    auth: process.env.EMAIL_USER ? {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    } : false,
    from: process.env.EMAIL_FROM || 'dev@latvianauthor.local',
    // Retry configuration
    maxRetries: 1,
    retryDelay: 500
  },

  // File Upload Configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB for development
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    uploadDir: './uploads',
    maxFiles: 20
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    format: 'dev',
    // Console logging in development
    console: true,
    // Optional file logging
    errorLog: './logs/dev-error.log',
    accessLog: './logs/dev-access.log'
  },

  // Performance Configuration (less aggressive in development)
  performance: {
    // Compression
    compression: {
      level: 1,
      threshold: 0
    },
    // Static file caching (minimal in development)
    staticCache: {
      maxAge: '0',
      etag: false,
      lastModified: true
    }
  },

  // Health Check Configuration
  healthCheck: {
    endpoint: '/health',
    checks: {
      database: true,
      email: false,
      filesystem: true
    }
  }
};