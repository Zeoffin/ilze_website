const database = require('./database');
const PeopleContent = require('./PeopleContent');

/**
 * Repository class for managing PeopleContent database operations
 * Provides CRUD operations and data migration functionality
 */
class PeopleContentRepository {
  constructor() {
    this.db = database;
  }

  /**
   * Initialize the repository and ensure database connection
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      if (!this.db.db) {
        await this.db.initialize();
      }
    } catch (error) {
      console.error('Failed to initialize PeopleContentRepository:', error);
      throw new Error(`Repository initialization failed: ${error.message}`);
    }
  }

  /**
   * Create a new people content record
   * @param {Object} data - Content data
   * @param {string} data.personSlug - Person's slug
   * @param {string} data.personName - Person's name
   * @param {string} data.content - Content text
   * @param {string} [data.updatedBy] - Username of person creating the record
   * @returns {Promise<PeopleContent>} Created PeopleContent instance
   */
  async create(data) {
    try {
      await this.initialize();

      const { personSlug, personName, content, updatedBy = 'system' } = data;

      // Validate required fields
      if (!personSlug || !personName || !content) {
        throw new Error('Missing required fields: personSlug, personName, and content are required');
      }

      // Validate content length
      if (content.trim().length < 10) {
        throw new Error('Content must be at least 10 characters long');
      }

      if (content.length > 50000) {
        throw new Error('Content must be 50,000 characters or less');
      }

      // Check if person already exists
      const existing = await this.findBySlug(personSlug);
      if (existing) {
        throw new Error(`Person with slug '${personSlug}' already exists`);
      }

      const now = new Date().toISOString();
      const result = await this.db.run(
        `INSERT INTO people_content (person_slug, person_name, content, updated_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [personSlug, personName, content, updatedBy, now, now]
      );

      // Return the created instance
      return new PeopleContent({
        id: result.id,
        person_slug: personSlug,
        person_name: personName,
        content: content,
        updated_by: updatedBy,
        created_at: now,
        updated_at: now
      });
    } catch (error) {
      console.error('Error creating people content:', error);
      throw new Error(`Failed to create people content: ${error.message}`);
    }
  }

  /**
   * Find people content by slug
   * @param {string} slug - Person's slug
   * @returns {Promise<PeopleContent|null>} PeopleContent instance or null if not found
   */
  async findBySlug(slug) {
    try {
      await this.initialize();

      if (!slug) {
        return null;
      }

      const row = await this.db.get(
        'SELECT * FROM people_content WHERE person_slug = ?',
        [slug]
      );

      return row ? new PeopleContent(row) : null;
    } catch (error) {
      console.error(`Error finding people content by slug '${slug}':`, error);
      throw new Error(`Failed to find people content: ${error.message}`);
    }
  }

  /**
   * Update existing people content
   * @param {string} slug - Person's slug
   * @param {string} content - New content
   * @param {string} [updatedBy] - Username of person making the update
   * @returns {Promise<boolean>} True if update was successful
   */
  async update(slug, content, updatedBy = 'system') {
    try {
      await this.initialize();

      if (!slug || !content) {
        throw new Error('Slug and content are required for update');
      }

      // Validate content length
      if (content.trim().length < 10) {
        throw new Error('Content must be at least 10 characters long');
      }

      if (content.length > 50000) {
        throw new Error('Content must be 50,000 characters or less');
      }

      const now = new Date().toISOString();
      const result = await this.db.run(
        `UPDATE people_content 
         SET content = ?, updated_at = ?, updated_by = ?
         WHERE person_slug = ?`,
        [content, now, updatedBy, slug]
      );

      return result.changes > 0;
    } catch (error) {
      console.error(`Error updating people content for slug '${slug}':`, error);
      throw new Error(`Failed to update people content: ${error.message}`);
    }
  }

  /**
   * Get all people content records
   * @returns {Promise<Array<PeopleContent>>} Array of PeopleContent instances
   */
  async getAll() {
    try {
      await this.initialize();

      const rows = await this.db.all(
        'SELECT * FROM people_content ORDER BY person_name ASC'
      );

      return rows.map(row => new PeopleContent(row));
    } catch (error) {
      console.error('Error getting all people content:', error);
      throw new Error(`Failed to get all people content: ${error.message}`);
    }
  }

  /**
   * Check if people content exists by slug
   * @param {string} slug - Person's slug
   * @returns {Promise<boolean>} True if content exists
   */
  async exists(slug) {
    try {
      await this.initialize();

      if (!slug) {
        return false;
      }

      const row = await this.db.get(
        'SELECT 1 FROM people_content WHERE person_slug = ?',
        [slug]
      );

      return !!row;
    } catch (error) {
      console.error(`Error checking if people content exists for slug '${slug}':`, error);
      throw new Error(`Failed to check people content existence: ${error.message}`);
    }
  }

  /**
   * Delete people content by slug
   * @param {string} slug - Person's slug
   * @returns {Promise<boolean>} True if deletion was successful
   */
  async deleteBySlug(slug) {
    try {
      await this.initialize();

      if (!slug) {
        throw new Error('Slug is required for deletion');
      }

      const result = await this.db.run(
        'DELETE FROM people_content WHERE person_slug = ?',
        [slug]
      );

      return result.changes > 0;
    } catch (error) {
      console.error(`Error deleting people content for slug '${slug}':`, error);
      throw new Error(`Failed to delete people content: ${error.message}`);
    }
  }

  /**
   * Get count of all people content records
   * @returns {Promise<number>} Number of records
   */
  async getCount() {
    try {
      await this.initialize();

      const result = await this.db.get('SELECT COUNT(*) as count FROM people_content');
      return result.count;
    } catch (error) {
      console.error('Error getting people content count:', error);
      throw new Error(`Failed to get people content count: ${error.message}`);
    }
  }

  /**
   * Migrate people content from file-based data to database
   * This method imports content from PeopleDataService into the database
   * @param {Array} peopleData - Array of people data from files
   * @param {string} [updatedBy='system'] - Username for migration records
   * @returns {Promise<Object>} Migration results with success/failure counts
   */
  async migrateFromFiles(peopleData, updatedBy = 'system') {
    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: [],
      skipped: 0
    };

    if (!Array.isArray(peopleData)) {
      throw new Error('peopleData must be an array');
    }

    console.log(`Starting migration of ${peopleData.length} people from files to database...`);

    try {
      await this.initialize();

      // Begin transaction for atomic migration
      await this.db.run('BEGIN TRANSACTION');

      for (const person of peopleData) {
        results.total++;

        try {
          // Validate person data structure
          if (!person.slug || !person.name || !person.content || !person.content.text) {
            results.failed++;
            results.errors.push({
              person: person.name || 'Unknown',
              error: 'Missing required fields (slug, name, or content.text)'
            });
            continue;
          }

          // Check if person already exists in database
          const existing = await this.findBySlug(person.slug);
          if (existing) {
            console.log(`Skipping ${person.name} - already exists in database`);
            results.skipped++;
            continue;
          }

          // Validate content length
          const contentText = person.content.text.trim();
          if (contentText.length < 10) {
            results.failed++;
            results.errors.push({
              person: person.name,
              error: `Content too short (${contentText.length} characters, minimum 10)`
            });
            continue;
          }

          if (contentText.length > 50000) {
            results.failed++;
            results.errors.push({
              person: person.name,
              error: `Content too long (${contentText.length} characters, maximum 50,000)`
            });
            continue;
          }

          // Insert the person content
          const now = new Date().toISOString();
          await this.db.run(
            `INSERT INTO people_content (person_slug, person_name, content, updated_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [person.slug, person.name, contentText, updatedBy, now, now]
          );

          results.successful++;
          console.log(`✅ Migrated: ${person.name} (${contentText.length} characters)`);

        } catch (personError) {
          results.failed++;
          results.errors.push({
            person: person.name || 'Unknown',
            error: personError.message
          });
          console.error(`❌ Failed to migrate ${person.name}:`, personError.message);
        }
      }

      // Commit transaction
      await this.db.run('COMMIT');

      console.log(`\n📊 Migration completed:`);
      console.log(`   ✅ Successful: ${results.successful}/${results.total}`);
      console.log(`   ⏭️  Skipped (already exists): ${results.skipped}/${results.total}`);
      console.log(`   ❌ Failed: ${results.failed}/${results.total}`);

      if (results.errors.length > 0) {
        console.log(`\n❌ Migration errors:`);
        results.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error.person}: ${error.error}`);
        });
      }

      return results;

    } catch (error) {
      // Rollback transaction on error
      try {
        await this.db.run('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to rollback transaction:', rollbackError);
      }

      console.error('Migration failed:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  /**
   * Check if database migration has been completed
   * @returns {Promise<boolean>} True if migration has been completed
   */
  async isDatabaseMigrated() {
    try {
      const count = await this.getCount();
      return count > 0;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Get people content with pagination
   * @param {number} [limit=10] - Number of records per page
   * @param {number} [offset=0] - Number of records to skip
   * @returns {Promise<Object>} Paginated results with data and metadata
   */
  async getPaginated(limit = 10, offset = 0) {
    try {
      await this.initialize();

      // Validate pagination parameters
      const validLimit = Math.max(1, Math.min(100, parseInt(limit) || 10));
      const validOffset = Math.max(0, parseInt(offset) || 0);

      // Get total count
      const totalCount = await this.getCount();

      // Get paginated data
      const rows = await this.db.all(
        'SELECT * FROM people_content ORDER BY person_name ASC LIMIT ? OFFSET ?',
        [validLimit, validOffset]
      );

      const data = rows.map(row => new PeopleContent(row));

      return {
        data: data,
        pagination: {
          limit: validLimit,
          offset: validOffset,
          total: totalCount,
          hasMore: validOffset + validLimit < totalCount,
          page: Math.floor(validOffset / validLimit) + 1,
          totalPages: Math.ceil(totalCount / validLimit)
        }
      };
    } catch (error) {
      console.error('Error getting paginated people content:', error);
      throw new Error(`Failed to get paginated people content: ${error.message}`);
    }
  }

  /**
   * Search people content by name or content text
   * @param {string} query - Search query
   * @param {number} [limit=10] - Maximum number of results
   * @returns {Promise<Array<PeopleContent>>} Array of matching PeopleContent instances
   */
  async search(query, limit = 10) {
    try {
      await this.initialize();

      if (!query || query.trim().length === 0) {
        return [];
      }

      const searchTerm = `%${query.trim()}%`;
      const validLimit = Math.max(1, Math.min(100, parseInt(limit) || 10));

      const rows = await this.db.all(
        `SELECT * FROM people_content 
         WHERE person_name LIKE ? OR content LIKE ?
         ORDER BY person_name ASC 
         LIMIT ?`,
        [searchTerm, searchTerm, validLimit]
      );

      return rows.map(row => new PeopleContent(row));
    } catch (error) {
      console.error(`Error searching people content with query '${query}':`, error);
      throw new Error(`Failed to search people content: ${error.message}`);
    }
  }

  /**
   * Get repository statistics
   * @returns {Promise<Object>} Repository statistics
   */
  async getStats() {
    try {
      await this.initialize();

      const totalCount = await this.getCount();
      
      // Get content length statistics
      const contentStats = await this.db.get(`
        SELECT 
          AVG(LENGTH(content)) as avgLength,
          MIN(LENGTH(content)) as minLength,
          MAX(LENGTH(content)) as maxLength
        FROM people_content
      `);

      // Get recent activity
      const recentUpdates = await this.db.get(`
        SELECT COUNT(*) as count
        FROM people_content 
        WHERE updated_at > datetime('now', '-7 days')
      `);

      // Get update frequency by user
      const updatesByUser = await this.db.all(`
        SELECT updated_by, COUNT(*) as count
        FROM people_content 
        GROUP BY updated_by
        ORDER BY count DESC
      `);

      return {
        totalRecords: totalCount,
        contentStats: {
          averageLength: Math.round(contentStats?.avgLength || 0),
          minLength: contentStats?.minLength || 0,
          maxLength: contentStats?.maxLength || 0
        },
        recentActivity: {
          updatesLastWeek: recentUpdates?.count || 0
        },
        updatesByUser: updatesByUser || [],
        initialized: true
      };
    } catch (error) {
      console.error('Error getting repository statistics:', error);
      throw new Error(`Failed to get repository statistics: ${error.message}`);
    }
  }

  /**
   * Validate repository health and data integrity
   * @returns {Promise<Object>} Health check results
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      issues: [],
      checks: {
        databaseConnection: false,
        tableExists: false,
        dataIntegrity: false,
        indexesExist: false
      },
      stats: null
    };

    try {
      // Check database connection
      await this.initialize();
      health.checks.databaseConnection = true;

      // Check if table exists
      const tableCheck = await this.db.get(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='people_content'
      `);
      health.checks.tableExists = !!tableCheck;

