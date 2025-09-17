const database = require('./database');

class Content {
  constructor(data = {}) {
    this.id = data.id;
    this.section = data.section;
    this.content_type = data.content_type;
    this.content = data.content;
    this.order_index = data.order_index || 0;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create new content entry
  async save() {
    const now = new Date().toISOString();
    
    if (this.id) {
      // Update existing content
      const result = await database.run(
        `UPDATE content 
         SET section = ?, content_type = ?, content = ?, order_index = ?, updated_at = ?
         WHERE id = ?`,
        [this.section, this.content_type, this.content, this.order_index, now, this.id]
      );
      this.updated_at = now;
      return result;
    } else {
      // Create new content
      const result = await database.run(
        `INSERT INTO content (section, content_type, content, order_index, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [this.section, this.content_type, this.content, this.order_index, now, now]
      );
      this.id = result.id;
      this.created_at = now;
      this.updated_at = now;
      return result;
    }
  }

  // Find content by ID
  static async findById(id) {
    const row = await database.get('SELECT * FROM content WHERE id = ?', [id]);
    return row ? new Content(row) : null;
  }

  // Find all content for a specific section
  static async findBySection(section) {
    const rows = await database.all(
      'SELECT * FROM content WHERE section = ? ORDER BY order_index ASC, created_at ASC',
      [section]
    );
    return rows.map(row => new Content(row));
  }

  // Find content by section and type
  static async findBySectionAndType(section, contentType) {
    const rows = await database.all(
      'SELECT * FROM content WHERE section = ? AND content_type = ? ORDER BY order_index ASC',
      [section, contentType]
    );
    return rows.map(row => new Content(row));
  }

  // Get all content
  static async findAll() {
    const rows = await database.all('SELECT * FROM content ORDER BY section, order_index ASC');
    return rows.map(row => new Content(row));
  }

  // Delete content by ID
  static async deleteById(id) {
    const result = await database.run('DELETE FROM content WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // Update content order within a section
  static async updateOrder(section, contentIds) {
    const promises = contentIds.map((id, index) => 
      database.run('UPDATE content SET order_index = ? WHERE id = ? AND section = ?', [index, id, section])
    );
    await Promise.all(promises);
  }

  // Get content count by section
  static async getCountBySection(section) {
    const result = await database.get('SELECT COUNT(*) as count FROM content WHERE section = ?', [section]);
    return result.count;
  }

  // Validate content data
  validate() {
    const errors = [];

    if (!this.section || !['interesanti', 'gramatas', 'fragmenti'].includes(this.section)) {
      errors.push('Section must be one of: interesanti, gramatas, fragmenti');
    }

    if (!this.content_type || !['text', 'image'].includes(this.content_type)) {
      errors.push('Content type must be either text or image');
    }

    if (!this.content || this.content.trim().length === 0) {
      errors.push('Content cannot be empty');
    }

    if (this.order_index !== undefined && (isNaN(this.order_index) || this.order_index < 0)) {
      errors.push('Order index must be a non-negative number');
    }

    return errors;
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.id,
      section: this.section,
      content_type: this.content_type,
      content: this.content,
      order_index: this.order_index,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Content;