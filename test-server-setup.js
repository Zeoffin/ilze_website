// Simple test to verify server setup without running the server
const express = require('express');

try {
  // Test importing routes
  const adminRoutes = require('./src/routes/admin');
  const apiRoutes = require('./src/routes/api');
  const { requireAuth, requireGuest, addAuthStatus } = require('./src/middleware/auth');
  const { Content, AdminUser, ContactMessage } = require('./src/models');
  
  console.log('✓ All imports successful');
  console.log('✓ Admin routes loaded');
  console.log('✓ API routes loaded');
  console.log('✓ Auth middleware loaded');
  console.log('✓ Models loaded');
  
  // Test Express app creation
  const app = express();
  app.use('/admin', adminRoutes);
  app.use('/api', apiRoutes);
  
  console.log('✓ Express app setup successful');
  console.log('✓ Routes mounted successfully');
  
  console.log('\nServer setup verification complete!');
  
} catch (error) {
  console.error('❌ Error in server setup:', error.message);
  console.error(error.stack);
}