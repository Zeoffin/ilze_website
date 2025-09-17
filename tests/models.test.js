const { Content, AdminUser, ContactMessage, initializeDatabase, database } = require('../src/models');

describe('Database Models', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await database.close();
  });

  describe('Content Model', () => {
    test('should create and save content', async () => {
      const content = new Content({
        section: 'interesanti',
        content_type: 'text',
        content: 'Test content for interesanti section',
        order_index: 1
      });

      const errors = content.validate();
      expect(errors).toHaveLength(0);

      await content.save();
      expect(content.id).toBeDefined();
    });

    test('should find content by section', async () => {
      const contents = await Content.findBySection('interesanti');
      expect(Array.isArray(contents)).toBe(true);
    });

    test('should validate content data', () => {
      const content = new Content({
        section: 'invalid',
        content_type: 'invalid',
        content: ''
      });

      const errors = content.validate();
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('AdminUser Model', () => {
    test('should create admin user with hashed password', async () => {
      const admin = new AdminUser({
        username: 'testadmin',
        email: 'test@example.com'
      });

      await admin.setPassword('testpassword');
      
      const errors = admin.validate();
      expect(errors).toHaveLength(0);

      await admin.save();
      expect(admin.id).toBeDefined();
      expect(admin.password_hash).toBeDefined();
    });

    test('should authenticate user with correct password', async () => {
      const admin = await AdminUser.findByUsername('testadmin');
      expect(admin).toBeTruthy();
      
      const isValid = await admin.verifyPassword('testpassword');
      expect(isValid).toBe(true);
      
      const isInvalid = await admin.verifyPassword('wrongpassword');
      expect(isInvalid).toBe(false);
    });

    test('should validate username format', () => {
      const admin = new AdminUser({
        username: 'ab', // too short
        email: 'invalid-email'
      });

      const errors = admin.validate();
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ContactMessage Model', () => {
    test('should create and save contact message', async () => {
      const message = new ContactMessage({
        name: 'Test User',
        email: 'user@example.com',
        message: 'This is a test message'
      });

      const errors = message.validate();
      expect(errors).toHaveLength(0);

      await message.save();
      expect(message.id).toBeDefined();
      expect(message.submitted_at).toBeDefined();
    });

    test('should find messages by status', async () => {
      const messages = await ContactMessage.findByStatus('sent');
      expect(Array.isArray(messages)).toBe(true);
    });

    test('should validate required fields', () => {
      const message = new ContactMessage({
        name: '',
        email: 'invalid-email',
        message: ''
      });

      const errors = message.validate();
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});