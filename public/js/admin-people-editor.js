/**
 * Admin People Content Editor
 * Handles the content editing interface for people biographical content
 */

class PeopleContentEditor {
    constructor() {
        this.personSlug = null;
        this.originalContent = '';
        this.currentContent = '';
        this.hasUnsavedChanges = false;
        this.isLoading = false;
        this.isSaving = false;
        this.autoSaveTimeout = null;
        this.autoSaveDelay = 3000; // 3 seconds

        this.elements = {
            // Header elements
            backButton: document.getElementById('backButton'),
            cancelButton: document.getElementById('cancelButton'),
            saveButton: document.getElementById('saveButton'),
            saveButtonText: document.getElementById('saveButtonText'),
            personNameBreadcrumb: document.getElementById('personNameBreadcrumb'),
            personNameTitle: document.getElementById('personNameTitle'),

            // Editor elements
            contentEditor: document.getElementById('contentEditor'),
            characterCount: document.getElementById('characterCount'),
            wordCount: document.getElementById('wordCount'),
            saveStatus: document.getElementById('saveStatus'),
            lastSaved: document.getElementById('lastSaved'),
            revertButton: document.getElementById('revertButton'),

            // Person preview elements
            personPreview: document.getElementById('personPreview'),

            // Modal elements
            unsavedChangesModal: document.getElementById('unsavedChangesModal'),
            stayButton: document.getElementById('stayButton'),
            discardButton: document.getElementById('discardButton'),
            saveErrorModal: document.getElementById('saveErrorModal'),
            saveErrorMessage: document.getElementById('saveErrorMessage'),
            closeErrorButton: document.getElementById('closeErrorButton'),
            retrySaveButton: document.getElementById('retrySaveButton'),

            // Loading overlay
            loadingOverlay: document.getElementById('loadingOverlay'),
            loadingText: document.getElementById('loadingText')
        };

        this.init();
    }

    init() {
        this.extractPersonSlug();
        this.bindEvents();
        this.loadPersonData();
        this.setupBeforeUnloadWarning();
    }

    extractPersonSlug() {
        // Extract person slug from URL path
        const pathParts = window.location.pathname.split('/');
        const editIndex = pathParts.indexOf('edit');
        if (editIndex > 0) {
            this.personSlug = pathParts[editIndex - 1];
        }

        if (!this.personSlug) {
            this.showError('Invalid person identifier in URL');
            return;
        }
    }

