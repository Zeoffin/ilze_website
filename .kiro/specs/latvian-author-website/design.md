# Design Document

## Overview

The Latvian Author Website is a single-page application showcasing children's book author Ilze Skrastiņa. The design emphasizes a playful, colorful aesthetic appropriate for children's literature while maintaining professional functionality for content management. The site features a responsive layout with smooth navigation, dynamic content management, and secure admin functionality.

## Architecture

### Frontend Architecture
- **Single Page Application (SPA)** with smooth scrolling navigation
- **Responsive Design** using CSS Grid and Flexbox for mobile-first approach
- **Progressive Enhancement** for accessibility and performance
- **Component-based Structure** for maintainable code organization

### Backend Architecture
- **Node.js with Express.js** for server-side functionality
- **RESTful API** for admin content management
- **File-based Storage** for images with database metadata
- **Session-based Authentication** for admin security
- **Email Service Integration** for contact form functionality

### Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+), responsive design
- **Backend**: Node.js, Express.js, bcrypt for password hashing
- **Database**: SQLite for simplicity and portability
- **Email**: Nodemailer for contact form submissions
- **File Upload**: Multer for image management
- **Security**: express-session, CSRF protection, input validation

## Components and Interfaces

### 1. Public Website Components

#### Header Navigation
```
┌─────────────────────────────────────────────────────────┐
│  [Logo/Title]    Grāmatas  Fragmenti  Interesanti  Kontakti │
└─────────────────────────────────────────────────────────┘
```
- Fixed header with smooth scroll navigation
- Responsive hamburger menu for mobile devices
- Playful typography and colors

#### Section Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│                    Interesanti Section                   │
│  ┌─────────────┐  Author biography text with           │
│  │ author.jpg  │  character illustrations scattered     │
│  │             │  around for visual appeal              │
│  └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Grāmatas Section                      │
│  Introduction text about books                          │
│  ┌─────────────┐  Book description text                │
│  │ book_3.jpg  │  with character decorations           │
│  └─────────────┘                                        │
│  ┌─────────────┐  Book description text                │
│  │ book_2.jpg  │  with character decorations           │
│  └─────────────┘                                        │
│  ┌─────────────┐  Book description text                │
│  │ book_4.jpg  │  with character decorations           │
│  └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Fragmenti Section                      │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                      │
│  │prev1│ │prev2│ │prev3│ │prev4│  Gallery grid layout   │
│  └─────┘ └─────┘ └─────┘ └─────┘                      │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                      │
│  │prev5│ │prev6│ │prev7│ │prev8│                      │
│  └─────┘ └─────┘ └─────┘ └─────┘                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Kontakti Section                       │
│  Contact Form:                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Name: [________________]                            │ │
│  │ Email: [_______________]                            │ │
│  │ Message: [_________________________]               │ │
│  │          [_________________________]               │ │
│  │          [_________________________]               │ │
│  │                    [Submit]                         │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      Footer                             │
│              [publisher.png logo]                       │
└─────────────────────────────────────────────────────────┘
```

### 2. Admin Panel Components

#### Admin Login Interface
```
┌─────────────────────────────────────────────────────────┐
│                   Admin Login                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Username: [________________]                        │ │
│  │ Password: [________________]                        │ │
│  │                  [Login]                            │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Admin Dashboard Interface
```
┌─────────────────────────────────────────────────────────┐
│  Admin Dashboard                            [Logout]    │
├─────────────────────────────────────────────────────────┤
│  Section Management:                                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │ Interesanti │ │  Grāmatas   │ │  Fragmenti  │      │
│  │    [Edit]   │ │    [Edit]   │ │    [Edit]   │      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
└─────────────────────────────────────────────────────────┘
```

#### Content Editor Interface
```
┌─────────────────────────────────────────────────────────┐
│  Edit Section: [Section Name]              [Save] [Cancel] │
├─────────────────────────────────────────────────────────┤
│  Text Content:                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ [Rich text editor with formatting options]         │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  Images:                                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                  │
│  │ img1    │ │ img2    │ │ [Upload] │                  │
│  │ [Delete]│ │ [Delete]│ │ New Image│                  │
│  └─────────┘ └─────────┘ └─────────┘                  │
└─────────────────────────────────────────────────────────┘
```

## Data Models

### Content Model
```javascript
{
  id: Integer (Primary Key),
  section: String ('interesanti', 'gramatas', 'fragmenti'),
  content_type: String ('text', 'image'),
  content: Text (for text content) / String (for image paths),
  order_index: Integer (for ordering content within sections),
  created_at: DateTime,
  updated_at: DateTime
}
```

### Admin User Model
```javascript
{
  id: Integer (Primary Key),
  username: String (Unique),
  password_hash: String (bcrypt hashed),
  email: String,
  created_at: DateTime,
  last_login: DateTime
}
```

### Contact Message Model
```javascript
{
  id: Integer (Primary Key),
  name: String,
  email: String,
  message: Text,
  submitted_at: DateTime,
  status: String ('sent', 'failed')
}
```

## API Endpoints

### Public Endpoints
- `GET /` - Serve main website
- `GET /api/content/:section` - Get content for specific section
- `POST /api/contact` - Submit contact form

### Admin Endpoints
- `POST /admin/login` - Admin authentication
- `POST /admin/logout` - Admin logout
- `GET /admin/dashboard` - Admin dashboard (protected)
- `GET /admin/content/:section` - Get editable content (protected)
- `PUT /admin/content/:section` - Update section content (protected)
- `POST /admin/upload` - Upload new images (protected)
- `DELETE /admin/image/:filename` - Delete image (protected)

## Design System

### Color Palette
- **Primary Colors**: Bright, cheerful colors suitable for children
  - Warm Orange: #FF6B35
  - Playful Blue: #4ECDC4
  - Sunny Yellow: #FFE66D
  - Soft Green: #95E1D3
- **Secondary Colors**:
  - Deep Purple: #6C5CE7
  - Coral Pink: #FD79A8
- **Neutral Colors**:
  - Warm White: #FFEAA7
  - Soft Gray: #DDD6FE
  - Dark Text: #2D3436

### Typography
- **Headings**: Playful, rounded font (e.g., Nunito, Comfortaa)
- **Body Text**: Clean, readable font (e.g., Open Sans, Lato)
- **Accent Text**: Hand-drawn style font for special elements

### Visual Elements
- **Character Integration**: Scatter character images throughout sections as decorative elements
- **Rounded Corners**: Use border-radius for friendly, soft appearance
- **Subtle Shadows**: Add depth with soft drop shadows
- **Hover Effects**: Gentle animations for interactive elements

## Error Handling

### Frontend Error Handling
- **Network Errors**: Display user-friendly messages for connection issues
- **Form Validation**: Real-time validation with clear error messages
- **Image Loading**: Fallback placeholders for failed image loads
- **Navigation Errors**: Smooth fallback for broken anchor links

### Backend Error Handling
- **Authentication Errors**: Secure error messages that don't reveal system details
- **File Upload Errors**: Validate file types, sizes, and handle upload failures
- **Database Errors**: Log errors server-side, return generic messages to client
- **Email Sending Errors**: Graceful handling of email service failures

### Security Error Handling
- **CSRF Protection**: Validate tokens and handle invalid requests
- **Rate Limiting**: Prevent spam on contact form and admin login attempts
- **Input Validation**: Sanitize all user inputs to prevent XSS and injection attacks

## Testing Strategy

### Frontend Testing
- **Unit Tests**: Test individual JavaScript functions and components
- **Integration Tests**: Test form submissions and API interactions
- **Visual Regression Tests**: Ensure design consistency across updates
- **Accessibility Tests**: Verify WCAG compliance and screen reader compatibility
- **Cross-browser Tests**: Ensure compatibility across major browsers

### Backend Testing
- **API Tests**: Test all endpoints with various input scenarios
- **Authentication Tests**: Verify login, logout, and session management
- **File Upload Tests**: Test image upload, validation, and deletion
- **Email Tests**: Mock email service and test contact form functionality
- **Security Tests**: Test for common vulnerabilities (XSS, CSRF, SQL injection)

### End-to-End Testing
- **User Journey Tests**: Test complete user flows from navigation to contact
- **Admin Workflow Tests**: Test complete admin content management workflows
- **Mobile Responsiveness**: Test functionality across different screen sizes
- **Performance Tests**: Ensure fast loading times and smooth interactions

## Security Considerations

### Authentication Security
- **Password Hashing**: Use bcrypt with appropriate salt rounds
- **Session Management**: Secure session cookies with httpOnly and secure flags
- **Login Rate Limiting**: Prevent brute force attacks on admin login
- **Session Timeout**: Automatic logout after inactivity

### Data Protection
- **Input Sanitization**: Clean all user inputs to prevent XSS attacks
- **CSRF Protection**: Implement CSRF tokens for state-changing operations
- **File Upload Security**: Validate file types, sizes, and scan for malicious content
- **SQL Injection Prevention**: Use parameterized queries for database operations

### Infrastructure Security
- **HTTPS Enforcement**: Redirect all HTTP traffic to HTTPS
- **Security Headers**: Implement appropriate security headers (CSP, HSTS, etc.)
- **Error Information**: Avoid exposing sensitive system information in error messages
- **Logging**: Log security events for monitoring and incident response