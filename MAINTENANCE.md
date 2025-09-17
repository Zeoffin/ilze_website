# Maintenance Guide - Latvian Author Website

This guide provides comprehensive instructions for maintaining and monitoring the Latvian Author Website after deployment.

## Table of Contents

1. [Daily Maintenance Tasks](#daily-maintenance-tasks)
2. [Weekly Maintenance Tasks](#weekly-maintenance-tasks)
3. [Monthly Maintenance Tasks](#monthly-maintenance-tasks)
4. [Monitoring and Alerts](#monitoring-and-alerts)
5. [Backup and Recovery](#backup-and-recovery)
6. [Performance Optimization](#performance-optimization)
7. [Security Maintenance](#security-maintenance)
8. [Troubleshooting Common Issues](#troubleshooting-common-issues)
9. [Emergency Procedures](#emergency-procedures)

## Daily Maintenance Tasks

### 1. Health Check Monitoring

```bash
# Check application health
npm run health

# Or manually check health endpoint
curl -f https://yourdomain.com/health

# Check system resources
htop
df -h
```

### 2. Log Review

```bash
# Check error logs for issues
npm run logs:error

# Check access logs for unusual activity
npm run logs:access

# Check PM2 logs (if using PM2)
pm2 logs --lines 50
```

### 3. Database Health

```bash
# Check database file integrity (SQLite)
sqlite3 database.sqlite "PRAGMA integrity_check;"

# Check database size
ls -lh database.sqlite

# Monitor database growth
du -sh database.sqlite
```

## Weekly Maintenance Tasks

### 1. Security Audit

```bash
# Run comprehensive security audit
npm run security:audit

# Check for dependency vulnerabilities
npm audit

# Review access logs for suspicious activity
grep -E "(404|500|403)" logs/access.log | tail -20
```

### 2. Performance Review

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://yourdomain.com/

# Monitor memory usage
free -h
ps aux | grep node

# Check disk usage
df -h
du -sh uploads/
```

### 3. Backup Verification

```bash
# Create database backup
npm run backup:db

# Verify backup integrity
sqlite3 database-backup-*.sqlite "SELECT COUNT(*) FROM content;"

# Test backup restoration (in test environment)
cp database-backup-latest.sqlite test-database.sqlite
```

## Monthly Maintenance Tasks

### 1. Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Update dependencies (test in development first)
npm update

# Run tests after updates
npm run test:full

# Security audit after updates
npm run security:audit
```

### 2. SSL Certificate Renewal

```bash
# Check certificate expiration (if using Let's Encrypt)
sudo certbot certificates

# Renew certificates if needed
sudo certbot renew

# Test certificate renewal
sudo certbot renew --dry-run
```

### 3. Database Optimization

```bash
# SQLite optimization
sqlite3 database.sqlite "PRAGMA optimize;"
sqlite3 database.sqlite "PRAGMA wal_checkpoint(TRUNCATE);"

# Analyze database statistics
sqlite3 database.sqlite ".schema"
sqlite3 database.sqlite "SELECT name, COUNT(*) FROM sqlite_master GROUP BY type;"
```

### 4. Log Rotation and Cleanup

```bash
# Rotate logs (if not using logrotate)
mv logs/error.log logs/error.log.$(date +%Y%m%d)
mv logs/access.log logs/access.log.$(date +%Y%m%d)

# Compress old logs
gzip logs/*.log.20*

# Clean old logs (keep last 30 days)
find logs/ -name "*.log.*" -mtime +30 -delete
```

## Monitoring and Alerts

### 1. Health Check Monitoring

Create a monitoring script `scripts/monitor.sh`:

```bash
#!/bin/bash

HEALTH_URL="https://yourdomain.com/health"
LOG_FILE="logs/monitor.log"
EMAIL="admin@yourdomain.com"

# Check health endpoint
if ! curl -f -s "$HEALTH_URL" > /dev/null; then
    echo "$(date): Health check failed" >> "$LOG_FILE"
    echo "Website health check failed at $(date)" | mail -s "Website Down Alert" "$EMAIL"
    exit 1
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "$(date): Disk usage high: ${DISK_USAGE}%" >> "$LOG_FILE"
    echo "Disk usage is at ${DISK_USAGE}% on $(date)" | mail -s "Disk Space Alert" "$EMAIL"
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEMORY_USAGE" -gt 80 ]; then
    echo "$(date): Memory usage high: ${MEMORY_USAGE}%" >> "$LOG_FILE"
    echo "Memory usage is at ${MEMORY_USAGE}% on $(date)" | mail -s "Memory Usage Alert" "$EMAIL"
fi

echo "$(date): All checks passed" >> "$LOG_FILE"
```

Add to crontab for regular monitoring:

```bash
# Run every 5 minutes
*/5 * * * * /path/to/scripts/monitor.sh

# Daily summary report
0 8 * * * /path/to/scripts/daily-report.sh
```

### 2. Application Metrics

Monitor key application metrics:

- Response times
- Error rates
- Database query performance
- Memory usage
- Disk usage
- Active sessions

### 3. Log Analysis

Set up log analysis for:

- Error patterns
- Security incidents
- Performance issues
- User behavior patterns

## Backup and Recovery

### 1. Automated Backup Strategy

Create `scripts/backup-full.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/backup/latvian-author-website"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
cp database.sqlite "$BACKUP_DIR/database-$DATE.sqlite"

# Backup uploads
tar -czf "$BACKUP_DIR/uploads-$DATE.tar.gz" uploads/

# Backup configuration
tar -czf "$BACKUP_DIR/config-$DATE.tar.gz" .env config/ package.json

# Backup logs
tar -czf "$BACKUP_DIR/logs-$DATE.tar.gz" logs/

# Clean old backups
find "$BACKUP_DIR" -name "*.sqlite" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Verify backup integrity
sqlite3 "$BACKUP_DIR/database-$DATE.sqlite" "PRAGMA integrity_check;" > /dev/null
if [ $? -eq 0 ]; then
    echo "$(date): Backup completed successfully" >> logs/backup.log
else
    echo "$(date): Backup verification failed" >> logs/backup.log
    exit 1
fi
```

### 2. Recovery Procedures

#### Database Recovery

```bash
# Stop application
pm2 stop latvian-author-website

# Backup current database (if corrupted)
mv database.sqlite database-corrupted-$(date +%Y%m%d).sqlite

# Restore from backup
cp /backup/database-YYYYMMDD_HHMMSS.sqlite database.sqlite

# Verify restoration
sqlite3 database.sqlite "PRAGMA integrity_check;"

# Restart application
pm2 start latvian-author-website
```

#### Full System Recovery

```bash
# Restore uploads
tar -xzf /backup/uploads-YYYYMMDD_HHMMSS.tar.gz

# Restore configuration
tar -xzf /backup/config-YYYYMMDD_HHMMSS.tar.gz

# Restore database
cp /backup/database-YYYYMMDD_HHMMSS.sqlite database.sqlite

# Restart services
pm2 restart all
sudo systemctl restart nginx
```

## Performance Optimization

### 1. Database Optimization

```bash
# Analyze query performance
sqlite3 database.sqlite "EXPLAIN QUERY PLAN SELECT * FROM content WHERE section = 'interesanti';"

# Optimize database
sqlite3 database.sqlite "PRAGMA optimize;"
sqlite3 database.sqlite "VACUUM;"

# Update statistics
sqlite3 database.sqlite "ANALYZE;"
```

### 2. Static File Optimization

```bash
# Optimize images in uploads directory
find uploads/ -name "*.jpg" -exec jpegoptim --max=85 {} \;
find uploads/ -name "*.png" -exec optipng -o2 {} \;

# Generate WebP versions
find uploads/ -name "*.jpg" -exec cwebp -q 85 {} -o {}.webp \;
```

### 3. Application Performance

Monitor and optimize:

- Memory leaks
- Database connection pooling
- Static file caching
- Gzip compression
- CDN usage (if applicable)

## Security Maintenance

### 1. Regular Security Audits

```bash
# Run security audit
npm run security:audit

# Check for vulnerabilities
npm audit --audit-level moderate

# Review security headers
curl -I https://yourdomain.com/
```

### 2. Access Log Analysis

```bash
# Check for suspicious activity
grep -E "(sql|script|union|select)" logs/access.log
grep -E "40[0-9]|50[0-9]" logs/access.log | tail -20

# Monitor failed login attempts
grep "login.*failed" logs/error.log | tail -10

# Check for unusual user agents
awk '{print $12}' logs/access.log | sort | uniq -c | sort -nr | head -10
```

### 3. SSL/TLS Maintenance

```bash
# Test SSL configuration
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -text -noout | grep "Not After"

# Test SSL strength
nmap --script ssl-enum-ciphers -p 443 yourdomain.com
```

## Troubleshooting Common Issues

### 1. Application Won't Start

```bash
# Check logs
pm2 logs latvian-author-website

# Check port availability
sudo lsof -i :3000

# Check database connectivity
sqlite3 database.sqlite "SELECT 1;"

# Check file permissions
ls -la database.sqlite .env uploads/
```

### 2. High Memory Usage

```bash
# Check memory usage
ps aux | grep node
free -h

# Restart application
pm2 restart latvian-author-website

# Check for memory leaks
pm2 monit
```

### 3. Database Issues

```bash
# Check database integrity
sqlite3 database.sqlite "PRAGMA integrity_check;"

# Check database locks
sqlite3 database.sqlite "PRAGMA wal_checkpoint;"

# Repair database (if needed)
sqlite3 database.sqlite ".backup backup.db"
mv backup.db database.sqlite
```

### 4. Email Not Working

```bash
# Test SMTP connection
telnet smtp.gmail.com 587

# Check email configuration
grep EMAIL .env

# Check email logs
grep -i email logs/error.log
```

## Emergency Procedures

### 1. Site Down Emergency

```bash
# Quick restart
pm2 restart latvian-author-website
sudo systemctl restart nginx

# Check system resources
htop
df -h

# Enable maintenance mode (if configured)
touch maintenance.flag
```

### 2. Security Breach Response

```bash
# Immediate actions:
# 1. Change all passwords
# 2. Rotate session secret
# 3. Review access logs
# 4. Update all dependencies
# 5. Scan for malware

# Generate new session secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Update .env file with new secret
# Restart application
pm2 restart latvian-author-website
```

### 3. Data Loss Recovery

```bash
# Stop application
pm2 stop latvian-author-website

# Restore from most recent backup
cp /backup/database-latest.sqlite database.sqlite

# Verify data integrity
sqlite3 database.sqlite "SELECT COUNT(*) FROM content;"

# Restart application
pm2 start latvian-author-website
```

## Maintenance Schedule Template

### Daily (Automated)
- [ ] Health checks
- [ ] Log monitoring
- [ ] Backup creation
- [ ] Resource monitoring

### Weekly (Manual)
- [ ] Security audit
- [ ] Performance review
- [ ] Backup verification
- [ ] Log analysis

### Monthly (Scheduled)
- [ ] Dependency updates
- [ ] SSL certificate check
- [ ] Database optimization
- [ ] Log rotation
- [ ] Security review

### Quarterly (Planned)
- [ ] Full security audit
- [ ] Performance optimization
- [ ] Disaster recovery test
- [ ] Documentation update

This maintenance guide ensures the long-term reliability, security, and performance of the Latvian Author Website. Regular adherence to these procedures will help prevent issues and ensure smooth operation.