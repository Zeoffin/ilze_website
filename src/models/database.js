const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Database file path
const DB_PATH = path.join(__dirname, '../../database.sqlite');

class Database {
  constructor() {
    this.db = null;
  }

  // Initialize database connection and create tables
  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  // Create all required tables
  async createTables() {
    const tables = [
      // Content table for managing website sections
      `CREATE TABLE IF NOT EXISTS content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section TEXT NOT NULL CHECK(section IN ('interesanti', 'gramatas', 'fragmenti')),
        content_type TEXT NOT NULL CHECK(content_type IN ('text', 'image')),
        content TEXT NOT NULL,
        order_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Admin users table
      `CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )`,

      // Contact messages table
      `CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'sent' CHECK(status IN ('sent', 'failed'))
      )`
    ];

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_content_section ON content(section)',
      'CREATE INDEX IF NOT EXISTS idx_content_order ON content(section, order_index)',
      'CREATE INDEX IF NOT EXISTS idx_admin_username ON admin_users(username)',
      'CREATE INDEX IF NOT EXISTS idx_contact_submitted ON contact_messages(submitted_at)'
    ];

    // Create tables
    for (const table of tables) {
      await this.run(table);
    }

    // Create indexes
    for (const index of indexes) {
      await this.run(index);
    }

    // Create default admin user if none exists
    await this.createDefaultAdmin();
  }

  // Create default admin user
  async createDefaultAdmin() {
    const existingAdmin = await this.get('SELECT id FROM admin_users LIMIT 1');
    if (!existingAdmin) {
      const defaultPassword = 'admin123'; // Should be changed in production
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      
      await this.run(
        'INSERT INTO admin_users (username, password_hash, email) VALUES (?, ?, ?)',
        ['admin', passwordHash, 'admin@example.com']
      );
      console.log('Default admin user created (username: admin, password: admin123)');
    }
  }

  // Wrapper for database.run with Promise
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // Wrapper for database.get with Promise
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Wrapper for database.all with Promise
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Close database connection
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;