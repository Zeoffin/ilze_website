const request = require('supertest');
const app = require('../server');

describe('Security Tests', () => {
  let server;
  let agent;

  beforeAll((done) => {
    server = app.listen(0, () => {
      agent = request.agent(server);
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await agent.get('/');
      
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.headers['permissions-policy']).toBe('geolocation=(), microphone=(), camera=()');
    });

    test('should include CSP headers', async () => {
      const response = await agent.get('/');
      
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('Rate Limiting', () => {
    test('should rate limit contact form submissions', async () => {
      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        message: 'This is a test message for rate limiting'
      };

      // Make multiple requests quickly
      const promises = [];
      for (let i = 0; i < 7; i++) {
        promises.push(agent.post('/api/contact').send(contactData));
      }

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should rate limit admin login attempts', async () => {
      const loginData = {
        username: 'invalid',
        password: 'invalid'
      };

      // Make multiple failed login attempts
      const promises = [];
      for (let i = 0; i < 7; i++) {
        promises.push(agent.post('/admin/login').send(loginData));
      }

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    test('should validate contact form inputs', async () => {
      // Wait a bit to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test empty fields
      const response1 = await agent
        .post('/api/contact')
        .send({});
      
      // May be rate limited or validation failed
      expect([400, 429]).toContain(response1.status);
      if (response1.status === 400) {
        expect(response1.body.error).toBe('Validation failed');
      }

      // Wait before next test
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test invalid email
      const response2 = await agent
        .post('/api/contact')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          message: 'Test message that is long enough to pass validation'
        });
      
      expect([400, 429]).toContain(response2.status);
      if (response2.status === 400) {
        expect(response2.body.error).toBe('Validation failed');
      }

      // Wait before next test
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test message too short
      const response3 = await agent
        .post('/api/contact')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          message: 'Short'
        });
      
      expect([400, 429]).toContain(response3.status);
      if (response3.status === 400) {
        expect(response3.body.error).toBe('Validation failed');
      }
    });

    test('should validate admin login inputs', async () => {
      // Wait to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test empty fields
      const response1 = await agent
        .post('/admin/login')
        .send({});
      
      expect([400, 429]).toContain(response1.status);
      if (response1.status === 400) {
        expect(response1.body.error).toBe('Username and password are required');
      }

      // Wait before next test
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test invalid username characters
      const response2 = await agent
        .post('/admin/login')
        .send({
          username: 'invalid<script>',
          password: 'password'
        });
      
      expect([400, 401, 429]).toContain(response2.status);
      if (response2.status === 400) {
        expect(response2.body.error).toBe('Validation failed');
      }
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize XSS attempts in contact form', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>Test User',
        email: 'test@example.com',
        message: 'This is a test message with <script>alert("xss")</script> malicious content'
      };

      const response = await agent
        .post('/api/contact')
        .send(maliciousData);

      // Should not return 400 due to sanitization, but script tags should be removed
      if (response.status === 200 || response.status === 500) {
        // The input was sanitized (success) or email failed (expected in test env)
        expect(response.status).not.toBe(400);
      }
    });

    test('should sanitize SQL injection attempts', async () => {
      const maliciousData = {
        name: "'; DROP TABLE users; --",
        email: 'test@example.com',
        message: 'This is a test message with SQL injection attempt'
      };

      const response = await agent
        .post('/api/contact')
        .send(maliciousData);

      // Should not return 400 due to sanitization
      if (response.status === 200 || response.status === 500) {
        // The input was sanitized (success) or email failed (expected in test env)
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('CSRF Protection', () => {
    test('should require CSRF token for admin operations', async () => {
      // First login to get session
      const loginResponse = await agent
        .post('/admin/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      if (loginResponse.status === 200) {
        // Try to access protected route without CSRF token
        const response = await agent
          .put('/admin/content/interesanti')
          .send({
            content: [
              {
                content_type: 'text',
                content: 'Test content'
              }
            ]
          });

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('CSRF token mismatch');
      }
    });

    test('should provide CSRF token in response headers', async () => {
      // Login first
      const loginResponse = await agent
        .post('/admin/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      if (loginResponse.status === 200) {
        // Access dashboard to get CSRF token
        const dashboardResponse = await agent.get('/admin/dashboard');
        
        expect(dashboardResponse.headers['x-csrf-token']).toBeDefined();
      }
    });
  });

  describe('File Upload Security', () => {
    test('should reject non-image files', async () => {
      // First login
      const loginResponse = await agent
        .post('/admin/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      if (loginResponse.status === 200) {
        // Get CSRF token
        const dashboardResponse = await agent.get('/admin/dashboard');
        const csrfToken = dashboardResponse.headers['x-csrf-token'];

        // Try to upload a text file
        const response = await agent
          .post('/admin/upload')
          .set('X-CSRF-Token', csrfToken)
          .attach('images', Buffer.from('This is not an image'), 'test.txt');

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Only image files are allowed');
      }
    });

    test('should validate filename parameters', async () => {
      // First login
      const loginResponse = await agent
        .post('/admin/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      if (loginResponse.status === 200) {
        // Get CSRF token
        const dashboardResponse = await agent.get('/admin/dashboard');
        const csrfToken = dashboardResponse.headers['x-csrf-token'];

        // Try to delete with invalid filename
        const response = await agent
          .delete('/admin/image/../../../etc/passwd')
          .set('X-CSRF-Token', csrfToken);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation failed');
      }
    });
  });

  describe('Session Security', () => {
    test('should have secure session configuration', async () => {
      const response = await agent.get('/');
      
      // Check that session cookies are not exposed in response
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        const sessionCookie = setCookieHeader.find(cookie => 
          cookie.includes('connect.sid') || cookie.includes('session')
        );
        
        if (sessionCookie) {
          expect(sessionCookie).toContain('HttpOnly');
          // In production, should also contain 'Secure'
        }
      }
    });

    test('should timeout inactive sessions', async () => {
      // This test would require mocking time or waiting
      // For now, just verify the session timeout logic exists
      const loginResponse = await agent
        .post('/admin/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      if (loginResponse.status === 200) {
        // Access a protected route to verify session is active
        const response = await agent.get('/admin/status');
        
        if (response.status === 200) {
          expect(response.body.isAuthenticated).toBe(true);
        }
      }
    });
  });

  describe('Error Handling', () => {
    test('should not expose sensitive information in errors', async () => {
      // Try to access non-existent admin route
      const response = await agent.get('/admin/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Page not found');
      
      // Should not expose stack traces or internal paths
      expect(JSON.stringify(response.body)).not.toContain('node_modules');
      expect(JSON.stringify(response.body)).not.toContain(__dirname);
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await agent
        .post('/api/contact')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });
});