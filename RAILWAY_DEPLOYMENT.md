# Railway.com Deployment Guide

This guide covers deploying the Latvian Author Website to Railway.com, a modern cloud platform that provides automatic deployments from Git repositories.

## Prerequisites

- Git repository with your code
- Railway.com account
- Basic understanding of environment variables

## Quick Start

1. **Connect Repository to Railway**
   - Visit [railway.app](https://railway.app)
   - Click "Start a New Project"
   - Connect your Git repository
   - Select the repository containing this code

2. **Configure Environment Variables**
   - In Railway dashboard, go to your project
   - Click on "Variables" tab
   - Add the required environment variables (see below)

3. **Deploy**
   - Railway will automatically deploy when you push to your main branch
   - Monitor deployment logs in the Railway dashboard

## Required Environment Variables

Set these variables in Railway's dashboard under the "Variables" section:

### Essential Variables
```bash
NODE_ENV=production
SESSION_SECRET=your-super-secure-random-string-here
```

### Email Configuration
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### Admin Credentials
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password
```

### Database (Automatically provided by Railway)
Railway will automatically provide these when you add a PostgreSQL database:
```bash
DATABASE_URL=postgresql://...
PGHOST=...
PGPORT=...
PGDATABASE=...
PGUSER=...
PGPASSWORD=...
```

## Database Setup

### Adding PostgreSQL Database

1. In Railway dashboard, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create the database and provide connection variables
4. The application will automatically detect and use PostgreSQL in production

### Database Migration

The application automatically handles database migration:
- In development: Uses SQLite (`database.sqlite`)
- In production (Railway): Uses PostgreSQL
- Tables and indexes are created automatically on first startup
- Default admin user is created if none exists

## Deployment Process

### Automatic Deployment

Railway automatically deploys when you:
1. Push to your main/master branch
2. The deployment process includes:
   - Building the Docker container
   - Installing dependencies
   - Running health checks
   - Starting the application

### Manual Deployment

You can also trigger manual deployments:
1. Go to Railway dashboard
2. Click "Deploy" button
3. Monitor deployment logs

## Health Checks

The application includes built-in health monitoring:
- **Health Endpoint**: `/api/health`
- **Railway Health Check**: Configured in `railway.toml`
- **Docker Health Check**: Built into Dockerfile

Test the health endpoint after deployment:
```bash
curl https://your-app.railway.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "database": "connected",
  "environment": "production"
}
```

## File Storage

### Static Files
- Static files are served from the `public/` directory
- Uploaded images are stored in the `uploads/` directory
- Both directories are included in the Docker container

### Persistent Storage
Railway provides ephemeral storage by default. For persistent file uploads:
1. Consider using Railway's Volume feature
2. Or integrate with cloud storage (AWS S3, Cloudinary, etc.)

## Security Considerations

### Environment Variables
- Never commit sensitive data to Git
- Use Railway's environment variables for all secrets
- Rotate secrets regularly

### HTTPS
- Railway automatically provides HTTPS
- The application is configured to work with HTTPS in production

### Database Security
- Railway PostgreSQL instances are secured by default
- Connection uses SSL in production
- Database credentials are automatically managed

## Monitoring and Logs

### Application Logs
View logs in Railway dashboard:
1. Go to your project
2. Click on your service
3. View "Logs" tab

### Error Tracking
The application includes comprehensive error logging:
- Request/response logging
- Database error handling
- Security event logging

### Performance Monitoring
Monitor application performance:
- Response times logged for slow requests (>5s)
- Database connection monitoring
- Memory and CPU usage in Railway dashboard

## Troubleshooting

### Common Issues

**1. Database Connection Errors**
```
Error: Connection refused
```
Solution: Ensure PostgreSQL service is running and environment variables are set

**2. Missing Environment Variables**
```
Error: SESSION_SECRET is required
```
Solution: Set all required environment variables in Railway dashboard

**3. File Upload Issues**
```
Error: ENOENT: no such file or directory, open 'uploads/...'
```
Solution: Ensure uploads directory exists (handled automatically by deployment script)

**4. Health Check Failures**
```
Health check failed
```
Solution: Check application logs and ensure database is connected

### Debugging Steps

1. **Check Environment Variables**
   ```bash
   # In Railway dashboard, verify all required variables are set
   ```

2. **Review Deployment Logs**
   - Check Railway deployment logs for errors
   - Look for database connection issues
   - Verify all dependencies installed correctly

3. **Test Health Endpoint**
   ```bash
   curl https://your-app.railway.app/api/health
   ```

4. **Check Database Connection**
   - Verify PostgreSQL service is running
   - Check database connection variables
   - Review database initialization logs

## Scaling and Performance

### Automatic Scaling
Railway provides automatic scaling based on:
- CPU usage
- Memory usage
- Request volume

### Performance Optimization
The application includes several optimizations:
- Gzip compression
- Static file caching
- Database connection pooling
- Request rate limiting

### Resource Limits
Monitor resource usage in Railway dashboard:
- Memory usage
- CPU usage
- Database connections
- Storage usage

## Backup and Recovery

### Database Backups
Railway automatically backs up PostgreSQL databases:
- Daily automated backups
- Point-in-time recovery available
- Manual backup triggers available

### File Backups
For uploaded files:
1. Consider implementing automated backups to cloud storage
2. Use Railway's Volume snapshots if using persistent volumes

## Cost Management

### Railway Pricing
- Free tier available for development
- Pay-as-you-use pricing for production
- Monitor usage in Railway dashboard

### Optimization Tips
- Use appropriate resource limits
- Monitor and optimize database queries
- Implement caching where appropriate
- Regular cleanup of unused files

## Support and Resources

### Railway Documentation
- [Railway Docs](https://docs.railway.app/)
- [Railway Discord Community](https://discord.gg/railway)

### Application Support
- Check application logs first
- Review this deployment guide
- Test locally before deploying

### Emergency Procedures
1. **Rollback Deployment**
   - Use Railway dashboard to rollback to previous version
   - Monitor logs during rollback

2. **Database Recovery**
   - Use Railway's backup restoration
   - Contact Railway support if needed

3. **Service Outage**
   - Check Railway status page
   - Review application health checks
   - Scale resources if needed

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Test Railway deployment configuration
npm run railway:test
```

### Deployment Workflow
```bash
# 1. Test locally
npm run test:all

# 2. Test Railway configuration
npm run railway:test

# 3. Commit and push
git add .
git commit -m "Your changes"
git push origin main

# 4. Monitor deployment in Railway dashboard
```

### Environment Parity
- Use `.env` for local development
- Use Railway variables for production
- Keep environment configurations in sync

## Advanced Configuration

### Custom Domains
1. In Railway dashboard, go to "Settings"
2. Add your custom domain
3. Configure DNS records as instructed
4. Railway handles SSL certificates automatically

### Multiple Environments
Set up staging and production environments:
1. Create separate Railway projects
2. Use different Git branches
3. Configure environment-specific variables

### CI/CD Integration
Railway integrates with:
- GitHub Actions
- GitLab CI
- Other CI/CD platforms

Example GitHub Action for additional testing:
```yaml
name: Deploy to Railway
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run railway:test
```

This comprehensive guide should help you successfully deploy and maintain your Latvian Author Website on Railway.com.