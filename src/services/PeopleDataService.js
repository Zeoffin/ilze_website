const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');

class PeopleDataService {
  constructor() {
    this.peopleDirectory = path.join(__dirname, '../../public/media/people');
    this.initialized = false;
    this.people = new Map();
  }

  /**
   * Initialize the service by scanning and processing all people data
   */
  async initialize() {
    if (this.initialized) {
      console.log('People Data Service already initialized');
      return;
    }

    const startTime = Date.now();
    console.log('🔄 Initializing People Data Service...');
    console.log(`📁 Scanning directory: ${this.peopleDirectory}`);

    try {
      // Check if people directory exists with detailed error reporting
      try {
        await fs.access(this.peopleDirectory);
        console.log('✅ People directory found and accessible');
      } catch (error) {
        console.error(`❌ People directory not accessible: ${this.peopleDirectory}`);
        console.error(`   Error: ${error.message}`);
        console.error(`   Code: ${error.code}`);

        // Provide specific guidance based on error type
        if (error.code === 'ENOENT') {
          console.error('💡 Directory does not exist. Expected structure:');
          console.error('   public/media/people/');
          console.error('   ├── Person Name 1/');
          console.error('   │   ├── person.html');
          console.error('   │   └── images/');
          console.error('   └── Person Name 2/');
          console.error('       ├── person.html');
          console.error('       └── images/');
        } else if (error.code === 'EACCES') {
          console.error('💡 Permission denied. Check directory permissions.');
        }

        throw new Error(`People directory not accessible: ${error.message} (${error.code})`);
      }

      const results = await this.scanPeopleDirectory();
      this.initialized = true;

      const duration = Date.now() - startTime;

      // Enhanced completion logging
      console.log(`\n✅ People Data Service initialization completed in ${duration}ms`);
      console.log(`📊 Results: ${results.successful}/${results.total} people profiles loaded successfully`);

      if (results.successful > 0) {
        console.log(`🎉 Successfully loaded profiles:`);
        const loadedPeople = this.getAllPeople();
        loadedPeople.forEach((person, index) => {
          console.log(`   ${index + 1}. ${person.name} (${person.images.length} images, ${person.metadata.wordCount} words)`);
        });
      }

      if (results.failed > 0) {
        console.warn(`⚠️  ${results.failed} people profiles failed to load`);
        console.warn('   Check the error messages above for specific issues');
        console.warn('   Common issues: missing HTML files, invalid content, permission problems');
      }

      if (results.successful === 0) {
        console.warn('⚠️  No people profiles were successfully loaded');
        console.warn('   Interesanti section will show "no content available" message');
        console.warn('   Verify that people directories contain valid HTML files');
      }

      // Log memory usage for performance monitoring
      const memUsage = process.memoryUsage();
      console.log(`💾 Memory usage after loading: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap`);

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to initialize People Data Service after ${duration}ms`);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        path: error.path
      });

      // Mark as initialized even if failed to prevent retry loops
      this.initialized = true;

      // Clear any partial data that might have been loaded
      this.people.clear();

      console.error('🚨 People Data Service is in failed state');
      console.error('   - Interesanti routes will return service unavailable errors');
      console.error('   - Users will be redirected to main page with error message');
      console.error('   - Rest of the website will continue to function normally');

      throw error;
    }
  }

  /**
   * Scan the people directory and process all person folders
   */
  async scanPeopleDirectory() {
    let successful = 0;
    let failed = 0;
    let total = 0;
    const failedPeople = [];
    const successfulPeople = [];

    try {
      console.log('📂 Scanning people directory for person folders...');
      const entries = await fs.readdir(this.peopleDirectory, { withFileTypes: true });
      const personDirectories = entries.filter(entry => entry.isDirectory());
      total = personDirectories.length;

      console.log(`📋 Found ${personDirectories.length} person directories to process`);

      if (personDirectories.length === 0) {
        console.warn('⚠️  No person directories found in people directory');
        console.warn('   Expected structure: public/media/people/[Person Name]/');
        return { successful: 0, failed: 0, total: 0, failedPeople: [], successfulPeople: [] };
      }

      // Log all directories found for debugging
      console.log('📁 Directories found:');
      personDirectories.forEach((dir, index) => {
        console.log(`   ${index + 1}. ${dir.name}`);
      });

      console.log('\n🔄 Processing person directories...');

      for (const dir of personDirectories) {
        const processingStartTime = Date.now();

        try {
          console.log(`\n📝 Processing: ${dir.name}`);
          const personData = await this.processPersonData(dir.name);

          if (personData) {
            this.people.set(personData.slug, personData);
            const processingDuration = Date.now() - processingStartTime;
            console.log(`✅ Successfully processed: ${personData.name}`);
            console.log(`   📊 Stats: ${personData.images.length} images, ${personData.metadata.wordCount} words`);
            console.log(`   ⏱️  Processing time: ${processingDuration}ms`);
            console.log(`   🔗 URL slug: ${personData.slug}`);

            successful++;
            successfulPeople.push({
              name: personData.name,
              slug: personData.slug,
              images: personData.images.length,
              words: personData.metadata.wordCount,
              processingTime: processingDuration
            });
          } else {
            const processingDuration = Date.now() - processingStartTime;
            console.warn(`⚠️  Skipped: ${dir.name} (${processingDuration}ms)`);
            console.warn(`   Reason: No valid data found`);
            console.warn(`   Check: HTML file exists, content is valid, images directory present`);

            failed++;
            failedPeople.push({
              name: dir.name,
              reason: 'No valid data found',
              processingTime: processingDuration
            });
          }
        } catch (error) {
          const processingDuration = Date.now() - processingStartTime;
          console.error(`❌ Failed: ${dir.name} (${processingDuration}ms)`);
          console.error(`   Error: ${error.message}`);

          // Log specific error guidance
          if (error.message.includes('HTML file')) {
            console.error(`   💡 Check: Ensure ${dir.name} directory contains a .html file`);
          } else if (error.message.includes('permission') || error.message.includes('EACCES')) {
            console.error(`   💡 Check: File permissions for ${dir.name} directory`);
          } else if (error.message.includes('ENOENT')) {
            console.error(`   💡 Check: Directory structure and file existence`);
          }

          failed++;
          failedPeople.push({
            name: dir.name,
            reason: error.message,
            processingTime: processingDuration,
            errorCode: error.code
          });

          // Continue processing other people even if one fails
        }
      }

      // Enhanced results summary
      console.log(`\n📊 Processing Summary:`);
      console.log(`   ✅ Successful: ${successful}/${total}`);
      console.log(`   ❌ Failed: ${failed}/${total}`);
      console.log(`   📈 Success rate: ${total > 0 ? Math.round((successful / total) * 100) : 0}%`);

      if (successfulPeople.length > 0) {
        const avgProcessingTime = Math.round(
          successfulPeople.reduce((sum, p) => sum + p.processingTime, 0) / successfulPeople.length
        );
        console.log(`   ⏱️  Average processing time: ${avgProcessingTime}ms`);
      }

      if (failedPeople.length > 0) {
        console.log(`\n❌ Failed People Details:`);
        failedPeople.forEach((person, index) => {
          console.log(`   ${index + 1}. ${person.name}: ${person.reason}`);
        });
      }

      return {
        successful,
        failed,
        total,
        failedPeople,
        successfulPeople
      };

    } catch (error) {
      console.error('❌ Critical error scanning people directory:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        path: error.path
      });
      throw error;
    }
  }

  /**
   * Process data for a single person
   * @param {string} personName - The directory name of the person
   * @returns {Object|null} Processed person data or null if processing fails
   */
  async processPersonData(personName) {
    const personPath = path.join(this.peopleDirectory, personName);

    try {
      // Verify person directory exists
      try {
        await fs.access(personPath);
      } catch (error) {
        console.error(`Person directory not accessible: ${personPath}`);
        return null;
      }

      // Generate slug from person name
      const slug = this.generateSlug(personName);

      // Extract content from HTML file
      const content = await this.extractPersonContent(personPath, personName);
      if (!content) {
        console.warn(`No valid content found for ${personName} - skipping`);
        return null;
      }

      // Validate content has meaningful data
      if (!content.text || content.text.trim().length < 10) {
        console.warn(`Content too short for ${personName} (${content.text ? content.text.length : 0} characters) - skipping`);
        return null;
      }

      // Collect images
      const images = await this.collectPersonImages(personPath, personName);

      // Associate photo credits with images
      const imagesWithCredits = this.associatePhotoCreditsWithImages(images, content.photoCredits || []);

      // Get metadata
      const metadata = await this.getPersonMetadata(personPath, content, imagesWithCredits);

      const personData = {
        id: slug,
        name: this.cleanPersonName(personName),
        slug: slug,
        content: content,
        images: imagesWithCredits,
        metadata: metadata
      };

      // Validate the complete person data
      const validationErrors = this.validatePersonData(personData);
      if (validationErrors.length > 0) {
        console.warn(`Validation failed for ${personName}:`, validationErrors.join(', '));
        return null;
      }

      return personData;
    } catch (error) {
      console.error(`Error processing person data for ${personName}:`, error.message);
      return null;
    }
  }

  /**
   * Extract and clean content from person's HTML file
   * @param {string} personPath - Path to person's directory
   * @param {string} personName - Person's name
   * @returns {Object|null} Extracted content or null if no valid content found
   */
  async extractPersonContent(personPath, personName) {
    try {
      const files = await fs.readdir(personPath);
      const htmlFiles = files.filter(file => file.endsWith('.html') && !file.includes('Zone.Identifier'));

      if (htmlFiles.length === 0) {
        console.warn(`No HTML file found for ${personName} in directory ${personPath}`);
        return null;
      }

      if (htmlFiles.length > 1) {
        console.warn(`Multiple HTML files found for ${personName}, using first: ${htmlFiles[0]}`);
      }

      const htmlFile = htmlFiles[0];
      const htmlPath = path.join(personPath, htmlFile);

      // Check if file is readable
      try {
        await fs.access(htmlPath, fs.constants.R_OK);
      } catch (error) {
        console.error(`HTML file not readable for ${personName}: ${htmlPath}`);
        return null;
      }

      const htmlContent = await fs.readFile(htmlPath, 'utf-8');

      if (!htmlContent || htmlContent.trim().length === 0) {
        console.warn(`Empty HTML file for ${personName}: ${htmlPath}`);
        return null;
      }

      console.log(`Extracted content from ${htmlFile} for ${personName} (${htmlContent.length} characters)`);
      return this.parseAndCleanHTML(htmlContent, personName);
    } catch (error) {
      console.error(`Failed to extract content for ${personName}:`, error.message);
      return null;
    }
  }

  /**
   * Parse HTML content and extract clean text and structured data
   * @param {string} htmlContent - Raw HTML content
   * @param {string} personName - Person's name for context
   * @returns {Object} Cleaned and structured content
   */
  parseAndCleanHTML(htmlContent, personName) {
    try {
      const $ = cheerio.load(htmlContent);

      // Remove style tags and scripts
      $('style, script').remove();

      // Extract and remove photo credits from content
      const photoCredits = this.extractAndRemovePhotoCredits($);

      // Enhance recurring intro elements
      this.enhanceIntroElements($, personName);

      // Extract main content from body
      const bodyContent = $('body').html() || '';

      // Clean up the HTML - remove inline styles and unnecessary attributes
      const cleanedHtml = this.cleanHtmlContent(bodyContent);

      // Extract plain text for preview and search (after removing photo credits)
      const plainText = $('body').text().replace(/\s+/g, ' ').trim();

      return {
        html: cleanedHtml,
        text: plainText,
        photoCredits: photoCredits,
        wordCount: plainText.split(' ').filter(word => word.length > 0).length
      };
    } catch (error) {
      console.error(`Failed to parse HTML for ${personName}:`, error);
      return {
        html: '',
        text: '',
        photoCredits: [],
        wordCount: 0
      };
    }
  }

  /**
   * Clean HTML content by removing inline styles and unnecessary attributes
   * @param {string} html - HTML content to clean
   * @returns {string} Cleaned HTML
   */
  cleanHtmlContent(html) {
    const $ = cheerio.load(html);

    // Remove all style attributes
    $('*').removeAttr('style');

    // Remove unnecessary attributes but keep src, alt, href
    $('*').each((i, elem) => {
      const $elem = $(elem);
      const allowedAttrs = ['src', 'alt', 'href', 'title'];
      const attrs = Object.keys(elem.attribs || {});

      attrs.forEach(attr => {
        if (!allowedAttrs.includes(attr)) {
          $elem.removeAttr(attr);
        }
      });
    });

    // Update image paths to be relative to the website root
    $('img').each((i, elem) => {
      const $img = $(elem);
      const src = $img.attr('src');
      if (src && src.startsWith('images/')) {
        // This will be updated when we know the person's directory structure
        $img.attr('src', src);
      }
    });

    return $.html();
  }

  /**
   * Extract and remove photo credits from the HTML content
   * @param {Object} $ - Cheerio instance
   * @returns {Array} Array of photo credit objects
   */
  extractAndRemovePhotoCredits($) {
    const photoCredits = [];

    // Look for paragraphs that contain photo credits
    $('p').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();

      // Check if this paragraph contains photo credit information
      if (this.isPhotoCreditText(text)) {
        photoCredits.push({
          text: text,
          order: photoCredits.length // Track order for matching with images
        });

        // Remove this paragraph from the content
        $elem.remove();

        console.log(`Extracted photo credit: "${text}"`);
      }
    });

    return photoCredits;
  }

  /**
   * Check if text appears to be a photo credit
   * @param {string} text - Text to check
   * @returns {boolean} True if text appears to be a photo credit
   */
  isPhotoCreditText(text) {
    const lowerText = text.toLowerCase();

    // Common photo credit patterns in Latvian
    const photoCreditPatterns = [
      /^foto\s*:/i,                    // "Foto:"
      /^foto\s+no\s+/i,               // "Foto no"
      /^attēls\s*:/i,                 // "Attēls:"
      /^fotogrāfija\s*:/i,            // "Fotogrāfija:"
      /privātā\s+arhīva/i,            // "privātā arhīva"
      /personīgā\s+arhīva/i,          // "personīgā arhīva"
      /^autora\s+arhīvs/i,            // "autora arhīvs"
      /^no\s+personīgā/i              // "no personīgā"
    ];

    // Check if text matches any photo credit pattern
    return photoCreditPatterns.some(pattern => pattern.test(text)) ||
      // Also check if it's a short line that looks like a credit
      (text.length < 100 && (
        lowerText.includes('foto') ||
        lowerText.includes('attēls') ||
        lowerText.includes('arhīv')
      ));
  }

  /**
   * Enhance recurring intro elements by converting them to proper headers
   * @param {Object} $ - Cheerio instance
   * @param {string} personName - Person's name for context
   */
  enhanceIntroElements($, personName) {
    // Find and enhance the recurring question
    $('p').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();

      // Check if this is the recurring question
      if (text.includes('Kā sasniegt savu sapni un gūt panākumus?')) {
        $elem.replaceWith(`<h2 class="intro-question">${text}</h2>`);
        console.log(`Enhanced intro question for ${personName}`);
        return false; // Break after first match
      }
    });

    // Find and enhance the "Stāsta [NAME]" paragraph
    $('p').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();

      // Check if this starts with "Stāsta" and contains the person's name or similar pattern
      if (text.toLowerCase().startsWith('stāsta') && text.length < 200) {
        $elem.replaceWith(`<h3 class="intro-subtitle">${text}</h3>`);
        console.log(`Enhanced intro subtitle for ${personName}: "${text}"`);
        return false; // Break after first match
      }
    });

    // Also look for numbered sections (1., 2., 3., etc.) and enhance them
    $('p').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();

      // Check if this is a numbered section (starts with number and period, and is short)
      if (/^\d+\.\s*$/.test(text) && text.length < 10) {
        $elem.replaceWith(`<h4 class="section-number">${text}</h4>`);
        console.log(`Enhanced section number for ${personName}: "${text}"`);
      }
    });
  }

  /**
   * Associate photo credits with images based on their order in the content
   * @param {Array} images - Array of image objects
   * @param {Array} photoCredits - Array of photo credit objects
   * @returns {Array} Images with associated photo credits
   */
  associatePhotoCreditsWithImages(images, photoCredits) {
    if (!photoCredits || photoCredits.length === 0) {
      return images;
    }

    console.log(`Associating ${photoCredits.length} photo credits with ${images.length} images`);

    // Create a copy of images to avoid modifying the original
    const imagesWithCredits = images.map((image, index) => {
      const imageWithCredit = { ...image };

      // Try to match photo credit with image based on order
      if (index < photoCredits.length) {
        imageWithCredit.credit = photoCredits[index].text;
        console.log(`Associated credit "${photoCredits[index].text}" with image ${image.filename}`);
      } else if (photoCredits.length === 1 && images.length > 1) {
        // If there's only one credit for multiple images, apply it to all
        imageWithCredit.credit = photoCredits[0].text;
        console.log(`Applied single credit "${photoCredits[0].text}" to image ${image.filename}`);
      }

      return imageWithCredit;
    });

    return imagesWithCredits;
  }

  /**
   * Collect all images from person's images directory
   * @param {string} personPath - Path to person's directory
   * @param {string} personName - Person's name
   * @returns {Array} Array of image objects
   */
  async collectPersonImages(personPath, personName) {
    const imagesPath = path.join(personPath, 'images');
    const images = [];

    try {
      // Check if images directory exists
      try {
        await fs.access(imagesPath);
      } catch (error) {
        console.warn(`No images directory found for ${personName}: ${imagesPath}`);
        return [];
      }

      const files = await fs.readdir(imagesPath);
      const imageFiles = files.filter(file =>
        /\.(jpg|jpeg|png|gif|webp)$/i.test(file) &&
        !file.includes('Zone.Identifier')
      );

      if (imageFiles.length === 0) {
        console.warn(`No image files found in images directory for ${personName}`);
        return [];
      }

      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i];
        try {
          const imagePath = path.join(imagesPath, imageFile);

          // Check if image file is accessible
          await fs.access(imagePath, fs.constants.R_OK);
          const stats = await fs.stat(imagePath);

          // Skip very small files (likely corrupted)
          if (stats.size < 1024) {
            console.warn(`Skipping very small image file for ${personName}: ${imageFile} (${stats.size} bytes)`);
            continue;
          }

          // Create web-accessible path
          const webPath = `/media/people/${personName}/images/${imageFile}`;

          images.push({
            filename: imageFile,
            path: webPath,
            fullPath: imagePath,
            alt: this.generateAltText(personName, imageFile),
            size: stats.size,
            lastModified: stats.mtime,
            order: i // Track order for matching with photo credits
          });
        } catch (imageError) {
          console.warn(`Failed to process image ${imageFile} for ${personName}:`, imageError.message);
          // Continue with other images
        }
      }

      console.log(`Found ${images.length} valid images for ${personName}`);
      return images;
    } catch (error) {
      console.warn(`Error reading images directory for ${personName}:`, error.message);
      return [];
    }
  }

  /**
   * Generate metadata for a person
   * @param {string} personPath - Path to person's directory
   * @param {Object} content - Processed content
   * @param {Array} images - Array of images
   * @returns {Object} Metadata object
   */
  async getPersonMetadata(personPath, content, images) {
    try {
      const stats = await fs.stat(personPath);

      return {
        lastModified: stats.mtime,
        wordCount: content.wordCount,
        imageCount: images.length,
        hasContent: content.text.length > 0,
        contentLength: content.text.length
      };
    } catch (error) {
      console.warn(`Failed to get metadata for person at ${personPath}:`, error.message);
      return {
        lastModified: new Date(),
        wordCount: content.wordCount || 0,
        imageCount: images.length,
        hasContent: content.text.length > 0,
        contentLength: content.text.length
      };
    }
  }

  /**
   * Generate a URL-friendly slug from person name
   * @param {string} name - Person's name
   * @returns {string} URL slug
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[āăą]/g, 'a')
      .replace(/[ēĕę]/g, 'e')
      .replace(/[īĭį]/g, 'i')
      .replace(/[ōŏő]/g, 'o')
      .replace(/[ūŭų]/g, 'u')
      .replace(/[ćčç]/g, 'c')
      .replace(/[ģğ]/g, 'g')
      .replace(/[ķ]/g, 'k')
      .replace(/[ļľ]/g, 'l')
      .replace(/[ńňņ]/g, 'n')
      .replace(/[ŕř]/g, 'r')
      .replace(/[śšş]/g, 's')
      .replace(/[ţť]/g, 't')
      .replace(/[žź]/g, 'z')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Clean person name for display
   * @param {string} name - Raw person name from directory
   * @returns {string} Cleaned name
   */
  cleanPersonName(name) {
    // Convert to proper case and clean up
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Generate alt text for images
   * @param {string} personName - Person's name
   * @param {string} filename - Image filename
   * @returns {string} Alt text
   */
  generateAltText(personName, filename) {
    const cleanName = this.cleanPersonName(personName);
    return `${cleanName} - ${filename.replace(/\.[^/.]+$/, "")}`;
  }

  /**
   * Get all people data
   * @returns {Array} Array of all person objects
   */
  getAllPeople() {
    return Array.from(this.people.values());
  }

  /**
   * Get person by slug
   * @param {string} slug - Person's slug
   * @returns {Object|null} Person object or null if not found
   */
  getPersonBySlug(slug) {
    return this.people.get(slug) || null;
  }

  /**
   * Check if person exists
   * @param {string} slug - Person's slug
   * @returns {boolean} True if person exists
   */
  personExists(slug) {
    return this.people.has(slug);
  }

  /**
   * Get person's main image (first image)
   * @param {string} slug - Person's slug
   * @returns {Object|null} Main image object or null
   */
  getPersonMainImage(slug) {
    const person = this.getPersonBySlug(slug);
    return person && person.images.length > 0 ? person.images[0] : null;
  }

  /**
   * Get content preview for a person
   * @param {string} slug - Person's slug
   * @param {number} length - Maximum length of preview
   * @returns {string} Content preview
   */
  getPersonContentPreview(slug, length = 150) {
    const person = this.getPersonBySlug(slug);
    if (!person || !person.content.text) {
      return '';
    }

    const text = person.content.text;
    if (text.length <= length) {
      return text;
    }

    return text.substring(0, length).replace(/\s+\S*$/, '') + '...';
  }

  /**
   * Validate person data
   * @param {Object} personData - Person data to validate
   * @returns {Array} Array of validation errors
   */
  validatePersonData(personData) {
    const errors = [];

    if (!personData.name || personData.name.trim().length === 0) {
      errors.push('Person name is required');
    }

    if (!personData.slug || personData.slug.trim().length === 0) {
      errors.push('Person slug is required');
    }

    if (!personData.content || !personData.content.text) {
      errors.push('Person content is required');
    }

    if (personData.content && personData.content.text && personData.content.text.length < 50) {
      errors.push('Person content is too short (minimum 50 characters)');
    }

    return errors;
  }

  /**
   * Refresh data for all people (re-scan directory)
   */
  async refresh() {
    console.log('Refreshing people data...');
    this.people.clear();
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    const people = this.getAllPeople();
    const totalImages = people.reduce((sum, person) => sum + person.images.length, 0);
    const totalWords = people.reduce((sum, person) => sum + person.metadata.wordCount, 0);

    return {
      totalPeople: people.length,
      totalImages: totalImages,
      totalWords: totalWords,
      averageWordsPerPerson: people.length > 0 ? Math.round(totalWords / people.length) : 0,
      averageImagesPerPerson: people.length > 0 ? Math.round(totalImages / people.length) : 0,
      initialized: this.initialized,
      directoryPath: this.peopleDirectory,
      hasData: people.length > 0,
      serviceHealth: this.getServiceHealth()
    };
  }

  /**
   * Get detailed service health information
   * @returns {Object} Service health details
   */
  getServiceHealth() {
    const people = this.getAllPeople();
    const now = new Date();

    // Calculate health metrics
    const peopleWithImages = people.filter(p => p.images.length > 0).length;
    const peopleWithContent = people.filter(p => p.content.text && p.content.text.length > 50).length;
    const totalContentLength = people.reduce((sum, p) => sum + (p.content.text ? p.content.text.length : 0), 0);

    // Determine overall health status
    let status = 'healthy';
    let issues = [];

    if (!this.initialized) {
      status = 'failed';
      issues.push('Service not initialized');
    } else if (people.length === 0) {
      status = 'degraded';
      issues.push('No people data loaded');
    } else {
      if (peopleWithImages < people.length * 0.8) {
        status = 'degraded';
        issues.push(`${people.length - peopleWithImages} people missing images`);
      }
      if (peopleWithContent < people.length * 0.9) {
        status = 'degraded';
        issues.push(`${people.length - peopleWithContent} people with insufficient content`);
      }
    }

    return {
      status: status, // 'healthy', 'degraded', 'failed'
      initialized: this.initialized,
      dataLoaded: people.length > 0,
      peopleCount: people.length,
      peopleWithImages: peopleWithImages,
      peopleWithContent: peopleWithContent,
      averageContentLength: people.length > 0 ? Math.round(totalContentLength / people.length) : 0,
      issues: issues,
      lastChecked: now.toISOString(),
      uptime: this.initialized ? 'initialized' : 'not initialized'
    };
  }

  /**
   * Check if the service is ready to serve content
   * @returns {boolean} True if service is initialized and has data
   */
  isReady() {
    return this.initialized && this.people.size > 0;
  }

  /**
   * Get initialization status with detailed information
   * @returns {Object} Detailed status information
   */
  getInitializationStatus() {
    const health = this.getServiceHealth();

    return {
      initialized: this.initialized,
      hasData: this.people.size > 0,
      peopleCount: this.people.size,
      directoryExists: this.peopleDirectory ? true : false,
      directoryPath: this.peopleDirectory,
      ready: this.isReady(),
      health: health,
      canServeContent: this.initialized && this.people.size > 0,
      degradationMode: this.initialized && this.people.size === 0
    };
  }

  /**
   * Handle graceful degradation when service is not ready
   * @param {string} context - Context of the request (e.g., 'route', 'api', 'admin')
   * @returns {Object} Degradation response information
   */
  handleGracefulDegradation(context = 'general') {
    const status = this.getInitializationStatus();
    const health = status.health;

    const response = {
      available: false,
      reason: 'service_unavailable',
      message: 'The Interesanti section is temporarily unavailable',
      context: context,
      timestamp: new Date().toISOString()
    };

    if (!this.initialized) {
      response.reason = 'service_not_initialized';
      response.message = 'The people data service failed to initialize';
      response.technicalDetails = 'Service initialization failed during server startup';
      response.userMessage = 'This section is currently unavailable. Please try again later.';
    } else if (!status.hasData) {
      response.reason = 'no_data_available';
      response.message = 'No people profiles are currently available';
      response.technicalDetails = 'Service initialized but no valid people data was loaded';
      response.userMessage = 'No profiles are currently available in this section.';
    } else if (health.status === 'degraded') {
      response.available = true;
      response.reason = 'degraded_service';
      response.message = 'Service is running with limited functionality';
      response.technicalDetails = `Issues: ${health.issues.join(', ')}`;
      response.userMessage = 'Some content may be unavailable or incomplete.';
    }

    // Add recovery suggestions based on context
    if (context === 'admin') {
      response.recoverySuggestions = [
        'Check server logs for detailed error information',
        'Verify people directory structure and permissions',
        'Restart the server to retry initialization',
        'Check if people HTML files are valid and accessible'
      ];
    } else if (context === 'api') {
      response.retryAfter = 300; // 5 minutes
      response.fallbackEndpoints = [
        '/api/health/people',
        '/api/status'
      ];
    }

    return response;
  }

  /**
   * Attempt to recover from initialization failures
   * @returns {Promise<boolean>} True if recovery was successful
   */
  async attemptRecovery() {
    console.log('🔄 Attempting People Data Service recovery...');

    try {
      // Clear current state
      this.people.clear();
      this.initialized = false;

      // Attempt re-initialization
      await this.initialize();

      const stats = this.getStats();
      if (stats.hasData) {
        console.log('✅ Recovery successful - service restored with data');
        return true;
      } else {
        console.log('⚠️  Recovery partially successful - service initialized but no data loaded');
        return false;
      }
    } catch (error) {
      console.error('❌ Recovery failed:', error.message);
      return false;
    }
  }
}

// Create singleton instance
const peopleDataService = new PeopleDataService();

module.exports = peopleDataService;