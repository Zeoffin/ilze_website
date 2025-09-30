# Design Document

## Overview

The Interesanti People Section feature extends the existing Ilze Skrastiņa website by adding a new section that showcases interesting people with individual profile pages. The design leverages the existing website architecture, design system, and content management approach while introducing new routing capabilities for individual profile pages.

## Architecture

### System Architecture

The feature integrates with the existing Express.js server architecture:

- **Frontend**: Static HTML/CSS/JavaScript following the existing design patterns
- **Backend**: Express.js routes for serving profile pages and managing people data
- **Data Source**: File-based content extraction from existing HTML files in `public/media/people/`
- **Routing**: New route handlers for individual profile pages with clean URLs
- **Content Management**: Integration with existing admin system for future content updates

### Data Flow

1. **Initialization**: Server scans `public/media/people/` directory on startup
2. **Content Processing**: Extracts and cleans HTML content from individual `.html` files
3. **Image Processing**: Collects and optimizes images from each person's `images/` directory
4. **Route Generation**: Creates dynamic routes for each person's profile page
5. **Content Serving**: Serves processed content through templated HTML pages

## Components and Interfaces

### 1. People Data Service

**Purpose**: Handles extraction and processing of people data from the file system.

**Key Methods**:
- `scanPeopleDirectory()`: Scans the media/people directory for person folders
- `extractPersonContent(personPath)`: Extracts and cleans HTML content from person's .html file
- `collectPersonImages(personPath)`: Gathers all images from person's images directory
- `processPersonData(personName)`: Combines content and images into structured data
- `getAllPeople()`: Returns processed data for all people

**Data Structure**:
```javascript
{
  id: "andrejs-osokins",
  name: "Andrejs Osokins",
  slug: "andrejs-osokins",
  content: {
    html: "processed HTML content",
    text: "plain text version",
    images: [
      {
        filename: "image1.jpg",
        path: "/media/people/Andrejs Osokins/images/image1.jpg",
        alt: "generated alt text",
        caption: "extracted caption"
      }
    ]
  },
  metadata: {
    lastModified: "2024-01-01T00:00:00Z",
    wordCount: 450,
    imageCount: 5
  }
}
```

### 2. Interesanti Section Component

**Purpose**: Main section on the homepage displaying the people grid.

**Features**:
- Responsive grid layout (3 columns desktop, 2 tablet, 1 mobile)
- Person cards with hover effects
- Consistent with existing section styling
- Decorative elements matching website theme

**HTML Structure**:
```html
<section class="section interesanti-people" id="interesanti">
  <div class="section-container">
    <header class="section-header">
      <h2 class="section-title">Interesanti</h2>
      <p class="section-subtitle">Iepazīstieties ar interesantiem cilvēkiem</p>
    </header>
    <div class="people-grid">
      <!-- Person cards generated dynamically -->
    </div>
  </div>
</section>
```

### 3. Person Profile Page Component

**Purpose**: Individual profile pages for each person.

**Features**:
- Full biographical content display
- Image gallery with lightbox functionality
- Breadcrumb navigation
- Back to Interesanti section link
- Consistent header/footer with main site

**Template Structure**:
```html
<!DOCTYPE html>
<html lang="lv">
<head>
  <!-- Meta tags, title, styles -->
</head>
<body>
  <!-- Same header as main site -->
  <main class="person-profile">
    <nav class="breadcrumb">
      <a href="/#interesanti">Interesanti</a> > 
      <span>{{person.name}}</span>
    </nav>
    
    <article class="person-content">
      <header class="person-header">
        <h1>{{person.name}}</h1>
      </header>
      
      <div class="person-body">
        <!-- Processed content -->
        <!-- Image gallery -->
      </div>
    </article>
  </main>
  <!-- Same footer as main site -->
</body>
</html>
```

### 4. Route Handlers

**Purpose**: Express.js routes for serving profile pages and API endpoints.

**Routes**:
- `GET /interesanti/:slug` - Serve individual profile page
- `GET /api/people` - API endpoint for people data (for future use)
- `GET /api/people/:slug` - API endpoint for individual person data

### 5. Content Processing Engine

**Purpose**: Cleans and formats HTML content from source files.

**Processing Steps**:
1. **HTML Parsing**: Parse source HTML using cheerio or similar
2. **Content Extraction**: Extract meaningful text content, removing document metadata
3. **Image Processing**: Update image paths to work with website structure
4. **Text Formatting**: Convert to clean, semantic HTML
5. **Caption Extraction**: Extract image captions and photo credits
6. **Content Validation**: Ensure all content is properly formatted