      if (!health.checks.tableExists) {
        health.status = 'unhealthy';
        health.issues.push('people_content table does not exist');
        return health;
      }

      // Check indexes exist
      const indexCheck = await this.db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND tbl_name='people_content'
      `);
      health.checks.indexesExist = indexCheck.length >= 2; // Should have at least slug and updated indexes

      // Check data integrity
      const integrityCheck = await this.db.get(`
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN person_slug IS NULL OR person_slug = '' THEN 1 END) as missing_slug,
               COUNT(CASE WHEN person_name IS NULL OR person_name = '' THEN 1 END) as missing_name,
               COUNT(CASE WHEN content IS NULL OR content = '' THEN 1 END) as missing_content
        FROM people_content
      `);

      const hasIntegrityIssues = integrityCheck.missing_slug > 0 || 
                                integrityCheck.missing_name > 0 || 
                                integrityCheck.missing_content > 0;

      health.checks.dataIntegrity = !hasIntegrityIssues;

      if (hasIntegrityIssues) {
        health.status = 'degraded';
        if (integrityCheck.missing_slug > 0) {
          health.issues.push(`${integrityCheck.missing_slug} records missing person_slug`);
        }
        if (integrityCheck.missing_name > 0) {
          health.issues.push(`${integrityCheck.missing_name} records missing person_name`);
        }
        if (integrityCheck.missing_content > 0) {
          health.issues.push(`${integrityCheck.missing_content} records missing content`);
        }
      }

      // Get basic stats
      health.stats = await this.getStats();

    } catch (error) {
      health.status = 'unhealthy';
      health.issues.push(`Health check failed: ${error.message}`);
    }

    return health;
  }
}

module.exports = PeopleContentRepository;