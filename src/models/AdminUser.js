const database = require('./database');
const bcrypt = require('bcrypt');

class AdminUser {
  constructor(data = {}) {
    this.id = data.id;
    this.username = data.username;
    this.password_hash = data.password_hash;
    this.email = data.email;
    this.created_at = data.created_at;
    this.last_login = data.last_login;
  }

  // Create new admin user
  async save() {
    const now = new Date().toISOString();
    
    if (this.id) {
      // Update existing admin user
      const result = await database.run(
        `UPDATE admin_users 
         SET username = ?, email = ?, last_login = ?
         WHERE id = ?`,
        [this.username, this.email, this.last_login, this.id]
      );
      return result;
    } else {
      // Create new admin user
      const result = await database.run(
        `INSERT INTO admin_users (username, password_hash, email, created_at)
         VALUES (?, ?, ?, ?)`,
        [this.username, this.password_hash, this.email, now]
      );
      this.id = result.id;
      this.created_at = now;
      return result;
    }
  }

  // Set password (hashes it automatically)
  async setPassword(plainPassword) {
    this.password_hash = await bcrypt.hash(plainPassword, 10);
  }

  // Verify password
  async verifyPassword(plainPassword) {
    return await bcrypt.compare(plainPassword, this.password_hash);
  }

  // Update last login timestamp
  async updateLastLogin() {
    this.last_login = new Date().toISOString();
    if (this.id) {
      await database.run(
        'UPDATE admin_users SET last_login = ? WHERE id = ?',
        [this.last_login, this.id]
      );
    }
  }

  // Find admin user by ID
  static async findById(id) {
    const row = await database.get('SELECT * FROM admin_users WHERE id = ?', [id]);
    return row ? new AdminUser(row) : null;
  }

  // Find admin user by username
  static async findByUsername(username) {
    const row = await database.get('SELECT * FROM admin_users WHERE username = ?', [username]);
    return row ? new AdminUser(row) : null;
  }

  // Find admin user by email
  static async findByEmail(email) {
    const row = await database.get('SELECT * FROM admin_users WHERE email = ?', [email]);
    return row ? new AdminUser(row) : null;
  }

  // Get all admin users
  static async findAll() {
    const rows = await database.all('SELECT * FROM admin_users ORDER BY created_at ASC');
    return rows.map(row => new AdminUser(row));
  }

  // Delete admin user by ID
  static async deleteById(id) {
    const result = await database.run('DELETE FROM admin_users WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // Authenticate user with username and password
  static async authenticate(username, password) {
    const user = await AdminUser.findByUsername(username);
    if (user && await user.verifyPassword(password)) {
      await user.updateLastLogin();
      return user;
    }
    return null;
  }

  // Check if username is available
  static async isUsernameAvailable(username, excludeId = null) {
    let query = 'SELECT id FROM admin_users WHERE username = ?';
    let params = [username];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const existing = await database.get(query, params);
    return !existing;
  }

  // Check if email is available
  static async isEmailAvailable(email, excludeId = null) {
    let query = 'SELECT id FROM admin_users WHERE email = ?';
    let params = [email];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const existing = await database.get(query, params);
    return !existing;
  }

  // Validate admin user data
  validate() {
    const errors = [];

    if (!this.username || this.username.trim().length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (this.username && !/^[a-zA-Z0-9_]+$/.test(this.username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push('Invalid email format');
    }

    return errors;
  }

  // Convert to JSON for API responses (excludes password hash)
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      created_at: this.created_at,
      last_login: this.last_login
    };
  }

  // Convert to safe JSON (minimal info for session storage)
  toSafeJSON() {
    return {
      id: this.id,
      username: this.username
    };
  }
}

module.exports = AdminUser;