const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initializeDatabase } = require('./src/models');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https:", "data:"],
            connectSrc: ["'self'"],
            mediaSrc: ["'self'"],
            objectSrc: ["'none'"],
            childSrc: ["'none'"],
            workerSrc: ["'none'"],
            frameSrc: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
    },
    crossOriginEmbedderPolicy: false, // Allow images from different origins
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Additional security headers
app.use((req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    next();
});

// Rate limiting (more lenient for development)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs (increased for testing)
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});
app.use(limiter);

// Request ID middleware for error tracking
app.use((req, res, next) => {
    req.id = Math.random().toString(36).substr(2, 9);
    res.setHeader('X-Request-ID', req.id);
    next();
});

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            timestamp: new Date().toISOString(),
            requestId: req.id,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        };
        
        // Log errors and slow requests
        if (res.statusCode >= 400 || duration > 5000) {
            console.log('Request log:', JSON.stringify(logData, null, 2));
        }
    });
    
    next();
});

// Body parsing middleware with size limits
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        // Store raw body for potential signature verification
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb',
    parameterLimit: 100 // Limit number of parameters
}));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Static file serving
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import middleware
const { bruteForceProtection } = require('./src/middleware/auth');

// Apply brute force protection to admin login
app.use('/admin/login', bruteForceProtection);

// Routes
const adminRoutes = require('./src/routes/admin');
const apiRoutes = require('./src/routes/api');
const healthRoutes = require('./src/routes/health');

app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/health', healthRoutes);

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
    // Log error with more context
    const errorContext = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack
        }
    };
    
    console.error('Server error:', JSON.stringify(errorContext, null, 2));
    
    // Handle specific error types
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ 
            error: 'Invalid JSON format',
            message: 'Please check your request format',
            timestamp: new Date().toISOString()
        });
    }
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation failed',
            message: err.message,
            timestamp: new Date().toISOString()
        });
    }
    
    // Handle file upload errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            error: 'File too large',
            message: 'The uploaded file exceeds the maximum allowed size',
            timestamp: new Date().toISOString()
        });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(413).json({
            error: 'Too many files',
            message: 'Too many files uploaded at once',
            timestamp: new Date().toISOString()
        });
    }
    
    // Handle database errors
    if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({
            error: 'Data conflict',
            message: 'The operation conflicts with existing data',
            timestamp: new Date().toISOString()
        });
    }
    
    // Handle timeout errors
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
        return res.status(408).json({
            error: 'Request timeout',
            message: 'The request took too long to process',
            timestamp: new Date().toISOString()
        });
    }
    
    // Determine status code based on error type
    let statusCode = 500;
    if (err.statusCode) {
        statusCode = err.statusCode;
    } else if (err.status) {
        statusCode = err.status;
    }
    
    // Generic error response (don't expose internal details)
    res.status(statusCode).json({ 
        error: 'Internal server error',
        message: 'Something went wrong. Please try again later.',
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown'
    });
});

// Enhanced 404 handler
app.use((req, res) => {
    // Log 404 requests for monitoring
    console.log(`404 - ${req.method} ${req.url} - ${req.ip} - ${req.get('User-Agent')}`);
    
    // Return appropriate response based on request type
    if (req.accepts('html') && !req.accepts('json')) {
        // For HTML requests, redirect to main page
        res.redirect('/');
    } else {
        // For API requests, return JSON
        res.status(404).json({ 
            error: 'Page not found',
            message: 'The requested resource was not found',
            timestamp: new Date().toISOString(),
            path: req.url
        });
    }
});

// Initialize database and start server
const startServer = async () => {
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Visit http://localhost:${PORT} to view the website`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;