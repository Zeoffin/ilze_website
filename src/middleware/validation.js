const { body, param, validationResult } = require('express-validator');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const validator = require('validator');

// Create DOMPurify instance
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Sanitize HTML content while preserving safe formatting
 */
const sanitizeHTML = (html) => {
  if (!html || typeof html !== 'string') return '';
  
  // Configure DOMPurify to allow rich text formatting for content editing
  const cleanHTML = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'strike', 'del', 'ins',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote',
      'div', 'span', 'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'td', 'th'
    ],
    ALLOWED_ATTR: [
      'class', 'style', 'href', 'target', 'rel',
      'src', 'alt', 'width', 'height',
      'align', 'valign', 'colspan', 'rowspan'
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_SCRIPTS: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'button', 'select', 'option'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
    KEEP_CONTENT: true,
    ADD_TAGS: [],
    ADD_ATTR: []
  });
  
  return cleanHTML;
};

/**
 * Sanitize plain text input
 */
const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  // Remove HTML tags and decode HTML entities
  const cleanText = DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  
  // Additional sanitization
  return validator.escape(cleanText.trim());
};

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * Contact form validation rules
 */
const validateContactForm = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters')
    .matches(/^[a-zA-ZāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ\s\-'\.]+$/)
    .withMessage('Name contains invalid characters')
    .customSanitizer(sanitizeText),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 100 })
    .withMessage('Email must not exceed 100 characters')
    .normalizeEmail()
    .customSanitizer(sanitizeText),
  
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters')
    .customSanitizer(sanitizeText),
  
  handleValidationErrors
];

/**
 * Admin login validation rules
 */
const validateAdminLogin = [
  body('username')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Username must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9_\-\.]+$/)
    .withMessage('Username contains invalid characters')
    .customSanitizer(sanitizeText),
  
  body('password')
    .isLength({ min: 1, max: 200 })
    .withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Content validation rules
 */
const validateContent = [
  param('section')
    .isIn(['interesanti', 'gramatas', 'fragmenti'])
    .withMessage('Invalid section'),
  
  body('content')
    .isArray()
    .withMessage('Content must be an array'),
  
  body('content.*.content_type')
    .isIn(['text', 'image'])
    .withMessage('Content type must be text or image'),
  
  body('content.*.content')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content must be between 1 and 10000 characters')
    .custom((value, { req, path }) => {
      const index = path.split('[')[1].split(']')[0];
      const contentType = req.body.content[index].content_type;
      
      if (contentType === 'text') {
        // For text content, temporarily disable sanitization to test
        console.log('Original content:', value);
        console.log('Content type:', typeof value);
        console.log('Content includes <b>:', value.includes('<b>'));
        // Temporarily skip sanitization completely
        req.body.content[index].content = value;
      } else if (contentType === 'image') {
        // For image content, validate JSON or simple path
        console.log('Image validation - original value:', value);
        console.log('Image validation - value type:', typeof value);
        
        // Temporarily skip image validation to test
        console.log('Skipping image validation for debugging');
        req.body.content[index].content = value;
      }
      
      return true;
    }),
  
  handleValidationErrors
];

/**
 * File upload validation
 */
const validateFileUpload = (req, res, next) => {
  // Additional file validation beyond multer
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      // Validate file extension
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      
      if (!allowedExtensions.includes(fileExtension)) {
        return res.status(400).json({
          error: 'Invalid file type. Only JPG, PNG, GIF, and WebP files are allowed.'
        });
      }
      
      // Validate MIME type matches extension
      const expectedMimeTypes = {
        '.jpg': ['image/jpeg'],
        '.jpeg': ['image/jpeg'],
        '.png': ['image/png'],
        '.gif': ['image/gif'],
        '.webp': ['image/webp']
      };
      
      if (!expectedMimeTypes[fileExtension].includes(file.mimetype)) {
        return res.status(400).json({
          error: 'File type mismatch. The file extension does not match the file content.'
        });
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          error: 'File too large. Maximum size is 5MB.'
        });
      }
    }
  }
  
  next();
};

/**
 * Filename validation for image operations
 */
const validateFilename = [
  param('filename')
    .matches(/^[a-zA-Z0-9_\-\.]+\.(jpg|jpeg|png|gif|webp)$/i)
    .withMessage('Invalid filename format')
    .customSanitizer((value) => {
      // Sanitize filename to prevent directory traversal
      return require('path').basename(value);
    }),
  
  handleValidationErrors
];

/**
 * General input sanitization middleware
 */
const sanitizeInputs = (req, res, next) => {
  // Recursively sanitize all string inputs in req.body
  // Skip content fields that need to preserve HTML
  const sanitizeObject = (obj, keyPath = '') => {
    if (typeof obj === 'string') {
      // Skip sanitization for content fields that should preserve HTML
      // Only skip for text content in content update requests
      console.log('Checking sanitization skip for:', keyPath, 'method:', req.method, 'path:', req.path);
      // Fix regex to match both content.0.content and content[0].content patterns
      if (keyPath.match(/^content[\.\[]?\d+[\.\]]?\.content$/) && req.path.includes('/content/') && req.method === 'PUT') {
        console.log('Skipping sanitization for content field:', keyPath);
        return obj; // Return original HTML content
      }
      console.log('Applying sanitization to:', keyPath);
      return sanitizeText(obj);
    } else if (Array.isArray(obj)) {
      return obj.map((item, index) => sanitizeObject(item, `${keyPath}[${index}]`));
    } else if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        const newKeyPath = keyPath ? `${keyPath}.${key}` : key;
        sanitized[key] = sanitizeObject(value, newKeyPath);
      }
      return sanitized;
    }
    return obj;
  };
  
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

module.exports = {
  sanitizeHTML,
  sanitizeText,
  handleValidationErrors,
  validateContactForm,
  validateAdminLogin,
  validateContent,
  validateFileUpload,
  validateFilename,
  sanitizeInputs
};