    bindEvents() {
        // Navigation events
        this.elements.backButton?.addEventListener('click', () => this.handleNavigation('/admin/people'));
        this.elements.cancelButton?.addEventListener('click', () => this.handleNavigation('/admin/people'));

        // Save events
        this.elements.saveButton?.addEventListener('click', () => this.saveContent());
        this.elements.revertButton?.addEventListener('click', () => this.revertChanges());

        // Content editor events
        this.elements.contentEditor?.addEventListener('input', (e) => this.handleContentChange(e));
        this.elements.contentEditor?.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Modal events
        this.elements.stayButton?.addEventListener('click', () => this.hideModal('unsavedChangesModal'));
        this.elements.discardButton?.addEventListener('click', () => this.discardChanges());
        this.elements.closeErrorButton?.addEventListener('click', () => this.hideModal('saveErrorModal'));
        this.elements.retrySaveButton?.addEventListener('click', () => {
            this.hideModal('saveErrorModal');
            this.saveContent();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleGlobalKeyDown(e));
    }

    setupBeforeUnloadWarning() {
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }

    async loadPersonData() {
        if (!this.personSlug) return;

        this.showLoading('Loading person information...');

        try {
            const response = await fetch(`/admin/api/people/${this.personSlug}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`Failed to load person data: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to load person data');
            }

            this.displayPersonData(result.data);
            this.originalContent = result.data.content?.text || '';
            this.currentContent = this.originalContent;
            this.elements.contentEditor.value = this.currentContent;
            this.updateContentStats();
            this.updateSaveButtonState();
            
            // Check for and restore any unsaved content from previous session
            this.restoreUnsavedContent();

        } catch (error) {
            console.error('Error loading person data:', error);
            
            // Handle authentication errors
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                this.handleAuthenticationError();
                return;
            }
            
            this.showError(`Failed to load person data: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    displayPersonData(personData) {
        // Update breadcrumb and title
        if (this.elements.personNameBreadcrumb) {
            this.elements.personNameBreadcrumb.textContent = personData.name;
        }
        if (this.elements.personNameTitle) {
            this.elements.personNameTitle.textContent = personData.name;
        }

        // Update person preview
        const previewHtml = `
            <div class="person-preview-info">
                <div class="person-preview-image">
                    ${personData.images?.main ? 
                        `<img src="${personData.images.main.path}" alt="${personData.name}">` :
                        `<svg class="person-preview-image-placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>`
                    }
                </div>
                <div class="person-preview-details">
                    <h4 class="person-preview-name">${personData.name}</h4>
                    <div class="person-preview-slug">${personData.slug}</div>
                    <div class="person-preview-meta">
                        <div class="preview-meta-item">
                            <span class="preview-meta-label">Source:</span>
                            <span class="preview-meta-value source ${personData.metadata?.source || 'file'}">${personData.metadata?.source || 'file'}</span>
                        </div>
                        <div class="preview-meta-item">
                            <span class="preview-meta-label">Last Updated:</span>
                            <span class="preview-meta-value">${this.formatDate(personData.content?.lastUpdated)}</span>
                        </div>
                        <div class="preview-meta-item">
                            <span class="preview-meta-label">Updated By:</span>
                            <span class="preview-meta-value">${personData.content?.updatedBy || 'System'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (this.elements.personPreview) {
            this.elements.personPreview.innerHTML = previewHtml;
        }
    }

    handleContentChange(event) {
        this.currentContent = event.target.value;
        this.hasUnsavedChanges = this.currentContent !== this.originalContent;
        
        this.updateContentStats();
        this.updateSaveButtonState();
        this.clearSaveStatus();
        
        // Clear existing auto-save timeout
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        // Set new auto-save timeout for draft saving
        this.autoSaveTimeout = setTimeout(() => this.saveDraft(), this.autoSaveDelay);
    }

    handleKeyDown(event) {
        // Handle tab key for indentation
        if (event.key === 'Tab') {
            event.preventDefault();
            const start = event.target.selectionStart;
            const end = event.target.selectionEnd;
            const value = event.target.value;
            
            event.target.value = value.substring(0, start) + '    ' + value.substring(end);
            event.target.selectionStart = event.target.selectionEnd = start + 4;
            
            this.handleContentChange(event);
        }
    }

    handleGlobalKeyDown(event) {
        // Ctrl+S or Cmd+S to save
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            if (!this.isSaving && this.hasUnsavedChanges) {
                this.saveContent();
            }
        }
        
        // Escape to cancel/go back
        if (event.key === 'Escape') {
            // Don't trigger if user is in a modal
            if (document.querySelector('.modal-overlay.show')) {
                return;
            }
            
            if (this.hasUnsavedChanges) {
                this.showModal('unsavedChangesModal');
            } else {
                this.handleNavigation('/admin/people');
            }
        }
        
        // Ctrl+Z or Cmd+Z to revert changes
        if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
            if (this.hasUnsavedChanges && !this.isSaving) {
                event.preventDefault();
                this.revertChanges();
            }
        }
    }

    updateContentStats() {
        const content = this.currentContent;
        const characterCount = content.length;
        const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

        if (this.elements.characterCount) {
            this.elements.characterCount.textContent = characterCount.toLocaleString();
        }
        if (this.elements.wordCount) {
            this.elements.wordCount.textContent = wordCount.toLocaleString();
        }
    }

    updateSaveButtonState() {
        const canSave = this.hasUnsavedChanges && !this.isSaving && !this.isLoading;
        
        if (this.elements.saveButton) {
            this.elements.saveButton.disabled = !canSave;
            this.elements.saveButton.classList.toggle('saving', this.isSaving);
        }
        
        if (this.elements.revertButton) {
            this.elements.revertButton.disabled = !this.hasUnsavedChanges || this.isSaving;
        }
    }

    async saveContent() {
        if (this.isSaving || !this.hasUnsavedChanges) return;

        // Validate content before saving
        const trimmedContent = this.currentContent.trim();
        if (trimmedContent.length === 0) {
            this.showSaveStatus('error', 'Content cannot be empty');
            return;
        }
        
        if (trimmedContent.length < 10) {
            this.showSaveStatus('error', 'Content must be at least 10 characters long');
            return;
        }

        this.isSaving = true;
        this.updateSaveButtonState();
        this.showSaveStatus('saving', 'Saving changes...');

        if (this.elements.saveButtonText) {
            this.elements.saveButtonText.textContent = 'Saving...';
        }

        try {
            const response = await fetch(`/admin/api/people/${this.personSlug}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    content: this.currentContent
                })
            });

            if (!response.ok) {
                throw new Error(`Save failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to save content');
            }

            // Update state after successful save
            this.originalContent = this.currentContent;
            this.hasUnsavedChanges = false;
            this.updateSaveButtonState();
            this.showSaveStatus('success', 'Changes saved successfully');
            this.updateLastSaved();
            this.clearDraft();

        } catch (error) {
            console.error('Error saving content:', error);
            
            // Handle authentication errors
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                this.handleAuthenticationError();
                return;
            }
            
            this.showSaveStatus('error', 'Failed to save changes');
            this.showSaveError(error.message);
        } finally {
            this.isSaving = false;
            this.updateSaveButtonState();
            
            if (this.elements.saveButtonText) {
                this.elements.saveButtonText.textContent = 'Save Changes';
            }
        }
    }

