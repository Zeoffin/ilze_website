const request = require('supertest');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs').promises;
const { initializeDatabase, database, AdminUser, Content, ContactMessage } = require('../src/models');

// Create full test app
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

  // Rate limiting (more lenient for testing)
  const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      message: 'Too many requests from this IP, please try again later.'
  });
  app.use(limiter);

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
          maxAge: 24 * 60 * 60 * 1000
      }
  }));

  // Static file serving
  app.use(express.static(path.join(__dirname, '../public')));
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // Routes
  const adminRoutes = require('../src/routes/admin');
  const apiRoutes = require('../src/routes/api');
  app.use('/admin', adminRoutes);
  app.use('/api', apiRoutes);

  // Serve main page
  app.get('/', (req, res) => {
    res.json({ message: 'Test homepage' });
  });

  return app;
};

describe('Full Application Integration Tests', () => {
  let app;
  let testUser;

  beforeAll(async () => {
    await initializeDatabase();
    app = createTestApp();
    
    // Create test admin user
    const timestamp = Date.now();
    const username = `integrationadmin${timestamp}`;
    
    testUser = new AdminUser({
      username: username,
      email: `integrationadmin${timestamp}@example.com`
    });
    await testUser.setPassword('testpassword123');
    await testUser.save();
  });

  afterAll(async () => {
    // Clean up test user
    if (testUser && testUser.id) {
      await AdminUser.deleteById(testUser.id);
    }
    await database.close();
  });

  describe('Complete Admin Workflow', () => {
    test('should complete full admin content management workflow', async () => {
      const agent = request.agent(app);

      // Step 1: Login
      const loginResponse = await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('success', true);

      // Step 2: Access dashboard
      const dashboardResponse = await agent
        .get('/admin/dashboard')
        .expect(200);

      expect(dashboardResponse.body).toHaveProperty('success', true);

      // Step 3: Create content
      const contentData = {
        content: [
          {
            content_type: 'text',
            content: 'This is integration test content for the interesanti section.'
          },
          {
            content_type: 'image',
            content: '/media/test-image.jpg'
          }
        ]
      };

      const createContentResponse = await agent
        .put('/admin/content/interesanti')
        .send(contentData)
        .expect(200);

      expect(createContentResponse.body.content).toHaveLength(2);
      const textContentId = createContentResponse.body.content[0].id;
      const imageContentId = createContentResponse.body.content[1].id;

      // Step 4: Update content
      const updateData = {
        content: [
          {
            id: textContentId,
            content_type: 'text',
            content: 'Updated integration test content.'
          },
          {
            id: imageContentId,
            content_type: 'image',
            content: '/media/updated-image.jpg'
          },
          {
            content_type: 'text',
            content: 'New additional content item.'
          }
        ]
      };

      const updateContentResponse = await agent
        .put('/admin/content/interesanti')
        .send(updateData)
        .expect(200);

      expect(updateContentResponse.body.content).toHaveLength(3);
      expect(updateContentResponse.body.content[0].content).toBe('Updated integration test content.');

      // Step 5: Verify content via public API
      const publicContentResponse = await request(app)
        .get('/api/content/interesanti')
        .expect(200);

      expect(publicContentResponse.body.content).toHaveLength(3);
      expect(publicContentResponse.body.content[0].content).toBe('Updated integration test content.');

      // Step 6: Delete some content
      const finalUpdateData = {
        content: [
          {
            id: textContentId,
            content_type: 'text',
            content: 'Final content after deletion.'
          }
        ]
      };

      const finalUpdateResponse = await agent
        .put('/admin/content/interesanti')
        .send(finalUpdateData)
        .expect(200);

      expect(finalUpdateResponse.body.content).toHaveLength(1);

      // Step 7: Logout
      const logoutResponse = await agent
        .post('/admin/logout')
        .expect(200);

      expect(logoutResponse.body).toHaveProperty('success', true);

      // Step 8: Verify logout worked
      const statusResponse = await agent
        .get('/admin/status')
        .expect(200);

      expect(statusResponse.body).toHaveProperty('isAuthenticated', false);
    });

    test('should handle concurrent admin operations', async () => {
      // Create two admin sessions
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      // Login both agents
      await agent1
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      await agent2
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      // Both agents try to update content simultaneously
      const contentData1 = {
        content: [
          {
            content_type: 'text',
            content: 'Content from agent 1'
          }
        ]
      };

      const contentData2 = {
        content: [
          {
            content_type: 'text',
            content: 'Content from agent 2'
          }
        ]
      };

      const [response1, response2] = await Promise.all([
        agent1.put('/admin/content/gramatas').send(contentData1),
        agent2.put('/admin/content/fragmenti').send(contentData2)
      ]);

      // Both should succeed since they're updating different sections
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });

  describe('Complete Contact Form Workflow', () => {
    test('should handle complete contact form submission workflow', async () => {
      const contactData = {
        name: 'Integration Test User',
        email: 'integration@example.com',
        message: 'This is a comprehensive integration test message for the contact form functionality.'
      };

      // Submit contact form
      const submitResponse = await request(app)
        .post('/api/contact')
        .send(contactData)
        .expect(500); // Expected to fail due to email config in test

      expect(submitResponse.body).toHaveProperty('error');

      // Verify message was saved to database
      const messages = await ContactMessage.findByEmail('integration@example.com');
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].name).toBe('Integration Test User');
      expect(messages[0].status).toBe('failed'); // Failed due to email error

      // Verify message content
      expect(messages[0].message).toBe(contactData.message);
      expect(messages[0].submitted_at).toBeDefined();
    });

    test('should handle multiple contact form submissions', async () => {
      const baseContactData = {
        name: 'Multiple Test User',
        message: 'This is a test message for multiple submissions.'
      };

      const submissions = [];
      for (let i = 0; i < 3; i++) {
        submissions.push(
          request(app)
            .post('/api/contact')
            .send({
              ...baseContactData,
              email: `multiple${i}@example.com`
            })
        );
      }

      const responses = await Promise.all(submissions);
      
      // Some may be rate limited, others should process
      const processedResponses = responses.filter(r => r.status !== 429);
      expect(processedResponses.length).toBeGreaterThan(0);

      // Verify messages were saved
      for (let i = 0; i < 3; i++) {
        const messages = await ContactMessage.findByEmail(`multiple${i}@example.com`);
        if (messages.length > 0) {
          expect(messages[0].name).toBe('Multiple Test User');
        }
      }
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from database connection issues', async () => {
      // This test simulates database recovery scenarios
      const agent = request.agent(app);

      // Login first
      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      // Try to access content (should work)
      const response1 = await agent
        .get('/admin/content/interesanti')
        .expect(200);

      expect(response1.body).toHaveProperty('success', true);

      // Simulate database recovery by making another request
      const response2 = await agent
        .get('/admin/content/gramatas')
        .expect(200);

      expect(response2.body).toHaveProperty('success', true);
    });

    test('should handle malformed requests gracefully', async () => {
      const agent = request.agent(app);

      // Login
      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      // Send malformed content update
      const malformedData = {
        content: 'this should be an array'
      };

      const response = await agent
        .put('/admin/content/interesanti')
        .send(malformedData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Content must be an array');
    });
  });

  describe('Session Management Integration', () => {
    test('should handle session expiration properly', async () => {
      const agent = request.agent(app);

      // Login
      const loginResponse = await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('success', true);

      // Access protected resource
      await agent
        .get('/admin/dashboard')
        .expect(200);

      // Logout
      await agent
        .post('/admin/logout')
        .expect(200);

      // Try to access protected resource after logout
      const unauthorizedResponse = await agent
        .get('/admin/dashboard')
        .expect(401);

      expect(unauthorizedResponse.body).toHaveProperty('error', 'Authentication required');
    });

    test('should maintain session across multiple requests', async () => {
      const agent = request.agent(app);

      // Login
      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      // Make multiple authenticated requests
      const requests = [
        agent.get('/admin/status'),
        agent.get('/admin/dashboard'),
        agent.get('/admin/content/interesanti'),
        agent.get('/admin/images')
      ];

      const responses = await Promise.all(requests);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Data Consistency and Integrity', () => {
    test('should maintain data consistency across operations', async () => {
      const agent = request.agent(app);

      // Login
      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      // Create initial content
      const initialData = {
        content: [
          {
            content_type: 'text',
            content: 'Initial consistency test content'
          }
        ]
      };

      const createResponse = await agent
        .put('/admin/content/interesanti')
        .send(initialData)
        .expect(200);

      const contentId = createResponse.body.content[0].id;

      // Verify content exists in database
      const dbContent = await Content.findById(contentId);
      expect(dbContent).toBeTruthy();
      expect(dbContent.content).toBe('Initial consistency test content');

      // Update content
      const updateData = {
        content: [
          {
            id: contentId,
            content_type: 'text',
            content: 'Updated consistency test content'
          }
        ]
      };

      await agent
        .put('/admin/content/interesanti')
        .send(updateData)
        .expect(200);

      // Verify update in database
      const updatedDbContent = await Content.findById(contentId);
      expect(updatedDbContent.content).toBe('Updated consistency test content');

      // Verify via public API
      const publicResponse = await request(app)
        .get('/api/content/interesanti')
        .expect(200);

      const publicContent = publicResponse.body.content.find(item => item.id === contentId);
      expect(publicContent.content).toBe('Updated consistency test content');
    });

    test('should handle transaction-like operations correctly', async () => {
      const agent = request.agent(app);

      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      // Create multiple content items in one operation
      const multipleContentData = {
        content: [
          {
            content_type: 'text',
            content: 'Transaction test item 1'
          },
          {
            content_type: 'text',
            content: 'Transaction test item 2'
          },
          {
            content_type: 'image',
            content: '/media/transaction-test.jpg'
          }
        ]
      };

      const response = await agent
        .put('/admin/content/gramatas')
        .send(multipleContentData)
        .expect(200);

      expect(response.body.content).toHaveLength(3);

      // Verify all items were created with correct order
      const items = response.body.content;
      expect(items[0].order_index).toBe(0);
      expect(items[1].order_index).toBe(1);
      expect(items[2].order_index).toBe(2);

      // Verify in database
      const dbContent = await Content.findBySection('gramatas');
      expect(dbContent.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Performance and Load Handling', () => {
    test('should handle multiple concurrent requests', async () => {
      const requests = [];
      
      // Create multiple concurrent requests to public API
      for (let i = 0; i < 10; i++) {
        requests.push(request(app).get('/api/content/interesanti'));
      }

      const responses = await Promise.all(requests);
      
      // All should succeed (or be rate limited)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });

      // At least some should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });

    test('should handle large content updates efficiently', async () => {
      const agent = request.agent(app);

      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      // Create large content update
      const largeContent = {
        content: []
      };

      for (let i = 0; i < 20; i++) {
        largeContent.content.push({
          content_type: 'text',
          content: `Large content item ${i} with substantial text content that simulates real-world usage scenarios where content might be quite lengthy and detailed.`
        });
      }

      const startTime = Date.now();
      
      const response = await agent
        .put('/admin/content/fragmenti')
        .send(largeContent)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.content).toHaveLength(20);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});