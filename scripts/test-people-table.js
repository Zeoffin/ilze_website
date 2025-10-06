#!/usr/bin/env node

/**
 * Test script to verify people_content table functionality
 */

const { database } = require('../src/models');

const testPeopleTable = async () => {
  try {
    console.log('Testing people_content table functionality...\n');

    // Initialize database
    await database.initialize();
    console.log('✅ Database initialized');

    // Test inserting a record
    const testData = {
      person_slug: 'test-person',
      person_name: 'Test Person',
      content: 'This is test content for the people content table.',
      updated_by: 'test-admin'
    };

    const insertResult = await database.run(
      'INSERT INTO people_content (person_slug, person_name, content, updated_by) VALUES (?, ?, ?, ?)',
      [testData.person_slug, testData.person_name, testData.content, testData.updated_by]
    );

    console.log(`✅ Test record inserted with ID: ${insertResult.id}`);

    // Test retrieving the record
    const retrievedRecord = await database.get(
      'SELECT * FROM people_content WHERE person_slug = ?',
      [testData.person_slug]
    );

    if (retrievedRecord) {
      console.log('✅ Test record retrieved successfully:');
      console.log(`   - ID: ${retrievedRecord.id}`);
      console.log(`   - Slug: ${retrievedRecord.person_slug}`);
      console.log(`   - Name: ${retrievedRecord.person_name}`);
      console.log(`   - Content: ${retrievedRecord.content.substring(0, 50)}...`);
      console.log(`   - Created: ${retrievedRecord.created_at}`);
      console.log(`   - Updated: ${retrievedRecord.updated_at}`);
      console.log(`   - Updated by: ${retrievedRecord.updated_by}`);
    } else {
      throw new Error('Failed to retrieve test record');
    }

    // Test updating the record
    const updatedContent = 'This is updated test content.';
    await database.run(
      'UPDATE people_content SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE person_slug = ?',
      [updatedContent, testData.person_slug]
    );

    const updatedRecord = await database.get(
      'SELECT * FROM people_content WHERE person_slug = ?',
      [testData.person_slug]
    );

    if (updatedRecord && updatedRecord.content === updatedContent) {
      console.log('✅ Test record updated successfully');
    } else {
      throw new Error('Failed to update test record');
    }

    // Test unique constraint
    try {
      await database.run(
        'INSERT INTO people_content (person_slug, person_name, content, updated_by) VALUES (?, ?, ?, ?)',
        [testData.person_slug, 'Another Test Person', 'Different content', 'test-admin']
      );
      throw new Error('Unique constraint should have prevented duplicate slug');
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        console.log('✅ Unique constraint working correctly');
      } else {
        throw error;
      }
    }

    // Clean up test data
    await database.run('DELETE FROM people_content WHERE person_slug = ?', [testData.person_slug]);
    console.log('✅ Test data cleaned up');

    // Test indexes exist
    const indexes = await database.all(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='people_content' AND name LIKE 'idx_people_content%'"
    );

    console.log(`✅ Found ${indexes.length} performance indexes:`);
    indexes.forEach(idx => {
      console.log(`   - ${idx.name}`);
    });

    console.log('\n🎉 All people_content table tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await database.close();
  }
};

testPeopleTable()
  .then(() => {
    console.log('\nTest script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test script failed:', error);
    process.exit(1);
  });