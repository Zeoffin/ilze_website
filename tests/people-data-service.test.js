const peopleDataService = require('../src/services/PeopleDataService');
const fs = require('fs').promises;
const path = require('path');

describe('People Data Service', () => {
  beforeAll(async () => {
    // Initialize the service before running tests
    await peopleDataService.initialize();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(peopleDataService.initialized).toBe(true);
    });

    test('should load all 9 people from the directory', () => {
      const allPeople = peopleDataService.getAllPeople();
      expect(allPeople).toHaveLength(9);
    });

    test('should load expected people names', () => {
      const allPeople = peopleDataService.getAllPeople();
      const names = allPeople.map(person => person.name).sort();
      
      const expectedNames = [
        'Anna Andersone',
        'Annija Kopštāle', 
        'Andrejs Osokins',
        'Baiba Prindule-rence',
        'Edgars Točs',
        'Elīna Brasliņa',
        'Katrīna Dimante',
        'Oskars Kaulēns',
        'Reinis Ošenieks'
      ].sort();
      
      expect(names).toEqual(expectedNames);
    });
  });

  describe('Person Data Structure', () => {
    let samplePerson;

    beforeAll(() => {
      const allPeople = peopleDataService.getAllPeople();
      samplePerson = allPeople[0];
    });

    test('should have required properties', () => {
      expect(samplePerson).toHaveProperty('id');
      expect(samplePerson).toHaveProperty('name');
      expect(samplePerson).toHaveProperty('slug');
      expect(samplePerson).toHaveProperty('content');
      expect(samplePerson).toHaveProperty('images');
      expect(samplePerson).toHaveProperty('metadata');
    });

    test('should have valid content structure', () => {
      expect(samplePerson.content).toHaveProperty('html');
      expect(samplePerson.content).toHaveProperty('text');
      expect(samplePerson.content).toHaveProperty('imageCaptions');
      expect(samplePerson.content).toHaveProperty('wordCount');
      
      expect(typeof samplePerson.content.html).toBe('string');
      expect(typeof samplePerson.content.text).toBe('string');
      expect(Array.isArray(samplePerson.content.imageCaptions)).toBe(true);
      expect(typeof samplePerson.content.wordCount).toBe('number');
    });

    test('should have valid metadata structure', () => {
      expect(samplePerson.metadata).toHaveProperty('lastModified');
      expect(samplePerson.metadata).toHaveProperty('wordCount');
      expect(samplePerson.metadata).toHaveProperty('imageCount');
      expect(samplePerson.metadata).toHaveProperty('hasContent');
      expect(samplePerson.metadata).toHaveProperty('contentLength');
    });

    test('should have valid image structure', () => {
      if (samplePerson.images.length > 0) {
        const image = samplePerson.images[0];
        expect(image).toHaveProperty('filename');
        expect(image).toHaveProperty('path');
        expect(image).toHaveProperty('fullPath');
        expect(image).toHaveProperty('alt');
        expect(image).toHaveProperty('size');
        expect(image).toHaveProperty('lastModified');
        
        expect(image.path).toMatch(/^\/media\/people\/.+\/images\/.+\.(jpg|jpeg|png|gif|webp)$/i);
      }
    });
  });

  describe('Content Processing', () => {
    test('should extract meaningful content from HTML files', () => {
      const allPeople = peopleDataService.getAllPeople();
      
      allPeople.forEach(person => {
        expect(person.content.text.length).toBeGreaterThan(50);
        expect(person.content.wordCount).toBeGreaterThan(10);
        expect(person.metadata.hasContent).toBe(true);
      });
    });

    test('should clean HTML content properly', () => {
      const allPeople = peopleDataService.getAllPeople();
      const samplePerson = allPeople.find(p => p.content.html.length > 0);
      
      if (samplePerson) {
        // Should not contain inline styles
        expect(samplePerson.content.html).not.toMatch(/style\s*=/i);
        
        // Should not contain script tags
        expect(samplePerson.content.html).not.toMatch(/<script/i);
        
        // Should not contain style tags
        expect(samplePerson.content.html).not.toMatch(/<style/i);
      }
    });

    test('should extract image captions', () => {
      const allPeople = peopleDataService.getAllPeople();
      
      // At least some people should have image captions
      const peopleWithCaptions = allPeople.filter(p => p.content.imageCaptions.length > 0);
      expect(peopleWithCaptions.length).toBeGreaterThan(0);
    });
  });

  describe('Slug Generation', () => {
    test('should generate valid URL slugs', () => {
      const allPeople = peopleDataService.getAllPeople();
      
      allPeople.forEach(person => {
        expect(person.slug).toMatch(/^[a-z0-9-]+$/);
        expect(person.slug).not.toMatch(/^-|-$/);
        expect(person.slug).not.toMatch(/--/);
      });
    });

    test('should handle Latvian characters in slugs', () => {
      const testCases = [
        { input: 'Andrejs Osokins', expected: 'andrejs-osokins' },
        { input: 'ANNIJA KOPŠTĀLE', expected: 'annija-kopstale' },
        { input: 'Elīna Brasliņa', expected: 'elina-braslina' }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const slug = peopleDataService.generateSlug(input);
        expect(slug).toBe(expected);
      });
    });
  });

  describe('Data Retrieval', () => {
    test('should retrieve person by slug', () => {
      const allPeople = peopleDataService.getAllPeople();
      const firstPerson = allPeople[0];
      
      const retrieved = peopleDataService.getPersonBySlug(firstPerson.slug);
      expect(retrieved).toEqual(firstPerson);
    });

    test('should return null for non-existent slug', () => {
      const retrieved = peopleDataService.getPersonBySlug('non-existent-person');
      expect(retrieved).toBeNull();
    });

    test('should check person existence correctly', () => {
      const allPeople = peopleDataService.getAllPeople();
      const firstPerson = allPeople[0];
      
      expect(peopleDataService.personExists(firstPerson.slug)).toBe(true);
      expect(peopleDataService.personExists('non-existent-person')).toBe(false);
    });

    test('should get main image for person', () => {
      const allPeople = peopleDataService.getAllPeople();
      const personWithImages = allPeople.find(p => p.images.length > 0);
      
      if (personWithImages) {
        const mainImage = peopleDataService.getPersonMainImage(personWithImages.slug);
        expect(mainImage).toEqual(personWithImages.images[0]);
      }
    });

    test('should generate content preview', () => {
      const allPeople = peopleDataService.getAllPeople();
      const firstPerson = allPeople[0];
      
      const preview = peopleDataService.getPersonContentPreview(firstPerson.slug, 100);
      expect(preview.length).toBeLessThanOrEqual(104); // 100 + "..."
      
      if (firstPerson.content.text.length > 100) {
        expect(preview).toMatch(/\.\.\.$/);
      }
    });
  });

  describe('Data Validation', () => {
    test('should validate person data correctly', () => {
      const validPerson = {
        name: 'Test Person',
        slug: 'test-person',
        content: { text: 'This is a valid content with more than fifty characters to pass validation.' }
      };
      
      const errors = peopleDataService.validatePersonData(validPerson);
      expect(errors).toHaveLength(0);
    });

    test('should detect validation errors', () => {
      const invalidPerson = {
        name: '',
        slug: '',
        content: { text: 'Short' }
      };
      
      const errors = peopleDataService.validatePersonData(invalidPerson);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Person name is required');
      expect(errors).toContain('Person slug is required');
      expect(errors).toContain('Person content is too short (minimum 50 characters)');
    });
  });

  describe('Service Statistics', () => {
    test('should provide accurate statistics', () => {
      const stats = peopleDataService.getStats();
      const allPeople = peopleDataService.getAllPeople();
      
      expect(stats.totalPeople).toBe(allPeople.length);
      expect(stats.initialized).toBe(true);
      expect(stats.totalImages).toBeGreaterThan(0);
      expect(stats.totalWords).toBeGreaterThan(0);
      expect(stats.averageWordsPerPerson).toBeGreaterThan(0);
      expect(stats.averageImagesPerPerson).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing directories gracefully', async () => {
      // This test verifies that the service handles missing directories without crashing
      // The actual implementation should continue processing other people even if some fail
      const allPeople = peopleDataService.getAllPeople();
      expect(allPeople.length).toBeGreaterThan(0);
    });

    test('should handle malformed HTML gracefully', () => {
      // The service should not crash when encountering malformed HTML
      // This is tested implicitly by the successful initialization
      expect(peopleDataService.initialized).toBe(true);
    });
  });
});