# Deployment Guide - Latvian Author Website

This guide provides comprehensive instructions for deploying the Latvian Author Website to various environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Local Development Setup](#local-development-setup)
4. [Production Deployment](#production-deployment)
5. [Railway.com Deployment](#railwaycom-deployment)
6. [Database Setup](#database-setup)
7. [Security Considerations](#security-considerations)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- Node.js 16.x or higher
- npm 8.x or higher
- SQLite 3.x (for local development)
- PostgreSQL (for production, if using Railway)

### Required Services
- SMTP email service (Gmail, SendGrid, etc.)
- File storage (local filesystem or cloud storage)

## Environment Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Security
SESSION_SECRET=your-super-secure-random-string-here

# Database (SQLite for local, PostgreSQL URL for Railway)
DATABASE_PATH=./database.sqlite
# DATABASE_URL=postgresql://user:password@host:port/database (for Railway)

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# Logging
LOG_LEVEL=info

# CORS (comma-separated list of allowed origins)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Generating Secure Session Secret

```bash
# Generate a secure session secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Local Development Setup

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd latvian-author-website
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Initialize Database**
   ```bash
   npm run init-db
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Run Tests**
   ```bash
   npm test
   ```

## Production Deployment

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash latvianauthor
sudo usermod -aG sudo latvianauthor
```

### 2. Application Deployment

```bash
# Switch to application user
sudo su - latvianauthor

# Clone repository
git clone <repository-url> /home/latvianauthor/app
cd /home/latvianauthor/app

# Install dependencies
npm ci --only=production

# Set up environment
cp .env.example .env
# Edit .env with production values

# Initialize database
npm run init-db

# Create necessary directories
mkdir -p logs uploads

# Set proper permissions
chmod 755 uploads
chmod 755 logs
```

### 3. Process Management with PM2

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'latvian-author-website',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512'
  }]
};
```

Start the application:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Reverse Proxy with Nginx

Install and configure Nginx:

```bash
sudo apt install nginx

# Create site configuration
sudo nano /etc/nginx/sites-available/latvianauthor
```

Nginx configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=contact:10m rate=1r/m;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Rate limit API endpoints
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        # ... other proxy settings
    }
    
    # Rate limit contact form
    location /api/contact {
        limit_req zone=contact burst=5 nodelay;
        proxy_pass http://localhost:3000;
        # ... other proxy settings
    }
    
    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://localhost:3000;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/latvianauthor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL Certificate with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Railway.com Deployment

### 1. Prepare for Railway

Create `railway.toml`:

```toml
[build]
builder = "NIXPACKS"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[env]
NODE_ENV = "production"
```

### 2. Database Migration Script

Create `scripts/migrate-to-postgresql.js`:

```javascript
const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');

async function migrateToPostgreSQL() {
  const sqliteDb = new sqlite3.Database('./database.sqlite');
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await pgClient.connect();
    
    // Create PostgreSQL tables
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS content (
        id SERIAL PRIMARY KEY,
        section VARCHAR(50) NOT NULL,
        content_type VARCHAR(20) NOT NULL,
        content TEXT,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'sent'
      );
    `);

    console.log('PostgreSQL migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pgClient.end();
    sqliteDb.close();
  }
}

if (require.main === module) {
  migrateToPostgreSQL();
}

module.exports = { migrateToPostgreSQL };
```

### 3. Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Set environment variables
railway variables set NODE_ENV=production
railway variables set SESSION_SECRET=your-secure-secret
railway variables set EMAIL_HOST=smtp.gmail.com
railway variables set EMAIL_USER=your-email@gmail.com
railway variables set EMAIL_PASS=your-app-password
railway variables set EMAIL_FROM=your-email@gmail.com

# Deploy
railway up
```

## Database Setup

### SQLite (Development/Small Production)

```bash
# Initialize database
npm run init-db

# Create admin user
node scripts/create-admin.js

# Seed sample content
node scripts/seed-content.js
```

### PostgreSQL (Railway/Large Production)

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://user:password@host:port/database"

# Run migration
node scripts/migrate-to-postgresql.js

# Initialize with admin user
node scripts/create-admin.js
```

## Security Considerations

### 1. Environment Variables
- Never commit `.env` files to version control
- Use strong, unique passwords and secrets
- Rotate secrets regularly

### 2. File Permissions
```bash
# Set proper file permissions
chmod 600 .env
chmod 755 uploads/
chmod 644 public/*
```

### 3. Firewall Configuration
```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 4. Regular Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
npm audit
npm update
```

## Monitoring and Maintenance

### 1. Log Monitoring

```bash
# View PM2 logs
pm2 logs

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# View application logs
tail -f logs/error.log
tail -f logs/access.log
```

### 2. Health Checks

The application includes a health check endpoint at `/health`:

```bash
curl https://yourdomain.com/health
```

### 3. Database Backup

```bash
# SQLite backup
cp database.sqlite database-backup-$(date +%Y%m%d).sqlite

# PostgreSQL backup (Railway)
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### 4. Automated Backups

Create a backup script `scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/home/latvianauthor/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp database.sqlite $BACKUP_DIR/database-$DATE.sqlite

# Backup uploads
tar -czf $BACKUP_DIR/uploads-$DATE.tar.gz uploads/

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -name "*.sqlite" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

Add to crontab:
```bash
crontab -e
# Add: 0 2 * * * /home/latvianauthor/app/scripts/backup.sh
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   sudo lsof -i :3000
   sudo kill -9 <PID>
   ```

2. **Permission Denied on Uploads**
   ```bash
   sudo chown -R latvianauthor:latvianauthor uploads/
   chmod 755 uploads/
   ```

3. **Database Connection Issues**
   ```bash
   # Check database file permissions
   ls -la database.sqlite
   
   # Recreate database
   rm database.sqlite
   npm run init-db
   ```

4. **Email Not Sending**
   - Verify SMTP credentials
   - Check firewall rules for SMTP ports
   - Enable "Less secure app access" for Gmail
   - Use App Passwords for Gmail with 2FA

5. **High Memory Usage**
   ```bash
   # Monitor memory usage
   pm2 monit
   
   # Restart application
   pm2 restart latvian-author-website
   ```

### Performance Optimization

1. **Enable Gzip Compression**
   - Already configured in Nginx
   - Reduces bandwidth usage by 60-80%

2. **Static File Caching**
   - Configured in Nginx for 1 year
   - Use versioned filenames for cache busting

3. **Database Optimization**
   ```sql
   -- SQLite optimization
   PRAGMA optimize;
   PRAGMA wal_checkpoint(TRUNCATE);
   ```

4. **Monitor Performance**
   ```bash
   # Check response times
   curl -w "@curl-format.txt" -o /dev/null -s https://yourdomain.com/
   
   # Monitor server resources
   htop
   iotop
   ```

### Support and Maintenance

For ongoing support and maintenance:

1. Monitor error logs daily
2. Update dependencies monthly
3. Backup database weekly
4. Review security settings quarterly
5. Update SSL certificates (automated with Let's Encrypt)

### Emergency Procedures

1. **Site Down**
   ```bash
   pm2 restart latvian-author-website
   sudo systemctl restart nginx
   ```

2. **Database Corruption**
   ```bash
   # Restore from backup
   cp database-backup-YYYYMMDD.sqlite database.sqlite
   pm2 restart latvian-author-website
   ```

3. **Security Breach**
   ```bash
   # Change all passwords immediately
   # Review access logs
   # Update all dependencies
   # Rotate session secret
   ```

This deployment guide provides comprehensive instructions for deploying and maintaining the Latvian Author Website in various environments. Follow the security best practices and monitoring procedures to ensure reliable operation.