const database = require('./database');
const Content = require('./Content');
const AdminUser = require('./AdminUser');
const ContactMessage = require('./ContactMessage');
const Person = require('./Person');
const PeopleRepository = require('./PeopleRepository');
const peopleDataService = require('../services/PeopleDataService');

// Initialize database when models are imported
let initialized = false;

// Create people repository instance
const peopleRepository = new PeopleRepository(peopleDataService);

const initializeDatabase = async () => {
  if (!initialized) {
    try {
      console.log('Initializing database...');
      await database.initialize();
      console.log('Database initialized successfully');
      
      // Initialize people data service and repository with enhanced error handling
      console.log('Initializing people data service...');
      const peopleInitStartTime = Date.now();
      
      try {
        // Initialize people data service
        await peopleDataService.initialize();
        
        // Initialize people repository
        await peopleRepository.initialize();
        
        const peopleInitDuration = Date.now() - peopleInitStartTime;
        console.log(`People data service and repository initialized successfully in ${peopleInitDuration}ms`);
        
        // Validate initialization results
        const stats = peopleDataService.getStats();
        if (!stats.hasData) {
          console.warn('⚠️ People data service initialized but no people data was loaded');
          console.warn('   This may be due to:');
          console.warn('   - Empty people directory');
          console.warn('   - Invalid HTML files in people directories');
          console.warn('   - Permission issues reading files');
          console.warn('   - Malformed directory structure');
        }
        
      } catch (peopleError) {
        const peopleInitDuration = Date.now() - peopleInitStartTime;
        console.error(`❌ Failed to initialize people data service after ${peopleInitDuration}ms`);
        console.error('Error details:', {
          name: peopleError.name,
          message: peopleError.message,
          stack: process.env.NODE_ENV === 'development' ? peopleError.stack : undefined
        });
        
        // Log specific error guidance
        if (peopleError.message.includes('People directory not accessible')) {
          console.error('💡 People directory issue:');
          console.error('   - Verify public/media/people directory exists');
          console.error('   - Check directory permissions (should be readable)');
          console.error('   - Ensure path is correct relative to server root');
        } else if (peopleError.message.includes('ENOENT')) {
          console.error('💡 File not found issue:');
          console.error('   - Check if people subdirectories exist');
          console.error('   - Verify HTML files are present in people directories');
          console.error('   - Ensure file names don\'t contain special characters');
        } else if (peopleError.message.includes('EACCES')) {
          console.error('💡 Permission issue:');
          console.error('   - Check file/directory permissions');
          console.error('   - Ensure server process has read access');
          console.error('   - Verify ownership of files and directories');
        } else {
          console.error('💡 General people service issue:');
          console.error('   - Check server logs for more details');
          console.error('   - Verify people directory structure');
          console.error('   - Ensure HTML files are valid');
        }
        
        console.warn('⚠️ Continuing without people data - Interesanti section will show error messages');
        console.warn('   Users accessing /interesanti routes will see service unavailable messages');
        console.warn('   The rest of the website will function normally');
        
        // Don't throw - allow database initialization to complete
        // The server will handle graceful degradation for people routes
      }
      
      initialized = true;
      console.log('✅ Database initialization completed');
      
      // Log final initialization summary
      const finalStats = peopleDataService.getStats();
      console.log('\n--- Initialization Summary ---');
      console.log(`Database: ✅ Initialized`);
      console.log(`People Service: ${finalStats.initialized ? '✅' : '❌'} ${finalStats.initialized ? 'Initialized' : 'Failed'}`);
      console.log(`People Data: ${finalStats.hasData ? '✅' : '⚠️'} ${finalStats.hasData ? `${finalStats.totalPeople} profiles loaded` : 'No data available'}`);
      
    } catch (error) {
      console.error('❌ Critical failure during database initialization:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      
      // Log troubleshooting guidance for database errors
      if (error.message.includes('SQLITE') || error.code === 'SQLITE_CANTOPEN') {
        console.error('💡 Database file issue:');
        console.error('   - Check if database.sqlite file exists and is accessible');
        console.error('   - Verify database file permissions');
        console.error('   - Ensure sufficient disk space');
        console.error('   - Check if database file is corrupted');
      } else if (error.code === 'EACCES') {
        console.error('💡 Permission issue:');
        console.error('   - Check database file permissions');
        console.error('   - Ensure server process has read/write access');
        console.error('   - Verify directory permissions');
      } else {
        console.error('💡 General database issue:');
        console.error('   - Check server configuration');
        console.error('   - Verify environment variables');
        console.error('   - Ensure all dependencies are installed');
      }
      
      throw error;
    }
  } else {
    console.log('Database already initialized, skipping...');
  }
};

// Export models and database utilities
module.exports = {
  database,
  Content,
  AdminUser,
  ContactMessage,
  Person,
  PeopleRepository,
  peopleDataService,
  peopleRepository,
  initializeDatabase
};