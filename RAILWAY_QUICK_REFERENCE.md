# Railway Deployment Quick Reference

## 🚀 Quick Deploy Checklist

- [ ] Repository connected to Railway
- [ ] PostgreSQL database added to project
- [ ] Environment variables configured
- [ ] First deployment successful
- [ ] Health check passing
- [ ] Admin login tested
- [ ] Contact form tested

## 📋 Required Environment Variables

Copy these to Railway dashboard → Variables:

```bash
# Essential
NODE_ENV=production
SESSION_SECRET=generate-secure-random-string

# Email (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Admin Access
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password-here
```

## 🔧 Quick Commands

```bash
# Test Railway configuration locally
npm run railway:test

# Run all tests before deployment
npm run test:all

# Check security
npm run security:audit
```

## 🏥 Health Check

Test after deployment:
```bash
curl https://your-app.railway.app/api/health
```

## 📁 Key Files

- `railway.toml` - Railway configuration
- `Dockerfile` - Container configuration  
- `.env.railway` - Environment variables template
- `RAILWAY_DEPLOYMENT.md` - Full deployment guide

## 🔍 Troubleshooting

| Issue | Solution |
|-------|----------|
| Database connection failed | Check PostgreSQL service is running |
| Missing environment variables | Set all required vars in Railway dashboard |
| Health check failing | Check logs, verify database connection |
| Admin login not working | Verify ADMIN_USERNAME and ADMIN_PASSWORD |
| Email not sending | Check EMAIL_* variables and Gmail app password |

## 📞 Quick Links

- [Railway Dashboard](https://railway.app/dashboard)
- [Railway Docs](https://docs.railway.app/)
- [Full Deployment Guide](./RAILWAY_DEPLOYMENT.md)

## 🎯 Post-Deployment Tests

1. Visit your Railway app URL
2. Test navigation between sections
3. Try contact form submission
4. Login to admin panel
5. Test content editing
6. Verify image uploads work