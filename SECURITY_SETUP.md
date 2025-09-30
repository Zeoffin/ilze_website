# 🔐 Security Setup for Railway Deployment

## Quick Setup Guide

### 1. Generate Secure Credentials
```bash
npm run generate:credentials
```

### 2. Set Environment Variables in Railway
Copy the generated values to your Railway project's environment variables:

- `NODE_ENV=production`
- `SESSION_SECRET=<generated-secret>`
- `ADMIN_USERNAME=<your-username>`
- `ADMIN_PASSWORD=<generated-password>`
- `ADMIN_EMAIL=<your-email>`

### 3. Deploy
```bash
railway up
```

## What This Setup Provides

✅ **Secure Admin Authentication**
- Environment-based credentials
- Strong password generation
- Bcrypt hashing with salt rounds of 12

✅ **Session Security**
- Cryptographically secure session secrets
- HTTP-only cookies
- Secure cookies in production

✅ **Database Security**
- Automatic admin user creation
- No hardcoded passwords
- Secure password generation fallback

## Security Features

### Password Security
- **Local Development**: Uses fallback password or environment variable
- **Production**: Requires environment variable or generates secure random password
- **Hashing**: Bcrypt with 12 salt rounds (more secure than default 10)

### Environment Detection
- **Development**: Shows password in logs for convenience
- **Production**: Only shows username, warns about missing password env var

### Fallback Behavior
- If no `ADMIN_PASSWORD` is set in production, generates a secure random password
- Logs the generated password once for you to save
- Recommends setting the environment variable for future deployments

## Files Modified

1. **`src/models/database.js`** - Updated admin user creation with environment variables
2. **`.env.example`** - Added admin credential examples
3. **`RAILWAY_DEPLOYMENT.md`** - Complete deployment guide
4. **`scripts/generate-credentials.js`** - Credential generation utility
5. **`package.json`** - Added `generate:credentials` script

## Next Steps

1. Run `npm run generate:credentials` to get your secure credentials
2. Follow the Railway deployment guide in `RAILWAY_DEPLOYMENT.md`
3. Save your credentials securely (password manager recommended)
4. Test your deployment by logging into `/admin` with your credentials

## Important Notes

⚠️ **Never commit `.env` files or credentials to git**
⚠️ **Use different passwords for local vs production**
⚠️ **Save generated passwords immediately - they won't be shown again**
⚠️ **Change the default email to your actual email address**