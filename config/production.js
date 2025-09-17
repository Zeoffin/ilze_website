/**
 * Production Configuration
 * This file contains production-specific settings for the Latvian Author Website
 */

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: 'production'
  },

  // Database Configuration
  database: {
    type: 'sqlite',
    filename: process.env.DATABASE_PATH || './database.sqlite',
    options: {
      // Enable WAL mode for better concurrent access
      mode: 'WAL',
      // Enable foreign keys
      foreignKeys: true,
      // Connection pool settings
      busyTimeout: 30000,
      // Journal mode
      journalMode: 'WAL',
      // Synchronous mode for production
      synchronous: 'NORMAL'
    }
  },

  // Security Configuration
  security: {
    // Session configuration
    session: {
      secret: process.env.SESSION_SECRET,
      name: 'latvian-author-session',
      cookie: {
        secure: true, // HTTPS only in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
      },
      resave: false,
      saveUninitialized: false
    },

    // Rate limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 15 * 60
      }
    },

    // Brute force protection
    bruteForce: {
      freeRetries: 3,
      minWait: 5 * 60 * 1000, // 5 minutes
      maxWait: 60 * 60 * 1000, // 1 hour
      failuresBeforeDelay: 3
    },

    // CORS settings
    cors: {
      origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false,
      credentials: true,
      optionsSuccessStatus: 200
    },

    // Helmet security headers
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "https:", "data:"],
          connectSrc: ["'self'"],
          mediaSrc: ["'self'"],
          objectSrc: ["'none'"],
          childSrc: ["'none'"],
          workerSrc: ["'none'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: []
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }
  },

  // Email Configuration
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    from: process.env.EMAIL_FROM,
    // Retry configuration
    maxRetries: 3,
    retryDelay: 1000
  },

  // File Upload Configuration
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    uploadDir: './uploads',
    maxFiles: 10
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'combined',
    // Log file paths
    errorLog: './logs/error.log',
    accessLog: './logs/access.log',
    // Log rotation
    maxSize: '20m',
    maxFiles: '14d'
  },

  // Performance Configuration
  performance: {
    // Compression
    compression: {
      level: 6,
      threshold: 1024
    },
    // Static file caching
    staticCache: {
      maxAge: '1y',
      etag: true,
      lastModified: true
    }
  },

  // Health Check Configuration
  healthCheck: {
    endpoint: '/health',
    checks: {
      database: true,
      email: false, // Don't check email in health endpoint
      filesystem: true
    }
  }
};