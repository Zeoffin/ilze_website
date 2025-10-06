/**
 * Admin People Management JavaScript
 * Handles people list display, loading states, and navigation
 */

class AdminPeopleManager {
    constructor() {
        this.people = [];
        this.isLoading = false;
        this.hasError = false;
        
        this.init();
    }
    
    async init() {
        try {
            // Show loading overlay
            this.showLoading();
            
            // Check authentication status
            const authStatus = await window.adminUtils.checkAuthStatus();
            if (!authStatus.isAuthenticated) {
                if (authStatus.error === 'Network' || authStatus.error === 'Timeout') {
                    this.showError('Unable to verify authentication. Please check your connection and try again.');
                    this.hideLoading();
                    return;
                }
                window.location.href = '/admin/login';
                return;
            }
            
            // Initialize the interface
            this.setupEventListeners();
            this.setupConnectionHandling();
            this.updateUserInfo(authStatus.user);
            
            // Load people data
            await this.loadPeopleData();
            
            // Hide loading overlay
            this.hideLoading();
            
        } catch (error) {
            console.error('People manager initialization error:', error);
            this.showError('Failed to initialize people management interface');
            this.hideLoading();
        }
    }
    
    setupEventListeners() {
        // User menu functionality (reuse from dashboard)
        const userMenuButton = document.getElementById('userMenuButton');
        const userDropdown = document.getElementById('userDropdown');
        
        if (userMenuButton && userDropdown) {
            userMenuButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUserMenu();
            });
            
            document.addEventListener('click', () => {
                this.closeUserMenu();
            });
            
            userDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        // Logout button
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                this.handleLogout();
            });
        }
        
        // Retry button
        const retryButton = document.getElementById('retryButton');
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                this.retryLoadPeople();
            });
        }
        
        // People grid click handlers (delegated event handling)
        const peopleGrid = document.getElementById('peopleGrid');
        if (peopleGrid) {
            peopleGrid.addEventListener('click', (e) => {
                this.handlePeopleGridClick(e);
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape key functionality
            if (e.key === 'Escape') {
                this.closeUserMenu();
            }
            
            // Ctrl/Cmd + R for refresh
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                this.refreshPeopleData();
            }
            
            // F5 for refresh (alternative)
            if (e.key === 'F5') {
                e.preventDefault();
                this.refreshPeopleData();
            }
            
            // Arrow key navigation for person cards
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                this.handleKeyboardNavigation(e);
            }
            
            // Enter key to activate focused person card
            if (e.key === 'Enter') {
                const focusedCard = document.querySelector('.person-card:focus');
                if (focusedCard) {
                    e.preventDefault();
                    const slug = focusedCard.dataset.slug;
                    if (slug) {
                        this.navigateToEditor(slug);
                    }
                }
            }
        });
    }
    
    async loadPeopleData() {
        try {
            this.showLoadingState();
            this.isLoading = true;
            this.hasError = false;
            
            console.log('Loading people data...');
            
            const response = await window.adminUtils.authenticatedFetch('/admin/api/people', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    window.adminUtils.showError('Session expired. Redirecting to login...');
                    setTimeout(() => {
                        window.location.href = '/admin/login';
                    }, 1500);
                    return;
                }
                
                const errorData = await response.json().catch(() => ({}));
                let errorMessage = 'Failed to load people data';
                
                switch (response.status) {
                    case 403:
                        errorMessage = 'Access denied. You do not have permission to view people data.';
                        break;
                    case 404:
                        errorMessage = 'People management endpoint not found.';
                        break;
                    case 500:
                        errorMessage = 'Server error occurred while loading people data.';
                        break;
                    default:
                        errorMessage = errorData.message || `HTTP ${response.status}: Failed to load people data`;
                }
                
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to load people data');
            }
            
            this.people = data.data || [];
            console.log(`Loaded ${this.people.length} people profiles from ${data.meta?.source || 'unknown source'}`);
            
            // Show success message if data was migrated
            if (data.meta?.migrated === false && this.people.length > 0) {
                window.adminUtils.showInfo('People data loaded from files. Database migration will occur automatically.');
            }
            
            this.renderPeopleGrid();
            this.updateStats();
            
        } catch (error) {
            console.error('Failed to load people data:', error);
            this.hasError = true;
            
            // Provide specific error handling based on error type
            let displayMessage = error.message;
            
            if (error.name === 'TimeoutError') {
                displayMessage = 'Request timed out. Please check your connection and try again.';
            } else if (error.name === 'NetworkError') {
                displayMessage = 'Network error occurred. Please check your internet connection.';
            }
            
            this.showErrorState(displayMessage);
        } finally {
            this.isLoading = false;
        }
    }
    
    renderPeopleGrid() {
        const peopleGrid = document.getElementById('peopleGrid');
        const loadingState = document.getElementById('loadingState');
        const errorState = document.getElementById('errorState');
        const emptyState = document.getElementById('emptyState');
        
        // Hide all states first
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
        
        if (this.people.length === 0) {
            emptyState.style.display = 'flex';
            peopleGrid.style.display = 'none';
            return;
        }
        
        // Clear existing content
        peopleGrid.innerHTML = '';
        
        // Render each person card
        this.people.forEach(person => {
            const personCard = this.createPersonCard(person);
            peopleGrid.appendChild(personCard);
        });
        
        peopleGrid.style.display = 'grid';
    }
    
    createPersonCard(person) {
        const card = document.createElement('div');
        card.className = 'person-card';
        card.dataset.slug = person.slug;
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Edit ${person.name} profile`);
        card.setAttribute('title', `Click to edit ${person.name}'s biographical content`);
        
        // Determine content source and status
        const contentSource = person.metadata?.source || 'file';
        const hasContent = person.content && person.content.text && person.content.text.trim().length > 0;
        const hasImages = person.images && person.images.length > 0;
        const isRecentlyUpdated = this.isRecentlyUpdated(person.metadata?.lastModified || person.content?.lastUpdated);
        
        // Get main image
        const mainImage = hasImages ? person.images[0] : null;
        
        // Create content preview
        const contentPreview = this.createContentPreview(person.content?.text || '');
        
        // Format last updated date
        const lastUpdated = this.formatLastUpdated(person.metadata?.lastModified || person.content?.lastUpdated);
        
        card.innerHTML = `
            <div class="person-status">
                <div class="status-badge ${hasContent ? 'has-content' : ''}" title="${hasContent ? 'Has content' : 'No content'}"></div>
                <div class="status-badge ${hasImages ? 'has-images' : ''}" title="${hasImages ? 'Has images' : 'No images'}"></div>
                <div class="status-badge ${isRecentlyUpdated ? 'recently-updated' : ''}" title="${isRecentlyUpdated ? 'Recently updated' : 'Not recently updated'}"></div>
            </div>
            
            <div class="person-card-header">
                <div class="person-thumbnail">
                    ${mainImage ? 
                        `<img src="${this.escapeHtml(mainImage.path)}" alt="${this.escapeHtml(mainImage.alt || person.name)}" loading="lazy">` :
                        `<svg class="person-thumbnail-placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>`
                    }
                </div>
                <div class="person-info">
                    <h3 class="person-name">${this.escapeHtml(person.name)}</h3>
                    <div class="person-slug">${this.escapeHtml(person.slug)}</div>
                </div>
            </div>
            
            <div class="person-content">
                <p class="content-preview">${contentPreview}</p>
                
                <div class="person-meta">
                    <div class="meta-item">
                        <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14,2 14,8 20,8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10,9 9,9 8,9"></polyline>
                        </svg>
                        <span class="word-count">${person.metadata?.wordCount || 0} words</span>
                    </div>
                    
                    <div class="meta-item">
                        <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <span class="last-updated">${lastUpdated}</span>
                    </div>
                    
                    <div class="meta-item">
                        <span class="content-source ${contentSource}">${contentSource === 'database' ? 'Database' : 'File'}</span>
                    </div>
                </div>
            </div>
            
            <div class="person-actions">
                <a href="/admin/people/${this.escapeHtml(person.slug)}/edit" class="edit-person-button">
                    <svg class="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit Content
                </a>
                <a href="/#interesanti-${this.escapeHtml(person.slug)}" target="_blank" rel="noopener" class="view-person-button" title="View on website">
                    <svg class="view-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15,3 21,3 21,9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
            </div>
        `;
        
        return card;
    }
    
    createContentPreview(text) {
        if (!text || text.trim().length === 0) {
            return '<em>No content available</em>';
        }
        
        // Clean the text and create a preview
        const cleanText = text.replace(/\s+/g, ' ').trim();
        const maxLength = 150;
        
        if (cleanText.length <= maxLength) {
            return this.escapeHtml(cleanText);
        }
        
        // Find a good breaking point near the max length
        const truncated = cleanText.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        const breakPoint = lastSpace > maxLength * 0.7 ? lastSpace : maxLength;
        
        return this.escapeHtml(cleanText.substring(0, breakPoint)) + '...';
    }
    
    isRecentlyUpdated(dateString) {
        if (!dateString) return false;
        
        const date = new Date(dateString);
        const now = new Date();
        const daysDiff = (now - date) / (1000 * 60 * 60 * 24);
        
        return daysDiff <= 7; // Consider recent if updated within 7 days
    }
    
    formatLastUpdated(dateString) {
        if (!dateString) return 'Unknown';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString('lv-LV', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    }
    
    updateStats() {
        const totalPeopleEl = document.getElementById('totalPeople');
        const lastUpdatedEl = document.getElementById('lastUpdated');
        
        if (totalPeopleEl) {
            // Add animation to number change
            const currentCount = parseInt(totalPeopleEl.textContent) || 0;
            const newCount = this.people.length;
            
            if (currentCount !== newCount) {
                this.animateNumber(totalPeopleEl, currentCount, newCount);
            }
        }
        
        if (lastUpdatedEl && this.people.length > 0) {
            // Find the most recently updated person
            const mostRecent = this.people.reduce((latest, person) => {
                const personDate = new Date(person.lastUpdated || person.metadata?.lastModified || person.content?.lastUpdated || 0);
                const latestDate = new Date(latest.lastUpdated || latest.metadata?.lastModified || latest.content?.lastUpdated || 0);
                return personDate > latestDate ? person : latest;
            });
            
            lastUpdatedEl.textContent = this.formatLastUpdated(
                mostRecent.lastUpdated || mostRecent.metadata?.lastModified || mostRecent.content?.lastUpdated
            );
        } else if (lastUpdatedEl) {
            lastUpdatedEl.textContent = 'Never';
        }
    }
    
    /**
     * Animate number changes in stats
     */
    animateNumber(element, from, to, duration = 500) {
        const startTime = performance.now();
        const difference = to - from;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.round(from + (difference * easeOutQuart));
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * Refresh people data
     */
    async refreshPeopleData() {
        if (this.isLoading) {
            console.log('Already loading, skipping refresh');
            return;
        }
        
        console.log('Refreshing people data...');
        window.adminUtils.showInfo('Refreshing people data...');
        await this.loadPeopleData();
    }
    
    /**
     * Handle keyboard navigation between person cards
     */
    handleKeyboardNavigation(e) {
        const cards = Array.from(document.querySelectorAll('.person-card'));
        if (cards.length === 0) return;
        
        const focusedCard = document.querySelector('.person-card:focus');
        let currentIndex = focusedCard ? cards.indexOf(focusedCard) : -1;
        
        // Calculate grid dimensions for arrow navigation
        const gridContainer = document.getElementById('peopleGrid');
        if (!gridContainer) return;
        
        const gridStyles = window.getComputedStyle(gridContainer);
        const gridCols = gridStyles.gridTemplateColumns.split(' ').length;
        
        let newIndex = currentIndex;
        
        switch (e.key) {
            case 'ArrowRight':
                newIndex = Math.min(currentIndex + 1, cards.length - 1);
                break;
            case 'ArrowLeft':
                newIndex = Math.max(currentIndex - 1, 0);
                break;
            case 'ArrowDown':
                newIndex = Math.min(currentIndex + gridCols, cards.length - 1);
                break;
            case 'ArrowUp':
                newIndex = Math.max(currentIndex - gridCols, 0);
                break;
        }
        
        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < cards.length) {
            e.preventDefault();
            cards[newIndex].focus();
        }
    }
    
    showLoadingState() {
        const loadingState = document.getElementById('loadingState');
        const errorState = document.getElementById('errorState');
        const emptyState = document.getElementById('emptyState');
        const peopleGrid = document.getElementById('peopleGrid');
        
        loadingState.style.display = 'flex';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
        peopleGrid.style.display = 'none';
    }
    
    showErrorState(message) {
        const loadingState = document.getElementById('loadingState');
        const errorState = document.getElementById('errorState');
        const emptyState = document.getElementById('emptyState');
        const peopleGrid = document.getElementById('peopleGrid');
        const errorMessage = document.getElementById('errorMessage');
        
        loadingState.style.display = 'none';
        errorState.style.display = 'flex';
        emptyState.style.display = 'none';
        peopleGrid.style.display = 'none';
        
        if (errorMessage) {
            errorMessage.textContent = message || 'An error occurred while loading people data.';
        }
    }
    
    async retryLoadPeople() {
        console.log('Retrying people data load...');
        await this.loadPeopleData();
    }
    
    /**
     * Handle clicks within the people grid (delegated event handling)
     */
    handlePeopleGridClick(e) {
        // Handle edit button clicks
        const editButton = e.target.closest('.edit-person-button');
        if (editButton) {
            e.preventDefault();
            const slug = editButton.closest('.person-card')?.dataset.slug;
            if (slug) {
                this.navigateToEditor(slug);
            }
            return;
        }
        
        // Handle view button clicks
        const viewButton = e.target.closest('.view-person-button');
        if (viewButton) {
            // Let the default link behavior handle this
            return;
        }
        
        // Handle person card clicks (navigate to editor)
        const personCard = e.target.closest('.person-card');
        if (personCard && !e.target.closest('.person-actions')) {
            const slug = personCard.dataset.slug;
            if (slug) {
                this.navigateToEditor(slug);
            }
        }
    }
    
    /**
     * Navigate to the person editor page
     */
    navigateToEditor(slug) {
        if (!slug) {
            console.error('No slug provided for navigation');
            window.adminUtils.showError('Unable to navigate: person not found');
            return;
        }
        
        // Find the person data for better feedback
        const person = this.people.find(p => p.slug === slug);
        const personName = person ? person.name : slug;
        
        // Show loading indicator with specific message
        this.showLoading();
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            loadingText.textContent = `Opening editor for ${personName}...`;
        }
        
        // Navigate to editor page
        const editorUrl = `/admin/people/${encodeURIComponent(slug)}/edit`;
        console.log(`Navigating to editor: ${editorUrl} for person: ${personName}`);
        
        // Add visual feedback to the card being clicked
        const personCard = document.querySelector(`[data-slug="${slug}"]`);
        if (personCard) {
            personCard.style.opacity = '0.6';
            personCard.style.transform = 'scale(0.98)';
        }
        
        // Use window.location for navigation
        window.location.href = editorUrl;
    }
    
    updateUserInfo(user) {
        const usernameElement = document.getElementById('adminUsername');
        if (usernameElement && user) {
            usernameElement.textContent = user.username;
        }
    }
    
    toggleUserMenu() {
        const button = document.getElementById('userMenuButton');
        const dropdown = document.getElementById('userDropdown');
        
        if (button && dropdown) {
            const isExpanded = button.getAttribute('aria-expanded') === 'true';
            button.setAttribute('aria-expanded', !isExpanded);
            dropdown.classList.toggle('show');
        }
    }
    
    closeUserMenu() {
        const button = document.getElementById('userMenuButton');
        const dropdown = document.getElementById('userDropdown');
        
        if (button && dropdown) {
            button.setAttribute('aria-expanded', 'false');
            dropdown.classList.remove('show');
        }
    }
    
    async handleLogout() {
        try {
            this.showLoading();
            
            const response = await window.adminUtils.authenticatedFetch('/admin/logout', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                window.adminUtils.showSuccess('Logged out successfully');
                setTimeout(() => {
                    window.location.href = '/admin/login';
                }, 1000);
            } else {
                throw new Error('Logout failed');
            }
            
        } catch (error) {
            console.error('Logout error:', error);
            window.adminUtils.showError('Logout failed. Please try again.');
        } finally {
            this.hideLoading();
        }
    }
    
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('show');
        }
    }
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Check connection status and provide feedback
     */
    async checkConnectionStatus() {
        try {
            const response = await fetch('/admin/status', {
                method: 'GET',
                credentials: 'same-origin',
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            
            return response.ok;
        } catch (error) {
            console.warn('Connection check failed:', error);
            return false;
        }
    }
    
    /**
     * Handle online/offline status changes
     */
    setupConnectionHandling() {
        window.addEventListener('online', () => {
            console.log('Connection restored');
            window.adminUtils.showSuccess('Connection restored. Refreshing data...');
            setTimeout(() => {
                this.refreshPeopleData();
            }, 1000);
        });
        
        window.addEventListener('offline', () => {
            console.log('Connection lost');
            window.adminUtils.showError('Connection lost. Some features may not work properly.');
        });
        
        // Check connection status periodically when there are errors
        if (this.hasError) {
            const checkInterval = setInterval(async () => {
                const isOnline = await this.checkConnectionStatus();
                if (isOnline && this.hasError) {
                    clearInterval(checkInterval);
                    window.adminUtils.showInfo('Connection restored. Click retry to reload data.');
                }
            }, 30000); // Check every 30 seconds
            
            // Clear interval after 5 minutes to avoid indefinite checking
            setTimeout(() => clearInterval(checkInterval), 300000);
        }
    }
}

// Initialize the people manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminPeopleManager();
});

// Handle page visibility changes to refresh data if needed
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Page became visible, could refresh data here if needed
        console.log('People management page became visible');
    }
});