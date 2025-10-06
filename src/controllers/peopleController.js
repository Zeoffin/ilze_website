const PeopleContent = require('../models/PeopleContent');
const PeopleContentRepository = require('../models/PeopleContentRepository');
const peopleDataService = require('../services/PeopleDataService');
const { validationResult } = require('express-validator');

/**
 * Controller for admin people management API endpoints
 */
class PeopleController {
  constructor() {
    this.repository = new PeopleContentRepository();
    this.peopleDataService = peopleDataService;
  }

  /**
   * Get all people for admin management interface
   * GET /admin/api/people
   */
  getAllPeople = async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Ensure repository is initialized
      await this.repository.initialize();
      
      // Check if database migration has been completed
      const isMigrated = await this.repository.isDatabaseMigrated();
      
      if (!isMigrated) {
        // If not migrated, try to initialize people data service and migrate
        if (!this.peopleDataService.initialized) {
          await this.peopleDataService.initialize();
        }
        
        // Perform migration if people data is available
        const fileBasedPeople = this.peopleDataService.getAllPeople();
        if (fileBasedPeople.length > 0) {
          console.log('Performing database migration for people content...');
          await this.repository.migrateFromFiles(fileBasedPeople, req.session.username || 'system');
        }
      }
      
      // Get all people from database
      const dbPeople = await this.repository.getAll();
      
      // If no database content, fall back to file-based content
      if (dbPeople.length === 0) {
        if (!this.peopleDataService.initialized) {
          await this.peopleDataService.initialize();
        }
        const fileBasedPeople = this.peopleDataService.getAllPeople();
        
        // Transform file-based people to match expected API format
        const transformedPeople = fileBasedPeople.map(person => ({
          slug: person.slug,
          name: person.name,
          lastUpdated: person.metadata.lastModified,
          updatedBy: 'file-system',
          contentPreview: this.generateContentPreview(person.content.text),
          wordCount: person.metadata.wordCount,
          mainImage: person.images.length > 0 ? person.images[0] : null,
          source: 'file'
        }));
        
        const duration = Date.now() - startTime;
        
        return res.json({
          success: true,
          data: transformedPeople,
          meta: {
            count: transformedPeople.length,
            source: 'file-system',
            migrated: false,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
            requestId: req.id
          }
        });
      }
      
      // Transform database people to include additional metadata
      const transformedPeople = await Promise.all(
        dbPeople.map(async (dbPerson) => {
          // Get file-based person data for images
          let mainImage = null;
          if (this.peopleDataService.initialized) {
            const filePerson = this.peopleDataService.getPersonBySlug(dbPerson.personSlug);
            if (filePerson && filePerson.images.length > 0) {
              mainImage = filePerson.images[0];
            }
          }
          
          return {
            slug: dbPerson.personSlug,
            name: dbPerson.personName,
            lastUpdated: dbPerson.updatedAt,
            updatedBy: dbPerson.updatedBy,
            contentPreview: dbPerson.getContentPreview(150),
            wordCount: dbPerson.getWordCount(),
            mainImage: mainImage,
            source: 'database'
          };
        })
      );
      
      const duration = Date.now() - startTime;
      
