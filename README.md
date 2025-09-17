# Latvian Author Website

A showcase website for Latvian children's book author Ilze Skrastiņa, featuring her books, book fragments, author information, and contact functionality with admin panel for content management.

## Project Structure

```
├── public/                 # Frontend static files
│   ├── css/               # Stylesheets
│   ├── js/                # Client-side JavaScript
│   ├── media/             # Static media files
│   └── index.html         # Main HTML file
├── src/                   # Backend source code
│   ├── routes/            # Express routes
│   ├── models/            # Database models
│   └── middleware/        # Custom middleware
├── uploads/               # User uploaded files
├── server.js              # Main server entry point
└── package.json           # Project dependencies
```

## Setup Instructions

1. Clone the repository
2. Copy `.env.example` to `.env` and configure your environment variables
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Visit `http://localhost:3000` to view the website

## Available Scripts

### Development
- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon
- `npm run init-db` - Initialize the database

### Testing
- `npm test` - Run all tests
- `npm run test:unit` - Run unit tests
- `npm run test:integration` - Run integration tests
- `npm run test:security` - Run security tests
- `npm run test:complete` - Run complete integration tests
- `npm run test:all` - Run comprehensive test suite with reports
- `npm run test:coverage` - Run tests with coverage report

### Security & Deployment
- `npm run security:audit` - Run comprehensive security audit
- `npm run deploy:check` - Run security audit and all tests before deployment
- `npm run railway:test` - Test Railway deployment configuration
- `npm run railway:predeploy` - Pre-deployment setup for Railway
- `npm run railway:postdeploy` - Post-deployment verification for Railway

## Features

- Single-page responsive website with smooth navigation
- Playful, colorful design appropriate for children's literature
- Admin panel for content management
- Contact form with email functionality
- Image upload and management system
- Secure authentication and session management

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Authentication**: bcrypt, express-session
- **File Upload**: Multer
- **Email**: Nodemailer
- **Security**: Helmet, rate limiting, CSRF protection

## Deployment

### Railway.com Deployment (Recommended)

**Quick Start:**
1. Connect your Git repository to [Railway](https://railway.app)
2. Add PostgreSQL database service
3. Configure environment variables
4. Deploy automatically on push

```bash
# Test Railway configuration before deploying
npm run railway:test
```

📖 **Full Guide:** [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)  
🚀 **Quick Reference:** [RAILWAY_QUICK_REFERENCE.md](RAILWAY_QUICK_REFERENCE.md)

### Traditional Deployment

**Quick Deployment Check:**
```bash
npm run deploy:check
```

**Production Options:**

1. **Deploy with PM2**
   ```bash
   npm ci --production
   pm2 start ecosystem.config.js --env production
   ```

2. **Deploy with Docker**
   ```bash
   docker-compose up -d
   ```

### Deployment Documentation
- [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) - Railway.com deployment guide
- [RAILWAY_QUICK_REFERENCE.md](RAILWAY_QUICK_REFERENCE.md) - Railway quick reference
- [DEPLOYMENT.md](DEPLOYMENT.md) - Traditional deployment guide
- [MAINTENANCE.md](MAINTENANCE.md) - Ongoing maintenance procedures
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Step-by-step deployment checklist

## Security Features

- Comprehensive input validation and sanitization
- Rate limiting on all endpoints
- Secure session management
- File upload restrictions and validation
- Security headers (Helmet.js)
- Brute force protection
- SQL injection prevention
- XSS protection
- CSRF protection

## Monitoring & Health Checks

The application includes built-in monitoring capabilities:

- Health check endpoint: `/api/health`
- Comprehensive logging with request IDs
- Performance monitoring
- Error tracking and reporting
- Automated security auditing

## Testing

The project includes comprehensive testing:

- **Unit Tests**: Models and API endpoints
- **Integration Tests**: Complete user workflows
- **Security Tests**: Authentication and authorization
- **Performance Tests**: Load and response time testing
- **End-to-End Tests**: Complete application workflows

Run the complete test suite:
```bash
npm run test:all
```

## Maintenance

Regular maintenance tasks:
- Daily: Health monitoring, log review
- Weekly: Security updates, database maintenance
- Monthly: Dependency updates, performance review
- Quarterly: Security audit, content review

See [MAINTENANCE.md](MAINTENANCE.md) for detailed procedures.