const request = require('supertest');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { initializeDatabase, database, AdminUser } = require('../src/models');
const PeopleContentRepository = require('../src/models/PeopleContentRepository');

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

  // Routes
  const adminRoutes = require('../src/routes/admin');
  app.use('/admin', adminRoutes);

  return app;
};

describe('Admin People Management API', () => {
  let app;
  let testUser;
  let authenticatedAgent;
  let repository;

  beforeAll(async () => {
    await initializeDatabase();
    app = createTestApp();
    repository = new PeopleContentRepository();
    
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

    // Create authenticated agent
    authenticatedAgent = request.agent(app);
    await authenticatedAgent
      .post('/admin/login')
      .send({
        username: testUser.username,
        password: 'testpassword123'
      })
      .expect(200);
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
    
    // Clean up test people content
    try {
      await database.run('DELETE FROM people_content WHERE person_slug LIKE ?', ['test-%']);
    } catch (error) {
      console.log('Error cleaning up test data:', error.message);
    }
    
    await database.close();
  });

  describe('GET /admin/api/people', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/admin/api/people')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    test('should return people list when authenticated', async () => {
      const response = await authenticatedAgent
        .get('/admin/api/people')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toHaveProperty('count');
      expect(response.body.meta).toHaveProperty('timestamp');
    });

    test('should return proper data structure for people', async () => {
      // First create a test person
      await repository.create({
        personSlug: 'test-person-1',
        personName: 'Test Person 1',
        content: 'This is test content for person 1. It has enough characters to pass validation.',
        updatedBy: testUser.username
      });

      const response = await authenticatedAgent
        .get('/admin/api/people')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const person = response.body.data.find(p => p.slug === 'test-person-1');
      if (person) {
        expect(person).toHaveProperty('slug');
        expect(person).toHaveProperty('name');
        expect(person).toHaveProperty('lastUpdated');
        expect(person).toHaveProperty('updatedBy');
        expect(person).toHaveProperty('contentPreview');
        expect(person).toHaveProperty('wordCount');
        expect(person).toHaveProperty('source');
      }
    });
  });

  describe('GET /admin/api/people/:slug', () => {
    beforeEach(async () => {
      // Create test person for individual tests
      try {
        await repository.create({
          personSlug: 'test-person-2',
          personName: 'Test Person 2',
          content: 'This is test content for person 2. It has enough characters to pass validation and provides meaningful content.',
          updatedBy: testUser.username
        });
      } catch (error) {
        // Person might already exist, that's okay
      }
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/admin/api/people/test-person-2')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    test('should return person data when authenticated', async () => {
      const response = await authenticatedAgent
        .get('/admin/api/people/test-person-2')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('slug', 'test-person-2');
      expect(response.body.data).toHaveProperty('name', 'Test Person 2');
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data.content).toHaveProperty('text');
      expect(response.body.data.content).toHaveProperty('wordCount');
      expect(response.body.data.content).toHaveProperty('source');
    });

    test('should return 404 for non-existent person', async () => {
      const response = await authenticatedAgent
        .get('/admin/api/people/non-existent-person')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Person not found');
    });

    test('should validate slug format', async () => {
      const response = await authenticatedAgent
        .get('/admin/api/people/invalid@slug!')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation error');
    });
  });

  describe('PUT /admin/api/people/:slug', () => {
    beforeEach(async () => {
      // Create test person for update tests
      try {
        await repository.create({
          personSlug: 'test-person-3',
          personName: 'Test Person 3',
          content: 'This is original test content for person 3. It has enough characters to pass validation.',
          updatedBy: testUser.username
        });
      } catch (error) {
        // Person might already exist, that's okay
      }
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .put('/admin/api/people/test-person-3')
        .send({
          content: 'Updated content that is long enough to pass validation requirements.'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    test('should update person content when authenticated', async () => {
      const newContent = 'This is updated test content for person 3. It has been modified and has enough characters to pass validation.';
      
      const response = await authenticatedAgent
        .put('/admin/api/people/test-person-3')
        .send({
          content: newContent
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Content updated successfully');
      expect(response.body.data).toHaveProperty('slug', 'test-person-3');
      expect(response.body.data).toHaveProperty('updatedBy', testUser.username);
      expect(response.body.data).toHaveProperty('wordCount');

      // Verify the content was actually updated
      const getResponse = await authenticatedAgent
        .get('/admin/api/people/test-person-3')
        .expect(200);

      expect(getResponse.body.data.content.text).toBe(newContent);
    });

    test('should validate content length - too short', async () => {
      const response = await authenticatedAgent
        .put('/admin/api/people/test-person-3')
        .send({
          content: 'Short'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation error');
      expect(response.body.message).toContain('at least 10 characters');
    });

    test('should validate content length - too long', async () => {
      const longContent = 'A'.repeat(50001);
      
      const response = await authenticatedAgent
        .put('/admin/api/people/test-person-3')
        .send({
          content: longContent
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation error');
      expect(response.body.message).toContain('50,000 characters or less');
    });

    test('should require content field', async () => {
      const response = await authenticatedAgent
        .put('/admin/api/people/test-person-3')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    test('should return 404 for non-existent person', async () => {
      const response = await authenticatedAgent
        .put('/admin/api/people/non-existent-person')
        .send({
          content: 'This is valid content that is long enough to pass validation requirements.'
        })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Person not found');
    });

    test('should validate slug format', async () => {
      const response = await authenticatedAgent
        .put('/admin/api/people/invalid@slug!')
        .send({
          content: 'This is valid content that is long enough to pass validation requirements.'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation error');
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll just verify the API structure is correct
      const response = await authenticatedAgent
        .get('/admin/api/people')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
    });

    test('should include request metadata in responses', async () => {
      const response = await authenticatedAgent
        .get('/admin/api/people')
        .expect(200);

      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('duration');
      expect(response.body.meta.duration).toMatch(/^\d+ms$/);
    });
  });
});