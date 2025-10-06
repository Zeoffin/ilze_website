#!/usr/bin/env node

/**
 * Verification script to check people_content table structure
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../database.sqlite');

const verifyTable = async () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }

      console.log('Verifying people_content table structure...\n');

      // Check table exists
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='people_content'", (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          reject(new Error('people_content table does not exist'));
          return;
        }

        console.log('✅ people_content table exists');

        // Get table info
        db.all("PRAGMA table_info(people_content)", (err, columns) => {
          if (err) {
            reject(err);
            return;
          }

          console.log('\n📋 Table Structure:');
          columns.forEach(col => {
            console.log(`  - ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}`);
          });

          // Get indexes
          db.all("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='people_content'", (err, indexes) => {
            if (err) {
              reject(err);
              return;
            }

            console.log('\n🔍 Indexes:');
            indexes.forEach(idx => {
              if (idx.name.startsWith('idx_people_content')) {
                console.log(`  - ${idx.name}`);
              }
            });

            // Check foreign key constraints
            db.all("PRAGMA foreign_key_list(people_content)", (err, fks) => {
              if (err) {
                reject(err);
                return;
              }

              if (fks.length > 0) {
                console.log('\n🔗 Foreign Keys:');
                fks.forEach(fk => {
                  console.log(`  - ${fk.from} -> ${fk.table}.${fk.to}`);
                });
              }

              console.log('\n✅ Table verification completed successfully');
              
              db.close();
              resolve();
            });
          });
        });
      });
    });
  });
};

verifyTable()
  .then(() => {
    console.log('\nVerification script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });