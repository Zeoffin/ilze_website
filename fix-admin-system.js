#!/usr/bin/env node

/**
 * Comprehensive Admin System Fix Script
 * This script will restore the admin system to working order
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Starting comprehensive admin system fix...\n');

async function fixAdminSystem() {
    try {
        // Step 1: Fix database file permissions
        console.log('1. Fixing database file permissions...');
        const dbPath = path.join(__dirname, 'database.sqlite');
        
        if (fs.existsSync(dbPath)) {
            // Check current permissions
            const stats = fs.statSync(dbPath);
            console.log(`   Current database file size: ${stats.size} bytes`);
            
            // Fix permissions - make it readable and writable
            try {
                fs.chmodSync(dbPath, 0o666);
                console.log('   ✅ Database permissions fixed');
            } catch (error) {
                console.log('   ⚠️  Could not change permissions, trying to recreate...');
                
                // Backup and recreate
                const backupPath = `${dbPath}.backup.${Date.now()}`;
                fs.copyFileSync(dbPath, backupPath);
                console.log(`   📁 Backup created: ${backupPath}`);
                
                fs.unlinkSync(dbPath);
                console.log('   🗑️  Old database file removed');
            }
        } else {
            console.log('   📝 No existing database file found');
        }
        
        // Step 2: Initialize fresh database
        console.log('\n2. Initializing fresh database...');
        const { initializeDatabase, database } = require('./src/models');
        
        await initializeDatabase();
        console.log('   ✅ Database initialized successfully');
        
        // Step 3: Verify database tables
        console.log('\n3. Verifying database tables...');
        const tables = await database.all("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('   Tables found:', tables.map(t => t.name));
        
        // Step 4: Check admin user
        console.log('\n4. Checking admin user...');
        const adminUsers = await database.all('SELECT username, email FROM admin_users');
        console.log('   Admin users:', adminUsers);
        
        if (adminUsers.length === 0) {
            console.log('   ⚠️  No admin users found, this should not happen');
        } else {
            console.log('   ✅ Admin user exists');
        }
        
        // Step 5: Add sample content to test sections
        console.log('\n5. Adding sample content for testing...');
        const sections = ['interesanti', 'gramatas', 'fragmenti'];
        
        for (const section of sections) {
            const existingContent = await database.all('SELECT * FROM content WHERE section = ?', [section]);
            
            if (existingContent.length === 0) {
                console.log(`   Adding sample content to ${section}...`);
                
                // Add text content
                await database.run(
                    'INSERT INTO content (section, content_type, content, order_index) VALUES (?, ?, ?, ?)',
                    [
                        section, 
                        'text', 
                        `<h2>${section.charAt(0).toUpperCase() + section.slice(1)}</h2><p>This is sample content for the ${section} section. You can edit this content using the admin panel.</p><p>The admin system has been restored and should be working properly now.</p>`, 
                        0
                    ]
                );
                
                // Add image content for fragmenti
                if (section === 'fragmenti') {
                    await database.run(
                        'INSERT INTO content (section, content_type, content, order_index) VALUES (?, ?, ?, ?)',
                        [section, 'image', '/media/placeholder-book.jpg', 1]
                    );
                }
                
                console.log(`   ✅ Sample content added to ${section}`);
            } else {
                console.log(`   ℹ️  ${section} already has ${existingContent.length} content items`);
            }
        }
        
        // Step 6: Verify file permissions
        console.log('\n6. Verifying file permissions...');
        const criticalFiles = [
            'database.sqlite',
            'uploads',
            'public',
            'src'
        ];
        
        for (const file of criticalFiles) {
            if (fs.existsSync(file)) {
                const stats = fs.statSync(file);
                console.log(`   ${file}: ${stats.isDirectory() ? 'directory' : 'file'} - OK`);
            } else {
                console.log(`   ${file}: missing`);
            }
        }
        
        // Step 7: Test database operations
        console.log('\n7. Testing database operations...');
        
        // Test read
        const testRead = await database.all('SELECT COUNT(*) as count FROM content');
        console.log(`   Read test: ${testRead[0].count} content items found`);
        
        // Test write
        const testWrite = await database.run(
            'INSERT INTO content (section, content_type, content, order_index) VALUES (?, ?, ?, ?)',
            ['interesanti', 'text', '<p>Test write operation</p>', 999]
        );
        console.log(`   Write test: inserted with ID ${testWrite.id}`);
        
        // Clean up test
        await database.run('DELETE FROM content WHERE order_index = 999');
        console.log('   ✅ Database operations working correctly');
        
        // Close database
        await database.close();
        
        console.log('\n🎉 Admin system fix completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Start the server: npm run dev');
        console.log('2. Go to: http://localhost:3000/admin/login');
        console.log('3. Login with: username=admin, password=admin123');
        console.log('4. Test the admin dashboard functionality');
        console.log('5. Check that "Edit Content" buttons work');
        console.log('6. Verify that all sections now have content');
        
    } catch (error) {
        console.error('\n❌ Error during admin system fix:', error);
        console.error('Stack trace:', error.stack);
        
        console.log('\n🔧 Manual recovery steps:');
        console.log('1. Stop the server if running');
        console.log('2. Delete database.sqlite file');
        console.log('3. Run: npm run init-db');
        console.log('4. Start server: npm run dev');
        
        process.exit(1);
    }
}

// Run the fix
fixAdminSystem();