      res.json({
        success: true,
        data: transformedPeople,
        meta: {
          count: transformedPeople.length,
          source: 'database',
          migrated: true,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
      
      console.log(`Admin API: Served ${transformedPeople.length} people in ${duration}ms`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error('Error in getAllPeople:', {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        requestId: req.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch people data',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
  }

  /**
   * Get specific person content for editing
   * GET /admin/api/people/:slug
   */
  getPerson = async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Validate request parameters
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array(),
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
      
      const { slug } = req.params;
      
      // Ensure repository is initialized
      await this.repository.initialize();
      
      // Try to get content from database first
      const dbPerson = await this.repository.findBySlug(slug);
      
      if (dbPerson) {
        // Get file-based person data for images and metadata
        let filePerson = null;
        if (!this.peopleDataService.initialized) {
          await this.peopleDataService.initialize();
        }
        filePerson = this.peopleDataService.getPersonBySlug(slug);
        
        const personData = {
          slug: dbPerson.personSlug,
          name: dbPerson.personName,
          content: {
            text: dbPerson.content,
            lastUpdated: dbPerson.updatedAt,
            updatedBy: dbPerson.updatedBy,
            wordCount: dbPerson.getWordCount(),
            characterCount: dbPerson.getCharacterCount(),
            source: 'database'
          },
          images: filePerson ? filePerson.images : [],
          metadata: {
            lastModified: new Date(dbPerson.updatedAt),
            hasContent: true,
            contentLength: dbPerson.content.length,
            imageCount: filePerson ? filePerson.images.length : 0,
            source: 'database'
          }
        };
        
        const duration = Date.now() - startTime;
        
        res.json({
          success: true,
          data: personData,
          meta: {
            source: 'database',
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
            requestId: req.id
          }
        });
        
        console.log(`Admin API: Served person data for ${personData.name} from database in ${duration}ms`);
        return;
      }
      
      // Fall back to file-based content if not in database
      if (!this.peopleDataService.initialized) {
        await this.peopleDataService.initialize();
      }
      
      const filePerson = this.peopleDataService.getPersonBySlug(slug);
      
      if (!filePerson) {
        return res.status(404).json({
          success: false,
          error: 'Person not found',
          message: 'The requested person profile does not exist',
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
      
      const personData = {
        slug: filePerson.slug,
        name: filePerson.name,
        content: {
          text: filePerson.content.text,
          lastUpdated: filePerson.metadata.lastModified,
          updatedBy: 'file-system',
          wordCount: filePerson.metadata.wordCount,
          characterCount: filePerson.content.text.replace(/\s/g, '').length,
          source: 'file'
        },
        images: filePerson.images,
        metadata: filePerson.metadata
      };
      
      const duration = Date.now() - startTime;
      
      res.json({
        success: true,
        data: personData,
        meta: {
          source: 'file-system',
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
      
      console.log(`Admin API: Served person data for ${personData.name} from files in ${duration}ms`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error('Error in getPerson:', {
        error: error.message,
        slug: req.params.slug,
        stack: error.stack,
        duration: `${duration}ms`,
        requestId: req.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch person data',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
  }

  /**
   * Update person content
   * PUT /admin/api/people/:slug
   */
  updatePerson = async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Validate request parameters
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array(),
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
      
      const { slug } = req.params;
      const { content } = req.body;
      const updatedBy = req.session.username || 'admin';
      
      // Validate content
      if (!content || typeof content !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Content is required and must be a string',
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
      
      const trimmedContent = content.trim();
      
      if (trimmedContent.length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Content must be at least 10 characters long',
          details: {
            provided: trimmedContent.length,
            minimum: 10
          },
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
      
      if (trimmedContent.length > 50000) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Content must be 50,000 characters or less',
          details: {
            provided: trimmedContent.length,
            maximum: 50000
          },
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
      
      // Ensure repository is initialized
      await this.repository.initialize();
      
      // Check if person exists in database
      let dbPerson = await this.repository.findBySlug(slug);
      
      if (dbPerson) {
        // Update existing database record
        const success = await this.repository.update(slug, trimmedContent, updatedBy);
        
        if (!success) {
          return res.status(500).json({
            success: false,
            error: 'Update failed',
            message: 'Failed to update person content in database',
            timestamp: new Date().toISOString(),
            requestId: req.id
          });
        }
        
        // Get updated record
        dbPerson = await this.repository.findBySlug(slug);
        
      } else {
        // Person doesn't exist in database, check if it exists in files
        if (!this.peopleDataService.initialized) {
          await this.peopleDataService.initialize();
        }
        
        const filePerson = this.peopleDataService.getPersonBySlug(slug);
        
        if (!filePerson) {
          return res.status(404).json({
            success: false,
            error: 'Person not found',
            message: 'The requested person profile does not exist',
            timestamp: new Date().toISOString(),
            requestId: req.id
          });
        }
        
        // Create new database record
        dbPerson = await this.repository.create({
          personSlug: slug,
          personName: filePerson.name,
          content: trimmedContent,
          updatedBy: updatedBy
        });
      }
      
      const duration = Date.now() - startTime;
      
      res.json({
        success: true,
        message: 'Content updated successfully',
        data: {
          slug: dbPerson.personSlug,
          name: dbPerson.personName,
          updatedAt: dbPerson.updatedAt,
          updatedBy: dbPerson.updatedBy,
          wordCount: dbPerson.getWordCount(),
          characterCount: dbPerson.getCharacterCount(),
          contentLength: dbPerson.content.length
        },
        meta: {
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
      
      console.log(`Admin API: Updated content for ${dbPerson.personName} by ${updatedBy} in ${duration}ms`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error('Error in updatePerson:', {
        error: error.message,
        slug: req.params.slug,
        stack: error.stack,
        duration: `${duration}ms`,
        requestId: req.id
      });
      
      // Handle specific error types
      if (error.message.includes('validation') || error.message.includes('required')) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to update person content',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
  }

  /**
   * Generate content preview for display in lists
   * @param {string} content - Full content text
   * @param {number} maxLength - Maximum preview length
   * @returns {string} Content preview
   */
  generateContentPreview(content, maxLength = 150) {
    if (!content || typeof content !== 'string') {
      return '';
    }
    
    const trimmed = content.trim();
    if (trimmed.length <= maxLength) {
      return trimmed;
    }
    
    // Find the last complete word within the limit
    const truncated = trimmed.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }
}

module.exports = new PeopleController();