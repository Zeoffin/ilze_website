/**
 * Profile page JavaScript functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize profile page functionality
    initializeImageGallery();
    initializeNavigation();
    initializeAccessibility();
    
    console.log('Profile page initialized');
});

/**
 * Initialize image gallery functionality with lightbox
 */
function initializeImageGallery() {
    const images = document.querySelectorAll('.profile-image img, .gallery-grid img');
    
    images.forEach((img, index) => {
        // Add loading state
        img.addEventListener('loadstart', function() {
            this.parentElement.classList.add('loading');
        });
        
        // Handle successful image load
        img.addEventListener('load', function() {
            this.parentElement.classList.remove('loading');
            this.classList.add('loaded');
        });
        
        // Handle image load errors
        img.addEventListener('error', function() {
            this.parentElement.classList.remove('loading');
            this.parentElement.classList.add('error');
            console.warn('Failed to load image:', this.src);
        });
        
        // Add click handler for lightbox functionality
        img.addEventListener('click', function(e) {
            e.preventDefault();
            openLightbox(this, index, images);
        });

        // Add keyboard support for images
        img.parentElement.setAttribute('tabindex', '0');
        img.parentElement.setAttribute('role', 'button');
        img.parentElement.setAttribute('aria-label', `Atvērt attēlu: ${img.alt}`);
        
        img.parentElement.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                img.click();
            }
        });
    });
}

/**
 * Open lightbox for image viewing
 * @param {HTMLImageElement} clickedImage - The clicked image
 * @param {number} currentIndex - Current image index
 * @param {NodeList} allImages - All gallery images
 */
function openLightbox(clickedImage, currentIndex, allImages) {
    // Create lightbox overlay
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox-overlay';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Attēlu galerija');
    
    // Create lightbox content
    lightbox.innerHTML = `
        <div class="lightbox-container">
            <button class="lightbox-close" aria-label="Aizvērt galeriju" title="Aizvērt (Esc)">
                <span aria-hidden="true">&times;</span>
            </button>
            
            <div class="lightbox-content">
                <img class="lightbox-image" src="${clickedImage.src}" alt="${clickedImage.alt}">
                <div class="lightbox-caption">
                    <p>${clickedImage.alt}</p>
                </div>
            </div>
            
            ${allImages.length > 1 ? `
                <button class="lightbox-prev" aria-label="Iepriekšējais attēls" title="Iepriekšējais (←)">
                    <span aria-hidden="true">‹</span>
                </button>
                <button class="lightbox-next" aria-label="Nākamais attēls" title="Nākamais (→)">
                    <span aria-hidden="true">›</span>
                </button>
                
                <div class="lightbox-counter">
                    <span class="current-image">${currentIndex + 1}</span> / 
                    <span class="total-images">${allImages.length}</span>
                </div>
            ` : ''}
        </div>
    `;
    
    // Add lightbox styles
    addLightboxStyles();
    
    // Append to body
    document.body.appendChild(lightbox);
    document.body.classList.add('lightbox-open');
    
    // Focus management
    const closeButton = lightbox.querySelector('.lightbox-close');
    closeButton.focus();
    
    // Store current index
    lightbox.currentIndex = currentIndex;
    lightbox.allImages = allImages;
    
    // Event listeners
    setupLightboxEventListeners(lightbox);
    
    // Announce to screen readers
    announceToScreenReader(`Atvērta attēlu galerija. Attēls ${currentIndex + 1} no ${allImages.length}`);
}

/**
 * Setup event listeners for lightbox
 * @param {HTMLElement} lightbox - Lightbox element
 */
function setupLightboxEventListeners(lightbox) {
    const closeButton = lightbox.querySelector('.lightbox-close');
    const prevButton = lightbox.querySelector('.lightbox-prev');
    const nextButton = lightbox.querySelector('.lightbox-next');
    const lightboxImage = lightbox.querySelector('.lightbox-image');
    
    // Close lightbox
    const closeLightbox = () => {
        document.body.removeChild(lightbox);
        document.body.classList.remove('lightbox-open');
        
        // Return focus to the original image
        const originalImage = lightbox.allImages[lightbox.currentIndex];
        if (originalImage && originalImage.parentElement) {
            originalImage.parentElement.focus();
        }
        
        announceToScreenReader('Galerija aizvērta');
    };
    
    // Navigate to previous image
    const showPrevImage = () => {
        if (lightbox.currentIndex > 0) {
            lightbox.currentIndex--;
            updateLightboxImage(lightbox);
        }
    };
    
    // Navigate to next image
    const showNextImage = () => {
        if (lightbox.currentIndex < lightbox.allImages.length - 1) {
            lightbox.currentIndex++;
            updateLightboxImage(lightbox);
        }
    };
    
    // Close button
    closeButton.addEventListener('click', closeLightbox);
    
    // Navigation buttons
    if (prevButton) {
        prevButton.addEventListener('click', showPrevImage);
    }
    if (nextButton) {
        nextButton.addEventListener('click', showNextImage);
    }
    
    // Click outside to close
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', function lightboxKeyHandler(e) {
        switch (e.key) {
            case 'Escape':
                closeLightbox();
                document.removeEventListener('keydown', lightboxKeyHandler);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                showPrevImage();
                break;
            case 'ArrowRight':
                e.preventDefault();
                showNextImage();
                break;
        }
    });
    
    // Touch/swipe support for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    
    lightboxImage.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    lightboxImage.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left - next image
                showNextImage();
            } else {
                // Swipe right - previous image
                showPrevImage();
            }
        }
    }
}

