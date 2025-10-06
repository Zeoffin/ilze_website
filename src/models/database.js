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
      )`,

      // People content table for managing Interesanti people content
      `CREATE TABLE IF NOT EXISTS people_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_slug TEXT UNIQUE NOT NULL,
        person_name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        FOREIGN KEY (updated_by) REFERENCES admin_users(username)
      )`
    ];

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_content_section ON content(section)',
      'CREATE INDEX IF NOT EXISTS idx_content_order ON content(section, order_index)',
      'CREATE INDEX IF NOT EXISTS idx_admin_username ON admin_users(username)',
      'CREATE INDEX IF NOT EXISTS idx_contact_submitted ON contact_messages(submitted_at)',
      'CREATE INDEX IF NOT EXISTS idx_people_content_slug ON people_content(person_slug)',
      'CREATE INDEX IF NOT EXISTS idx_people_content_updated ON people_content(updated_at)'
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
      // Use environment variables for admin credentials
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || this.generateSecurePassword();
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

      const passwordHash = await bcrypt.hash(adminPassword, 12);

      await this.run(
        'INSERT INTO admin_users (username, password_hash, email) VALUES (?, ?, ?)',
        [adminUsername, passwordHash, adminEmail]
      );

      // Log different messages based on environment
      if (process.env.NODE_ENV === 'production') {
        console.log(`Admin user created: ${adminUsername}`);
        if (!process.env.ADMIN_PASSWORD) {
          console.log('⚠️  IMPORTANT: No ADMIN_PASSWORD set. Generated password:', adminPassword);
          console.log('⚠️  Please save this password and set ADMIN_PASSWORD environment variable');
        }
      } else {
        console.log(`Default admin user created (username: ${adminUsername}, password: ${adminPassword})`);
      }
    }
  }

  // Generate a secure random password
  generateSecurePassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // Wrapper for database.run with Promise
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
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