    revertChanges() {
        if (!this.hasUnsavedChanges) return;

        this.currentContent = this.originalContent;
        this.elements.contentEditor.value = this.currentContent;
        this.hasUnsavedChanges = false;
        
        this.updateContentStats();
        this.updateSaveButtonState();
        this.showSaveStatus('success', 'Changes reverted');
    }

    handleNavigation(url) {
        if (this.hasUnsavedChanges) {
            this.showModal('unsavedChangesModal');
            this.pendingNavigation = url;
        } else {
            window.location.href = url;
        }
    }

    discardChanges() {
        this.hasUnsavedChanges = false;
        this.hideModal('unsavedChangesModal');
        
        if (this.pendingNavigation) {
            window.location.href = this.pendingNavigation;
        }
    }

    showSaveStatus(type, message) {
        if (!this.elements.saveStatus) return;

        const iconHtml = {
            saving: '<svg class="save-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>',
            success: '<svg class="save-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22,4 12,14.01 9,11.01"></polyline></svg>',
            error: '<svg class="save-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
        };

        this.elements.saveStatus.className = `save-status ${type}`;
        this.elements.saveStatus.innerHTML = `${iconHtml[type] || ''}${message}`;

        // Clear status after delay (except for errors)
        if (type !== 'error') {
            setTimeout(() => this.clearSaveStatus(), 3000);
        }
    }

    clearSaveStatus() {
        if (this.elements.saveStatus) {
            this.elements.saveStatus.className = 'save-status';
            this.elements.saveStatus.innerHTML = '';
        }
    }

    updateLastSaved() {
        if (this.elements.lastSaved) {
            const now = new Date();
            this.elements.lastSaved.textContent = `Last saved: ${this.formatTime(now)}`;
        }
    }

    showSaveError(message) {
        if (this.elements.saveErrorMessage) {
            this.elements.saveErrorMessage.textContent = message;
        }
        this.showModal('saveErrorModal');
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    showLoading(message = 'Loading...') {
        this.isLoading = true;
        if (this.elements.loadingText) {
            this.elements.loadingText.textContent = message;
        }
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('show');
        }
    }

    hideLoading() {
        this.isLoading = false;
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.remove('show');
        }
    }

    showError(message) {
        console.error('Editor Error:', message);
        
        // Use the existing error modal system
        if (this.elements.saveErrorMessage) {
            this.elements.saveErrorMessage.textContent = message;
        }
        this.showModal('saveErrorModal');
    }

    formatDate(dateString) {
        if (!dateString) return 'Never';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Invalid date';
        }
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    handleAuthenticationError() {
        // Store current content to preserve unsaved changes
        if (this.hasUnsavedChanges) {
            localStorage.setItem('peopleEditor_unsavedContent', JSON.stringify({
                slug: this.personSlug,
                content: this.currentContent,
                timestamp: Date.now()
            }));
        }
        
        // Show authentication error message
        this.showSaveStatus('error', 'Session expired. Redirecting to login...');
        
        // Redirect to login after a short delay
        setTimeout(() => {
            window.location.href = '/admin/login?redirect=' + encodeURIComponent(window.location.pathname);
        }, 2000);
    }

    restoreUnsavedContent() {
        // Check for previously saved unsaved content
        const savedContent = localStorage.getItem('peopleEditor_unsavedContent');
        if (savedContent) {
            try {
                const data = JSON.parse(savedContent);
                
                // Only restore if it's for the same person and not too old (1 hour)
                if (data.slug === this.personSlug && (Date.now() - data.timestamp) < 3600000) {
                    this.currentContent = data.content;
                    this.elements.contentEditor.value = this.currentContent;
                    this.hasUnsavedChanges = true;
                    this.updateContentStats();
                    this.updateSaveButtonState();
                    this.showSaveStatus('success', 'Restored unsaved changes from previous session');
                }
                
                // Clean up the stored content
                localStorage.removeItem('peopleEditor_unsavedContent');
            } catch (error) {
                console.error('Failed to restore unsaved content:', error);
                localStorage.removeItem('peopleEditor_unsavedContent');
            }
        }
    }

    saveDraft() {
        // Save current content as draft to localStorage
        if (this.hasUnsavedChanges && this.personSlug) {
            try {
                localStorage.setItem('peopleEditor_draft', JSON.stringify({
                    slug: this.personSlug,
                    content: this.currentContent,
                    timestamp: Date.now()
                }));
                
                // Show subtle draft saved indicator
                this.showSaveStatus('success', 'Draft saved automatically');
                setTimeout(() => this.clearSaveStatus(), 2000);
            } catch (error) {
                console.error('Failed to save draft:', error);
            }
        }
    }

    clearDraft() {
        // Clear saved draft when content is successfully saved
        localStorage.removeItem('peopleEditor_draft');
    }
}

// Initialize the editor when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.peopleContentEditor = new PeopleContentEditor();
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PeopleContentEditor;
}