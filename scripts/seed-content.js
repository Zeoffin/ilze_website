#!/usr/bin/env node

/**
 * Content seeding script
 * Adds sample content to the database for testing the content editor
 */

const { initializeDatabase, Content } = require('../src/models');

const sampleContent = {
  interesanti: [
    {
      content_type: 'text',
      content: '<h2>Par autori</h2><p>Ilze Skrastiņa ir talantīga bērnu grāmatu autore un animatore, kura darbi iepriecina gan mazos, gan lielos lasītājus. Viņas radošā darbība apvieno vizuālo mākslu ar stāstīšanas prasmi.</p>',
      order_index: 0
    },
    {
      content_type: 'text',
      content: '<p>Ilze ir strādājusi animācijas industrijā un radījusi daudzas iemīļotas personāžus. Viņas pieredze animācijā atspoguļojas arī grāmatu ilustrācijās, padarot tās dzīvas un saistošas bērniem.</p>',
      order_index: 1
    }
  ],
  gramatas: [
    {
      content_type: 'text',
      content: '<h2>Grāmatas bērniem</h2><p>Ilzes Skrastiņas grāmatas ir radītas ar mīlestību un rūpību, lai iepriecinātu bērnus un palīdzētu viņiem iemācīties svarīgas dzīves mācības caur aizraujošiem stāstiem.</p>',
      order_index: 0
    },
    {
      content_type: 'text',
      content: '<h3>Pirmā grāmata</h3><p>Šī ir pirmā grāmata sērijā, kas stāsta par draudzību un piedzīvojumiem. Grāmatā ir krāsainas ilustrācijas un vienkārši, bet dziļi stāsti.</p>',
      order_index: 1
    },
    {
      content_type: 'text',
      content: '<h3>Otrā grāmata</h3><p>Otrā grāmata turpina stāstu par mīļajiem varoņiem un viņu jaunajiem piedzīvojumiem. Šeit lasītāji atklās jaunas pasaules un satiks jaunus draugus.</p>',
      order_index: 2
    }
  ],
  fragmenti: [
    {
      content_type: 'text',
      content: '<h2>Grāmatu fragmenti</h2><p>Šeit jūs varat apskatīt fragmentus no Ilzes Skrastiņas grāmatām - gan tekstu, gan ilustrāciju paraugus, lai saprastu viņas darbu stilu un saturu.</p>',
      order_index: 0
    },
    {
      content_type: 'text',
      content: '<p>Katrs fragments ir rūpīgi izvēlēts, lai parādītu grāmatu daudzveidību un kvalitāti. Tie ļauj lasītājiem iepazīties ar autores stilu pirms pilnas grāmatas iegādes.</p>',
      order_index: 1
    }
  ]
};

async function seedContent() {
  try {
    console.log('Initializing database connection...');
    await initializeDatabase();
    
    console.log('Seeding content...');
    
    for (const [section, items] of Object.entries(sampleContent)) {
      console.log(`Seeding ${section} section...`);
      
      // Check if content already exists for this section
      const existingContent = await Content.findBySection(section);
      if (existingContent.length > 0) {
        console.log(`Content already exists for ${section} section, skipping...`);
        continue;
      }
      
      // Add content items
      for (const item of items) {
        const content = new Content({
          section: section,
          content_type: item.content_type,
          content: item.content,
          order_index: item.order_index
        });
        
        await content.save();
        console.log(`Added content item: ${item.content_type} for ${section}`);
      }
    }
    
    console.log('Content seeding completed successfully!');
    
  } catch (error) {
    console.error('Content seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedContent();
}

module.exports = seedContent;