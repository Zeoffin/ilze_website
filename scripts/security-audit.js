#!/usr/bin/env node

/**
 * Security Audit Script
 * Performs comprehensive security checks on the Latvian Author Website
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class SecurityAuditor {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  addIssue(category, severity, message, recommendation) {
    this.issues.push({ category, severity, message, recommendation });
  }

  addWarning(category, message, recommendation) {
    this.warnings.push({ category, message, recommendation });
  }

  addPassed(category, message) {
    this.passed.push({ category, message });
  }

  async checkEnvironmentVariables() {
    console.log('🔍 Checking environment variables...');
    
    const requiredVars = [
      'SESSION_SECRET',
      'EMAIL_HOST',
      'EMAIL_USER',
      'EMAIL_PASS'
    ];

    const env = process.env;

    // Check if .env file exists
    try {
      await fs.access('.env');
      this.addPassed('Environment', '.env file exists');
    } catch {
      this.addWarning('Environment', '.env file not found', 'Create .env file from .env.example');
    }

    // Check required variables
    for (const varName of requiredVars) {
      if (!env[varName]) {
        this.addIssue('Environment', 'HIGH', `${varName} is not set`, `Set ${varName} in .env file`);
      } else {
        this.addPassed('Environment', `${varName} is configured`);
      }
    }

    // Check session secret strength
    if (env.SESSION_SECRET) {
      if (env.SESSION_SECRET.length < 32) {
        this.addIssue('Environment', 'HIGH', 'SESSION_SECRET is too short', 'Use at least 32 characters for SESSION_SECRET');
      } else if (env.SESSION_SECRET === 'your-secret-key-change-in-production') {
        this.addIssue('Environment', 'CRITICAL', 'SESSION_SECRET is using default value', 'Generate a secure random SESSION_SECRET');
      } else {
        this.addPassed('Environment', 'SESSION_SECRET has adequate length');
      }
    }

    // Check NODE_ENV
    if (env.NODE_ENV === 'production') {
      this.addPassed('Environment', 'NODE_ENV is set to production');
    } else {
      this.addWarning('Environment', 'NODE_ENV is not set to production', 'Set NODE_ENV=production for production deployment');
    }
  }

  async checkFilePermissions() {
    console.log('🔍 Checking file permissions...');

    const criticalFiles = [
      '.env',
      'database.sqlite',
      'package.json',
      'server.js'
    ];

    for (const file of criticalFiles) {
      try {
        const stats = await fs.stat(file);
        const mode = stats.mode & parseInt('777', 8);
        
        if (file === '.env') {
          if (mode > parseInt('600', 8)) {
            this.addIssue('Permissions', 'HIGH', `.env file has overly permissive permissions (${mode.toString(8)})`, 'Set permissions to 600: chmod 600 .env');
          } else {
            this.addPassed('Permissions', '.env file has secure permissions');
          }
        } else if (file === 'database.sqlite') {
          if (mode > parseInt('644', 8)) {
            this.addIssue('Permissions', 'MEDIUM', `Database file has overly permissive permissions (${mode.toString(8)})`, 'Set permissions to 644: chmod 644 database.sqlite');
          } else {
            this.addPassed('Permissions', 'Database file has appropriate permissions');
          }
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          this.addWarning('Permissions', `Could not check permissions for ${file}`, 'Verify file exists and is accessible');
        }
      }
    }

    // Check uploads directory
    try {
      const stats = await fs.stat('uploads');
      const mode = stats.mode & parseInt('777', 8);
      
      if (mode > parseInt('755', 8)) {
        this.addIssue('Permissions', 'MEDIUM', `Uploads directory has overly permissive permissions (${mode.toString(8)})`, 'Set permissions to 755: chmod 755 uploads');
      } else {
        this.addPassed('Permissions', 'Uploads directory has appropriate permissions');
      }
    } catch (error) {
      this.addWarning('Permissions', 'Uploads directory not found', 'Create uploads directory with proper permissions');
    }
  }

  async checkDependencyVulnerabilities() {
    console.log('🔍 Checking dependency vulnerabilities...');

    try {
      // Run npm audit
      const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
      const audit = JSON.parse(auditResult);

      if (audit.metadata.vulnerabilities.total === 0) {
        this.addPassed('Dependencies', 'No known vulnerabilities found');
      } else {
        const { high, critical, moderate, low } = audit.metadata.vulnerabilities;
        
        if (critical > 0) {
          this.addIssue('Dependencies', 'CRITICAL', `${critical} critical vulnerabilities found`, 'Run npm audit fix immediately');
        }
        
        if (high > 0) {
          this.addIssue('Dependencies', 'HIGH', `${high} high severity vulnerabilities found`, 'Run npm audit fix');
        }
        
        if (moderate > 0) {
          this.addWarning('Dependencies', `${moderate} moderate severity vulnerabilities found`, 'Consider running npm audit fix');
        }
        
        if (low > 0) {
          this.addWarning('Dependencies', `${low} low severity vulnerabilities found`, 'Monitor and update when convenient');
        }
      }
    } catch (error) {
      this.addWarning('Dependencies', 'Could not run npm audit', 'Manually run npm audit to check for vulnerabilities');
    }
  }

  async checkConfigurationSecurity() {
    console.log('🔍 Checking configuration security...');

    try {
      // Check server.js for security configurations
      const serverContent = await fs.readFile('server.js', 'utf8');

      // Check for helmet usage
      if (serverContent.includes('helmet')) {
        this.addPassed('Configuration', 'Helmet security middleware is configured');
      } else {
        this.addIssue('Configuration', 'HIGH', 'Helmet security middleware not found', 'Add helmet middleware for security headers');
      }

      // Check for rate limiting
      if (serverContent.includes('rate-limit') || serverContent.includes('rateLimit')) {
        this.addPassed('Configuration', 'Rate limiting is configured');
      } else {
        this.addIssue('Configuration', 'MEDIUM', 'Rate limiting not found', 'Add rate limiting to prevent abuse');
      }

      // Check for session security
      if (serverContent.includes('httpOnly: true')) {
        this.addPassed('Configuration', 'Session cookies are httpOnly');
      } else {
        this.addIssue('Configuration', 'HIGH', 'Session cookies are not httpOnly', 'Set httpOnly: true for session cookies');
      }

      // Check for CORS configuration
      if (serverContent.includes('cors')) {
        this.addPassed('Configuration', 'CORS is configured');
      } else {
        this.addWarning('Configuration', 'CORS configuration not found', 'Configure CORS for production use');
      }

    } catch (error) {
      this.addWarning('Configuration', 'Could not analyze server configuration', 'Manually review server.js for security settings');
    }
  }

  async checkDatabaseSecurity() {
    console.log('🔍 Checking database security...');

    try {
      const { database } = require('../src/models');

      // Check if database file exists and is not world-readable
      try {
        const stats = await fs.stat('database.sqlite');
        this.addPassed('Database', 'Database file exists');
        
        // Check for backup files
        const files = await fs.readdir('.');
        const backupFiles = files.filter(f => f.includes('database') && f.includes('backup'));
        
        if (backupFiles.length > 0) {
          this.addPassed('Database', `Found ${backupFiles.length} backup files`);
        } else {
          this.addWarning('Database', 'No database backup files found', 'Implement regular database backups');
        }
        
      } catch (error) {
        this.addWarning('Database', 'Database file not found', 'Initialize database with npm run init-db');
      }

      // Check for default admin credentials
      try {
        const admin = await database.get('SELECT username FROM admin_users WHERE username = ? AND password_hash = ?', 
          ['admin', '$2b$10$somedefaulthash']);
        
        if (admin) {
          this.addIssue('Database', 'CRITICAL', 'Default admin credentials detected', 'Change default admin password immediately');
        } else {
          this.addPassed('Database', 'No default admin credentials found');
        }
      } catch (error) {
        // Database might not be initialized, which is okay
        this.addWarning('Database', 'Could not check admin credentials', 'Ensure database is properly initialized');
      }

    } catch (error) {
      this.addWarning('Database', 'Could not connect to database', 'Check database configuration and connectivity');
    }
  }

  async checkFileUploadSecurity() {
    console.log('🔍 Checking file upload security...');

    try {
      // Check upload directory configuration
      const config = require('../config');
      
      if (config.upload.maxFileSize <= 10 * 1024 * 1024) { // 10MB
        this.addPassed('Upload', 'File size limit is reasonable');
      } else {
        this.addWarning('Upload', 'File size limit is very high', 'Consider reducing max file size to prevent abuse');
      }

      if (config.upload.allowedTypes && config.upload.allowedTypes.length > 0) {
        this.addPassed('Upload', 'File type restrictions are configured');
      } else {
        this.addIssue('Upload', 'HIGH', 'No file type restrictions found', 'Implement file type validation');
      }

      // Check if uploads directory exists outside web root
      const uploadsPath = path.resolve(config.upload.uploadDir);
      const publicPath = path.resolve('./public');
      
      if (!uploadsPath.startsWith(publicPath)) {
        this.addPassed('Upload', 'Uploads directory is outside public web root');
      } else {
        this.addIssue('Upload', 'MEDIUM', 'Uploads directory is within public web root', 'Move uploads outside public directory');
      }

    } catch (error) {
      this.addWarning('Upload', 'Could not analyze upload configuration', 'Review upload settings in config files');
    }
  }

  async checkLogSecurity() {
    console.log('🔍 Checking logging security...');

    try {
      // Check if logs directory exists
      try {
        await fs.access('logs');
        this.addPassed('Logging', 'Logs directory exists');
        
        // Check log file permissions
        const logFiles = await fs.readdir('logs');
        for (const logFile of logFiles) {
          const stats = await fs.stat(path.join('logs', logFile));
          const mode = stats.mode & parseInt('777', 8);
          
          if (mode > parseInt('644', 8)) {
            this.addWarning('Logging', `Log file ${logFile} has overly permissive permissions`, 'Set log file permissions to 644');
          }
        }
        
      } catch (error) {
        this.addWarning('Logging', 'Logs directory not found', 'Create logs directory for proper logging');
      }

      // Check for sensitive data in logs (basic check)
      const serverContent = await fs.readFile('server.js', 'utf8');
      if (serverContent.includes('console.log(req.body)') || serverContent.includes('console.log(password)')) {
        this.addIssue('Logging', 'HIGH', 'Potential sensitive data logging detected', 'Remove or sanitize sensitive data from logs');
      } else {
        this.addPassed('Logging', 'No obvious sensitive data logging found');
      }

    } catch (error) {
      this.addWarning('Logging', 'Could not analyze logging configuration', 'Review logging implementation');
    }
  }

  async checkSSLConfiguration() {
    console.log('🔍 Checking SSL/TLS configuration...');

    const env = process.env;

    // Check if running in production with HTTPS
    if (env.NODE_ENV === 'production') {
      if (env.HTTPS === 'true' || env.SSL_CERT) {
        this.addPassed('SSL', 'HTTPS appears to be configured');
      } else {
        this.addIssue('SSL', 'HIGH', 'HTTPS not configured for production', 'Configure HTTPS with valid SSL certificates');
      }

      // Check session cookie security
      if (env.SESSION_SECURE === 'true') {
        this.addPassed('SSL', 'Session cookies are marked secure');
      } else {
        this.addIssue('SSL', 'MEDIUM', 'Session cookies not marked secure', 'Set secure: true for session cookies in production');
      }
    } else {
      this.addWarning('SSL', 'Not running in production mode', 'Ensure HTTPS is configured for production deployment');
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🛡️  SECURITY AUDIT REPORT');
    console.log('='.repeat(60));

    // Summary
    const totalIssues = this.issues.length;
    const criticalIssues = this.issues.filter(i => i.severity === 'CRITICAL').length;
    const highIssues = this.issues.filter(i => i.severity === 'HIGH').length;
    const mediumIssues = this.issues.filter(i => i.severity === 'MEDIUM').length;

    console.log(`\n📊 SUMMARY:`);
    console.log(`   ✅ Passed: ${this.passed.length}`);
    console.log(`   ⚠️  Warnings: ${this.warnings.length}`);
    console.log(`   ❌ Issues: ${totalIssues}`);
    console.log(`      🔴 Critical: ${criticalIssues}`);
    console.log(`      🟠 High: ${highIssues}`);
    console.log(`      🟡 Medium: ${mediumIssues}`);

    // Critical Issues
    if (criticalIssues > 0) {
      console.log(`\n🔴 CRITICAL ISSUES (${criticalIssues}):`);
      this.issues.filter(i => i.severity === 'CRITICAL').forEach((issue, index) => {
        console.log(`   ${index + 1}. [${issue.category}] ${issue.message}`);
        console.log(`      💡 ${issue.recommendation}`);
      });
    }

    // High Issues
    if (highIssues > 0) {
      console.log(`\n🟠 HIGH PRIORITY ISSUES (${highIssues}):`);
      this.issues.filter(i => i.severity === 'HIGH').forEach((issue, index) => {
        console.log(`   ${index + 1}. [${issue.category}] ${issue.message}`);
        console.log(`      💡 ${issue.recommendation}`);
      });
    }

    // Medium Issues
    if (mediumIssues > 0) {
      console.log(`\n🟡 MEDIUM PRIORITY ISSUES (${mediumIssues}):`);
      this.issues.filter(i => i.severity === 'MEDIUM').forEach((issue, index) => {
        console.log(`   ${index + 1}. [${issue.category}] ${issue.message}`);
        console.log(`      💡 ${issue.recommendation}`);
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${this.warnings.length}):`);
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. [${warning.category}] ${warning.message}`);
        console.log(`      💡 ${warning.recommendation}`);
      });
    }

    // Recommendations
    console.log(`\n🎯 NEXT STEPS:`);
    if (criticalIssues > 0) {
      console.log(`   1. 🚨 Address ${criticalIssues} critical security issues immediately`);
    }
    if (highIssues > 0) {
      console.log(`   2. 🔧 Fix ${highIssues} high priority issues before deployment`);
    }
    if (mediumIssues > 0) {
      console.log(`   3. 📋 Plan to address ${mediumIssues} medium priority issues`);
    }
    if (this.warnings.length > 0) {
      console.log(`   4. 📝 Review ${this.warnings.length} warnings for improvements`);
    }

    console.log(`\n📚 SECURITY RESOURCES:`);
    console.log(`   • OWASP Top 10: https://owasp.org/www-project-top-ten/`);
    console.log(`   • Node.js Security: https://nodejs.org/en/security/`);
    console.log(`   • Express Security: https://expressjs.com/en/advanced/best-practice-security.html`);

    console.log('\n' + '='.repeat(60));

    // Return exit code based on severity
    if (criticalIssues > 0) {
      return 2; // Critical issues found
    } else if (highIssues > 0) {
      return 1; // High priority issues found
    } else {
      return 0; // No critical or high issues
    }
  }

  async runAudit() {
    console.log('🚀 Starting security audit...\n');

    await this.checkEnvironmentVariables();
    await this.checkFilePermissions();
    await this.checkDependencyVulnerabilities();
    await this.checkConfigurationSecurity();
    await this.checkDatabaseSecurity();
    await this.checkFileUploadSecurity();
    await this.checkLogSecurity();
    await this.checkSSLConfiguration();

    const exitCode = this.generateReport();
    process.exit(exitCode);
  }
}

// Run audit if called directly
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.runAudit().catch(error => {
    console.error('Security audit failed:', error);
    process.exit(3);
  });
}

module.exports = SecurityAuditor;