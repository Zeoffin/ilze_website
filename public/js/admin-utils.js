/**
 * Admin Utilities
 * Common utilities for admin panel functionality including CSRF token handling
 */

class AdminUtils {
    constructor() {
        this.csrfToken = null;
    }
    
    /**
     * Get CSRF token from server
     */
    async getCsrfToken() {
        try {
            const response = await fetch('/admin/status', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const csrfToken = response.headers.get('X-CSRF-Token');
                if (csrfToken) {
                    this.csrfToken = csrfToken;
                    return csrfToken;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Failed to get CSRF token:', error);
            return null;
        }
    }
    
    /**
     * Make authenticated request with CSRF token
     */
    async authenticatedFetch(url, options = {}) {
        // Ensure we have a CSRF token for state-changing operations
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase())) {
            if (!this.csrfToken) {
                await this.getCsrfToken();
            }
            
            // Add CSRF token to headers
            options.headers = {
                ...options.headers,
                'X-CSRF-Token': this.csrfToken
            };
        }
        
        // Ensure credentials are included
        options.credentials = 'same-origin';
        
        // Add timeout if not provided
        if (!options.signal) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second default timeout
            options.signal = controller.signal;
            
            // Clear timeout when request completes
            options.signal.addEventListener('abort', () => clearTimeout(timeoutId));
        }
        
        try {
            const response = await fetch(url, options);
            
            // Update CSRF token if provided in response
            const newCsrfToken = response.headers.get('X-CSRF-Token');
            if (newCsrfToken) {
                this.csrfToken = newCsrfToken;
            }
            
            // Handle CSRF token mismatch
            if (response.status === 403) {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.error === 'CSRF token mismatch') {
                    // Try to get a new token and retry once
                    await this.getCsrfToken();
                    if (this.csrfToken) {
                        options.headers['X-CSRF-Token'] = this.csrfToken;
                        
                        // Create new controller for retry
                        const retryController = new AbortController();
                        const retryTimeoutId = setTimeout(() => retryController.abort(), 30000);
                        options.signal = retryController.signal;
                        
                        return await fetch(url, options);
                    }
                }
            }
            
            return response;
        } catch (error) {
            console.error('Authenticated fetch failed:', error);
            
            // Enhance error with more context
            if (error.name === 'AbortError') {
                const enhancedError = new Error('Request timed out');
                enhancedError.name = 'TimeoutError';
                enhancedError.originalError = error;
                throw enhancedError;
            } else if (error.message.includes('fetch')) {
                const enhancedError = new Error('Network error occurred');
                enhancedError.name = 'NetworkError';
                enhancedError.originalError = error;
                throw enhancedError;
            }
            
            throw error;
        }
    }
    
    /**
     * Check authentication status
     */
    async checkAuthStatus() {
        try {
            const response = await this.authenticatedFetch('/admin/status', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    return { isAuthenticated: false, error: 'Unauthorized' };
                }
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Auth status check failed:', error);
            
            // Return different responses based on error type
            if (error.name === 'TimeoutError') {
                return { isAuthenticated: false, error: 'Timeout' };
            } else if (error.name === 'NetworkError') {
                return { isAuthenticated: false, error: 'Network' };
            } else {
                return { isAuthenticated: false, error: 'Unknown' };
            }
        }
    }
    
    /**
     * Show loading overlay
     */
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('show');
        }
    }
    
    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }
    
    /**
     * Show message to user
     */
    showMessage(message, type = 'info') {
        // Create a temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `admin-message admin-message-${type}`;
        messageEl.innerHTML = `
            <div class="admin-message-content">
                <span class="admin-message-text">${message}</span>
                <button class="admin-message-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add styles for the message
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            max-width: 400px;
            background: var(--color-white);
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            border-left: 4px solid ${type === 'error' ? 'var(--color-error)' : type === 'success' ? 'var(--color-success)' : 'var(--color-primary-blue)'};
            animation: slideInRight 0.3s ease;
        `;
        
        const contentStyle = `
            padding: var(--spacing-lg);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--spacing-md);
        `;
        
        const textStyle = `
            color: var(--color-dark-text);
            font-size: var(--font-size-sm);
            line-height: 1.4;
            flex: 1;
        `;
        
        const closeStyle = `
            background: none;
            border: none;
            font-size: var(--font-size-lg);
            color: var(--color-light-text);
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.2s ease;
        `;
        
        messageEl.querySelector('.admin-message-content').style.cssText = contentStyle;
        messageEl.querySelector('.admin-message-text').style.cssText = textStyle;
        messageEl.querySelector('.admin-message-close').style.cssText = closeStyle;
        
        document.body.appendChild(messageEl);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentElement) {
                messageEl.remove();
            }
        }, 5000);
    }
    
    /**
     * Show error message
     */
    showError(message) {
        this.showMessage(message, 'error');
    }
    
    /**
     * Show success message
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    }
    
    /**
     * Show info message
     */
    showInfo(message) {
        this.showMessage(message, 'info');
    }
    
    /**
     * Sanitize HTML content
     */
    sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }
    
    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Debounce function calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Get file extension from filename
     */
    getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
    }
    
    /**
     * Check if file is an image
     */
    isImageFile(filename) {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        const extension = this.getFileExtension(filename).toLowerCase();
        return imageExtensions.includes(extension);
    }
}

// Create global instance
window.adminUtils = new AdminUtils();

// Add CSS animation for message slide-in
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .admin-message-close:hover {
        background-color: var(--color-soft-gray) !important;
    }
`;
document.head.appendChild(style);