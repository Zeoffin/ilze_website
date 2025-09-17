/**
 * Health Check Routes
 * Provides health check endpoints for monitoring and deployment verification
 */

const express = require('express');
const router = express.Router();
const { database } = require('../models');
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