/**
 * Update lightbox image
 * @param {HTMLElement} lightbox - Lightbox element
 */
function updateLightboxImage(lightbox) {
    const lightboxImage = lightbox.querySelector('.lightbox-image');
    const lightboxCaption = lightbox.querySelector('.lightbox-caption p');
    const currentCounter = lightbox.querySelector('.current-image');
    const prevButton = lightbox.querySelector('.lightbox-prev');
    const nextButton = lightbox.querySelector('.lightbox-next');
    
    const currentImage = lightbox.allImages[lightbox.currentIndex];
    
    // Update image with loading state
    lightboxImage.style.opacity = '0.5';
    lightboxImage.src = currentImage.src;
    lightboxImage.alt = currentImage.alt;
    
    // Update caption
    if (lightboxCaption) {
        lightboxCaption.textContent = currentImage.alt;
    }
    
    // Update counter
    if (currentCounter) {
        currentCounter.textContent = lightbox.currentIndex + 1;
    }
    
    // Update navigation button states
    if (prevButton) {
        prevButton.disabled = lightbox.currentIndex === 0;
        prevButton.style.opacity = lightbox.currentIndex === 0 ? '0.5' : '1';
    }
    
    if (nextButton) {
        nextButton.disabled = lightbox.currentIndex === lightbox.allImages.length - 1;
        nextButton.style.opacity = lightbox.currentIndex === lightbox.allImages.length - 1 ? '0.5' : '1';
    }
    
    // Handle image load
    lightboxImage.addEventListener('load', function() {
        this.style.opacity = '1';
    }, { once: true });
    
    // Announce change to screen readers
    announceToScreenReader(`Attēls ${lightbox.currentIndex + 1} no ${lightbox.allImages.length}`);
}

/**
 * Add lightbox CSS styles
 */
