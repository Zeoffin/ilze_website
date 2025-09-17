const request = require('supertest');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initializeDatabase, database, AdminUser } = require('../src/models');
const { bruteForceProtection } = require('../src/middleware/auth');

// Create test app for admin routes
const createTestApp = () => {
  const app = express();
  
  // Security middleware
  app.use(helmet({
      contentSecurityPolicy: {
          directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", "data:", "https:"],
          },
      },
  }));

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session configuration
  app.use(session({
      secret: 'test-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
          secure: false,
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
  }));

  // Apply brute force protection to admin login
  app.use('/admin/login', bruteForceProtection);

  // Routes
  const adminRoutes = require('../src/routes/admin');
  app.use('/admin', adminRoutes);

  return app;
};

describe('Admin Authentication System', () => {
  let app;
  let testUser;

  beforeAll(async () => {
    await initializeDatabase();
    app = createTestApp();
    
    // Create a unique test admin user
    const timestamp = Date.now();
    const username = `testadmin${timestamp}`;
    
    // Check if user already exists and delete if so
    const existingUser = await AdminUser.findByUsername(username);
    if (existingUser) {
      await AdminUser.deleteById(existingUser.id);
    }
    
    testUser = new AdminUser({
      username: username,
      email: `testadmin${timestamp}@example.com`
    });
    await testUser.setPassword('testpassword123');
    await testUser.save();
  });

  // Add delay between tests to avoid rate limiting
  afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Clean up test user
    if (testUser && testUser.id) {
      await AdminUser.deleteById(testUser.id);
    }
    await database.close();
  });

  describe('POST /admin/login', () => {
    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', testUser.username);
    });

    test('should reject invalid username', async () => {
      const response = await request(app)
        .post('/admin/login')
        .send({
          username: 'nonexistent',
          password: 'testpassword123'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    test('should reject invalid password', async () => {
      const response = await request(app)
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    test('should reject empty credentials', async () => {
      const response = await request(app)
        .post('/admin/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Username and password are required');
    });

    test('should handle rate limiting for failed attempts', async () => {
      const requests = [];
      
      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        requests.push(
          request(app)
            .post('/admin/login')
            .send({
              username: testUser.username,
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('GET /admin/status', () => {
    test('should return unauthenticated status initially', async () => {
      const response = await request(app)
        .get('/admin/status')
        .expect(200);

      expect(response.body).toHaveProperty('isAuthenticated', false);
      expect(response.body).toHaveProperty('user', null);
    });

    test('should return authenticated status after login', async () => {
      const agent = request.agent(app);
      
      // Login first
      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      // Check status
      const response = await agent
        .get('/admin/status')
        .expect(200);

      expect(response.body).toHaveProperty('isAuthenticated', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', testUser.username);
    });
  });

  describe('POST /admin/logout', () => {
    test('should logout successfully when authenticated', async () => {
      const agent = request.agent(app);
      
      // Login first
      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      // Logout
      const response = await agent
        .post('/admin/logout')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Logout successful');

      // Verify status is unauthenticated
      const statusResponse = await agent
        .get('/admin/status')
        .expect(200);

      expect(statusResponse.body).toHaveProperty('isAuthenticated', false);
    });

    test('should require authentication for logout', async () => {
      const response = await request(app)
        .post('/admin/logout')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });
  });

  describe('GET /admin/dashboard', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/admin/dashboard')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    test('should allow access when authenticated', async () => {
      const agent = request.agent(app);
      
      // Login first
      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      // Access dashboard
      const response = await agent
        .get('/admin/dashboard')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', testUser.username);
    });
  });
});