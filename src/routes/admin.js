const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const AdminUser = require('../models/AdminUser');
const { requireAuth, requireGuest, addAuthStatus, csrfProtection } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const { 
  validateAdminLogin, 
  validateContent, 
  validateFileUpload, 
  validateFilename,
  sanitizeInputs 
} = require('../middleware/validation');
const router = express.Router();

// Rate limiting for admin login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many login attempts, please try again later.',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Rate limiting for general admin routes (more lenient for development)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs (increased for testing)
  message: {
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting, auth status, and input sanitization to all admin routes
router.use(adminLimiter);
router.use(addAuthStatus);
router.use(sanitizeInputs);

// Apply CSRF protection to authenticated routes
router.use('/dashboard*', requireAuth, csrfProtection);
router.use('/content*', requireAuth, csrfProtection);
router.use('/upload*', requireAuth, csrfProtection);
router.use('/image*', requireAuth, csrfProtection);
router.use('/logout', requireAuth, csrfProtection);

/**
 * GET /admin/login
 * Serve admin login page
 */
router.get('/login', requireGuest, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/admin-login.html'));
});

/**
 * GET /admin/dashboard.html
 * Serve admin dashboard page
 */
router.get('/dashboard.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/admin-dashboard.html'));
});

/**
 * GET /admin/editor
 * Serve admin content editor page
 */
router.get('/editor', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/admin-editor.html'));
});

/**
 * POST /admin/login
 * Admin authentication endpoint
 */
router.post('/login', loginLimiter, requireGuest, validateAdminLogin, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }
    
    // Find admin user
    const adminUser = await AdminUser.findByUsername(username.trim());
    if (!adminUser) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, adminUser.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }
    
    // Update last login
    await adminUser.updateLastLogin();
    
    // Set session with security measures
    req.session.isAdmin = true;
    req.session.userId = adminUser.id;
    req.session.username = adminUser.username;
    req.session.loginTime = Date.now();
    req.session.lastActivity = Date.now();
    
    // Regenerate session ID to prevent session fixation
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({
          error: 'Session error'
        });
      }
      
      // Restore session data after regeneration
      req.session.isAdmin = true;
      req.session.userId = adminUser.id;
      req.session.username = adminUser.username;
      req.session.loginTime = Date.now();
      req.session.lastActivity = Date.now();
    
      res.json({
        success: true,
        message: 'Login successful',
        user: {
          username: adminUser.username,
          email: adminUser.email
        }
      });
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * POST /admin/logout
 * Admin logout endpoint
 */
router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        error: 'Failed to logout'
      });
    }
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  });
});

/**
 * GET /admin/status
 * Check authentication status
 */
router.get('/status', (req, res) => {
  res.json({
    isAuthenticated: !!(req.session && req.session.isAdmin),
    user: req.session && req.session.isAdmin ? {
      username: req.session.username
    } : null
  });
});

/**
 * GET /admin/dashboard
 * Admin dashboard endpoint (protected)
 */
router.get('/dashboard', requireAuth, (req, res) => {
  // Check if request expects HTML response
  if (req.accepts('html') && !req.accepts('json')) {
    return res.sendFile(path.join(__dirname, '../../public/admin-dashboard.html'));
  }
  
  // Return JSON for API requests
  res.json({
    success: true,
    message: 'Welcome to admin dashboard',
    user: {
      username: req.session.username
    },
    sections: ['interesanti', 'gramatas', 'fragmenti']
  });
});

/**
 * GET /admin/content/:section
 * Get editable content for a specific section (protected)
 */
