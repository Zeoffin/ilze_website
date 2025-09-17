/**
 * Admin Login JavaScript
 * Handles form submission, validation, and authentication
 */

class AdminLogin {
    constructor() {
        this.form = document.getElementById('adminLoginForm');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.loginButton = document.getElementById('loginButton');
        this.buttonText = this.loginButton.querySelector('.button-text');
        this.buttonSpinner = this.loginButton.querySelector('.button-spinner');
        this.formMessage = document.getElementById('formMessage');
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.checkAuthStatus();
    }
    
    bindEvents() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        this.usernameInput.addEventListener('input', this.clearFieldError.bind(this, 'username'));
        this.passwordInput.addEventListener('input', this.clearFieldError.bind(this, 'password'));
        
        // Handle Enter key in form fields
        [this.usernameInput, this.passwordInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.form.dispatchEvent(new Event('submit'));
                }
            });
        });
    }
    
    async checkAuthStatus() {
        try {
            const response = await fetch('/admin/status');
            const data = await response.json();
            
            if (data.isAuthenticated) {
                this.redirectToDashboard();
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
        }
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.loginButton.disabled) return;
        
        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }
        
        this.setLoadingState(true);
        this.clearMessages();
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch('/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const data = await response.json();      
      
            if (response.ok && data.success) {
                this.showMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    this.redirectToDashboard();
                }, 1500);
            } else {
                this.handleLoginError(data, response.status);
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.handleNetworkError(error);
        } finally {
            this.setLoadingState(false);
        }
    }
    
    getFormData() {
        return {
            username: this.usernameInput.value.trim(),
            password: this.passwordInput.value
        };
    }
    
    validateForm(data) {
        let isValid = true;
        
        if (!data.username) {
            this.showFieldError('username', 'Username is required');
            isValid = false;
        } else if (data.username.length < 3) {
            this.showFieldError('username', 'Username must be at least 3 characters');
            isValid = false;
        }
        
        if (!data.password) {
            this.showFieldError('password', 'Password is required');
            isValid = false;
        }
        
        return isValid;
    }
    
    handleLoginError(data, status) {
        if (status === 429) {
            this.showMessage('Too many login attempts. Please try again later.', 'error');
            this.showRetryTimer(data.retryAfter || 900); // 15 minutes default
        } else if (status === 401) {
            this.showMessage('Invalid username or password.', 'error');
            this.passwordInput.value = '';
            this.passwordInput.focus();
            this.addShakeAnimation();
        } else if (status === 400 && data.error === 'Already authenticated') {
            this.redirectToDashboard();
        } else if (status >= 500) {
            this.showMessage('Server error. Please try again in a few moments.', 'error');
        } else {
            this.showMessage(data.error || 'Login failed. Please try again.', 'error');
        }
    }
    
    handleNetworkError(error) {
        if (error.name === 'AbortError') {
            this.showMessage('Request timed out. Please check your connection and try again.', 'error');
        } else if (error.message.includes('fetch') || error.name === 'TypeError') {
            this.showMessage('Network error. Please check your internet connection and try again.', 'error');
        } else {
            this.showMessage('An unexpected error occurred. Please try again.', 'error');
        }
    }
    
    showRetryTimer(seconds) {
        const retryTimer = document.createElement('div');
        retryTimer.className = 'retry-timer';
        retryTimer.innerHTML = `
            <p>You can try again in <span id="countdown">${seconds}</span> seconds</p>
        `;
        
        this.formMessage.appendChild(retryTimer);
        
        const countdown = document.getElementById('countdown');
        const interval = setInterval(() => {
            seconds--;
            if (countdown) {
                countdown.textContent = seconds;
            }
            
            if (seconds <= 0) {
                clearInterval(interval);
                if (retryTimer.parentElement) {
                    retryTimer.remove();
                }
            }
        }, 1000);
    }
    
    addShakeAnimation() {
        this.form.classList.add('shake');
        setTimeout(() => {
            this.form.classList.remove('shake');
        }, 600);
    }
    
    setLoadingState(loading) {
        this.loginButton.disabled = loading;
        
        if (loading) {
            this.buttonText.style.display = 'none';
            this.buttonSpinner.style.display = 'flex';
        } else {
            this.buttonText.style.display = 'inline';
            this.buttonSpinner.style.display = 'none';
        }
    }
    
    showMessage(message, type = 'error') {
        this.formMessage.textContent = message;
        this.formMessage.className = `form-message ${type}`;
    }
    
    clearMessages() {
        this.formMessage.textContent = '';
        this.formMessage.className = 'form-message';
    }
    
    showFieldError(fieldName, message) {
        const errorElement = document.getElementById(`${fieldName}Error`);
        if (errorElement) {
            errorElement.textContent = message;
        }
    }
    
    clearFieldError(fieldName) {
        const errorElement = document.getElementById(`${fieldName}Error`);
        if (errorElement) {
            errorElement.textContent = '';
        }
    }
    
    redirectToDashboard() {
        window.location.href = '/admin/dashboard.html';
    }
}

// Initialize admin login when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminLogin();
});