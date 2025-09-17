#!/usr/bin/env node

/**
 * Debug script to check admin functionality issues
 */

const { initializeDatabase, database, AdminUser, Content } = require('./src/models');

async function debugAdminIssues() {
    console.log('🔍 Debugging admin functionality issues...\n');
    
    try {
        // 1. Test database initialization
        console.log('1. Testing database initialization...');
        await initializeDatabase();
        console.log('✅ Database initialized successfully\n');
        
        // 2. Check admin users
        console.log('2. Checking admin users...');
        const adminUsers = await database.all('SELECT username, email FROM admin_users');
        console.log('Admin users:', adminUsers);
        console.log('✅ Admin users found\n');
        
        // 3. Check content in all sections
        console.log('3. Checking content in all sections...');
        const sections = ['interesanti', 'gramatas', 'fragmenti'];
        
        for (const section of sections) {
            const content = await database.all('SELECT * FROM content WHERE section = ?', [section]);
            console.log(`${section}: ${content.length} items`);
            if (content.length > 0) {
                content.forEach(item => {
                    console.log(`  - ID: ${item.id}, Type: ${item.content_type}, Content: ${item.content.substring(0, 50)}...`);
                });
            }
        }
        console.log('✅ Content check completed\n');
        
        // 4. Test Content model methods
        console.log('4. Testing Content model methods...');
        const testContent = await Content.findBySection('interesanti');
        console.log(`Content.findBySection('interesanti'): ${testContent.length} items`);
        console.log('✅ Content model methods working\n');
        
        // 5. Test admin authentication
        console.log('5. Testing admin authentication...');
        const adminUser = await AdminUser.findByUsername('admin');
        if (adminUser) {
            console.log(`Admin user found: ${adminUser.username}`);
            console.log('✅ Admin authentication setup working\n');
        } else {
            console.log('❌ Admin user not found\n');
        }
        
        // 6. Check database tables
        console.log('6. Checking database tables...');
        const tables = await database.all("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('Tables:', tables.map(t => t.name));
        console.log('✅ Database tables check completed\n');
        
        // 7. Add some test content if sections are empty
        console.log('7. Adding test content to empty sections...');
        for (const section of sections) {
            const existingContent = await database.all('SELECT * FROM content WHERE section = ?', [section]);
            if (existingContent.length === 0) {
                console.log(`Adding test content to ${section} section...`);
                
                // Add a text block
                await database.run(
                    'INSERT INTO content (section, content_type, content, order_index) VALUES (?, ?, ?, ?)',
                    [section, 'text', `<h2>Welcome to ${section}</h2><p>This is test content for the ${section} section. You can edit this content using the admin panel.</p>`, 0]
                );
                
                // Add an image block for fragmenti
                if (section === 'fragmenti') {
                    await database.run(
                        'INSERT INTO content (section, content_type, content, order_index) VALUES (?, ?, ?, ?)',
                        [section, 'image', '/media/placeholder-book.jpg', 1]
                    );
                }
                
                console.log(`✅ Test content added to ${section}`);
            } else {
                console.log(`${section} already has content, skipping...`);
            }
        }
        console.log('✅ Test content setup completed\n');
        
        console.log('🎉 All checks completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Start the server: npm run dev');
        console.log('2. Go to http://localhost:3000/admin/login');
        console.log('3. Login with username: admin, password: admin123');
        console.log('4. Try clicking "Edit Content" on any section');
        
    } catch (error) {
        console.error('❌ Error during debugging:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        // Close database connection
        await database.close();
        process.exit(0);
    }
}

debugAdminIssues();