router.get('/content/:section', requireAuth, async (req, res) => {
  try {
    const { section } = req.params;
    
    // Validate section parameter
    const validSections = ['interesanti', 'gramatas', 'fragmenti'];
    if (!validSections.includes(section)) {
      return res.status(400).json({
        error: 'Invalid section. Must be one of: interesanti, gramatas, fragmenti'
      });
    }
    
    const { Content } = require('../models');
    const content = await Content.findBySection(section);
    
    res.json({
      success: true,
      section: section,
      content: content.map(item => item.toJSON())
    });
    
  } catch (error) {
    console.error('Error fetching admin content:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * PUT /admin/content/:section
 * Update content for a specific section (protected)
 */
router.put('/content/:section', validateContent, async (req, res) => {
  try {
    const { section } = req.params;
    const { content } = req.body;
    
    // Import Content model at the beginning
    const { Content } = require('../models');
    
    // Validate section parameter
    const validSections = ['interesanti', 'gramatas', 'fragmenti'];
    if (!validSections.includes(section)) {
      return res.status(400).json({
        error: 'Invalid section. Must be one of: interesanti, gramatas, fragmenti'
      });
    }
    
    // Validate content array
    if (!Array.isArray(content)) {
      return res.status(400).json({
        error: 'Content must be an array'
      });
    }
    
    // Allow empty content arrays (for clearing sections)
    if (content.length === 0) {
      console.log(`Clearing all content for section: ${section}`);
      // Delete all existing content for this section
      const existingContent = await Content.findBySection(section);
      console.log(`Found ${existingContent.length} existing items to delete`);
      for (const item of existingContent) {
        console.log(`Deleting item with ID: ${item.id}`);
        await Content.deleteById(item.id);
      }
      
      return res.json({
        success: true,
        message: 'All content cleared successfully',
        section: section,
        content: []
      });
    }
    
    // First, get all existing content for this section
    const existingContent = await Content.findBySection(section);
    const existingIds = existingContent.map(item => item.id);
    
    // Collect IDs from the incoming content
    const incomingIds = content.filter(item => item.id).map(item => parseInt(item.id));
    
    // Find IDs to delete (existing but not in incoming)
    const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));
    
    console.log(`Section: ${section}`);
    console.log(`Existing IDs: [${existingIds.join(', ')}]`);
    console.log(`Incoming IDs: [${incomingIds.join(', ')}]`);
    console.log(`IDs to delete: [${idsToDelete.join(', ')}]`);
    console.log(`Incoming content items: ${content.length}`);
    
    // Delete removed content items
    for (const id of idsToDelete) {
      console.log(`Deleting content item with ID: ${id}`);
      await Content.deleteById(id);
    }
    
    const updatedContent = [];
    
    // Process each content item
    for (let i = 0; i < content.length; i++) {
      const item = content[i];
      
      // Validate content item
      if (!item.content_type || !['text', 'image'].includes(item.content_type)) {
        return res.status(400).json({
          error: `Invalid content_type for item ${i}. Must be 'text' or 'image'`
        });
      }
      
      // Clean and validate content
      const cleanContent = item.content.trim();
      
      // Check for empty content (including common empty HTML patterns)
      const isEmpty = !cleanContent || 
                     cleanContent === '<br>' || 
                     cleanContent === '<div><br></div>' ||
                     cleanContent === '<p><br></p>' ||
                     cleanContent === '<p></p>' ||
                     cleanContent.replace(/<[^>]*>/g, '').trim().length === 0;
      
      if (isEmpty) {
        return res.status(400).json({
          error: `Content cannot be empty for item ${i}`
        });
      }
      
      // Create or update content item
      let contentItem;
      if (item.id) {
        // Update existing content
        contentItem = await Content.findById(item.id);
        if (contentItem) {
          contentItem.content = cleanContent;
          contentItem.order_index = i;
          await contentItem.save();
        }
      } else {
        // Create new content
        contentItem = new Content({
          section: section,
          content_type: item.content_type,
          content: cleanContent,
          order_index: i
        });
        await contentItem.save();
      }
      
      if (contentItem) {
        updatedContent.push(contentItem.toJSON());
      }
    }
    
    res.json({
      success: true,
      message: 'Content updated successfully',
      section: section,
      content: updatedContent
    });
    
  } catch (error) {
    console.error('Error updating admin content:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * DELETE /admin/content/:id
 * Delete a specific content item (protected)
 */
router.delete('/content/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        error: 'Invalid content ID'
      });
    }
    
    const { Content } = require('../models');
    const deleted = await Content.deleteById(parseInt(id));
    
    if (deleted) {
      res.json({
        success: true,
        message: 'Content deleted successfully'
      });
    } else {
      res.status(404).json({
        error: 'Content not found'
      });
    }
    
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /admin/images
 * Get list of all uploaded images (protected)
 */
router.get('/images', requireAuth, async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads');
    const mediaDir = path.join(__dirname, '../../public/media');
    
    const images = [];
    
    // Get images from uploads directory
    try {
      const uploadFiles = await fs.readdir(uploadsDir);
      for (const file of uploadFiles) {
        if (file !== '.gitkeep' && /\.(jpg|jpeg|png|gif|webp)$/i.test(file)) {
          const filePath = path.join(uploadsDir, file);
          const stats = await fs.stat(filePath);
          images.push({
            filename: file,
            path: `/uploads/${file}`,
            size: stats.size,
            uploadedAt: stats.birthtime,
            type: 'uploaded'
          });
        }
      }
    } catch (error) {
      console.log('No uploads directory or error reading it:', error.message);
    }
    
    // Get images from media directory (existing images)
    try {
      const mediaFiles = await fs.readdir(mediaDir);
      for (const file of mediaFiles) {
        if (file !== '.gitkeep' && /\.(jpg|jpeg|png|gif|webp)$/i.test(file) && !file.includes('Zone.Identifier')) {
          const filePath = path.join(mediaDir, file);
          const stats = await fs.stat(filePath);
          images.push({
            filename: file,
            path: `/media/${file}`,
            size: stats.size,
            uploadedAt: stats.birthtime,
            type: 'media'
          });
        }
      }
    } catch (error) {
      console.log('Error reading media directory:', error.message);
    }
    
    // Sort by upload date (newest first)
    images.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    
    res.json({
      success: true,
      images: images
    });
    
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /admin/upload
 * Upload new images (protected)
 */
router.post('/upload', upload.array('images', 10), handleUploadError, validateFileUpload, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded'
      });
    }
    
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype
    }));
    
    res.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      files: uploadedFiles
    });
    
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * DELETE /admin/image/:filename
 * Delete an uploaded image (protected)
 */
