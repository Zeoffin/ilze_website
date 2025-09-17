/**
 * Authentication middleware for admin routes
 */

/**
 * Middleware to check if user is authenticated as admin
 */
const requireAuth = (req, res, next) => {
  if (req.session && req.session.isAdmin && req.session.userId) {
    // Check session timeout (24 hours)
    const sessionAge = Date.now() - (req.session.loginTime || 0);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if (sessionAge > maxAge) {
      req.session.destroy((err) => {
        if (err) console.error('Session destruction error:', err);
      });
      
      return res.status(401).json({
        error: 'Session expired',
        message: 'Your session has expired. Please log in again.'
      });
    }
    
    // Update last activity time
    req.session.lastActivity = Date.now();
    
    return next();
  }
  
  // Check if request expects HTML response
  if (req.accepts('html') && !req.accepts('json')) {
    return res.redirect('/admin/login');
  }
  
  return res.status(401).json({
    error: 'Authentication required',
    message: 'Please log in to access this resource'
  });
};

/**
 * Middleware to check if user is already authenticated (for login page)
 */
const requireGuest = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    // Check if request expects HTML response
    if (req.accepts('html') && !req.accepts('json')) {
      return res.redirect('/admin/dashboard');
    }
    
    return res.status(400).json({
      error: 'Already authenticated',
      message: 'You are already logged in'
    });
  }
  
  return next();
};

/**
 * Middleware to add authentication status to response
 */
const addAuthStatus = (req, res, next) => {
  res.locals.isAuthenticated = !!(req.session && req.session.isAdmin);
  res.locals.user = req.session && req.session.isAdmin ? { username: req.session.username } : null;
  next();
};

module.exports = {
  requireAuth,
  requireGuest,
  addAuthStatus
};
/**

 * Middleware to prevent brute force attacks by tracking failed login attempts
 */
const loginAttempts = new Map();

const bruteForceProtection = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  
  // Clean up old entries
  for (const [ip, data] of loginAttempts.entries()) {
    if (now - data.firstAttempt > windowMs) {
      loginAttempts.delete(ip);
    }
  }
  
  const attempts = loginAttempts.get(clientIP);
  
  if (attempts && attempts.count >= maxAttempts) {
    const timeLeft = windowMs - (now - attempts.firstAttempt);
    if (timeLeft > 0) {
      return res.status(429).json({
        error: 'Too many failed login attempts',
        message: `Please try again in ${Math.ceil(timeLeft / 60000)} minutes`,
        retryAfter: Math.ceil(timeLeft / 1000)
      });
    } else {
      // Window expired, reset attempts
      loginAttempts.delete(clientIP);
    }
  }
  
  // Store original end function to intercept response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    // Check if login failed (401 status)
    if (res.statusCode === 401) {
      const current = loginAttempts.get(clientIP) || { count: 0, firstAttempt: now };
      current.count++;
      if (current.count === 1) {
        current.firstAttempt = now;
      }
      loginAttempts.set(clientIP, current);
    } else if (res.statusCode === 200) {
      // Login successful, clear attempts
      loginAttempts.delete(clientIP);
    }
    
    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * Middleware to add CSRF protection headers
 */
const csrfProtection = (req, res, next) => {
  // Generate CSRF token if not exists
  if (!req.session.csrfToken) {
    req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
  }
  
  // Add CSRF token to response headers for AJAX requests
  res.setHeader('X-CSRF-Token', req.session.csrfToken);
  
  // For state-changing operations, verify CSRF token
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    // Skip CSRF check for login endpoint (it has its own protection)
    if (req.path === '/login') {
      return next();
    }
    
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    
    // Temporarily disable CSRF check in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('CSRF check skipped in development mode');
      return next();
    }
    
    if (!token || token !== req.session.csrfToken) {
      return res.status(403).json({
        error: 'CSRF token mismatch',
        message: 'Invalid or missing CSRF token'
      });
    }
  }
  
  next();
};

module.exports = {
  requireAuth,
  requireGuest,
  addAuthStatus,
  bruteForceProtection,
  csrfProtection
};