const request = require('supertest');
const app = require('../server');
const { initializeDatabase } = require('../src/models');
const fs = require('fs');
const path = require('path');

describe('Complete User Workflow Integration Tests', () => {
    let server;
    let agent;

    beforeAll(async () => {
        // Initialize test database
        await initializeDatabase();
        
        // Create supertest agent for session persistence
        agent = request.agent(app);
    });

    afterAll(async () => {
        if (server) {
            server.close();
        }
    });

    describe('Complete Admin Workflow', () => {
        test('Admin can login, manage content, and logout', async () => {
            // 1. Admin login
            const loginResponse = await agent
                .post('/admin/login')
                .send({
                    username: 'admin',
                    password: 'admin123'
                });
            
            expect(loginResponse.status).toBe(302);
            expect(loginResponse.headers.location).toBe('/admin/dashboard');

            // 2. Access admin dashboard
            const dashboardResponse = await agent
                .get('/admin/dashboard');
            
            expect(dashboardResponse.status).toBe(200);

            // 3. Create new content
            const createContentResponse = await agent
                .post('/api/content')
                .send({
                    title: 'Integration Test Book',
                    description: 'A test book for integration testing',
                    type: 'book',
                    content: 'This is test content for integration testing.',
                    published: true
                });
            
            expect(createContentResponse.status).toBe(201);
            expect(createContentResponse.body.title).toBe('Integration Test Book');
            
            const contentId = createContentResponse.body.id;

            // 4. Update the content
            const updateResponse = await agent
                .put(`/api/content/${contentId}`)
                .send({
                    title: 'Updated Integration Test Book',
                    description: 'Updated description',
                    content: 'Updated content for testing.'
                });
            
            expect(updateResponse.status).toBe(200);
            expect(updateResponse.body.title).toBe('Updated Integration Test Book');

            // 5. Verify content appears in public API
            const publicResponse = await request(app)
                .get('/api/content');
            
            expect(publicResponse.status).toBe(200);
            const updatedContent = publicResponse.body.find(item => item.id === contentId);
            expect(updatedContent.title).toBe('Updated Integration Test Book');

            // 6. Delete the content
            const deleteResponse = await agent
                .delete(`/api/content/${contentId}`);
            
            expect(deleteResponse.status).toBe(200);

            // 7. Verify content is deleted
            const verifyDeleteResponse = await request(app)
                .get('/api/content');
            
            const deletedContent = verifyDeleteResponse.body.find(item => item.id === contentId);
            expect(deletedContent).toBeUndefined();

            // 8. Admin logout
            const logoutResponse = await agent
                .post('/admin/logout');
            
            expect(logoutResponse.status).toBe(302);
            expect(logoutResponse.headers.location).toBe('/');
        });

        test('Image upload and management workflow', async () => {
            // Login first
            await agent
                .post('/admin/login')
                .send({
                    username: 'admin',
                    password: 'admin123'
                });

            // Create a test image buffer
            const testImageBuffer = Buffer.from('fake-image-data');
            
            // Upload image
            const uploadResponse = await agent
                .post('/api/upload')
                .attach('image', testImageBuffer, 'test-image.jpg');
            
            expect(uploadResponse.status).toBe(200);
            expect(uploadResponse.body.filename).toMatch(/test-image.*\.jpg$/);
            
            const filename = uploadResponse.body.filename;

            // Verify image can be accessed
            const imageResponse = await request(app)
                .get(`/uploads/${filename}`);
            
            expect(imageResponse.status).toBe(200);

            // Delete image
            const deleteResponse = await agent
                .delete(`/api/upload/${filename}`);
            
            expect(deleteResponse.status).toBe(200);
        });
    });

    describe('Public User Workflow', () => {
        test('User can browse content and send contact message', async () => {
            // 1. Access main page
            const homeResponse = await request(app)
                .get('/');
            
            expect(homeResponse.status).toBe(200);

            // 2. Get public content
            const contentResponse = await request(app)
                .get('/api/content');
            
            expect(contentResponse.status).toBe(200);
            expect(Array.isArray(contentResponse.body)).toBe(true);

            // 3. Send contact message
            const contactResponse = await request(app)
                .post('/api/contact')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    message: 'This is a test message from integration testing.'
                });
            
            expect(contactResponse.status).toBe(200);
            expect(contactResponse.body.message).toBe('Message sent successfully');
        });

        test('User can view individual content items', async () => {
            // First create content as admin
            await agent
                .post('/admin/login')
                .send({
                    username: 'admin',
                    password: 'admin123'
                });

            const createResponse = await agent
                .post('/api/content')
                .send({
                    title: 'Public View Test',
                    description: 'Test content for public viewing',
                    type: 'book',
                    content: 'Content for public viewing test.',
                    published: true
                });
            
            const contentId = createResponse.body.id;

            // Now test public access
            const publicViewResponse = await request(app)
                .get(`/api/content/${contentId}`);
            
            expect(publicViewResponse.status).toBe(200);
            expect(publicViewResponse.body.title).toBe('Public View Test');

            // Cleanup
            await agent
                .delete(`/api/content/${contentId}`);
        });
    });

    describe('Error Handling and Security', () => {
        test('Unauthorized access is properly blocked', async () => {
            // Try to access admin dashboard without login
            const unauthorizedResponse = await request(app)
                .get('/admin/dashboard');
            
            expect(unauthorizedResponse.status).toBe(302);
            expect(unauthorizedResponse.headers.location).toBe('/admin/login');

            // Try to create content without authentication
            const unauthorizedCreateResponse = await request(app)
                .post('/api/content')
                .send({
                    title: 'Unauthorized Content',
                    description: 'This should fail'
                });
            
            expect(unauthorizedCreateResponse.status).toBe(401);
        });

        test('Input validation works correctly', async () => {
            // Test invalid contact form data
            const invalidContactResponse = await request(app)
                .post('/api/contact')
                .send({
                    name: '',
                    email: 'invalid-email',
                    message: ''
                });
            
            expect(invalidContactResponse.status).toBe(400);
            expect(invalidContactResponse.body.errors).toBeDefined();
        });

        test('Rate limiting is functional', async () => {
            // This test would need to be adjusted based on actual rate limits
            // For now, just verify the middleware is in place
            const response = await request(app)
                .get('/api/content');
            
            expect(response.headers['x-ratelimit-limit']).toBeDefined();
        });
    });

    describe('Performance and Accessibility', () => {
        test('Static files are served correctly', async () => {
            const cssResponse = await request(app)
                .get('/css/style.css');
            
            expect(cssResponse.status).toBe(200);
            expect(cssResponse.headers['content-type']).toMatch(/text\/css/);

            const jsResponse = await request(app)
                .get('/js/main.js');
            
            expect(jsResponse.status).toBe(200);
            expect(jsResponse.headers['content-type']).toMatch(/application\/javascript/);
        });

        test('Security headers are present', async () => {
            const response = await request(app)
                .get('/');
            
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-xss-protection']).toBe('1; mode=block');
            expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
        });
    });
});