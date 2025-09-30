# Railway Deployment Guide

This guide explains how to securely deploy your Latvian Author Website to Railway.

## 🔐 Security Configuration

### Required Environment Variables

Set these environment variables in your Railway project dashboard:

```bash
# Production Environment
NODE_ENV=production

# Session Security
SESSION_SECRET=your-very-long-random-string-here

# Admin Credentials (IMPORTANT!)
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-secure-password-here
ADMIN_EMAIL=your-email@domain.com
```

### Generating Secure Values

#### 1. Session Secret
Generate a secure session secret (32+ characters):
```bash
# Option 1: Use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Use OpenSSL
openssl rand -hex 32

# Option 3: Online generator
# Visit: https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx
```

#### 2. Admin Password
Create a strong password with:
- At least 12 characters
- Mix of uppercase, lowercase, numbers, and symbols
- No dictionary words or personal information

Example strong password: `K9#mX2$vB8@nQ5!w`

## 🚀 Deployment Steps

### 1. Prepare Your Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### 2. Deploy to Railway

#### Option A: Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Set environment variables
railway variables set NODE_ENV=production
railway variables set SESSION_SECRET=your-generated-secret
railway variables set ADMIN_USERNAME=your-admin-username
railway variables set ADMIN_PASSWORD=your-secure-password
railway variables set ADMIN_EMAIL=your-email@domain.com

# Deploy
railway up
```

#### Option B: Railway Dashboard
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Go to Variables tab and add:
   - `NODE_ENV=production`
   - `SESSION_SECRET=your-generated-secret`
   - `ADMIN_USERNAME=your-admin-username`
   - `ADMIN_PASSWORD=your-secure-password`
   - `ADMIN_EMAIL=your-email@domain.com`

### 3. Verify Deployment

After deployment:
1. Visit your Railway app URL
2. Go to `/admin` to test admin login
3. Use your configured `ADMIN_USERNAME` and `ADMIN_PASSWORD`
4. Check that all 9 people profiles load correctly

## 🔍 Post-Deployment Checklist

- [ ] Admin login works with your credentials
- [ ] People section displays all 9 profiles
- [ ] Images load correctly
- [ ] Contact form works (if implemented)
- [ ] No sensitive information in logs
- [ ] HTTPS is enabled (Railway provides this automatically)

## 🛡️ Security Best Practices

### Environment Variables
- ✅ Never commit `.env` files to git
- ✅ Use different passwords for local vs production
- ✅ Rotate passwords regularly
- ✅ Use Railway's built-in environment variable encryption

### Database Security
- ✅ SQLite database is automatically secured on Railway
- ✅ No external database connections needed
- ✅ Database backups handled by Railway

### Application Security
- ✅ Helmet.js configured for security headers
- ✅ Rate limiting enabled
- ✅ Session security configured
- ✅ Input validation in place

## 🔧 Troubleshooting

### Common Issues

#### 1. Admin Login Not Working
```bash
# Check environment variables are set
railway variables

# Check logs for admin user creation
railway logs
```

#### 2. People Profiles Not Loading
- Ensure `public/media/people/` directory is in your git repository
- Check Railway logs for People Data Service initialization

#### 3. Images Not Displaying
- Verify image paths in Railway logs
- Check that images are committed to git (not in .gitignore)

### Useful Railway Commands
```bash
# View logs
railway logs

# Check environment variables
railway variables

# Open app in browser
railway open

# Connect to shell
railway shell
```

## 📞 Support

If you encounter issues:
1. Check Railway logs: `railway logs`
2. Verify environment variables: `railway variables`
3. Test locally first with production environment variables
4. Check Railway's status page: [status.railway.app](https://status.railway.app)

## 🔄 Updates and Maintenance

### Updating the Application
```bash
# Make changes locally
git add .
git commit -m "Update application"
git push origin main

# Railway will automatically redeploy
```

### Changing Admin Password
```bash
# Update environment variable
railway variables set ADMIN_PASSWORD=new-secure-password

# Restart the application
railway restart
```

### Database Backup
Railway automatically handles database persistence, but for extra safety:
- Consider implementing a backup strategy for critical data
- Export important content regularly through the admin interface