#!/usr/bin/env node

/**
 * Database initialization script
 * Run this script to set up the SQLite database with all required tables and indexes
 */

const { initializeDatabase, database } = require('../src/models');

async function initDatabase() {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('Database initialization completed successfully!');
    
    // Close the database connection
    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;