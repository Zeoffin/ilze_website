# Deployment Checklist

Use this checklist to ensure a secure and successful deployment of the Latvian Author Website.

## Pre-Deployment Checklist

### Security Configuration
- [ ] **Environment Variables**
  - [ ] Copy `.env.production` to `.env`
  - [ ] Generate secure `SESSION_SECRET` (64+ characters)
  - [ ] Set strong `ADMIN_USERNAME` (not "admin")
  - [ ] Set strong `ADMIN_PASSWORD` (12+ characters, mixed case, numbers, symbols)
  - [ ] Configure email settings (`EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`)
  - [ ] Set `NODE_ENV=production`

- [ ] **Security Audit**
  - [ ] Run `npm run security:audit`
  - [ ] Address all HIGH severity issues
  - [ ] Review and address MEDIUM severity issues
  - [ ] Document any accepted risks

- [ ] **File Permissions**
  - [ ] Set `.env` permissions to 600 (`chmod 600 .env`)
  - [ ] Set database permissions to 644 (`chmod 644 database.sqlite`)
  - [ ] Ensure uploads directory is not executable
  - [ ] Create `.htaccess` in uploads directory if using Apache

### Testing
- [ ] **Comprehensive Testing**
  - [ ] Run `npm run test:all`
  - [ ] Verify all tests pass
  - [ ] Check test coverage (>80% recommended)
  - [ ] Test health check endpoint

- [ ] **Manual Testing**
  - [ ] Test admin login/logout
  - [ ] Test content creation/editing/deletion
  - [ ] Test image upload/deletion
  - [ ] Test contact form submission
  - [ ] Test public content viewing
  - [ ] Test error handling (404, 500, etc.)

### Dependencies
- [ ] **Dependency Security**
  - [ ] Run `npm audit`
  - [ ] Fix all HIGH and CRITICAL vulnerabilities
  - [ ] Update outdated packages (test thoroughly)
  - [ ] Remove unused dependencies

### Database
- [ ] **Database Setup**
  - [ ] Run `npm run init-db` if fresh installation
  - [ ] Backup existing database if upgrading
  - [ ] Test database connectivity
  - [ ] Verify database permissions

## Deployment Steps

### Server Preparation
- [ ] **System Updates**
  - [ ] Update operating system packages
  - [ ] Install Node.js 18+ 
  - [ ] Install PM2 globally (`npm install -g pm2`)
  - [ ] Configure firewall (allow ports 80, 443, SSH only)

