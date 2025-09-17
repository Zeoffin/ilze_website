#!/usr/bin/env node

/**
 * Seed script for Interesanti section content
 * Populates the database with author biographical information
 */

const { Content, initializeDatabase, database } = require('../src/models');

async function seedInteresantiContent() {
  try {
    console.log('Initializing database connection...');
    await initializeDatabase();
    
    console.log('Seeding Interesanti section content...');
    
    // Author biographical content
    const authorContent = [
      {
        section: 'interesanti',
        content_type: 'text',
        content: JSON.stringify({
          type: 'intro',
          text: 'Sveiki! Es esmu Ilze Skrastiņa'
        }),
        order_index: 0
      },
      {
        section: 'interesanti',
        content_type: 'text',
        content: JSON.stringify({
          type: 'paragraph',
          text: 'Jau no mazotnes man patika zīmēt un stāstīt stāstus. Šī kaislība aizveda mani uz animācijas pasauli, kur strādāju kā animatore vairākus gadus. Animācijas darbs iemācīja man, kā radīt dzīvus tēlus un stāstīt stāstus ar attēliem.'
        }),
        order_index: 1
      },
      {
        section: 'interesanti',
        content_type: 'text',
        content: JSON.stringify({
          type: 'paragraph',
          text: 'Kad kļuvu par māmiņu, sāku rakstīt stāstus saviem bērniem. Viņi bija mani pirmie un stingrākie kritiķi! Viņu smiekliem un jautājumiem palīdzot, radās manas pirmās bērnu grāmatas.'
        }),
        order_index: 2
      },
      {
        section: 'interesanti',
        content_type: 'text',
        content: JSON.stringify({
          type: 'paragraph',
          text: 'Manas grāmatas ir domātas bērniem vecumā no 3 līdz 8 gadiem. Tajās ir daudz krāsu, jautru tēlu un stāstu, kas māca par draudzību, drosmi un sapņu piepildīšanu. Katrs stāsts ir kā mazs piedzīvojums, kurā bērni var iemācīties kaut ko jaunu par sevi un pasauli.'
        }),
        order_index: 3
      },
      {
        section: 'interesanti',
        content_type: 'text',
        content: JSON.stringify({
          type: 'paragraph',
          text: 'Man patīk domāt, ka manas grāmatas ir kā tiltiņš starp bērnu iztēli un īsto pasauli - vieta, kur viss ir iespējams un kur katrs bērns var būt varonis savā stāstā.'
        }),
        order_index: 4
      },
      {
        section: 'interesanti',
        content_type: 'text',
        content: JSON.stringify({
          type: 'signature',
          text: 'Ar mīlestību,',
          name: 'Ilze ✨'
        }),
        order_index: 5
      }
    ];
    
    // Clear existing interesanti content
    await database.run('DELETE FROM content WHERE section = ?', ['interesanti']);
    console.log('Cleared existing Interesanti content');
    
    // Insert new content
    for (const contentData of authorContent) {
      const content = new Content(contentData);
      await content.save();
      console.log(`Added content: ${contentData.content_type} (order: ${contentData.order_index})`);
    }
    
    console.log('Interesanti section content seeded successfully!');
    
    // Verify the content was added
    const savedContent = await Content.findBySection('interesanti');
    console.log(`\nVerification: Found ${savedContent.length} content items in Interesanti section`);
    
    // Close database connection
    await database.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error seeding Interesanti content:', error);
    process.exit(1);
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedInteresantiContent();
}

module.exports = seedInteresantiContent;