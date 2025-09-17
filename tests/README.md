# Test Suite Documentation

This directory contains a comprehensive test suite for the Latvian Author Website project. The tests cover all major functionality including API endpoints, authentication, content management, security, and error handling.

## Test Structure

### Core Test Files

1. **`api.test.js`** - Unit tests for backend API endpoints
   - Content retrieval endpoints
   - Contact form submission
   - Input validation
   - Rate limiting
   - Email functionality integration

2. **`admin-auth.test.js`** - Integration tests for admin authentication flow
   - Login/logout functionality
   - Session management
   - Authentication middleware
   - Brute force protection
   - Rate limiting for admin operations

3. **`content-management.test.js`** - Tests for content management functionality
   - CRUD operations for content
   - Content validation and sanitization
   - Content ordering and organization
   - Public API integration
   - Security measures for content operations

4. **`email-functionality.test.js`** - Tests for contact form and email sending
   - Email sending with various scenarios
   - Retry logic and error handling
   - Email formatting and sanitization
   - Database integration for contact messages
   - Rate limiting for email operations

5. **`image-management.test.js`** - Tests for image upload and management
   - File upload validation
   - Image CRUD operations
   - File type and size validation
   - Security measures for file operations
   - Frontend integration testing

6. **`security.test.js`** - Security measures and error handling scenarios
   - Security headers validation
   - Input sanitization and validation
   - CSRF protection
   - Rate limiting
   - Session security
   - XSS and injection prevention

7. **`models.test.js`** - Unit tests for database models
   - Content model operations
   - AdminUser model and authentication
   - ContactMessage model
   - Data validation and constraints

8. **`integration.test.js`** - Full application integration tests
   - Complete admin workflows
   - End-to-end content management
   - Session management across requests
   - Data consistency and integrity
   - Performance and load handling

9. **`error-handling.test.js`** - Comprehensive error handling tests
   - HTTP error responses
   - Authentication and authorization errors
   - Data validation errors
   - File upload errors
   - Database error handling
   - Network and timeout errors
   - Edge case scenarios

### Configuration Files

- **`jest.config.js`** - Jest test configuration
- **`setup.js`** - Global test setup and environment configuration

## Running Tests

### All Tests
```bash
npm test
```

### Test Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Security tests
npm run test:security

# Email functionality tests
npm run test:email

# Content management tests
npm run test:content

# Error handling tests
npm run test:errors
```

### Test Coverage
```bash
npm run test:coverage
```

### Watch Mode (for development)
```bash
npm run test:watch
```

## Test Environment

### Environment Variables
The tests use the following environment variables (set in `setup.js`):
- `NODE_ENV=test`
- `SESSION_SECRET=test-secret-key`
- `EMAIL_HOST=localhost`
- `EMAIL_PORT=587`
- `EMAIL_USER=test@example.com`
- `EMAIL_PASS=testpass`
- `EMAIL_FROM=test@example.com`

### Database
- Tests use a separate SQLite database that is cleaned up before each test suite
- Database is automatically initialized and closed for each test file

### Mocking
- Email functionality is mocked using Jest mocks for `nodemailer`
- File system operations are tested with temporary files
- Network requests are isolated using supertest

## Test Coverage Areas

### 1. Backend API Endpoints (Requirements: 5.3, 7.1, 8.2, 9.1, 10.4)
- ✅ Content retrieval endpoints (`/api/content/:section`)
- ✅ Contact form submission (`/api/contact`)
- ✅ Input validation and sanitization
- ✅ Rate limiting and security measures
- ✅ Error handling and edge cases

### 2. Admin Authentication Flow (Requirements: 7.1, 7.2, 7.3, 10.1, 10.2, 10.4)
- ✅ Login with valid/invalid credentials
- ✅ Session management and timeout
- ✅ Logout functionality
- ✅ Authentication middleware
- ✅ Brute force protection
- ✅ Rate limiting for admin operations

### 3. Contact Form and Email Sending (Requirements: 5.3, 5.4, 5.5)
- ✅ Email sending with success/failure scenarios
- ✅ Retry logic and timeout handling
- ✅ Email formatting and content sanitization
- ✅ Database integration for contact messages
- ✅ Rate limiting for contact form submissions

### 4. Image Upload and Content Management (Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 9.5)
- ✅ File upload validation and processing
- ✅ Content CRUD operations
- ✅ Content validation and sanitization
- ✅ Image management and organization
- ✅ Security measures for file operations

### 5. Security Measures and Error Handling (Requirements: 10.1, 10.3, 10.5)
- ✅ Security headers and CSP
- ✅ Input sanitization and XSS prevention
- ✅ CSRF protection
- ✅ Rate limiting across all endpoints
- ✅ Session security and management
- ✅ SQL injection prevention
- ✅ File upload security
- ✅ Error handling and logging

## Test Quality Metrics

### Coverage Goals
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

### Test Types Distribution
- **Unit Tests**: ~40% (Models, individual functions)
- **Integration Tests**: ~35% (API endpoints, workflows)
- **Security Tests**: ~15% (Security measures, validation)
- **Error Handling Tests**: ~10% (Edge cases, error scenarios)

## Best Practices Implemented

### 1. Test Isolation
- Each test file manages its own database state
- Tests don't depend on each other
- Proper cleanup after each test

### 2. Realistic Test Data
- Uses realistic user inputs and scenarios
- Tests edge cases and boundary conditions
- Includes internationalization and special characters

### 3. Security Testing
- Tests for common vulnerabilities (XSS, SQL injection, CSRF)
- Validates input sanitization
- Tests authentication and authorization

### 4. Performance Considerations
- Tests run with timeouts to catch performance issues
- Concurrent request testing
- Large payload handling

### 5. Error Scenarios
- Tests both expected and unexpected errors
- Validates error message structure
- Tests recovery scenarios

## Continuous Integration

The test suite is designed to run in CI/CD environments:
- All tests run sequentially to avoid port conflicts
- Proper cleanup and resource management
- Deterministic test results
- Comprehensive error reporting

## Troubleshooting

### Common Issues

1. **Port conflicts**: Tests run sequentially (`--runInBand`) to avoid this
2. **Database locks**: Each test file uses a fresh database
3. **Rate limiting**: Tests include delays where necessary
4. **Email configuration**: Email tests use mocks to avoid external dependencies

### Debug Mode
To run tests with full logging:
```bash
DEBUG=* npm test
```

### Individual Test Files
To run a specific test file:
```bash
npx jest tests/specific-test.test.js --runInBand
```

## Contributing

When adding new tests:
1. Follow the existing naming conventions
2. Include both positive and negative test cases
3. Add proper cleanup in `afterAll` hooks
4. Update this documentation if adding new test categories
5. Ensure tests are deterministic and don't rely on external services