const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');

console.log('Testing database connection...');
console.log('Database path:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    } else {
        console.log('✅ Connected to SQLite database');
        
        // Check tables
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
            if (err) {
                console.error('Error querying tables:', err);
            } else {
                console.log('Tables:', tables);
                
                // Check content
                db.all("SELECT section, COUNT(*) as count FROM content GROUP BY section", (err, content) => {
                    if (err) {
                        console.error('Error querying content:', err);
                    } else {
                        console.log('Content by section:', content);
                    }
                    
                    // Check admin users
                    db.all("SELECT username FROM admin_users", (err, users) => {
                        if (err) {
                            console.error('Error querying admin users:', err);
                        } else {
                            console.log('Admin users:', users);
                        }
                        
                        db.close();
                    });
                });
            }
        });
    }
});