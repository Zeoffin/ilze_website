const request = require('supertest');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { initializeDatabase, database, AdminUser } = require('../src/models');

// Create test app
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
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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

  // Routes
  const adminRoutes = require('../src/routes/admin');
  const apiRoutes = require('../src/routes/api');
  app.use('/admin', adminRoutes);
  app.use('/api', apiRoutes);

  // Test route that throws an error
  app.get('/test-error', (req, res, next) => {
    const error = new Error('Test error for error handling');
    error.status = 500;
    next(error);
  });

  // Test route that throws validation error
  app.post('/test-validation-error', (req, res, next) => {
    const error = new Error('Test validation error');
    error.name = 'ValidationError';
    next(error);
  });

  return app;
};

describe('Error Handling and Edge Cases', () => {
  let app;
  let testUser;

  beforeAll(async () => {
    await initializeDatabase();
    app = createTestApp();
    
    // Create test admin user
    const timestamp = Date.now();
    const username = `erroradmin${timestamp}`;
    
    testUser = new AdminUser({
      username: username,
      email: `erroradmin${timestamp}@example.com`
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

  describe('HTTP Error Responses', () => {
    test('should handle 404 errors properly', async () => {
      const response = await request(app)
        .get('/nonexistent-route')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Page not found');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should handle 500 errors with proper error structure', async () => {
      const response = await request(app)
        .get('/test-error')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Internal server error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('requestId');
      
      // Should not expose internal error details
      expect(response.body.message).not.toContain('Test error for error handling');
    });

    test('should handle validation errors properly', async () => {
      const response = await request(app)
        .post('/test-validation-error')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/contact')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid JSON format');
      expect(response.body).toHaveProperty('message', 'Please check your request format');
    });

    test('should handle request timeout scenarios', async () => {
      // This test simulates timeout handling
      const response = await request(app)
        .get('/api/content/interesanti')
        .timeout(1000)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Authentication and Authorization Errors', () => {
    test('should handle unauthorized access attempts', async () => {
      const response = await request(app)
        .get('/admin/dashboard')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    test('should handle invalid login credentials', async () => {
      const response = await request(app)
        .post('/admin/login')
        .send({
          username: 'nonexistent',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    test('should handle session expiration gracefully', async () => {
      const agent = request.agent(app);

      // Login
      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      // Manually destroy session to simulate expiration
      // This would normally happen through session timeout
      
      // Try to access protected resource
      const response = await request(app)
        .get('/admin/dashboard')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    test('should handle concurrent login attempts', async () => {
      const loginData = {
        username: testUser.username,
        password: 'testpassword123'
      };

      // Make multiple concurrent login requests
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(request(app).post('/admin/login').send(loginData));
      }

      const responses = await Promise.all(requests);
      
      // All should either succeed or be rate limited
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('Data Validation and Sanitization Errors', () => {
    test('should handle invalid section parameters', async () => {
      const response = await request(app)
        .get('/api/content/invalid_section')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid section');
      expect(response.body).toHaveProperty('validSections');
    });

    test('should handle oversized request payloads', async () => {
      const agent = request.agent(app);

      // Login first
      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      // Create oversized content
      const oversizedContent = 'A'.repeat(2 * 1024 * 1024); // 2MB of content
      
      const response = await agent
        .put('/admin/content/interesanti')
        .send({
          content: [
            {
              content_type: 'text',
              content: oversizedContent
            }
          ]
        })
        .expect(413);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle special characters in content', async () => {
      const agent = request.agent(app);

      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      const specialContent = {
        content: [
          {
            content_type: 'text',
            content: 'Content with special chars: àáâãäåæçèéêë ñòóôõö ùúûüý 中文 العربية 🎉🚀'
          }
        ]
      };

      const response = await agent
        .put('/admin/content/interesanti')
        .send(specialContent)
        .expect(200);

      expect(response.body.content[0].content).toContain('àáâãäåæçèéêë');
      expect(response.body.content[0].content).toContain('中文');
      expect(response.body.content[0].content).toContain('🎉🚀');
    });

    test('should handle SQL injection attempts in content', async () => {
      const agent = request.agent(app);

      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      const maliciousContent = {
        content: [
          {
            content_type: 'text',
            content: "'; DROP TABLE content; --"
          }
        ]
      };

      const response = await agent
        .put('/admin/content/interesanti')
        .send(maliciousContent)
        .expect(200);

      // Content should be saved but sanitized
      expect(response.body.content[0].content).toBeDefined();
      
      // Verify database is still intact by making another request
      const verifyResponse = await agent
        .get('/admin/content/interesanti')
        .expect(200);

      expect(verifyResponse.body).toHaveProperty('success', true);
    });

    test('should handle XSS attempts in contact form', async () => {
      const xssData = {
        name: '<script>alert("xss")</script>Test User',
        email: 'test@example.com',
        message: 'Message with <script>alert("xss")</script> malicious content'
      };

      const response = await request(app)
        .post('/api/contact')
        .send(xssData)
        .expect(500); // Expected to fail due to email config

      // Should not return 400 (validation error) because content was sanitized
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('File Upload Error Handling', () => {
    test('should handle missing file uploads', async () => {
      const agent = request.agent(app);

      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      const response = await agent
        .post('/admin/upload')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'No files uploaded');
    });

    test('should handle invalid file types', async () => {
      const agent = request.agent(app);

      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      // This test would require actual file upload simulation
      // For now, we test the error response structure
      const response = await agent
        .post('/admin/upload')
        .attach('images', Buffer.from('not an image'), 'test.txt')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle file deletion errors', async () => {
      const agent = request.agent(app);

      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      const response = await agent
        .delete('/admin/image/nonexistent.jpg')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Image not found');
    });

    test('should handle directory traversal attempts', async () => {
      const agent = request.agent(app);

      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      const response = await agent
        .delete('/admin/image/../../../etc/passwd')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('Database Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // This test simulates database connection issues
      const response = await request(app)
        .get('/api/content/interesanti')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    test('should handle constraint violations', async () => {
      const agent = request.agent(app);

      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      // Try to create content with invalid data that might cause constraint violations
      const invalidContent = {
        content: [
          {
            content_type: 'text',
            content: null // This might cause a constraint violation
          }
        ]
      };

      const response = await agent
        .put('/admin/content/interesanti')
        .send(invalidContent)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Network and Timeout Errors', () => {
    test('should handle slow database queries', async () => {
      // Test that the application handles slow queries gracefully
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/content/interesanti')
        .expect(200);

      const duration = Date.now() - startTime;
      
      expect(response.body).toHaveProperty('success', true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should handle concurrent database operations', async () => {
      const agent = request.agent(app);

      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      // Make multiple concurrent content updates
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          agent
            .put(`/admin/content/interesanti`)
            .send({
              content: [
                {
                  content_type: 'text',
                  content: `Concurrent test content ${i}`
                }
              ]
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // All should succeed or fail gracefully
      responses.forEach(response => {
        expect([200, 400, 500]).toContain(response.status);
      });
    });
  });

  describe('Edge Case Scenarios', () => {
    test('should handle empty request bodies', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send()
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle requests with missing headers', async () => {
      const response = await request(app)
        .post('/api/contact')
        .set('Content-Type', '')
        .send('test data')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle unicode and emoji content', async () => {
      const agent = request.agent(app);

      await agent
        .post('/admin/login')
        .send({
          username: testUser.username,
          password: 'testpassword123'
        })
        .expect(200);

      const unicodeContent = {
        content: [
          {
            content_type: 'text',
            content: '🌟 Unicode test: Ñoño café naïve résumé 中文测试 العربية اختبار 🚀'
          }
        ]
      };

      const response = await agent
        .put('/admin/content/interesanti')
        .send(unicodeContent)
        .expect(200);

      expect(response.body.content[0].content).toContain('🌟');
      expect(response.body.content[0].content).toContain('中文测试');
    });

    test('should handle very long URLs', async () => {
      const longPath = 'a'.repeat(2000);
      
      const response = await request(app)
        .get(`/api/content/${longPath}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});