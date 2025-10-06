# Design Document

## Overview

The Admin People Editor feature extends the existing admin panel to provide content management capabilities for the Interesanti people section. The design leverages the existing admin infrastructure, authentication system, and database while adding new database tables and admin interfaces specifically for people content management. The system migrates people content from HTML files to the database and manages all content through the database going forward.

## Architecture

### System Architecture

The feature integrates with the existing admin system architecture:

- **Frontend**: Admin dashboard extension with people management interface
- **Backend**: New Express.js routes for people content CRUD operations
- **Database**: New table for storing edited people content with SQLite integration
- **Data Layer**: Enhanced PeopleDataService to prioritize database content over file content
- **Authentication**: Leverages existing admin authentication and session management
- **API**: RESTful endpoints for people content management

### Data Flow

1. **Initial Migration**: System imports people content from HTML files to database on first run
2. **Admin Access**: Administrator navigates to people management from admin dashboard
3. **Data Retrieval**: System fetches people list from database
4. **Content Editing**: Administrator selects person and edits content in text editor
5. **Data Persistence**: Updated content is saved to database with validation
6. **Public Display**: Website visitors see current database content

## Components and Interfaces

### 1. Database Schema

**People Content Table**:
```sql
CREATE TABLE people_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_slug TEXT UNIQUE NOT NULL,
  person_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  FOREIGN KEY (updated_by) REFERENCES admin_users(username)
);

CREATE INDEX idx_people_content_slug ON people_content(person_slug);
CREATE INDEX idx_people_content_updated ON people_content(updated_at);
```

### 2. Enhanced PeopleDataService

**Purpose**: Extends existing service to use database as primary content source with initial migration from files.

**New Methods**:
- `migrateFromFiles()`: One-time migration of content from HTML files to database
- `getPersonFromDatabase(slug)`: Returns person content from database
- `getAllPeopleFromDatabase()`: Returns all people content from database
- `isDatabaseMigrated()`: Checks if migration has been completed

**Enhanced Data Structure**:
```javascript
{
  id: "andrejs-osokins",
  name: "Andrejs Osokins",
  slug: "andrejs-osokins",
  content: {
    html: "processed HTML content",
    text: "plain text version",
    lastUpdated: "2024-01-01T00:00:00Z",
    updatedBy: "admin_username"
  },
  images: [...], // unchanged from file system
  metadata: {
    wordCount: 450,
    lastModified: "2024-01-01T00:00:00Z",
    source: "database"
  }
}
```

### 3. People Content Model

**Purpose**: Database model for managing people content.

```javascript
class PeopleContent {
  constructor(data = {}) {
    this.id = data.id;
    this.personSlug = data.person_slug;
    this.personName = data.person_name;
    this.content = data.content;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.updatedBy = data.updated_by;
  }

  static async findBySlug(slug) {
    // Retrieve content for specific person
  }

  static async create(data) {
    // Create new person content record
  }

  async update(content, updatedBy) {
    // Update existing person content
  }

  static async getAll() {
    // Get all people content
  }

  static async exists(slug) {
    // Check if person exists in database
  }
}
```

### 4. Admin People Management Interface

**Purpose**: Web interface for managing people content within admin dashboard.

**Main Components**:

#### People List View
```html
<div class="people-management-container">
  <header class="people-management-header">
    <h2>Interesanti People Management</h2>
    <p>Edit biographical content for people in the Interesanti section</p>
  </header>
  
  <div class="people-list">
    <!-- Person cards with edit status indicators -->
    <div class="person-card" data-slug="andrejs-osokins">
      <div class="person-thumbnail">
        <img src="/media/people/Andrejs Osokins/images/main.jpg" alt="Andrejs Osokins">
      </div>
      <div class="person-info">
        <h3>Andrejs Osokins</h3>
        <p class="content-preview">Pianists Andrejs Osokins ir viens no...</p>
        <div class="person-meta">
          <span class="word-count">450 words</span>
          <span class="last-updated">Updated 2 days ago</span>
        </div>
      </div>
      <div class="person-actions">
        <button class="edit-button" data-slug="andrejs-osokins">Edit</button>
      </div>
    </div>
  </div>
</div>
```

#### Content Editor Interface
```html
<div class="content-editor-container">
  <header class="editor-header">
    <div class="editor-breadcrumb">
      <a href="/admin/people">People Management</a> > 
      <span>Edit: {{person.name}}</span>
    </div>
    <div class="editor-actions">
      <button class="save-button" id="saveContent">Save Changes</button>
      <button class="cancel-button" id="cancelEdit">Cancel</button>
    </div>
  </header>
  
  <div class="editor-content">
    <div class="editor-sidebar">
      <div class="person-preview">
        <img src="{{person.mainImage.path}}" alt="{{person.name}}">
        <h3>{{person.name}}</h3>
        <div class="content-info">
          <p><strong>Last updated:</strong> <span class="last-updated">{{lastUpdated}}</span></p>
          <p><strong>Word count:</strong> <span class="word-count">{{wordCount}}</span></p>
        </div>
      </div>
    </div>
    
    <div class="editor-main">
      <div class="editor-toolbar">
        <div class="editor-info">
          <span class="content-info">Editing: {{person.name}}</span>
        </div>
      </div>
      
      <textarea class="content-editor" id="contentEditor" rows="20">
        {{person.content.text}}
      </textarea>
      
      <div class="editor-footer">
        <div class="character-count">
          <span id="characterCount">0</span> characters
        </div>
        <div class="save-status" id="saveStatus">
          <!-- Save status messages -->
        </div>
      </div>
    </div>
  </div>
</div>
```

