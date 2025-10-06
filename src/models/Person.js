const PeopleContent = require('./PeopleContent');

/**
 * Person model class for representing individual people in the Interesanti section
 */
class Person {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.slug = data.slug;
    this.content = data.content || {};
    this.images = data.images || [];
    this.metadata = data.metadata || {};
  }

  /**
   * Factory method to create Person from directory data
   * @param {Object} directoryData - Raw data from PeopleDataService
   * @returns {Person} Person instance
   */
  static fromDirectory(directoryData) {
    if (!directoryData) {
      throw new Error('Directory data is required to create Person');
    }

    return new Person({
      id: directoryData.id,
      name: directoryData.name,
      slug: directoryData.slug,
      content: directoryData.content,
      images: directoryData.images,
      metadata: directoryData.metadata
    });
  }

  /**
   * Get the profile URL for this person
   * @returns {string} Profile URL
   */
  getProfileUrl() {
    return `/interesanti/${this.slug}`;
  }

  /**
   * Get the main image for this person (first image)
   * @returns {Object|null} Main image object or null if no images
   */
  getMainImage() {
    return this.images && this.images.length > 0 ? this.images[0] : null;
  }

  /**
   * Get a content preview for grid display
   * @param {number} length - Maximum length of preview (default: 150)
   * @returns {string} Truncated content preview
   */
  getContentPreview(length = 150) {
    if (!this.content || !this.content.text) {
      return '';
    }

    const text = this.content.text;
    if (text.length <= length) {
      return text;
    }

    // Find the last complete word within the length limit
    const truncated = text.substring(0, length);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > 0) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }

  /**
   * Get all images for this person
   * @returns {Array} Array of image objects
   */
  getAllImages() {
    return this.images || [];
  }

  /**
   * Get image count
   * @returns {number} Number of images
   */
  getImageCount() {
    return this.images ? this.images.length : 0;
  }

  /**
   * Get word count from metadata
   * @returns {number} Word count
   */
  getWordCount() {
    return this.metadata && this.metadata.wordCount ? this.metadata.wordCount : 0;
  }

  /**
   * Check if person has content
   * @returns {boolean} True if person has content
   */
  hasContent() {
    return this.content && this.content.text && this.content.text.length > 0;
  }

  /**
   * Check if person has images
   * @returns {boolean} True if person has images
   */
  hasImages() {
    return this.images && this.images.length > 0;
  }

  /**
   * Get formatted last modified date
   * @returns {string} Formatted date string
   */
  getLastModified() {
    if (this.metadata && this.metadata.lastModified) {
      return new Date(this.metadata.lastModified).toLocaleDateString('lv-LV');
    }
    return '';
  }

  /**
   * Get HTML content for rendering
   * @returns {string} HTML content
   */
  getHtmlContent() {
    return this.content && this.content.html ? this.content.html : '';
  }

  /**
   * Get plain text content
   * @returns {string} Plain text content
   */
  getTextContent() {
    return this.content && this.content.text ? this.content.text : '';
  }

  /**
   * Get image captions
   * @returns {Array} Array of image caption objects
   */
  getImageCaptions() {
    return this.content && this.content.imageCaptions ? this.content.imageCaptions : [];
  }

  /**
   * Validate person data
   * @returns {Array} Array of validation errors
   */
  validate() {
    const errors = [];

    if (!this.id || this.id.trim().length === 0) {
      errors.push('Person ID is required');
    }

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Person name is required');
    }

    if (!this.slug || this.slug.trim().length === 0) {
      errors.push('Person slug is required');
    }

    if (!this.hasContent()) {
      errors.push('Person content is required');
    }

    if (this.content && this.content.text && this.content.text.length < 50) {
      errors.push('Person content is too short (minimum 50 characters)');
    }

    // Validate slug format (URL-friendly)
    if (this.slug && !/^[a-z0-9-]+$/.test(this.slug)) {
      errors.push('Person slug must contain only lowercase letters, numbers, and hyphens');
    }

    return errors;
  }

  /**
   * Convert to JSON for API responses
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      content: this.content,
      images: this.images,
      metadata: this.metadata,
      profileUrl: this.getProfileUrl(),
      mainImage: this.getMainImage(),
      imageCount: this.getImageCount(),
      wordCount: this.getWordCount(),
      hasContent: this.hasContent(),
      hasImages: this.hasImages(),
      lastModified: this.getLastModified()
    };
  }

  /**
   * Convert to simplified JSON for grid display
   * @returns {Object} Simplified JSON representation
   */
  toGridJSON() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      profileUrl: this.getProfileUrl(),
      mainImage: this.getMainImage(),
      contentPreview: this.getContentPreview(120),
      imageCount: this.getImageCount(),
      wordCount: this.getWordCount()
    };
  }

  /**
   * Convert to detailed JSON for profile pages
   * @returns {Object} Detailed JSON representation
   */
  toProfileJSON() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      content: {
        html: this.getHtmlContent(),
        text: this.getTextContent(),
        imageCaptions: this.getImageCaptions()
      },
      images: this.getAllImages(),
      metadata: this.metadata,
      profileUrl: this.getProfileUrl(),
      lastModified: this.getLastModified()
    };
  }

  /**
   * Get content from database for this person
   * @returns {Promise<Object|null>} Content object from database or null if not found
   */
  static async getFromDatabase(slug) {
    try {
      if (!slug) {
        console.warn('⚠️  Slug is required to retrieve person from database');
        return null;
      }

      const dbContent = await PeopleContent.findBySlug(slug);
      
      if (dbContent) {
        return {
          text: dbContent.content,
          html: Person.processTextToHtml(dbContent.content),
          lastUpdated: dbContent.updatedAt,
          updatedBy: dbContent.updatedBy,
          source: 'database'
        };
      }
      
      return null;
    } catch (error) {
      console.warn(`⚠️  Could not retrieve person from database with slug '${slug}': ${error.message}`);
      // Return null instead of throwing - this allows fallback to file content
      return null;
    }
  }

  /**
   * Update content in database for this person
   * @param {string} content - New content text
   * @param {string} updatedBy - Username of person making update
   * @returns {Promise<boolean>} Success status
   */
  async updateContent(content, updatedBy) {
    try {
      if (!this.slug) {
        throw new Error('Person slug is required to update content');
      }

      if (!content || typeof content !== 'string') {
        throw new Error('Content must be a non-empty string');
      }

      if (content.trim().length < 10) {
        throw new Error('Content must be at least 10 characters long');
      }

      if (content.length > 50000) {
        throw new Error('Content must be 50,000 characters or less');
      }

      // Check if person exists in database
      const dbContent = await PeopleContent.findBySlug(this.slug);
      
      if (dbContent) {
        // Update existing content
        const success = await dbContent.update(content, updatedBy || 'system');
        
        if (success) {
          // Update local content object to reflect database changes
          this.content = {
            ...this.content,
            text: content,
            html: Person.processTextToHtml(content),
            lastUpdated: new Date().toISOString(),
            updatedBy: updatedBy || 'system',
            source: 'database'
          };

          // Update metadata
          this.metadata = {
            ...this.metadata,
            lastModified: new Date(),
            wordCount: content.split(' ').filter(word => word.length > 0).length,
            contentLength: content.length,
            source: 'database'
          };

          console.log(`✅ Successfully updated content for ${this.name} (${content.length} characters)`);
          return true;
        }
        
        return false;
      } else {
        // Create new database record if it doesn't exist
        const newContent = await PeopleContent.create({
          personSlug: this.slug,
          personName: this.name,
          content: content,
          updatedBy: updatedBy || 'system'
        });

        if (newContent) {
          // Update local content object
          this.content = {
            ...this.content,
            text: content,
            html: Person.processTextToHtml(content),
            lastUpdated: newContent.updatedAt,
            updatedBy: newContent.updatedBy,
            source: 'database'
          };

          // Update metadata
          this.metadata = {
            ...this.metadata,
            lastModified: new Date(newContent.updatedAt),
            wordCount: content.split(' ').filter(word => word.length > 0).length,
            contentLength: content.length,
            source: 'database'
          };

          console.log(`✅ Successfully created new content for ${this.name} (${content.length} characters)`);
          return true;
        }

        return false;
      }
    } catch (error) {
      console.error(`Error updating content for person '${this.slug}':`, error);
      throw new Error(`Failed to update person content: ${error.message}`);
    }
  }

  /**
   * Create Person instance with database content
   * @param {string} slug - Person's slug
   * @returns {Promise<Person|null>} Person instance with database content or null if not found
   */
  static async createFromDatabase(slug) {
    try {
      if (!slug) {
        throw new Error('Slug is required to create person from database');
      }

      const dbContent = await PeopleContent.findBySlug(slug);
      
      if (!dbContent) {
        return null;
      }

      // Create person instance with database content
      const personData = {
        id: dbContent.personSlug,
        name: dbContent.personName,
        slug: dbContent.personSlug,
        content: {
          text: dbContent.content,
          html: Person.processTextToHtml(dbContent.content),
          lastUpdated: dbContent.updatedAt,
          updatedBy: dbContent.updatedBy,
          source: 'database'
        },
        images: [], // Images will be populated separately from file system
        metadata: {
          lastModified: new Date(dbContent.updatedAt),
          wordCount: dbContent.content.split(' ').filter(word => word.length > 0).length,
          imageCount: 0, // Will be updated when images are loaded
          hasContent: true,
          contentLength: dbContent.content.length,
          source: 'database'
        }
      };

      return new Person(personData);
    } catch (error) {
      console.error(`Error creating person from database with slug '${slug}':`, error);
      throw new Error(`Failed to create person from database: ${error.message}`);
    }
  }

  /**
   * Check if person has database content
   * @returns {Promise<boolean>} True if person exists in database
   */
  async hasDatabase() {
    try {
      if (!this.slug) {
        return false;
      }

      return await PeopleContent.exists(this.slug);
    } catch (error) {
      console.error(`Error checking database existence for person '${this.slug}':`, error);
      return false;
    }
  }

  /**
   * Get content source (database or file)
   * @returns {string} Content source ('database', 'file', or 'unknown')
   */
  getContentSource() {
    if (this.content && this.content.source) {
      return this.content.source;
    }
    
    if (this.metadata && this.metadata.source) {
      return this.metadata.source;
    }
    
    return 'unknown';
  }

  /**
   * Process plain text to HTML (basic conversion)
   * @param {string} text - Plain text content
   * @returns {string} HTML content
   */
  static processTextToHtml(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    // Basic text to HTML conversion
    // Split by double newlines for paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    
    const htmlParagraphs = paragraphs
      .filter(p => p.trim().length > 0)
      .map(paragraph => {
        // Replace single newlines with <br> within paragraphs
        const processedParagraph = paragraph.trim().replace(/\n/g, '<br>');
        return `<p>${processedParagraph}</p>`;
      });

    return htmlParagraphs.join('\n');
  }

  /**
   * Merge database content with existing person data
   * This method updates the current person instance with database content while preserving images
   * @param {string} updatedBy - Username for tracking who requested the merge
   * @returns {Promise<boolean>} Success status
   */
  async mergeWithDatabase(updatedBy = 'system') {
    try {
      if (!this.slug) {
        console.warn(`⚠️  Cannot merge with database: Person slug is missing for ${this.name || 'unknown person'}`);
        return false;
      }

      const dbContent = await Person.getFromDatabase(this.slug);
      
      if (dbContent) {
        // Update content with database version
        this.content = {
          ...this.content,
          ...dbContent
        };

        // Update metadata to reflect database source
        this.metadata = {
          ...this.metadata,
          lastModified: new Date(dbContent.lastUpdated),
          wordCount: dbContent.text.split(' ').filter(word => word.length > 0).length,
          contentLength: dbContent.text.length,
          source: 'database'
        };

        console.log(`✅ Successfully merged ${this.name} with database content`);
        return true;
      }

      console.log(`ℹ️  No database content found for ${this.name}, keeping file content`);
      return false;
    } catch (error) {
      console.warn(`⚠️  Could not merge ${this.name} with database content: ${error.message}`);
      // Don't throw error - fallback to file content is acceptable
      return false;
    }
  }

  /**
   * Enhanced validation that includes database content validation
   * @returns {Array} Array of validation errors
   */
  validate() {
    const errors = [];

    if (!this.id || this.id.trim().length === 0) {
      errors.push('Person ID is required');
    }

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Person name is required');
    }

    if (!this.slug || this.slug.trim().length === 0) {
      errors.push('Person slug is required');
    }

    if (!this.hasContent()) {
      errors.push('Person content is required');
    }

    if (this.content && this.content.text && this.content.text.length < 50) {
      errors.push('Person content is too short (minimum 50 characters)');
    }

    // Enhanced content length validation for database content
    if (this.content && this.content.text && this.content.text.length > 50000) {
      errors.push('Person content is too long (maximum 50,000 characters)');
    }

    // Validate slug format (URL-friendly)
    if (this.slug && !/^[a-z0-9-]+$/.test(this.slug)) {
      errors.push('Person slug must contain only lowercase letters, numbers, and hyphens');
    }

    // Validate content source if specified
    if (this.content && this.content.source && !['database', 'file'].includes(this.content.source)) {
      errors.push('Content source must be either "database" or "file"');
    }

    return errors;
  }

  /**
   * Enhanced toJSON that includes database information
   * @returns {Object} JSON representation with database info
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      content: this.content,
      images: this.images,
      metadata: this.metadata,
      profileUrl: this.getProfileUrl(),
      mainImage: this.getMainImage(),
      imageCount: this.getImageCount(),
      wordCount: this.getWordCount(),
      hasContent: this.hasContent(),
      hasImages: this.hasImages(),
      lastModified: this.getLastModified(),
      contentSource: this.getContentSource()
    };
  }
}

module.exports = Person;