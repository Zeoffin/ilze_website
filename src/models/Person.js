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
}

module.exports = Person;