#!/usr/bin/env node

/**
 * Create Admin User Script
 * Run this script to create an admin user for the dashboard
 */

const { AdminUser, initializeDatabase, database } = require('../src/models');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function questionHidden(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let password = '';
    
    const onData = (char) => {
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          console.log('');
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          process.exit();
          break;
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    };
    
    process.stdin.on('data', onData);
  });
}

async function createAdmin() {
  try {
    console.log('🔧 Admin User Creation Script');
    console.log('=============================\n');
    
    // Initialize database
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized\n');
    
    // Get user input
    const username = await question('Enter admin username: ');
    const email = await question('Enter admin email: ');
    const password = await questionHidden('Enter admin password: ');
    const confirmPassword = await questionHidden('Confirm admin password: ');
    
    rl.close();
    
    // Validate input
    if (!username || username.trim().length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Please enter a valid email address');
    }
    
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }
    
    // Check if username already exists
    const existingUser = await AdminUser.findByUsername(username.trim());
    if (existingUser) {
      throw new Error(`Username "${username}" already exists`);
    }
    
    // Check if email already exists
    const existingEmail = await AdminUser.findByEmail(email.trim());
    if (existingEmail) {
      throw new Error(`Email "${email}" already exists`);
    }
    
    // Create admin user
    console.log('\nCreating admin user...');
    const adminUser = new AdminUser({
      username: username.trim(),
      email: email.trim()
    });
    
    await adminUser.setPassword(password);
    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log(`\nAdmin Details:`);
    console.log(`- Username: ${adminUser.username}`);
    console.log(`- Email: ${adminUser.email}`);
    console.log(`- ID: ${adminUser.id}`);
    
    console.log('\n🚀 You can now access the admin dashboard at:');
    console.log('   http://localhost:3000/admin/login');
    
  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    if (database) {
      await database.close();
    }
  }
}

// Run if this script is executed directly
if (require.main === module) {
  createAdmin();
}

module.exports = createAdmin;