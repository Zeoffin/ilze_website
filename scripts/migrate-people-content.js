#!/usr/bin/env node

/**
 * Migration script for people_content table
 * Creates the people_content table and indexes if they don't exist
 * This script can be run independently or as part of database initialization
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const DB_PATH = path.join(__dirname, '../database.sqlite');

class PeopleContentMigration {
  constructor() {
    this.db = null;
  }

  // Initialize database connection
  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database for people content migration');
          resolve();
        }
      });
    });
  }

  // Run SQL command with Promise wrapper
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

  // Get single row with Promise wrapper
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

  // Check if people_content table exists
  async tableExists() {
    const result = await this.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='people_content'"
    );
    return !!result;
  }

  // Create people_content table
  async createTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS people_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_slug TEXT UNIQUE NOT NULL,
        person_name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        FOREIGN KEY (updated_by) REFERENCES admin_users(username)
      )
    `;

    await this.run(createTableSQL);
    console.log('✅ people_content table created successfully');
  }

  // Create indexes for performance optimization
  async createIndexes() {
    const indexes = [
      {
        name: 'idx_people_content_slug',
        sql: 'CREATE INDEX IF NOT EXISTS idx_people_content_slug ON people_content(person_slug)'
      },
      {
        name: 'idx_people_content_updated',
        sql: 'CREATE INDEX IF NOT EXISTS idx_people_content_updated ON people_content(updated_at)'
      }
    ];

    for (const index of indexes) {
      await this.run(index.sql);
      console.log(`✅ Index ${index.name} created successfully`);
    }
  }

  // Verify table structure
  async verifyTable() {
    const tableInfo = await this.get("PRAGMA table_info(people_content)");
    if (!tableInfo) {
      throw new Error('people_content table was not created properly');
    }

    // Check if indexes exist
    const indexes = await this.get(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='index' AND tbl_name='people_content'"
    );
    
    console.log(`✅ Table verification complete - ${indexes.count} indexes created`);
  }

  // Run the complete migration
  async migrate() {
    try {
      console.log('Starting people_content table migration...');
      
      await this.connect();
      
      const exists = await this.tableExists();
      if (exists) {
        console.log('⚠️ people_content table already exists, skipping table creation');
      } else {
        await this.createTable();
      }
      
      await this.createIndexes();
      await this.verifyTable();
      
      console.log('✅ People content migration completed successfully');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      if (this.db) {
        this.db.close();
        console.log('Database connection closed');
      }
    }
  }

  // Close database connection
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

// Run migration if script is executed directly
if (require.main === module) {
  const migration = new PeopleContentMigration();
  migration.migrate()
    .then(() => {
      console.log('Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = PeopleContentMigration;