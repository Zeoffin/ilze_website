const database = require('./database');

class PeopleContent {
  constructor(data = {}) {
    this.id = data.id;
    this.personSlug = data.person_slug;
    this.personName = data.person_name;
    this.content = data.content;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.updatedBy = data.updated_by;
  }

  // Save content (create or update)
  async save() {
    const now = new Date().toISOString();
    
    if (this.id) {
      // Update existing content
      const result = await database.run(
        `UPDATE people_content 
         SET content = ?, updated_at = ?, updated_by = ?
         WHERE id = ?`,
        [this.content, now, this.updatedBy, this.id]
      );
      this.updatedAt = now;
      return result;
    } else {
      // Create new content
      const result = await database.run(
        `INSERT INTO people_content (person_slug, person_name, content, updated_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [this.personSlug, this.personName, this.content, this.updatedBy, now, now]
      );
      this.id = result.id;
      this.createdAt = now;
      this.updatedAt = now;
      return result;
    }
  }

  // Update content for existing record
  async update(content, updatedBy) {
    if (!this.id) {
      throw new Error('Cannot update: PeopleContent instance has no ID');
    }

    const now = new Date().toISOString();
    const result = await database.run(
      `UPDATE people_content 
       SET content = ?, updated_at = ?, updated_by = ?
       WHERE id = ?`,
      [content, now, updatedBy, this.id]
    );

    if (result.changes > 0) {
      this.content = content;
      this.updatedAt = now;
      this.updatedBy = updatedBy;
      return true;
    }
    return false;
  }

  // Find content by person slug
  static async findBySlug(slug) {
    const row = await database.get(
      'SELECT * FROM people_content WHERE person_slug = ?',
      [slug]
    );
    return row ? new PeopleContent(row) : null;
  }

  // Create new people content record
  static async create(data) {
    const { personSlug, personName, content, updatedBy } = data;
    
    // Validate required fields
    if (!personSlug || !personName || !content) {
      throw new Error('Missing required fields: personSlug, personName, and content are required');
    }

    const now = new Date().toISOString();
    const result = await database.run(
      `INSERT INTO people_content (person_slug, person_name, content, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [personSlug, personName, content, updatedBy || 'system', now, now]
    );

    // Return the created instance
    return new PeopleContent({
      id: result.id,
      person_slug: personSlug,
      person_name: personName,
      content: content,
      updated_by: updatedBy || 'system',
      created_at: now,
      updated_at: now
    });
  }

  // Get all people content
  static async getAll() {
    const rows = await database.all(
      'SELECT * FROM people_content ORDER BY person_name ASC'
    );
    return rows.map(row => new PeopleContent(row));
  }

  // Check if person content exists by slug
  static async exists(slug) {
    const row = await database.get(
      'SELECT 1 FROM people_content WHERE person_slug = ?',
      [slug]
    );
    return !!row;
  }

  // Delete content by slug
  static async deleteBySlug(slug) {
    const result = await database.run(
      'DELETE FROM people_content WHERE person_slug = ?',
      [slug]
    );
    return result.changes > 0;
  }

  // Get content count
  static async getCount() {
    const result = await database.get('SELECT COUNT(*) as count FROM people_content');
    return result.count;
  }

  // Find content by ID
  static async findById(id) {
    const row = await database.get('SELECT * FROM people_content WHERE id = ?', [id]);
    return row ? new PeopleContent(row) : null;
  }

  // Validate content data
  validate() {
    const errors = [];

    // Validate person slug
    if (!this.personSlug || typeof this.personSlug !== 'string') {
      errors.push('Person slug is required and must be a string');
    } else if (!/^[a-z0-9-]+$/.test(this.personSlug)) {
      errors.push('Person slug must contain only lowercase letters, numbers, and hyphens');
    } else if (this.personSlug.length < 2 || this.personSlug.length > 100) {
      errors.push('Person slug must be between 2 and 100 characters');
    }

    // Validate person name
    if (!this.personName || typeof this.personName !== 'string') {
      errors.push('Person name is required and must be a string');
    } else if (this.personName.trim().length === 0) {
      errors.push('Person name cannot be empty');
    } else if (this.personName.length > 255) {
      errors.push('Person name must be 255 characters or less');
    }

    // Validate content
    if (!this.content || typeof this.content !== 'string') {
      errors.push('Content is required and must be a string');
    } else if (this.content.trim().length === 0) {
      errors.push('Content cannot be empty');
    } else if (this.content.length < 10) {
      errors.push('Content must be at least 10 characters long');
    } else if (this.content.length > 50000) {
      errors.push('Content must be 50,000 characters or less');
    }

    // Validate updated_by if provided
    if (this.updatedBy && (typeof this.updatedBy !== 'string' || this.updatedBy.length > 100)) {
      errors.push('Updated by must be a string of 100 characters or less');
    }

    return errors;
  }

  // Validate slug format (static method for external use)
  static validateSlug(slug) {
    if (!slug || typeof slug !== 'string') {
      return false;
    }
    return /^[a-z0-9-]+$/.test(slug) && slug.length >= 2 && slug.length <= 100;
  }

  // Validate content length (static method for external use)
  static validateContent(content) {
    if (!content || typeof content !== 'string') {
      return false;
    }
    const trimmed = content.trim();
    return trimmed.length >= 10 && trimmed.length <= 50000;
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.id,
      personSlug: this.personSlug,
      personName: this.personName,
      content: this.content,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy
    };
  }

  // Get content preview (first 150 characters)
  getContentPreview(maxLength = 150) {
    if (!this.content) return '';
    
    const trimmed = this.content.trim();
    if (trimmed.length <= maxLength) {
      return trimmed;
    }
    
    // Find the last complete word within the limit
    const truncated = trimmed.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  // Get word count
  getWordCount() {
    if (!this.content) return 0;
    
    const words = this.content.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }

  // Get character count (excluding whitespace)
  getCharacterCount() {
    if (!this.content) return 0;
    return this.content.replace(/\s/g, '').length;
  }
}

module.exports = PeopleContent;