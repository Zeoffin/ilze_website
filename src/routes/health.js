/**
 * Health Check Routes
 * Provides health check endpoints for monitoring and deployment verification
 */

const express = require('express');
const router = express.Router();
const { database } = require('../models');
const peopleDataService = require('../services/PeopleDataService');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config');

// Health check endpoint
router.get('/', async (req, res) => {
  const startTime = Date.now();
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env,
    uptime: Math.floor(process.uptime()),
    checks: {}
  };

  try {
    // Database health check
    if (config.healthCheck.checks.database) {
      try {
        await database.get('SELECT 1 as test');
        checks.checks.database = {
          status: 'healthy',
          message: 'Database connection successful'
        };
      } catch (error) {
        checks.checks.database = {
          status: 'unhealthy',
          message: 'Database connection failed',
          error: error.message
        };
        checks.status = 'unhealthy';
      }
    }

    // Filesystem health check
    if (config.healthCheck.checks.filesystem) {
      try {
        await fs.access(config.upload.uploadDir);
        checks.checks.filesystem = {
          status: 'healthy',
          message: 'Upload directory accessible'
        };
      } catch (error) {
        checks.checks.filesystem = {
          status: 'unhealthy',
          message: 'Upload directory not accessible',
          error: error.message
        };
        checks.status = 'unhealthy';
      }
    }

    // People Data Service health check
    try {
      const peopleHealth = peopleDataService.getServiceHealth();
      const peopleStats = peopleDataService.getStats();
      
      checks.checks.peopleService = {
        status: peopleHealth.status === 'healthy' ? 'healthy' : 
                peopleHealth.status === 'degraded' ? 'warning' : 'unhealthy',
        initialized: peopleHealth.initialized,
        dataLoaded: peopleHealth.dataLoaded,
        peopleCount: peopleHealth.peopleCount,
        issues: peopleHealth.issues,
        message: peopleHealth.status === 'healthy' ? 
                `${peopleHealth.peopleCount} people profiles loaded` :
                `Service ${peopleHealth.status}: ${peopleHealth.issues.join(', ')}`
      };
      
      // Mark overall health as degraded if people service has issues
      if (peopleHealth.status === 'failed') {
        checks.status = 'unhealthy';
      } else if (peopleHealth.status === 'degraded' && checks.status === 'healthy') {
        checks.status = 'degraded';
      }
    } catch (error) {
      checks.checks.peopleService = {
        status: 'unhealthy',
        message: 'Failed to check people service health',
        error: error.message
      };
      checks.status = 'unhealthy';
    }

    // Memory usage check
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    checks.checks.memory = {
      status: memUsageMB.heapUsed < 400 ? 'healthy' : 'warning',
      usage: memUsageMB,
      message: `Heap usage: ${memUsageMB.heapUsed}MB`
    };

    if (memUsageMB.heapUsed > 500) {
      checks.checks.memory.status = 'unhealthy';
      checks.status = 'unhealthy';
    }

    // Response time
    checks.responseTime = `${Date.now() - startTime}ms`;

    // Set appropriate HTTP status code
    const statusCode = checks.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(checks);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
});

