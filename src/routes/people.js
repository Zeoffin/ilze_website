const express = require('express');
const { param, validationResult } = require('express-validator');
const path = require('path');
const router = express.Router();

// Import people services and models
const peopleDataService = require('../services/PeopleDataService');
const PeopleRepository = require('../models/PeopleRepository');

// Initialize people repository
const peopleRepository = new PeopleRepository(peopleDataService);

/**
 * Middleware to ensure people repository is initialized
 */
const ensurePeopleInitialized = async (req, res, next) => {
  try {
    if (!peopleRepository.isReady()) {
      await peopleRepository.initialize();
    }
    next();
  } catch (error) {
    console.error('Failed to initialize people repository:', error);
    res.status(500).json({
      error: 'Service unavailable',
      message: 'Unable to load people data at this time',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
};

/**
 * Validation middleware for person slug parameter
 */
const validatePersonSlug = [
  param('slug')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Person slug must be between 1 and 100 characters')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Person slug must contain only lowercase letters, numbers, and hyphens')
    .customSanitizer((value) => {
      // Additional sanitization to prevent directory traversal
      return value.replace(/[^a-z0-9-]/g, '').toLowerCase();
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid person slug',
        details: errors.array().map(error => ({
          field: error.path,
          message: error.msg,
          value: error.value
        })),
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    next();
  }
];

/**
 * GET /interesanti/:slug
 * Serve individual person profile page
 */
router.get('/:slug', ensurePeopleInitialized, validatePersonSlug, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { slug } = req.params;
    
    // Get person data from repository
    const person = peopleRepository.getBySlug(slug);
    
    if (!person) {
      console.log(`Person not found: ${slug}`);
      
      // Check if this is an API request
      const isApiRequest = req.headers.accept && 
                           (req.headers.accept.includes('application/json') && 
                            !req.headers.accept.includes('text/html')) ||
                           req.query.format === 'json' ||
                           req.path.startsWith('/api/');
      
      if (isApiRequest) {
        // For API requests, return JSON 404
        return res.status(404).json({
          error: 'Person not found',
          message: 'The requested person profile does not exist',
          redirect: '/#interesanti',
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      } else {
        // For browser requests, redirect to main page with Interesanti section
        return res.redirect('/#interesanti');
      }
    }
    
    const duration = Date.now() - startTime;
    
    // Check if this is an API request (has Accept: application/json header or explicit API request)
    const isApiRequest = req.headers.accept && 
                         (req.headers.accept.includes('application/json') && 
                          !req.headers.accept.includes('text/html')) ||
                         req.query.format === 'json' ||
                         req.path.startsWith('/api/');
    
    if (isApiRequest) {
      // For API requests, return JSON data
      res.json({
        success: true,
        person: person.toProfileJSON(),
        meta: {
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    } else {
      // For browser requests, serve the profile page
      const profileData = person.toProfileJSON();
      const html = generateProfilePageHTML(profileData);
      
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
      
      console.log(`Served profile page for ${person.name} in ${duration}ms`);
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('Error serving person profile:', {
      error: error.message,
      slug: req.params.slug,
      duration: `${duration}ms`,
      requestId: req.id,
      stack: error.stack
    });
    
    // Check if this is an API request
    const isApiRequest = req.headers.accept && 
                         (req.headers.accept.includes('application/json') && 
                          !req.headers.accept.includes('text/html')) ||
                         req.query.format === 'json' ||
                         req.path.startsWith('/api/');
    
    if (isApiRequest) {
      // For API requests, return JSON error
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to load person profile',
        redirect: '/#interesanti',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    } else {
      // For browser requests, redirect to main page
      return res.redirect('/#interesanti');
    }
  }
});

/**
 * Generate HTML for person profile page
 * @param {Object} personData - Person data from toProfileJSON()
 * @returns {string} Complete HTML page
 */
function generateProfilePageHTML(personData) {
  const { name, content, images, metadata } = personData;
  
  // Generate content with interspersed images
  const contentWithImages = intersperseParagraphsWithImages(content.html, images);
  
  // Generate breadcrumb navigation
  const breadcrumbHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb navigation">
      <ol>
        <li><a href="/">Sākums</a></li>
        <li><a href="/#interesanti">Interesanti</a></li>
        <li aria-current="page">${name}</li>
      </ol>
    </nav>
  `;

/**
 * Create a smart magazine-style layout that prevents text wrapping issues
 * @param {string} htmlContent - The HTML content
 * @param {Array} images - Array of image objects
 * @returns {string} HTML content with intelligently placed images
 */
function intersperseParagraphsWithImages(htmlContent, images) {
  if (!images || images.length === 0) {
    return htmlContent;
  }

  // Parse the HTML content
  const cheerio = require('cheerio');
  const $ = cheerio.load(htmlContent);
  
  // Get all paragraphs
  const paragraphs = $('p').toArray();
  
  if (paragraphs.length === 0) {
    // If no paragraphs, create a simple layout
    return htmlContent + `
      <div class="content-images-section">
        ${images.map((image, index) => generateImageHTML(image, index, 'full')).join('')}
      </div>
    `;
  }
  
  const totalParagraphs = paragraphs.length;
  let imageIndex = 0;
  let lastFloatSide = null;
  let consecutiveFloats = 0;
  const maxConsecutiveFloats = 2; // Prevent too many floating images in a row
  
  // Calculate smart intervals based on content length and image count
  const baseInterval = Math.max(3, Math.floor(totalParagraphs / Math.min(images.length, 4)));
  
  // Insert images at strategic points
  paragraphs.forEach((paragraph, index) => {
    const $paragraph = $(paragraph);
    const paragraphText = $paragraph.text().trim();
    
    // Don't place images after very short paragraphs or headers
    if (paragraphText.length < 50 || $paragraph.prev().is('h1, h2, h3, h4')) {
      return;
    }
    
    const shouldAddImage = (
      imageIndex < images.length && 
      index > 1 && // Give more space at the beginning
      index < totalParagraphs - 2 && // Give more space at the end
      (index + 1) % baseInterval === 0
    );
    
    if (shouldAddImage) {
      // Determine layout type based on context
      let layoutType = 'float';
      let floatSide = imageIndex % 2 === 0 ? 'left' : 'right';
      
      // Use full-width layout if:
      // 1. Too many consecutive floats
      // 2. Many images remaining (more than 3)
      // 3. Near headers or special elements
      if (consecutiveFloats >= maxConsecutiveFloats || 
          (images.length - imageIndex) > 3 ||
          $paragraph.next().hasClass('intro-question, intro-subtitle, section-number')) {
        layoutType = 'full';
        consecutiveFloats = 0;
        lastFloatSide = null;
      } else {
        // Alternate sides but avoid same side twice in a row if possible
        if (lastFloatSide === floatSide && consecutiveFloats > 0) {
          floatSide = floatSide === 'left' ? 'right' : 'left';
        }
        consecutiveFloats++;
        lastFloatSide = floatSide;
      }
      
      const imageHTML = generateImageHTML(images[imageIndex], imageIndex, layoutType, floatSide);
      $paragraph.after(imageHTML);
      imageIndex++;
    }
  });
  
  // Handle remaining images with full-width layout to avoid crowding
  while (imageIndex < images.length) {
    const targetIndex = Math.min(
      Math.floor(totalParagraphs * 0.8), 
      totalParagraphs - 2
    );
    
    if (targetIndex >= 0 && targetIndex < paragraphs.length) {
      const imageHTML = generateImageHTML(images[imageIndex], imageIndex, 'full');
      $(paragraphs[targetIndex]).after(imageHTML);
    } else {
      // Fallback: add at the end with full width
      const imageHTML = generateImageHTML(images[imageIndex], imageIndex, 'full');
      $('body').append(imageHTML);
    }
    imageIndex++;
  }
  
  return $.html();
}

/**
 * Generate HTML for a single image with smart layout
 * @param {Object} image - Image object
 * @param {number} index - Image index
 * @param {string} layoutType - 'float' or 'full'
 * @param {string} floatSide - 'left' or 'right' (only used if layoutType is 'float')
 * @returns {string} HTML for the image
 */
function generateImageHTML(image, index = 0, layoutType = 'float', floatSide = 'left') {
  if (layoutType === 'full') {
    return `
      <div class="content-image-full">
        <figure class="content-image">
          <img src="${image.path}" alt="${image.alt}" loading="lazy">
        </figure>
      </div>
    `;
  } else {
    return `
      <figure class="content-image float-${floatSide}">
        <img src="${image.path}" alt="${image.alt}" loading="lazy">
      </figure>
    `;
  }
}
  
  return `<!DOCTYPE html>
<html lang="lv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} - Ilze Skrastiņa</title>
    <meta name="description" content="Iepazīstieties ar ${name} - interesantu cilvēku portretējumu Ilzes Skrastiņas mājaslapā.">
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Styles -->
    <link rel="stylesheet" href="/css/styles.css">
    <link rel="stylesheet" href="/css/profile.css">
    
    <!-- Open Graph meta tags -->
    <meta property="og:title" content="${name} - Ilze Skrastiņa">
    <meta property="og:description" content="Iepazīstieties ar ${name} - interesantu cilvēku portretējumu Ilzes Skrastiņas mājaslapā.">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${process.env.SITE_URL || 'http://localhost:3000'}/interesanti/${personData.slug}">
    ${images.length > 0 ? `<meta property="og:image" content="${process.env.SITE_URL || 'http://localhost:3000'}${images[0].path}">` : ''}
    
    <!-- Twitter Card meta tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${name} - Ilze Skrastiņa">
    <meta name="twitter:description" content="Iepazīstieties ar ${name} - interesantu cilvēku portretējumu Ilzes Skrastiņas mājaslapā.">
    ${images.length > 0 ? `<meta name="twitter:image" content="${process.env.SITE_URL || 'http://localhost:3000'}${images[0].path}">` : ''}
</head>
<body>
    <!-- Main content -->
    <main class="person-profile">
        <div class="profile-container">
            ${breadcrumbHTML}
            
            <article class="person-content">
                <header class="person-header">
                    <h1 class="person-title">${name}</h1>
                </header>
                
                <div class="person-body">
                    <div class="person-text">
                        ${contentWithImages}
                    </div>
                </div>
                
                <footer class="person-footer">
                    <a href="/#interesanti" class="back-link">
                        <span class="back-arrow">←</span>
                        Atpakaļ uz Interesanti sadaļu
                    </a>
                </footer>
            </article>
        </div>
    </main>

    <!-- Footer (same as main site) -->
    <footer class="footer">
        <div class="footer-container">
            <div class="footer-content">
                <div class="footer-info">
                    <h3>Ilze Skrastiņa</h3>
                    <p>Rakstniece un žurnāliste</p>
                </div>
                
                <div class="footer-links">
                    <a href="/#par-autori">Par Autori</a>
                    <a href="/#gramatas">Grāmatas</a>
                    <a href="/#fragmenti">Fragmenti</a>
                    <a href="/#interesanti">Interesanti</a>
                    <a href="/#kontakti">Kontakti</a>
                </div>
            </div>
            
            <div class="footer-bottom">
                <p>&copy; ${new Date().getFullYear()} Ilze Skrastiņa. Visas tiesības aizsargātas.</p>
            </div>
        </div>
    </footer>

    <!-- Scripts -->
    <script src="/js/main.js"></script>
    <script src="/js/profile.js"></script>
</body>
</html>`;
}

module.exports = router;