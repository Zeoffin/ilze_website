const request = require('supertest');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const { initializeDatabase, database, ContactMessage } = require('../src/models');

// Mock nodemailer
jest.mock('nodemailer');

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

  // Routes
  const apiRoutes = require('../src/routes/api');
  app.use('/api', apiRoutes);

  return app;
};

describe('Email Functionality', () => {
  let app;
  let mockTransporter;
  let mockSendMail;

  beforeAll(async () => {
    await initializeDatabase();
    app = createTestApp();
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup nodemailer mock
    mockSendMail = jest.fn();
    mockTransporter = {
      sendMail: mockSendMail
    };
    nodemailer.createTransporter = jest.fn().mockReturnValue(mockTransporter);
  });

  afterAll(async () => {
    await database.close();
  });

  describe('Contact Form Email Sending', () => {
    test('should send email successfully with valid data', async () => {
      // Mock successful email sending
      mockSendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: '250 OK'
      });

      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'This is a test message from the contact form.'
      };

      const response = await request(app)
        .post('/api/contact')
        .send(contactData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Your message has been sent successfully!');

      // Verify email was sent
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall).toHaveProperty('to', process.env.EMAIL_USER);
      expect(emailCall).toHaveProperty('subject', 'New Contact Form Message from John Doe');
      expect(emailCall.html).toContain('John Doe');
      expect(emailCall.html).toContain('john@example.com');
      expect(emailCall.html).toContain('This is a test message from the contact form.');

      // Verify message was saved to database with correct status
      const messages = await ContactMessage.findByEmail('john@example.com');
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].status).toBe('sent');
    });

    test('should handle email sending failure gracefully', async () => {
      // Mock email sending failure
      mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));

      const contactData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        message: 'This message should fail to send via email.'
      };

      const response = await request(app)
        .post('/api/contact')
        .send(contactData)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to send email');
      expect(response.body.message).toContain('We received your message but could not send the email notification');

      // Verify message was still saved to database with failed status
      const messages = await ContactMessage.findByEmail('jane@example.com');
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].status).toBe('failed');
    });

    test('should retry email sending on failure', async () => {
      // Mock first two attempts to fail, third to succeed
      mockSendMail
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Another temporary failure'))
        .mockResolvedValueOnce({
          messageId: 'retry-success-id',
          response: '250 OK'
        });

      const contactData = {
        name: 'Retry Test',
        email: 'retry@example.com',
        message: 'This should succeed after retries.'
      };

      const response = await request(app)
        .post('/api/contact')
        .send(contactData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      
      // Verify email was attempted 3 times
      expect(mockSendMail).toHaveBeenCalledTimes(3);

      // Verify final status is sent
      const messages = await ContactMessage.findByEmail('retry@example.com');
      expect(messages[0].status).toBe('sent');
    });

    test('should handle email timeout', async () => {
      // Mock email sending to timeout
      mockSendMail.mockImplementation(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Email send timeout')), 15000);
        });
      });

      const contactData = {
        name: 'Timeout Test',
        email: 'timeout@example.com',
        message: 'This should timeout.'
      };

      const response = await request(app)
        .post('/api/contact')
        .send(contactData)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to send email');

      // Verify message was saved with failed status
      const messages = await ContactMessage.findByEmail('timeout@example.com');
      expect(messages[0].status).toBe('failed');
    }, 20000); // Increase timeout for this test

    test('should include proper email headers and formatting', async () => {
      mockSendMail.mockResolvedValue({
        messageId: 'format-test-id',
        response: '250 OK'
      });

      const contactData = {
        name: 'Format Test User',
        email: 'format@example.com',
        message: 'This is a test message with\nmultiple lines\nfor formatting.'
      };

      await request(app)
        .post('/api/contact')
        .send(contactData)
        .expect(200);

      const emailCall = mockSendMail.mock.calls[0][0];
      
      // Check email structure
      expect(emailCall).toHaveProperty('from', process.env.EMAIL_FROM);
      expect(emailCall).toHaveProperty('to', process.env.EMAIL_USER);
      expect(emailCall).toHaveProperty('subject');
      expect(emailCall).toHaveProperty('html');
      expect(emailCall).toHaveProperty('text');

      // Check HTML formatting
      expect(emailCall.html).toContain('<h3>New Contact Form Submission</h3>');
      expect(emailCall.html).toContain('<strong>Name:</strong>');
      expect(emailCall.html).toContain('<strong>Email:</strong>');
      expect(emailCall.html).toContain('<strong>Message:</strong>');
      expect(emailCall.html).toContain('<br>'); // Line breaks should be converted

      // Check text version
      expect(emailCall.text).toContain('New Contact Form Submission');
      expect(emailCall.text).toContain('Name: Format Test User');
      expect(emailCall.text).toContain('Email: format@example.com');
    });

    test('should sanitize email content to prevent injection', async () => {
      mockSendMail.mockResolvedValue({
        messageId: 'sanitize-test-id',
        response: '250 OK'
      });

      const maliciousData = {
        name: '<script>alert("xss")</script>Malicious User',
        email: 'malicious@example.com',
        message: 'This contains <script>alert("xss")</script> malicious content.'
      };

      await request(app)
        .post('/api/contact')
        .send(maliciousData)
        .expect(200);

      const emailCall = mockSendMail.mock.calls[0][0];
      
      // Script tags should be removed from email content
      expect(emailCall.html).not.toContain('<script>');
      expect(emailCall.text).not.toContain('<script>');
      
      // But safe content should remain
      expect(emailCall.html).toContain('Malicious User');
      expect(emailCall.html).toContain('malicious content');
    });
  });

  describe('Email Configuration and Error Handling', () => {
    test('should handle missing email configuration gracefully', async () => {
      // Temporarily remove email config
      const originalHost = process.env.EMAIL_HOST;
      delete process.env.EMAIL_HOST;

      const contactData = {
        name: 'Config Test',
        email: 'config@example.com',
        message: 'Testing missing email config.'
      };

      const response = await request(app)
        .post('/api/contact')
        .send(contactData)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to send email');

      // Restore config
      process.env.EMAIL_HOST = originalHost;
    });

    test('should validate email transporter creation', async () => {
      // Mock transporter creation to fail
      nodemailer.createTransporter = jest.fn().mockImplementation(() => {
        throw new Error('Invalid email configuration');
      });

      const contactData = {
        name: 'Transporter Test',
        email: 'transporter@example.com',
        message: 'Testing transporter creation failure.'
      };

      const response = await request(app)
        .post('/api/contact')
        .send(contactData)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to send email');
    });

    test('should handle various SMTP errors', async () => {
      const smtpErrors = [
        new Error('ECONNREFUSED'),
        new Error('ETIMEDOUT'),
        new Error('Authentication failed'),
        new Error('Recipient rejected'),
        new Error('Message too large')
      ];

      for (let i = 0; i < smtpErrors.length; i++) {
        mockSendMail.mockRejectedValue(smtpErrors[i]);

        const contactData = {
          name: `SMTP Error Test ${i}`,
          email: `smtp${i}@example.com`,
          message: `Testing SMTP error: ${smtpErrors[i].message}`
        };

        const response = await request(app)
          .post('/api/contact')
          .send(contactData)
          .expect(500);

        expect(response.body).toHaveProperty('error', 'Failed to send email');

        // Verify message was saved with failed status
        const messages = await ContactMessage.findByEmail(`smtp${i}@example.com`);
        expect(messages[0].status).toBe('failed');
      }
    });
  });

  describe('Email Rate Limiting', () => {
    test('should respect rate limiting for email sending', async () => {
      mockSendMail.mockResolvedValue({
        messageId: 'rate-limit-test',
        response: '250 OK'
      });

      const contactData = {
        name: 'Rate Limit Test',
        email: 'ratelimit@example.com',
        message: 'Testing rate limiting for email sending.'
      };

      // Send multiple requests quickly
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/contact')
            .send({
              ...contactData,
              email: `ratelimit${i}@example.com`
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const successfulResponses = responses.filter(r => r.status === 200);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      expect(successfulResponses.length).toBeLessThan(10);
    });
  });

  describe('Database Integration', () => {
    test('should save contact messages with correct timestamps', async () => {
      mockSendMail.mockResolvedValue({
        messageId: 'timestamp-test',
        response: '250 OK'
      });

      const beforeTime = new Date();
      
      const contactData = {
        name: 'Timestamp Test',
        email: 'timestamp@example.com',
        message: 'Testing timestamp functionality.'
      };

      await request(app)
        .post('/api/contact')
        .send(contactData)
        .expect(200);

      const afterTime = new Date();
      
      const messages = await ContactMessage.findByEmail('timestamp@example.com');
      const message = messages[0];
      
      expect(message.submitted_at).toBeDefined();
      const submittedTime = new Date(message.submitted_at);
      expect(submittedTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(submittedTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    test('should handle database errors during message saving', async () => {
      // Mock database error
      const originalSave = ContactMessage.prototype.save;
      ContactMessage.prototype.save = jest.fn().mockRejectedValue(new Error('Database error'));

      const contactData = {
        name: 'DB Error Test',
        email: 'dberror@example.com',
        message: 'Testing database error handling.'
      };

      const response = await request(app)
        .post('/api/contact')
        .send(contactData)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Internal server error');

      // Restore original method
      ContactMessage.prototype.save = originalSave;
    });
  });
});