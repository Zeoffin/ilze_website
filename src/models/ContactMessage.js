const database = require('./database');

class ContactMessage {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.message = data.message;
    this.submitted_at = data.submitted_at;
    this.status = data.status || 'sent';
  }

  // Save contact message
  async save() {
    const now = new Date().toISOString();
    
    if (this.id) {
      // Update existing message (mainly for status updates)
      const result = await database.run(
        `UPDATE contact_messages 
         SET name = ?, email = ?, message = ?, status = ?
         WHERE id = ?`,
        [this.name, this.email, this.message, this.status, this.id]
      );
      return result;
    } else {
      // Create new contact message
      const result = await database.run(
        `INSERT INTO contact_messages (name, email, message, submitted_at, status)
         VALUES (?, ?, ?, ?, ?)`,
        [this.name, this.email, this.message, now, this.status]
      );
      this.id = result.id;
      this.submitted_at = now;
      return result;
    }
  }

  // Update message status
  async updateStatus(status) {
    if (!['sent', 'failed'].includes(status)) {
      throw new Error('Invalid status. Must be "sent" or "failed"');
    }
    
    this.status = status;
    if (this.id) {
      await database.run(
        'UPDATE contact_messages SET status = ? WHERE id = ?',
        [this.status, this.id]
      );
    }
  }

  // Find contact message by ID
  static async findById(id) {
    const row = await database.get('SELECT * FROM contact_messages WHERE id = ?', [id]);
    return row ? new ContactMessage(row) : null;
  }

  // Get all contact messages
  static async findAll(limit = null, offset = 0) {
    let query = 'SELECT * FROM contact_messages ORDER BY submitted_at DESC';
    let params = [];
    
    if (limit) {
      query += ' LIMIT ? OFFSET ?';
      params = [limit, offset];
    }
    
    const rows = await database.all(query, params);
    return rows.map(row => new ContactMessage(row));
  }

  // Find messages by status
  static async findByStatus(status) {
    const rows = await database.all(
      'SELECT * FROM contact_messages WHERE status = ? ORDER BY submitted_at DESC',
      [status]
    );
    return rows.map(row => new ContactMessage(row));
  }

  // Find messages by email
  static async findByEmail(email) {
    const rows = await database.all(
      'SELECT * FROM contact_messages WHERE email = ? ORDER BY submitted_at DESC',
      [email]
    );
    return rows.map(row => new ContactMessage(row));
  }

  // Find messages within date range
  static async findByDateRange(startDate, endDate) {
    const rows = await database.all(
      `SELECT * FROM contact_messages 
       WHERE submitted_at >= ? AND submitted_at <= ?
       ORDER BY submitted_at DESC`,
      [startDate, endDate]
    );
    return rows.map(row => new ContactMessage(row));
  }

  // Get recent messages (last N days)
  static async findRecent(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const rows = await database.all(
      `SELECT * FROM contact_messages 
       WHERE submitted_at >= ?
       ORDER BY submitted_at DESC`,
      [startDate.toISOString()]
    );
    return rows.map(row => new ContactMessage(row));
  }

  // Delete contact message by ID
  static async deleteById(id) {
    const result = await database.run('DELETE FROM contact_messages WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // Get message count
  static async getCount() {
    const result = await database.get('SELECT COUNT(*) as count FROM contact_messages');
    return result.count;
  }

  // Get message count by status
  static async getCountByStatus(status) {
    const result = await database.get(
      'SELECT COUNT(*) as count FROM contact_messages WHERE status = ?',
      [status]
    );
    return result.count;
  }

  // Search messages by name or email
  static async search(searchTerm) {
    const term = `%${searchTerm}%`;
    const rows = await database.all(
      `SELECT * FROM contact_messages 
       WHERE name LIKE ? OR email LIKE ? OR message LIKE ?
       ORDER BY submitted_at DESC`,
      [term, term, term]
    );
    return rows.map(row => new ContactMessage(row));
  }

  // Validate contact message data
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (this.name && this.name.length > 100) {
      errors.push('Name must be less than 100 characters');
    }

    if (!this.email || this.email.trim().length === 0) {
      errors.push('Email is required');
    }

    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push('Invalid email format');
    }

    if (!this.message || this.message.trim().length === 0) {
      errors.push('Message is required');
    }

    if (this.message && this.message.length > 2000) {
      errors.push('Message must be less than 2000 characters');
    }

    if (this.status && !['sent', 'failed'].includes(this.status)) {
      errors.push('Status must be either "sent" or "failed"');
    }

    return errors;
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      message: this.message,
      submitted_at: this.submitted_at,
      status: this.status
    };
  }

  // Convert to summary JSON (for lists)
  toSummaryJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      message: this.message.length > 100 ? this.message.substring(0, 100) + '...' : this.message,
      submitted_at: this.submitted_at,
      status: this.status
    };
  }
}

module.exports = ContactMessage;