## Data Models

### Person Model

```javascript
class Person {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.slug = data.slug;
    this.content = data.content;
    this.images = data.images;
    this.metadata = data.metadata;
  }
  
  static fromDirectory(dirPath) {
    // Factory method to create Person from directory
  }
  
  getProfileUrl() {
    return `/interesanti/${this.slug}`;
  }
  
  getMainImage() {
    return this.images[0] || null;
  }
  
  getContentPreview(length = 150) {
    // Return truncated content for grid display
  }
}
```

### People Repository

```javascript
class PeopleRepository {
  constructor() {
    this.people = new Map();
    this.initialized = false;
  }
  
  async initialize() {
    // Scan directory and load all people
  }
  
  getAll() {
    return Array.from(this.people.values());
  }
  
  getBySlug(slug) {
    return this.people.get(slug);
  }
  
  exists(slug) {
    return this.people.has(slug);
  }
}
```

## Error Handling

### Content Processing Errors

- **Missing HTML files**: Log warning, skip person, continue processing others
- **Malformed HTML**: Attempt to clean, fallback to plain text extraction
- **Missing images**: Continue with available images, log missing files
- **Invalid directory structure**: Skip invalid directories, log issues

### Runtime Errors

- **404 Handling**: Redirect to main Interesanti section for invalid person slugs
- **Content Loading Errors**: Show error message with retry option
- **Image Loading Errors**: Use placeholder images, graceful degradation

### Error Responses

```javascript
// 404 for invalid person
{
  error: 'Person not found',
  message: 'The requested person profile does not exist',
  redirect: '/#interesanti'
}

// Content processing error
{
  error: 'Content unavailable',
  message: 'Unable to load person content at this time',
  retry: true
}
```

## Testing Strategy

### Unit Tests

- **People Data Service**: Test content extraction, image processing, data validation
- **Content Processing**: Test HTML cleaning, image path updates, text formatting
- **Route Handlers**: Test response formats, error handling, parameter validation
- **Person Model**: Test data structure, methods, validation

### Integration Tests

- **End-to-End Navigation**: Test navigation from main page to profile and back
- **Content Display**: Verify all people are displayed correctly in grid
- **Profile Page Rendering**: Test profile page generation for all people
- **Responsive Design**: Test layout on different screen sizes

### Performance Tests

- **Content Loading**: Measure time to process all people data on startup
- **Page Generation**: Test profile page rendering performance
- **Image Optimization**: Verify image loading and optimization
- **Memory Usage**: Monitor memory consumption with all people loaded

### Accessibility Tests

- **Screen Reader**: Test navigation and content reading
- **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
- **Color Contrast**: Verify text readability and contrast ratios
- **Alt Text**: Ensure all images have appropriate alt text

## Design System Integration

### Visual Consistency

The Interesanti section maintains visual consistency with the existing website:

- **Color Palette**: Uses existing CSS variables (--color-primary-orange, --color-primary-blue, etc.)
- **Typography**: Follows established font hierarchy (--font-heading, --font-body)
- **Spacing**: Uses consistent spacing variables (--spacing-md, --spacing-lg, etc.)
- **Shadows**: Applies existing shadow styles (--shadow-md, --shadow-playful)
- **Border Radius**: Uses established border radius values (--border-radius-lg)

### Component Styling

```css
/* Interesanti Section */
.interesanti-people {
  background: linear-gradient(135deg, var(--color-warm-white) 0%, var(--color-soft-gray) 100%);
}

/* People Grid */
.people-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-xl);
  margin-top: var(--spacing-2xl);
}

/* Person Card */
.person-card {
  background: var(--color-white);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  transition: var(--transition-normal);
  overflow: hidden;
}

.person-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-playful);
}

/* Profile Page */
.person-profile {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: var(--spacing-xl) var(--container-padding);
}
```

### Responsive Design

- **Mobile First**: Base styles for mobile, enhanced for larger screens
- **Breakpoints**: Uses existing breakpoint system
- **Grid Adaptation**: 1 column mobile, 2 columns tablet, 3 columns desktop
- **Image Optimization**: Responsive images with appropriate sizes
- **Touch Targets**: Minimum 44px touch targets for mobile interaction

### Decorative Elements

Maintains the playful, child-friendly aesthetic:

- **Character Decorations**: Reuses existing character images as decorative elements
- **Floating Animations**: Subtle animations consistent with existing sections
- **Color Accents**: Strategic use of primary colors for visual interest
- **Organic Shapes**: Soft, rounded elements matching the overall design language