- [ ] **SSL/HTTPS Setup**
  - [ ] Obtain SSL certificate (Let's Encrypt recommended)
  - [ ] Configure Nginx with SSL
  - [ ] Test HTTPS configuration
  - [ ] Set up automatic certificate renewal

### Application Deployment
- [ ] **Code Deployment**
  - [ ] Clone/pull latest code
  - [ ] Run `npm ci --production`
  - [ ] Copy and configure `.env` file
  - [ ] Set proper file permissions
  - [ ] Initialize database if needed

- [ ] **Process Management**
  - [ ] Start application with PM2 (`pm2 start ecosystem.config.js --env production`)
  - [ ] Save PM2 configuration (`pm2 save`)
  - [ ] Set up PM2 startup script (`pm2 startup`)
  - [ ] Test application restart

### Web Server Configuration
- [ ] **Nginx Setup** (if using)
  - [ ] Install and configure Nginx
  - [ ] Copy nginx.conf configuration
  - [ ] Test Nginx configuration (`nginx -t`)
  - [ ] Start/restart Nginx service
  - [ ] Test reverse proxy functionality

### Monitoring Setup
- [ ] **Logging**
  - [ ] Create logs directory
  - [ ] Configure log rotation
  - [ ] Set up log monitoring/alerting
  - [ ] Test log file creation

- [ ] **Health Monitoring**
  - [ ] Set up health check monitoring
  - [ ] Configure uptime monitoring
  - [ ] Set up performance monitoring
  - [ ] Configure alerting for downtime

## Post-Deployment Verification

### Functionality Testing
- [ ] **Public Website**
  - [ ] Visit main website URL
  - [ ] Test all navigation links
  - [ ] Verify content displays correctly
  - [ ] Test contact form submission
  - [ ] Check image loading

- [ ] **Admin Interface**
  - [ ] Test admin login
  - [ ] Test content management functions
  - [ ] Test image upload/management
  - [ ] Test admin logout

- [ ] **API Endpoints**
  - [ ] Test `/api/health` endpoint
  - [ ] Test `/api/content` endpoints
  - [ ] Test `/api/contact` endpoint
  - [ ] Verify proper error responses

### Security Verification
- [ ] **Security Headers**
  - [ ] Check security headers with online tools
  - [ ] Verify HTTPS is working
  - [ ] Test HTTP to HTTPS redirect
  - [ ] Check SSL certificate validity

- [ ] **Access Control**
  - [ ] Verify admin areas require authentication
  - [ ] Test rate limiting on contact form
  - [ ] Test file upload restrictions
  - [ ] Verify unauthorized access is blocked

### Performance Testing
- [ ] **Load Testing**
  - [ ] Test website under normal load
  - [ ] Check response times (<500ms for most requests)
  - [ ] Verify static file caching
  - [ ] Test concurrent user access

- [ ] **Resource Usage**
  - [ ] Monitor CPU usage
  - [ ] Monitor memory usage
  - [ ] Monitor disk space
  - [ ] Check database performance

## Backup and Recovery

### Backup Setup
- [ ] **Automated Backups**
  - [ ] Set up daily database backups
  - [ ] Set up weekly full backups
  - [ ] Configure backup retention policy
  - [ ] Test backup restoration process

- [ ] **Backup Verification**
  - [ ] Test database backup integrity
  - [ ] Verify backup file accessibility
  - [ ] Document backup restoration procedure
  - [ ] Set up backup monitoring/alerting

### Recovery Testing
- [ ] **Disaster Recovery**
  - [ ] Document recovery procedures
  - [ ] Test database restoration
  - [ ] Test full system recovery
  - [ ] Verify recovery time objectives

## Maintenance Setup

### Automated Maintenance
- [ ] **Cron Jobs**
  - [ ] Set up log rotation
  - [ ] Schedule database backups
  - [ ] Configure security update checks
  - [ ] Set up disk space monitoring

- [ ] **Monitoring Scripts**
  - [ ] Deploy health check scripts
  - [ ] Set up performance monitoring
  - [ ] Configure alerting systems
  - [ ] Test notification systems

### Documentation
- [ ] **Deployment Documentation**
  - [ ] Document server configuration
  - [ ] Record deployment procedures
  - [ ] Document troubleshooting steps
  - [ ] Create maintenance schedules

## Final Verification

### Complete System Test
- [ ] **End-to-End Testing**
  - [ ] Complete user workflow test
  - [ ] Admin workflow test
  - [ ] Error scenario testing
  - [ ] Performance verification

- [ ] **Security Final Check**
  - [ ] Run final security audit
  - [ ] Verify all security measures
  - [ ] Check access logs
  - [ ] Confirm monitoring is active

### Go-Live Checklist
- [ ] **DNS and Domain**
  - [ ] Configure DNS records
  - [ ] Test domain resolution
  - [ ] Verify SSL certificate for domain
  - [ ] Test from multiple locations

- [ ] **Final Preparations**
  - [ ] Notify stakeholders of go-live
  - [ ] Prepare rollback plan
  - [ ] Monitor initial traffic
  - [ ] Document any issues

## Post-Go-Live

### Immediate Monitoring (First 24 hours)
- [ ] Monitor application logs
- [ ] Check error rates
- [ ] Monitor performance metrics
- [ ] Verify backup systems
- [ ] Check security alerts

### First Week Tasks
- [ ] Review performance metrics
- [ ] Analyze user behavior
- [ ] Check for any security issues
- [ ] Verify backup integrity
- [ ] Update documentation with any changes

---

## Emergency Contacts

- **System Administrator**: [Contact Info]
- **Developer**: [Contact Info]
- **Hosting Provider**: [Contact Info]
- **Domain Registrar**: [Contact Info]

## Rollback Procedure

If issues are encountered:

1. **Immediate Actions**
   - Stop current application: `pm2 stop latvian-author-website`
   - Restore previous code version
   - Restore database backup if needed
   - Restart application: `pm2 start latvian-author-website`

2. **Verification**
   - Test basic functionality
   - Check logs for errors
   - Verify user access
   - Monitor for stability

3. **Communication**
   - Notify stakeholders of rollback
   - Document issues encountered
   - Plan resolution strategy
   - Schedule re-deployment

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Version**: _______________
**Notes**: _______________