router.delete('/image/:filename', validateFilename, async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({
        error: 'Filename is required'
      });
    }
    
    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    
    // Check if it's an uploaded file (in uploads directory)
    const uploadedFilePath = path.join(__dirname, '../../uploads', sanitizedFilename);
    
    try {
      await fs.access(uploadedFilePath);
      await fs.unlink(uploadedFilePath);
      
      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          error: 'Image not found'
        });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /admin/image/move-to-media/:filename
 * Move an uploaded image to the media directory (protected)
 */
router.post('/image/move-to-media/:filename', validateFilename, async (req, res) => {
  try {
    const { filename } = req.params;
    const { newName } = req.body;
    
    if (!filename) {
      return res.status(400).json({
        error: 'Filename is required'
      });
    }
    
    // Sanitize filenames
    const sanitizedFilename = path.basename(filename);
    const finalName = newName ? path.basename(newName) : sanitizedFilename;
    
    const sourcePath = path.join(__dirname, '../../uploads', sanitizedFilename);
    const destPath = path.join(__dirname, '../../public/media', finalName);
    
    try {
      // Check if source file exists
      await fs.access(sourcePath);
      
      // Check if destination already exists
      try {
        await fs.access(destPath);
        return res.status(400).json({
          error: 'A file with this name already exists in media directory'
        });
      } catch (error) {
        // File doesn't exist, which is what we want
      }
      
      // Move the file
      await fs.rename(sourcePath, destPath);
      
      res.json({
        success: true,
        message: 'Image moved to media directory successfully',
        newPath: `/media/${finalName}`
      });
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          error: 'Source image not found'
        });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Error moving image:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;