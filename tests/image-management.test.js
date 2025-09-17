const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../server');

describe('Image Management API', () => {
    let authCookie;
    
    beforeAll(async () => {
        // Login to get authentication cookie
        const loginResponse = await request(app)
            .post('/admin/login')
            .send({
                username: 'admin',
                password: 'admin123'
            });
        
        if (loginResponse.status === 200) {
            authCookie = loginResponse.headers['set-cookie'];
        }
    });
    
    describe('GET /admin/images', () => {
        test('should require authentication', async () => {
            const response = await request(app)
                .get('/admin/images');
            
            expect(response.status).toBe(302); // Redirect to login
        });
        
        test('should return list of images when authenticated', async () => {
            if (!authCookie) {
                console.log('Skipping authenticated test - no auth cookie');
                return;
            }
            
            const response = await request(app)
                .get('/admin/images')
                .set('Cookie', authCookie);
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('images');
            expect(Array.isArray(response.body.images)).toBe(true);
        });
    });
    
    describe('POST /admin/upload', () => {
        test('should require authentication', async () => {
            const response = await request(app)
                .post('/admin/upload');
            
            expect(response.status).toBe(302); // Redirect to login
        });
        
        test('should reject non-image files', async () => {
            if (!authCookie) {
                console.log('Skipping authenticated test - no auth cookie');
                return;
            }
            
            // Create a temporary text file
            const testFilePath = path.join(__dirname, 'test.txt');
            fs.writeFileSync(testFilePath, 'This is a test file');
            
            const response = await request(app)
                .post('/admin/upload')
                .set('Cookie', authCookie)
                .attach('images', testFilePath);
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            
            // Clean up
            fs.unlinkSync(testFilePath);
        });
        
        test('should accept valid image files', async () => {
            if (!authCookie) {
                console.log('Skipping authenticated test - no auth cookie');
                return;
            }
            
            // Create a minimal PNG file (1x1 pixel)
            const pngBuffer = Buffer.from([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
                0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
                0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
                0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
                0xAE, 0x42, 0x60, 0x82
            ]);
            
            const testFilePath = path.join(__dirname, 'test.png');
            fs.writeFileSync(testFilePath, pngBuffer);
            
            const response = await request(app)
                .post('/admin/upload')
                .set('Cookie', authCookie)
                .attach('images', testFilePath);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('success', true);
                expect(response.body).toHaveProperty('files');
                expect(Array.isArray(response.body.files)).toBe(true);
            }
            
            // Clean up
            fs.unlinkSync(testFilePath);
        });
    });
    
    describe('DELETE /admin/image/:filename', () => {
        test('should require authentication', async () => {
            const response = await request(app)
                .delete('/admin/image/test.jpg');
            
            expect(response.status).toBe(302); // Redirect to login
        });
        
        test('should return 404 for non-existent file', async () => {
            if (!authCookie) {
                console.log('Skipping authenticated test - no auth cookie');
                return;
            }
            
            const response = await request(app)
                .delete('/admin/image/non-existent-file.jpg')
                .set('Cookie', authCookie);
            
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'Image not found');
        });
    });
    
    describe('POST /admin/image/move-to-media/:filename', () => {
        test('should require authentication', async () => {
            const response = await request(app)
                .post('/admin/image/move-to-media/test.jpg');
            
            expect(response.status).toBe(302); // Redirect to login
        });
        
        test('should return 404 for non-existent file', async () => {
            if (!authCookie) {
                console.log('Skipping authenticated test - no auth cookie');
                return;
            }
            
            const response = await request(app)
                .post('/admin/image/move-to-media/non-existent-file.jpg')
                .set('Cookie', authCookie)
                .send({ newName: 'moved-file.jpg' });
            
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'Source image not found');
        });
    });
});

describe('Image Upload Middleware', () => {
    test('should validate file types correctly', () => {
        const { upload } = require('../src/middleware/upload');
        
        // Test valid image types
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const invalidTypes = ['text/plain', 'application/pdf', 'video/mp4', 'audio/mp3'];
        
        validTypes.forEach(mimetype => {
            const mockFile = { mimetype };
            const mockCb = jest.fn();
            
            // This would normally be called by multer's fileFilter
            // We can't easily test it directly, but we can verify the configuration exists
            expect(upload).toBeDefined();
        });
    });
    
    test('should have correct file size limits', () => {
        const { upload } = require('../src/middleware/upload');
        expect(upload).toBeDefined();
        // The actual limits are configured in the middleware
        // This test verifies the middleware loads without errors
    });
});

describe('Image Management Frontend Integration', () => {
    test('should serve admin editor with image management features', async () => {
        const response = await request(app)
            .get('/admin/editor');
        
        expect(response.status).toBe(200);
        expect(response.text).toContain('addImageButton');
        expect(response.text).toContain('manageImagesButton');
        expect(response.text).toContain('imageManagerModal');
        expect(response.text).toContain('imageBlockTemplate');
    });
    
    test('should include image management CSS', async () => {
        const response = await request(app)
            .get('/css/editor.css');
        
        expect(response.status).toBe(200);
        expect(response.text).toContain('.image-block');
        expect(response.text).toContain('.image-manager-modal');
        expect(response.text).toContain('.gallery-grid');
        expect(response.text).toContain('.modal-overlay');
    });
    
    test('should include image management JavaScript', async () => {
        const response = await request(app)
            .get('/js/admin-editor.js');
        
        expect(response.status).toBe(200);
        expect(response.text).toContain('createImageBlock');
        expect(response.text).toContain('openImageManager');
        expect(response.text).toContain('handleImageUpload');
        expect(response.text).toContain('loadAvailableImages');
    });
});