// Readiness probe (for Kubernetes/container orchestration)
router.get('/ready', async (req, res) => {
  try {
    // Check if database is ready
    await database.get('SELECT 1 as test');
    
    // Check if upload directory exists
    await fs.access(config.upload.uploadDir);
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Liveness probe (for Kubernetes/container orchestration)
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

// People Data Service specific health check
router.get('/people', async (req, res) => {
  try {
    const health = peopleDataService.getServiceHealth();
    const stats = peopleDataService.getStats();
    const initStatus = peopleDataService.getInitializationStatus();
    
    const response = {
      timestamp: new Date().toISOString(),
      service: 'People Data Service',
      status: health.status,
      initialized: health.initialized,
      dataLoaded: health.dataLoaded,
      ready: peopleDataService.isReady(),
      stats: {
        totalPeople: stats.totalPeople,
        totalImages: stats.totalImages,
        totalWords: stats.totalWords,
        averageWordsPerPerson: stats.averageWordsPerPerson,
        averageImagesPerPerson: stats.averageImagesPerPerson
      },
      health: {
        peopleWithImages: health.peopleWithImages,
        peopleWithContent: health.peopleWithContent,
        averageContentLength: health.averageContentLength,
        issues: health.issues,
        lastChecked: health.lastChecked
      },
      directory: {
        path: stats.directoryPath,
        accessible: initStatus.directoryExists
      }
    };
    
    // Include degradation info if service is not fully healthy
    if (health.status !== 'healthy') {
      response.degradation = peopleDataService.handleGracefulDegradation('health-check');
    }
    
    // Set appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(response);
    
  } catch (error) {
    console.error('People service health check error:', error);
    res.status(503).json({
      timestamp: new Date().toISOString(),
      service: 'People Data Service',
      status: 'error',
      error: 'Health check failed',
      message: error.message
    });
  }
});

// People service recovery endpoint (admin only)
router.post('/people/recover', async (req, res) => {
  // Simple authentication check - in production, use proper admin auth
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${config.security.session.secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    console.log('🔄 Manual recovery requested for People Data Service');
    const recoveryStartTime = Date.now();
    
    const success = await peopleDataService.attemptRecovery();
    const recoveryDuration = Date.now() - recoveryStartTime;
    
    const stats = peopleDataService.getStats();
    const health = peopleDataService.getServiceHealth();
    
    res.json({
      timestamp: new Date().toISOString(),
      recovery: {
        attempted: true,
        successful: success,
        duration: `${recoveryDuration}ms`
      },
      currentStatus: {
        status: health.status,
        initialized: health.initialized,
        dataLoaded: health.dataLoaded,
        peopleCount: stats.totalPeople,
        issues: health.issues
      }
    });
    
  } catch (error) {
    console.error('People service recovery error:', error);
    res.status(500).json({
      timestamp: new Date().toISOString(),
      recovery: {
        attempted: true,
        successful: false,
        error: error.message
      }
    });
  }
});

// Detailed system information (admin only)
router.get('/system', async (req, res) => {
  // Simple authentication check - in production, use proper admin auth
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${config.security.session.secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const systemInfo = {
      timestamp: new Date().toISOString(),
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: Math.floor(process.uptime())
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: config.env,
      config: {
        database: {
          type: config.database.type,
          filename: config.database.filename !== ':memory:' ? path.basename(config.database.filename) : ':memory:'
        },
        upload: {
          maxFileSize: config.upload.maxFileSize,
          uploadDir: config.upload.uploadDir
        },
        email: {
          host: config.email.host,
          port: config.email.port,
          secure: config.email.secure,
          configured: !!config.email.auth
        }
      }
    };

    // Add database statistics if available
    try {
      const contentCount = await database.get('SELECT COUNT(*) as count FROM content');
      const adminCount = await database.get('SELECT COUNT(*) as count FROM admin_users');
      const messageCount = await database.get('SELECT COUNT(*) as count FROM contact_messages');
      
      systemInfo.database = {
        content: contentCount.count,
        admins: adminCount.count,
        messages: messageCount.count
      };
    } catch (dbError) {
      systemInfo.database = { error: 'Unable to fetch database statistics' };
    }

    // Add filesystem information
    try {
      const uploadStats = await fs.stat(config.upload.uploadDir);
      const uploadFiles = await fs.readdir(config.upload.uploadDir);
      
      systemInfo.filesystem = {
        uploadDir: {
          exists: true,
          fileCount: uploadFiles.length,
          created: uploadStats.birthtime
        }
      };
    } catch (fsError) {
      systemInfo.filesystem = { error: 'Unable to access upload directory' };
    }

    res.json(systemInfo);
  } catch (error) {
    console.error('System info error:', error);
    res.status(500).json({
      error: 'Failed to retrieve system information',
      message: error.message
    });
  }
});

module.exports = router;