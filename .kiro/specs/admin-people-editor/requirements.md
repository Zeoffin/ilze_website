# Requirements Document

## Introduction

This feature extends the existing admin panel to allow editing of people content in the "Interesanti" section. Currently, people data is loaded from static HTML files in `/public/media/people/` directory. This feature will migrate people content to database storage and provide an admin interface to edit the text content of each person. Once migrated, all content will be managed through the database.

## Requirements

### Requirement 1

**User Story:** As a website administrator, I want to see an "Interesanti People" section in the admin dashboard, so that I can manage the content of people profiles.

#### Acceptance Criteria

1. WHEN the administrator views the admin dashboard THEN the system SHALL display an "Interesanti People" card in the content management section
2. WHEN the administrator clicks on the "Interesanti People" card THEN the system SHALL navigate to the people management interface
3. WHEN displaying the people management card THEN the system SHALL show an appropriate icon and description indicating it manages people profiles

### Requirement 2

**User Story:** As a website administrator, I want to see a list of all people in the Interesanti section, so that I can select which person's content I want to edit.

#### Acceptance Criteria

1. WHEN the administrator accesses the people management interface THEN the system SHALL display a list of all people from the Interesanti section
2. WHEN displaying each person in the list THEN the system SHALL show their name, a thumbnail image, and a brief content preview
3. WHEN displaying the people list THEN the system SHALL provide an "Edit" button for each person
4. WHEN no people are available THEN the system SHALL display an appropriate message explaining the situation

### Requirement 3

**User Story:** As a website administrator, I want to edit the text content of a specific person, so that I can update their biographical information.

#### Acceptance Criteria

1. WHEN the administrator clicks "Edit" for a person THEN the system SHALL open an editor interface for that person's content
2. WHEN the editor loads THEN the system SHALL display the current text content from the database
3. WHEN editing content THEN the system SHALL provide a textarea for modifying the biographical text
4. WHEN editing THEN the system SHALL preserve the person's name, images, and other metadata unchanged
5. WHEN the administrator makes changes THEN the system SHALL provide "Save" and "Cancel" buttons
6. WHEN the administrator clicks "Save" THEN the system SHALL update the content in the database
7. WHEN the administrator clicks "Cancel" THEN the system SHALL discard changes and return to the people list

### Requirement 4

**User Story:** As a website administrator, I want the system to migrate people content from files to the database, so that all content can be managed through the admin interface.

#### Acceptance Criteria

1. WHEN the system initializes THEN it SHALL check if people content exists in the database
2. WHEN people content is not in the database THEN the system SHALL import content from the HTML files into the database
3. WHEN importing content THEN the system SHALL preserve the text content, person name, and slug
4. WHEN importing is complete THEN the system SHALL use the database as the primary source for people content
5. WHEN the import process fails for some people THEN the system SHALL log errors and continue with successful imports

### Requirement 5

**User Story:** As a website visitor, I want to see the current people content from the database, so that I always see the latest information.

#### Acceptance Criteria

1. WHEN a visitor views the Interesanti section THEN the system SHALL display content from the database
2. WHEN a visitor views a person's profile page THEN the system SHALL display the content from the database
3. WHEN content is updated by an administrator THEN the system SHALL immediately reflect the changes for all visitors
4. WHEN the system cannot access database content THEN the system SHALL display an appropriate error message
5. WHEN displaying content THEN the system SHALL maintain the same formatting and presentation as before

### Requirement 6

**User Story:** As a website administrator, I want the system to handle database storage for people content, so that all people content is managed in one place.

#### Acceptance Criteria

1. WHEN the system initializes THEN it SHALL create a database table for storing people content
2. WHEN storing people content THEN the system SHALL save the person's slug, name, text content, and modification timestamp
3. WHEN retrieving people data THEN the system SHALL get content from the database
4. WHEN updating content THEN the system SHALL update the existing database record
5. WHEN the database is unavailable THEN the system SHALL display appropriate error messages

### Requirement 7

**User Story:** As a website administrator, I want to see clear feedback when saving or editing content, so that I know when my changes have been successfully applied.

#### Acceptance Criteria

1. WHEN saving content THEN the system SHALL display a success message confirming the save operation
2. WHEN a save operation fails THEN the system SHALL display an error message with details about the failure
3. WHEN loading the editor THEN the system SHALL show a loading indicator while content is being retrieved
4. WHEN content is being saved THEN the system SHALL disable the save button and show a saving indicator
5. WHEN returning to the people list after editing THEN the system SHALL show the updated content preview

### Requirement 8

**User Story:** As a system administrator, I want the people editing functionality to integrate seamlessly with the existing admin authentication and security, so that only authorized users can edit content.

#### Acceptance Criteria

1. WHEN accessing people management features THEN the system SHALL require valid admin authentication
2. WHEN an unauthenticated user tries to access people editing THEN the system SHALL redirect to the admin login page
3. WHEN an admin session expires during editing THEN the system SHALL handle the situation gracefully and preserve unsaved changes if possible
4. WHEN performing edit operations THEN the system SHALL validate admin permissions for each request
5. WHEN logging admin actions THEN the system SHALL record people content edits in the admin activity log