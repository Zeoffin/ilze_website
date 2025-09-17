#!/usr/bin/env node

/**
 * Update script for Interesanti section content
 * Updates the database with the new author biographical information
 */

const { Content, initializeDatabase, database } = require('../src/models');

async function updateInteresantiContent() {
  try {
    console.log('Initializing database connection...');
    await initializeDatabase();
    
    console.log('Updating Interesanti section content...');
    
    // Updated author biographical content
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
          text: 'Grāmatas autore Ilze Skrastiņa ir animatore, ilgus gadus strādājusi studijā "Dauka" un piedalījusies daudzu iemīļotu animācijas filmu veidošanā ("Kaķīša dzirnavas", "Fantadroms", "Saule brauca debesīs").'
        }),
        order_index: 1
      },
      {
        section: 'interesanti',
        content_type: 'text',
        content: JSON.stringify({
          type: 'paragraph',
          text: 'Savu rakstītājas talantu atklājusi kā scenārija autore filmām "Neparastie rīdzinieki", "Šunelītis" un "Varavīksne".'
        }),
        order_index: 2
      },
      {
        section: 'interesanti',
        content_type: 'text',
        content: JSON.stringify({
          type: 'paragraph',
          text: 'Ideja par grāmatu Ilzei radās, vērojot, kā aug viņas četri bērni. Autore saka: "Gandrīz visi grāmatā aprakstītie notikumi ir patiesi, varbūt mazliet piepušķoti un dramatizēti, bet īsti. Tajos esmu piedalījusies gan kā mamma, gan kā novērotāja."'
        }),
        order_index: 3
      },
      {
        section: 'interesanti',
        content_type: 'text',
        content: JSON.stringify({
          type: 'paragraph',
          text: 'Uzmanīgi klausījos savu bērnu stāstos par skolas gaitām un klusībā smējos par to, cik lielas problēmas ir mazās lietās. Lielākā daļa stāstu varoņu iet skolā arī šobrīd.'
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
    
    console.log('Interesanti section content updated successfully!');
    
    // Verify the content was updated
    const savedContent = await Content.findBySection('interesanti');
    console.log(`\nVerification: Found ${savedContent.length} content items in Interesanti section`);
    
    // Display the updated content
    console.log('\nUpdated content:');
    savedContent.forEach(item => {
      const data = JSON.parse(item.content);
      console.log(`- Order ${item.order_index}: ${data.type} - "${data.text || data.name}"`);
    });
    
    // Close database connection
    await database.close();
    console.log('\nDatabase connection closed');
    
  } catch (error) {
    console.error('Error updating Interesanti content:', error);
    process.exit(1);
  }
}

// Run update if this script is executed directly
if (require.main === module) {
  updateInteresantiContent();
}

module.exports = updateInteresantiContent;