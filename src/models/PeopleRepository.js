const Person = require('./Person');

/**
 * Repository class for managing collection of Person instances
 */
class PeopleRepository {
  constructor(peopleDataService) {
    this.peopleDataService = peopleDataService;
    this.people = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the repository by loading all people from the data service
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Ensure the data service is initialized
      if (!this.peopleDataService.initialized) {
        await this.peopleDataService.initialize();
      }

      // Load all people from the data service
      const peopleData = this.peopleDataService.getAllPeople();
      
      // Convert to Person instances and store in repository
      this.people.clear();
      for (const personData of peopleData) {
        try {
          const person = Person.fromDirectory(personData);
          this.people.set(person.slug, person);
        } catch (error) {
          console.error(`Failed to create Person instance for ${personData.name}:`, error);
          // Continue with other people even if one fails
        }
      }

      this.initialized = true;
      console.log(`PeopleRepository initialized with ${this.people.size} people`);
    } catch (error) {
      console.error('Failed to initialize PeopleRepository:', error);
      throw error;
    }
  }

  /**
   * Get all people as an array
   * @returns {Array<Person>} Array of Person instances
   */
  getAll() {
    return Array.from(this.people.values());
  }

  /**
   * Get person by slug
   * @param {string} slug - Person's slug
   * @returns {Person|null} Person instance or null if not found
   */
  getBySlug(slug) {
    if (!slug) {
      return null;
    }
    return this.people.get(slug) || null;
  }

  /**
   * Get person by ID (same as slug in this implementation)
   * @param {string} id - Person's ID
   * @returns {Person|null} Person instance or null if not found
   */
  getById(id) {
    return this.getBySlug(id);
  }

  /**
   * Check if person exists by slug
   * @param {string} slug - Person's slug
   * @returns {boolean} True if person exists
   */
  exists(slug) {
    return this.people.has(slug);
  }

  /**
   * Get count of all people
   * @returns {number} Number of people in repository
   */
  count() {
    return this.people.size;
  }

  /**
   * Get people with content (have text content)
   * @returns {Array<Person>} Array of people with content
   */
  getPeopleWithContent() {
    return this.getAll().filter(person => person.hasContent());
  }

  /**
   * Get people with images
   * @returns {Array<Person>} Array of people with images
   */
  getPeopleWithImages() {
    return this.getAll().filter(person => person.hasImages());
  }

  /**
   * Search people by name (case-insensitive partial match)
   * @param {string} query - Search query
   * @returns {Array<Person>} Array of matching people
   */
  searchByName(query) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();
    return this.getAll().filter(person => 
      person.name.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Search people by content (case-insensitive partial match)
   * @param {string} query - Search query
   * @returns {Array<Person>} Array of matching people
   */
  searchByContent(query) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();
    return this.getAll().filter(person => 
      person.hasContent() && 
      person.getTextContent().toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get people sorted by name
   * @param {boolean} ascending - Sort order (default: true)
   * @returns {Array<Person>} Sorted array of people
   */
  getSortedByName(ascending = true) {
    const people = this.getAll();
    return people.sort((a, b) => {
      const comparison = a.name.localeCompare(b.name, 'lv');
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Get people sorted by word count
   * @param {boolean} ascending - Sort order (default: false for most words first)
   * @returns {Array<Person>} Sorted array of people
   */
  getSortedByWordCount(ascending = false) {
    const people = this.getAll();
    return people.sort((a, b) => {
      const comparison = a.getWordCount() - b.getWordCount();
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Get people sorted by image count
   * @param {boolean} ascending - Sort order (default: false for most images first)
   * @returns {Array<Person>} Sorted array of people
   */
  getSortedByImageCount(ascending = false) {
    const people = this.getAll();
    return people.sort((a, b) => {
      const comparison = a.getImageCount() - b.getImageCount();
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Get random people
   * @param {number} count - Number of random people to return
   * @returns {Array<Person>} Array of random people
   */
  getRandom(count = 1) {
    const people = this.getAll();
    if (count >= people.length) {
      return [...people];
    }

    const shuffled = [...people].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Get people for grid display (simplified data)
   * @returns {Array<Object>} Array of simplified person objects for grid
   */
  getAllForGrid() {
    return this.getAll().map(person => person.toGridJSON());
  }

  /**
   * Get person for profile display (detailed data)
   * @param {string} slug - Person's slug
   * @returns {Object|null} Detailed person object for profile or null if not found
   */
  getForProfile(slug) {
    const person = this.getBySlug(slug);
    return person ? person.toProfileJSON() : null;
  }

  /**
   * Validate all people in repository
   * @returns {Object} Validation results with errors by person slug
   */
  validateAll() {
    const results = {
      valid: [],
      invalid: {},
      totalCount: this.count(),
      validCount: 0,
      invalidCount: 0
    };

    for (const person of this.getAll()) {
      const errors = person.validate();
      if (errors.length === 0) {
        results.valid.push(person.slug);
        results.validCount++;
      } else {
        results.invalid[person.slug] = errors;
        results.invalidCount++;
      }
    }

    return results;
  }

  /**
   * Refresh repository data from the data service
   * @returns {Promise<void>}
   */
  async refresh() {
    console.log('Refreshing PeopleRepository...');
    
    // Refresh the underlying data service
    await this.peopleDataService.refresh();
    
    // Reinitialize the repository
    this.initialized = false;
    await this.initialize();
    
    console.log(`PeopleRepository refreshed with ${this.people.size} people`);
  }

  /**
   * Get repository statistics
   * @returns {Object} Repository statistics
   */
  getStats() {
    const people = this.getAll();
    const totalImages = people.reduce((sum, person) => sum + person.getImageCount(), 0);
    const totalWords = people.reduce((sum, person) => sum + person.getWordCount(), 0);
    const peopleWithContent = this.getPeopleWithContent().length;
    const peopleWithImages = this.getPeopleWithImages().length;

    return {
      totalPeople: people.length,
      peopleWithContent: peopleWithContent,
      peopleWithImages: peopleWithImages,
      totalImages: totalImages,
      totalWords: totalWords,
      averageWordsPerPerson: people.length > 0 ? Math.round(totalWords / people.length) : 0,
      averageImagesPerPerson: people.length > 0 ? Math.round(totalImages / people.length) : 0,
      initialized: this.initialized
    };
  }

  /**
   * Check if repository is ready for use
   * @returns {boolean} True if repository is initialized and has data
   */
  isReady() {
    return this.initialized && this.people.size > 0;
  }

  /**
   * Get all person slugs
   * @returns {Array<string>} Array of all person slugs
   */
  getAllSlugs() {
    return Array.from(this.people.keys());
  }

  /**
   * Get people by multiple slugs
   * @param {Array<string>} slugs - Array of person slugs
   * @returns {Array<Person>} Array of Person instances (excluding not found)
   */
  getByMultipleSlugs(slugs) {
    if (!Array.isArray(slugs)) {
      return [];
    }

    return slugs
      .map(slug => this.getBySlug(slug))
      .filter(person => person !== null);
  }

  /**
   * Export all people data as JSON
   * @returns {Array<Object>} Array of all people as JSON objects
   */
  exportAll() {
    return this.getAll().map(person => person.toJSON());
  }
}

module.exports = PeopleRepository;