### 5. API Endpoints

**Purpose**: RESTful API for people content management.

**Endpoints**:

```javascript
// Get all people
GET /admin/api/people
Response: {
  success: true,
  data: [
    {
      slug: "andrejs-osokins",
      name: "Andrejs Osokins",
      lastUpdated: "2024-01-01T00:00:00Z",
      updatedBy: "admin",
      contentPreview: "Pianists Andrejs Osokins...",
      wordCount: 450,
      mainImage: {...}
    }
  ]
}

// Get specific person content for editing
GET /admin/api/people/:slug
Response: {
  success: true,
  data: {
    slug: "andrejs-osokins",
    name: "Andrejs Osokins",
    content: {
      text: "Full biographical content...",
      lastUpdated: "2024-01-01T00:00:00Z",
      updatedBy: "admin"
    },
    images: [...],
    metadata: {...}
  }
}

// Save updated content
PUT /admin/api/people/:slug
Request: {
  content: "Updated biographical content..."
}
Response: {
  success: true,
  message: "Content saved successfully",
  data: {
    slug: "andrejs-osokins",
    updatedAt: "2024-01-01T00:00:00Z",
    wordCount: 465
  }
}
```

### 6. Route Handlers

**Purpose**: Express.js routes for admin people management.

```javascript
// Admin people management page
router.get('/admin/people', requireAuth, async (req, res) => {
  // Render people management interface
});

// Admin people editor page
router.get('/admin/people/:slug/edit', requireAuth, async (req, res) => {
  // Render content editor for specific person
});

// API routes for CRUD operations
router.get('/admin/api/people', requireAuth, peopleController.getAllPeople);
router.get('/admin/api/people/:slug', requireAuth, peopleController.getPerson);
router.put('/admin/api/people/:slug', requireAuth, peopleController.updatePerson);
```

## Data Models

### Enhanced Person Model

```javascript
class Person {
  // ... existing methods ...

  /**
   * Get content from database
   * @returns {Object} Content object from database
   */
  static async getFromDatabase(slug) {
    const dbContent = await PeopleContent.findBySlug(slug);
    
    if (dbContent) {
      return {
        text: dbContent.content,
        html: this.processTextToHtml(dbContent.content),
        lastUpdated: dbContent.updatedAt,
        updatedBy: dbContent.updatedBy
      };
    }
    
    return null;
  }

  /**
   * Update content in database
   * @param {string} content - New content
   * @param {string} updatedBy - Username of person making update
   * @returns {boolean} Success status
   */
  async updateContent(content, updatedBy) {
    const dbContent = await PeopleContent.findBySlug(this.slug);
    
    if (dbContent) {
      await dbContent.update(content, updatedBy);
      return true;
    }
    
    return false;
  }
}
```

### People Content Repository

```javascript
class PeopleContentRepository {
  constructor(database) {
    this.db = database;
  }

  async findBySlug(slug) {
    const query = 'SELECT * FROM people_content WHERE person_slug = ?';
    const row = await this.db.get(query, [slug]);
    return row ? new PeopleContent(row) : null;
  }

  async create(slug, name, content, updatedBy) {
    const query = `
      INSERT INTO people_content (person_slug, person_name, content, updated_by)
      VALUES (?, ?, ?, ?)
    `;
    const result = await this.db.run(query, [slug, name, content, updatedBy]);
    return result.lastID;
  }

  async update(slug, content, updatedBy) {
    const query = `
      UPDATE people_content 
      SET content = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
      WHERE person_slug = ?
    `;
    await this.db.run(query, [content, updatedBy, slug]);
  }

  async getAll() {
    const query = 'SELECT * FROM people_content ORDER BY person_name';
    const rows = await this.db.all(query);
    return rows.map(row => new PeopleContent(row));
  }

  async migrateFromFiles(peopleData) {
    const query = `
      INSERT OR IGNORE INTO people_content (person_slug, person_name, content, updated_by)
      VALUES (?, ?, ?, ?)
    `;
    
    for (const person of peopleData) {
      await this.db.run(query, [person.slug, person.name, person.content.text, 'system']);
    }
  }
}
```

## Error Handling

### Database Errors

- **Connection Failures**: Graceful fallback to file-based content
- **Constraint Violations**: Validation errors with user-friendly messages
- **Transaction Failures**: Rollback with error reporting

