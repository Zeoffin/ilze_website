/**
 * Admin Dashboard JavaScript
 * Handles dashboard functionality, session management, and user interactions
 */

class AdminDashboard {
    constructor() {
        this.sessionCheckInterval = null;
        this.sessionWarningTimeout = null;
        this.sessionTimeoutTimeout = null;
        this.sessionDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        this.warningTime = 5 * 60 * 1000; // 5 minutes before expiry
        this.countdownInterval = null;
        this.csrfToken = null;
        
        this.init();
    }
    
    async init() {
        try {
            // Show loading overlay
            this.showLoading();
            
            // Check authentication status
            const authStatus = await this.checkAuthStatus();
            if (!authStatus.isAuthenticated) {
                window.location.href = '/admin/login';
                return;
            }
            
            // Initialize dashboard
            this.setupEventListeners();
            this.updateUserInfo(authStatus.user);
            this.startSessionMonitoring();
            
            // Hide loading overlay
            this.hideLoading();
            
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.showError('Failed to initialize dashboard');
            this.hideLoading();
        }
    }
    
    setupEventListeners() {
        // User menu toggle
        const userMenuButton = document.getElementById('userMenuButton');
        const userDropdown = document.getElementById('userDropdown');
        
        if (userMenuButton && userDropdown) {
            userMenuButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUserMenu();
            });
            
            // Close dropdown when clicking outside
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
        
