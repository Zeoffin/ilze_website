const request = require('supertest');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { initializeDatabase, database, AdminUser } = require('../src/models');

// Create test app for content management
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

  // Routes
  const adminRoutes = require('../src/routes/admin');
  const apiRoutes = require('../src/routes/api');
  app.use('/admin', adminRoutes);
  app.use('/api', apiRoutes);

  return app;
};

describe('Content Management System', () => {
  let app;
  let testUser;
  let authenticatedAgent;
  let csrfToken;

  beforeAll(async () => {
    await initializeDatabase();
    app = createTestApp();
    
    // Create test admin user
    const timestamp = Date.now();
    const username = `contentadmin${timestamp}`;
    
    testUser = new AdminUser({
      username: username,
      email: `contentadmin${timestamp}@example.com`
    });
    await testUser.setPassword('testpassword123');
    await testUser.save();

    // Create authenticated agent
    authenticatedAgent = request.agent(app);
    await authenticatedAgent
      .post('/admin/login')
      .send({
        username: testUser.username,
        password: 'testpassword123'
      })
      .expect(200);

    // Get CSRF token
    const dashboardResponse = await authenticatedAgent.get('/admin/dashboard');
    csrfToken = dashboardResponse.headers['x-csrf-token'];
  });

  afterAll(async () => {
    // Clean up test user
    if (testUser && testUser.id) {
      await AdminUser.deleteById(testUser.id);
    }
    await database.close();
  });

  describe('Content CRUD Operations', () => {
    test('should create new content item', async () => {
      const contentData = {
        content: [
          {
            content_type: 'text',
            content: 'This is a test content item for the interesanti section.'
          }
        ]
      };

      const response = await authenticatedAgent
        .put('/admin/content/interesanti')
        .set('X-CSRF-Token', csrfToken || '')
        .send(contentData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('content');
      expect(response.body.content).toHaveLength(1);
      expect(response.body.content[0]).toHaveProperty('content_type', 'text');
      expect(response.body.content[0]).toHaveProperty('section', 'interesanti');
    });

    test('should retrieve content for section', async () => {
      const response = await authenticatedAgent
        .get('/admin/content/interesanti')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('section', 'interesanti');
      expect(response.body).toHaveProperty('content');
      expect(Array.isArray(response.body.content)).toBe(true);
    });

    test('should update existing content item', async () => {
      // First create content
      const createData = {
        content: [
          {
            content_type: 'text',
            content: 'Original content'
          }
        ]
      };

      const createResponse = await authenticatedAgent
        .put('/admin/content/gramatas')
        .set('X-CSRF-Token', csrfToken || '')
        .send(createData)
        .expect(200);

      const contentId = createResponse.body.content[0].id;

      // Then update it
      const updateData = {
        content: [
          {
            id: contentId,
            content_type: 'text',
            content: 'Updated content'
          }
        ]
      };

      const updateResponse = await authenticatedAgent
        .put('/admin/content/gramatas')
        .set('X-CSRF-Token', csrfToken || '')
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.content[0].content).toBe('Updated content');
      expect(updateResponse.body.content[0].id).toBe(contentId);
    });

    test('should validate content data', async () => {
      const invalidData = {
        content: [
          {
            content_type: 'invalid_type',
            content: 'Test content'
          }
        ]
      };

      const response = await authenticatedAgent
        .put('/admin/content/interesanti')
        .set('X-CSRF-Token', csrfToken || '')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      // The actual error message from the server
      expect(response.body.error).toContain('Invalid content_type');
    });

    test('should reject empty content', async () => {
      const emptyData = {
        content: [
          {
            content_type: 'text',
            content: ''
          }
        ]
      };

      const response = await authenticatedAgent
        .put('/admin/content/interesanti')
        .set('X-CSRF-Token', csrfToken || '')
        .send(emptyData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      // The actual error message from the server
      expect(response.body.error).toContain('Content cannot be empty');
    });

    test('should handle HTML content properly', async () => {
      const htmlData = {
        content: [
          {
            content_type: 'text',
            content: '<p>This is <strong>HTML</strong> content with <em>formatting</em>.</p>'
          }
        ]
      };

      const response = await authenticatedAgent
        .put('/admin/content/interesanti')
        .set('X-CSRF-Token', csrfToken || '')
        .send(htmlData)
        .expect(200);

      // Content should be processed and may be sanitized
      expect(response.body.content[0].content).toBeDefined();
      expect(response.body.content[0].content.length).toBeGreaterThan(0);
      // Check that some content remains
      expect(response.body.content[0].content).toContain('HTML');
      expect(response.body.content[0].content).toContain('formatting');
    });
  });

  describe('Content Validation and Security', () => {
    test('should validate section parameter', async () => {
      const contentData = {
        content: [
          {
            content_type: 'text',
            content: 'Test content'
          }
        ]
      };

      const response = await authenticatedAgent
        .put('/admin/content/invalid_section')
        .set('X-CSRF-Token', csrfToken || '')
        .send(contentData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      // The actual error message from the server
      expect(response.body.error).toContain('Invalid section');
    });

    test('should require authentication for content operations', async () => {
      const unauthenticatedAgent = request.agent(app);
      
      const response = await unauthenticatedAgent
        .get('/admin/content/interesanti')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    test('should require CSRF token for content updates', async () => {
      const contentData = {
        content: [
          {
            content_type: 'text',
            content: 'Test content without CSRF token'
          }
        ]
      };

      const response = await authenticatedAgent
        .put('/admin/content/interesanti')
        .send(contentData)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'CSRF token mismatch');
    });
  });

  describe('Public Content API', () => {
    test('should serve content to public API', async () => {
      // First create some content
      const contentData = {
        content: [
          {
            content_type: 'text',
            content: 'Public content for interesanti section'
          }
        ]
      };

      await authenticatedAgent
        .put('/admin/content/interesanti')
        .set('X-CSRF-Token', csrfToken || '')
        .send(contentData)
        .expect(200);

      // Then fetch it via public API
      const publicResponse = await request(app)
        .get('/api/content/interesanti')
        .expect(200);

      expect(publicResponse.body).toHaveProperty('success', true);
      expect(publicResponse.body).toHaveProperty('section', 'interesanti');
      expect(publicResponse.body.content.length).toBeGreaterThan(0);
    });

    test('should handle non-existent sections gracefully', async () => {
      const response = await request(app)
        .get('/api/content/nonexistent')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid section');
    });
  });
});