### Content Validation Errors

- **Empty Content**: Prevent saving empty or whitespace-only content
- **Content Too Long**: Enforce reasonable content length limits
- **Invalid Person**: Validate that person exists in file system

### Authentication Errors

- **Session Expired**: Redirect to login with return URL
- **Insufficient Permissions**: Access denied with appropriate message
- **CSRF Protection**: Validate request authenticity

### Error Response Format

```javascript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Content cannot be empty",
    field: "content",
    details: {
      minLength: 10,
      provided: 0
    }
  }
}
```

## Testing Strategy

### Unit Tests

- **PeopleContent Model**: CRUD operations, validation, error handling
- **Enhanced PeopleDataService**: Database integration, fallback mechanisms
- **API Controllers**: Request handling, response formatting, error cases
- **Content Processing**: Text validation, HTML generation, character counting

### Integration Tests

- **Database Operations**: Full CRUD workflow with real database
- **Admin Interface**: Form submission, content saving, error display
- **Authentication Flow**: Login requirements, session handling, permissions
- **Fallback Mechanisms**: Database unavailable scenarios

### End-to-End Tests

- **Complete Edit Workflow**: Login → Navigate → Edit → Save → Verify
- **Revert Functionality**: Edit content → Revert → Verify original restored
- **Public Display**: Verify edited content appears on public site
- **Error Scenarios**: Network failures, validation errors, permission issues

### Performance Tests

- **Database Query Performance**: Measure content retrieval times
- **Concurrent Editing**: Multiple admin users editing simultaneously
- **Memory Usage**: Monitor memory consumption with large content
- **Cache Efficiency**: Verify content caching reduces database load

## Security Considerations

### Authentication & Authorization

- **Admin-Only Access**: All people management features require admin authentication
- **Session Validation**: Verify active admin session for all operations
- **CSRF Protection**: Implement CSRF tokens for state-changing operations
- **Input Sanitization**: Sanitize all user input to prevent XSS attacks

### Data Protection

- **SQL Injection Prevention**: Use parameterized queries exclusively
- **Content Validation**: Validate content length and format
- **Audit Trail**: Log all content changes with user and timestamp
- **Backup Strategy**: Regular database backups including people content

### Access Control

```javascript
// Middleware for admin-only routes
const requireAdminAuth = (req, res, next) => {
  if (!req.session.admin || !req.session.admin.authenticated) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Admin authentication required' }
    });
  }
  next();
};

// CSRF protection for content modifications
const csrfProtection = csrf({ cookie: true });
router.use('/admin/api/people', csrfProtection);
```

## Performance Optimization

### Caching Strategy

- **Content Caching**: Cache frequently accessed people content
- **Database Connection Pooling**: Efficient database connection management
- **Static Asset Optimization**: Optimize admin interface assets
- **Lazy Loading**: Load people list progressively for large datasets

### Database Optimization

```sql
-- Indexes for performance
CREATE INDEX idx_people_content_slug ON people_content(person_slug);
CREATE INDEX idx_people_content_updated ON people_content(updated_at);

-- Query optimization
EXPLAIN QUERY PLAN SELECT * FROM people_content WHERE person_slug = ?;
```

### Frontend Optimization

- **Debounced Saving**: Prevent excessive save requests during typing
- **Progressive Enhancement**: Ensure functionality without JavaScript
- **Responsive Images**: Optimize person thumbnails for admin interface
- **Minimal Dependencies**: Keep admin interface lightweight

## Design System Integration

### Visual Consistency

The people management interface maintains consistency with the existing admin dashboard:

- **Color Palette**: Uses existing admin CSS variables
- **Typography**: Follows established admin font hierarchy
- **Component Styling**: Reuses existing admin component classes
- **Layout Patterns**: Consistent with other admin management interfaces

### Admin Interface Styling

```css
/* People Management Specific Styles */
.people-management-container {
  max-width: var(--admin-content-max-width);
  margin: 0 auto;
  padding: var(--admin-spacing-lg);
}

.person-card {
  background: var(--admin-card-background);
  border: 1px solid var(--admin-border-color);
  border-radius: var(--admin-border-radius);
  padding: var(--admin-spacing-md);
  margin-bottom: var(--admin-spacing-md);
  transition: var(--admin-transition-normal);
}

.person-card:hover {
  box-shadow: var(--admin-shadow-hover);
  border-color: var(--admin-primary-color);
}



/* Content Editor Styles */
.content-editor-container {
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
  background: var(--admin-background-color);
}

.content-editor {
  width: 100%;
  min-height: 400px;
  padding: var(--admin-spacing-md);
  border: 1px solid var(--admin-border-color);
  border-radius: var(--admin-border-radius);
  font-family: var(--admin-font-mono);
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
}

.content-editor:focus {
  outline: none;
  border-color: var(--admin-primary-color);
  box-shadow: 0 0 0 2px var(--admin-primary-color-alpha);
}
```