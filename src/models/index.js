const database = require('./database');
const Content = require('./Content');
const AdminUser = require('./AdminUser');
const ContactMessage = require('./ContactMessage');

// Initialize database when models are imported
let initialized = false;

const initializeDatabase = async () => {
  if (!initialized) {
    try {
      await database.initialize();
      initialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }
};

// Export models and database utilities
module.exports = {
  database,
  Content,
  AdminUser,
  ContactMessage,
  initializeDatabase
};