        // Section edit buttons
        const editButtons = document.querySelectorAll('.edit-button');
        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.handleSectionEdit(section);
            });
        });
        
        // Quick action buttons
        const viewWebsiteButton = document.getElementById('viewWebsiteButton');
        if (viewWebsiteButton) {
            viewWebsiteButton.addEventListener('click', () => {
                window.open('/', '_blank', 'noopener,noreferrer');
            });
        }
        
        const refreshDataButton = document.getElementById('refreshDataButton');
        if (refreshDataButton) {
            refreshDataButton.addEventListener('click', () => {
                this.handleRefreshData();
            });
        }
        
        // Session warning modal buttons
        const extendSessionButton = document.getElementById('extendSessionButton');
        const logoutNowButton = document.getElementById('logoutNowButton');
        
        if (extendSessionButton) {
            extendSessionButton.addEventListener('click', () => {
                this.handleExtendSession();
            });
        }
        
        if (logoutNowButton) {
            logoutNowButton.addEventListener('click', () => {
                this.handleLogout();
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape key closes modals
            if (e.key === 'Escape') {
                this.closeSessionWarningModal();
                this.closeUserMenu();
            }
            
            // Ctrl/Cmd + L for logout
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                this.handleLogout();
            }
        });
    }
    
    async checkAuthStatus() {
        return await window.adminUtils.checkAuthStatus();
    }
    
    updateUserInfo(user) {
        const usernameElement = document.getElementById('adminUsername');
        if (usernameElement && user) {
            usernameElement.textContent = user.username;
        }
    }
    
    startSessionMonitoring() {
        // Check session status every 5 minutes
        this.sessionCheckInterval = setInterval(() => {
            this.checkSessionStatus();
        }, 5 * 60 * 1000);
        
        // Set up session timeout warning
        this.scheduleSessionWarning();
        
        // Update session timer display
        this.updateSessionTimer();
    }
    
    async checkSessionStatus() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const authStatus = await window.adminUtils.authenticatedFetch('/admin/status', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (authStatus.ok) {
                const data = await authStatus.json();
                if (!data.isAuthenticated) {
                    this.handleSessionExpired();
                }
            } else if (authStatus.status === 401) {
                this.handleSessionExpired();
            } else {
                throw new Error(`Session check failed with status ${authStatus.status}`);
            }
        } catch (error) {
            console.error('Session check failed:', error);
            
            // Only handle session expiry if it's an auth error
            if (error.message.includes('401') || error.message.includes('unauthorized')) {
                this.handleSessionExpired();
            } else if (error.name !== 'AbortError') {
                // Show warning for other errors but don't logout
                this.showError('Connection issue detected. Please check your internet connection.');
            }
        }
    }
    
    scheduleSessionWarning() {
        // Clear existing timeouts
        if (this.sessionWarningTimeout) {
            clearTimeout(this.sessionWarningTimeout);
        }
        if (this.sessionTimeoutTimeout) {
            clearTimeout(this.sessionTimeoutTimeout);
        }
        
        // Schedule warning 5 minutes before session expires
        const warningDelay = this.sessionDuration - this.warningTime;
        this.sessionWarningTimeout = setTimeout(() => {
            this.showSessionWarning();
        }, warningDelay);
        
        // Schedule automatic logout at session expiry
        this.sessionTimeoutTimeout = setTimeout(() => {
            this.handleSessionExpired();
        }, this.sessionDuration);
    }
    
    showSessionWarning() {
        const modal = document.getElementById('sessionWarningModal');
        if (modal) {
            modal.classList.add('show');
            this.startWarningCountdown();
        }
    }
    
    closeSessionWarningModal() {
        const modal = document.getElementById('sessionWarningModal');
        if (modal) {
            modal.classList.remove('show');
        }
        
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }
    
    startWarningCountdown() {
        let timeLeft = 5 * 60; // 5 minutes in seconds
        const countdownElement = document.getElementById('warningCountdown');
        
        this.countdownInterval = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            if (countdownElement) {
                countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(this.countdownInterval);
                this.handleSessionExpired();
            }
        }, 1000);
    }
    
    async handleExtendSession() {
        try {
            this.showLoading();
            
            // Make a request to refresh the session
            const response = await fetch('/admin/status', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const authStatus = await response.json();
                if (authStatus.isAuthenticated) {
                    // Session extended successfully
                    this.closeSessionWarningModal();
                    this.scheduleSessionWarning(); // Reschedule warning
                    this.showSuccess('Session extended successfully');
                } else {
                    this.handleSessionExpired();
                }
            } else {
                throw new Error('Failed to extend session');
            }
            
        } catch (error) {
            console.error('Session extension failed:', error);
            this.showError('Failed to extend session');
            this.handleSessionExpired();
        } finally {
            this.hideLoading();
        }
    }
    
    handleSessionExpired() {
        // Clear all intervals and timeouts
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
        }
        if (this.sessionWarningTimeout) {
            clearTimeout(this.sessionWarningTimeout);
        }
        if (this.sessionTimeoutTimeout) {
            clearTimeout(this.sessionTimeoutTimeout);
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        // Show message and redirect
        this.showError('Your session has expired. Redirecting to login...');
        
        setTimeout(() => {
            window.location.href = '/admin/login';
        }, 2000);
    }
    
    updateSessionTimer() {
        const timerElement = document.getElementById('sessionTimer');
        if (timerElement) {
            const now = new Date();
            timerElement.textContent = `Session active since ${now.toLocaleTimeString()}`;
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
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await window.adminUtils.authenticatedFetch('/admin/logout', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                // Clear intervals
                this.clearAllTimers();
                
                // Show success message briefly before redirect
                this.showSuccess('Logged out successfully');
                
                setTimeout(() => {
                    window.location.href = '/admin/login';
                }, 1000);
            } else {
                throw new Error(`Logout failed with status ${response.status}`);
            }
            
        } catch (error) {
            console.error('Logout error:', error);
            this.handleLogoutError(error);
        } finally {
            this.hideLoading();
        }
    }
    
    handleLogoutError(error) {
        if (error.name === 'AbortError') {
            this.showError('Logout request timed out. Redirecting to login...');
            setTimeout(() => {
                window.location.href = '/admin/login';
            }, 2000);
        } else if (error.message.includes('fetch') || error.name === 'TypeError') {
            this.showError('Network error during logout. Redirecting to login...');
            setTimeout(() => {
                window.location.href = '/admin/login';
            }, 2000);
        } else {
            this.showError('Logout failed. Please close your browser or try again.');
        }
    }
    
    clearAllTimers() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
        }
        if (this.sessionWarningTimeout) {
            clearTimeout(this.sessionWarningTimeout);
        }
        if (this.sessionTimeoutTimeout) {
            clearTimeout(this.sessionTimeoutTimeout);
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    }
    
    handleSectionEdit(section) {
        // Navigate to content editor for the specific section
        window.location.href = `/admin/editor?section=${section}`;
    }
    
    async handleRefreshData() {
        try {
            this.showLoading();
            
            // Simulate data refresh
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check auth status to refresh user info
            const authStatus = await this.checkAuthStatus();
            if (authStatus.isAuthenticated) {
                this.updateUserInfo(authStatus.user);
                this.updateSessionTimer();
                this.showSuccess('Dashboard data refreshed');
            } else {
                this.handleSessionExpired();
            }
            
        } catch (error) {
            console.error('Data refresh failed:', error);
            this.showError('Failed to refresh data');
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
    
    showError(message) {
        this.showMessage(message, 'error');
    }
    
    showSuccess(message) {
        this.showMessage(message, 'success');
    }
    
    showInfo(message) {
        this.showMessage(message, 'info');
    }
}

// Add CSS animation for message slide-in
const dashboardStyle = document.createElement('style');
dashboardStyle.textContent = `
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
document.head.appendChild(dashboardStyle);

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
});

// Handle page visibility changes to check session status
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Page became visible, check session status
        const dashboard = window.adminDashboard;
        if (dashboard && typeof dashboard.checkSessionStatus === 'function') {
            dashboard.checkSessionStatus();
        }
    }
});