function addLightboxStyles() {
    // Check if styles already exist
    if (document.getElementById('lightbox-styles')) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'lightbox-styles';
    style.textContent = `
        .lightbox-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            animation: lightboxFadeIn 0.3s ease-out forwards;
        }
        
        @keyframes lightboxFadeIn {
            to { opacity: 1; }
        }
        
        .lightbox-container {
            position: relative;
            max-width: 90vw;
            max-height: 90vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .lightbox-content {
            position: relative;
            text-align: center;
        }
        
        .lightbox-image {
            max-width: 100%;
            max-height: 80vh;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            transition: opacity 0.3s ease;
        }
        
        .lightbox-caption {
            margin-top: 1rem;
            color: white;
            font-size: 1rem;
            text-align: center;
            max-width: 600px;
        }
        
        .lightbox-close {
            position: absolute;
            top: -50px;
            right: -50px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 2rem;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.3s ease;
        }
        
        .lightbox-close:hover,
        .lightbox-close:focus {
            background: rgba(255, 255, 255, 0.3);
            outline: 2px solid white;
        }
        
        .lightbox-prev,
        .lightbox-next {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 2rem;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.3s ease, opacity 0.3s ease;
        }
        
        .lightbox-prev {
            left: -80px;
        }
        
        .lightbox-next {
            right: -80px;
        }
        
        .lightbox-prev:hover,
        .lightbox-prev:focus,
        .lightbox-next:hover,
        .lightbox-next:focus {
            background: rgba(255, 255, 255, 0.3);
            outline: 2px solid white;
        }
        
        .lightbox-prev:disabled,
        .lightbox-next:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }
        
        .lightbox-counter {
            position: absolute;
            bottom: -40px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            font-size: 0.9rem;
            background: rgba(0, 0, 0, 0.5);
            padding: 0.5rem 1rem;
            border-radius: 20px;
        }
        
        .lightbox-open {
            overflow: hidden;
        }
        
        /* Mobile responsive */
        @media (max-width: 768px) {
            .lightbox-close {
                top: -40px;
                right: -20px;
                font-size: 1.5rem;
                width: 35px;
                height: 35px;
            }
            
            .lightbox-prev,
            .lightbox-next {
                width: 40px;
                height: 40px;
                font-size: 1.5rem;
            }
            
            .lightbox-prev {
                left: -60px;
            }
            
            .lightbox-next {
                right: -60px;
            }
            
            .lightbox-counter {
                bottom: -30px;
                font-size: 0.8rem;
                padding: 0.3rem 0.8rem;
            }
        }
        
        @media (max-width: 480px) {
            .lightbox-prev {
                left: 10px;
            }
            
            .lightbox-next {
                right: 10px;
            }
            
            .lightbox-close {
                top: 10px;
                right: 10px;
            }
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Announce message to screen readers (fallback if not available)
 */
function announceToScreenReader(message) {
    // Check if the main site's announceToScreenReader function exists
    if (typeof window.announceToScreenReader === 'function') {
        window.announceToScreenReader(message);
        return;
    }
    
    // Fallback implementation
    let liveRegion = document.getElementById('lightbox-live-region');
    if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'lightbox-live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.style.cssText = `
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            padding: 0 !important;
            margin: -1px !important;
            overflow: hidden !important;
            clip: rect(0, 0, 0, 0) !important;
            white-space: nowrap !important;
            border: 0 !important;
        `;
        document.body.appendChild(liveRegion);
    }
    
    liveRegion.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
        liveRegion.textContent = '';
    }, 1000);
}

/**
 * Initialize navigation functionality
 */
function initializeNavigation() {
    const backLink = document.querySelector('.back-link');
    
    if (backLink) {
        // Handle back link click
        backLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Check if we came from the main page
            if (document.referrer && document.referrer.includes(window.location.origin)) {
                // Go back to previous page
                window.history.back();
            } else {
                // Navigate to main page with Interesanti section
                window.location.href = '/#interesanti';
            }
        });
    }
    
    // Handle navigation menu links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href').startsWith('/#')) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetSection = this.getAttribute('href').substring(2);
                
                // Navigate to main page with section
                window.location.href = '/#' + targetSection;
            });
        }
    });
}

/**
 * Initialize accessibility features
 */
function initializeAccessibility() {
    // Add keyboard navigation for images
    const images = document.querySelectorAll('.profile-image');
    
    images.forEach(imageContainer => {
        const img = imageContainer.querySelector('img');
        
        // Make images focusable
        imageContainer.setAttribute('tabindex', '0');
        imageContainer.setAttribute('role', 'button');
        imageContainer.setAttribute('aria-label', `View image: ${img.alt}`);
        
        // Handle keyboard interaction
        imageContainer.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                // Trigger click event
                img.click();
            }
        });
    });
    
    // Improve breadcrumb accessibility
    const breadcrumb = document.querySelector('.breadcrumb');
    if (breadcrumb) {
        breadcrumb.setAttribute('aria-label', 'Breadcrumb navigation');
    }
    
    // Add skip link for screen readers
    addSkipLink();
}

/**
 * Add skip link for screen readers
 */
function addSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 6px;
        background: var(--color-primary-blue);
        color: white;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 1000;
        transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', function() {
        this.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', function() {
        this.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Add id to main content
    const mainContent = document.querySelector('.person-content');
    if (mainContent) {
        mainContent.id = 'main-content';
    }
}

/**
 * Handle responsive image loading
 */
function handleResponsiveImages() {
    const images = document.querySelectorAll('.profile-image img');
    
    images.forEach(img => {
        // Add loading="lazy" for performance
        img.setAttribute('loading', 'lazy');
        
        // Add responsive image handling
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    
                    // Preload image
                    const imageLoader = new Image();
                    imageLoader.onload = function() {
                        img.src = this.src;
                        img.classList.add('loaded');
                    };
                    imageLoader.src = img.dataset.src || img.src;
                    
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px'
        });
        
        observer.observe(img);
    });
}

/**
 * Initialize smooth scrolling for anchor links
 */
function initializeSmoothScrolling() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                e.preventDefault();
                
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Update URL without triggering navigation
                history.pushState(null, null, '#' + targetId);
            }
        });
    });
}



/**
 * Handle error states gracefully
 */
function handleErrors() {
    window.addEventListener('error', function(e) {
        console.error('Profile page error:', e.error);
        
        // Show user-friendly error message if needed
        if (e.error && e.error.message) {
            console.warn('An error occurred on the profile page. Some features may not work correctly.');
        }
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Unhandled promise rejection:', e.reason);
        e.preventDefault();
    });
}

// Initialize error handling
handleErrors();

// Initialize additional features when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        handleResponsiveImages();
        initializeSmoothScrolling();
    });
} else {
    handleResponsiveImages();
    initializeSmoothScrolling();
}