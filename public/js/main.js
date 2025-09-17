/**
 * Main JavaScript functionality for Ilze Skrastiņa website
 * Handles navigation, smooth scrolling, and mobile menu
 * Optimized for performance and accessibility
 */

// Performance optimization: Use passive event listeners where possible
const passiveSupported = (() => {
    let passiveSupported = false;
    try {
        const options = {
            get passive() {
                passiveSupported = true;
                return false;
            }
        };
        window.addEventListener('test', null, options);
        window.removeEventListener('test', null, options);
    } catch (err) {
        passiveSupported = false;
    }
    return passiveSupported;
})();

// Intersection Observer for lazy loading and animations
let intersectionObserver;
let imageObserver;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize core functionality first
    initNavigation();
    initMobileMenu();
    initSmoothScrolling();
    initScrollSpy();
    
    // Initialize intersection observers for performance
    initIntersectionObservers();
    
    // Initialize lazy loading for images
    initLazyLoading();
    
    // Initialize sections with lazy loading
    initInteresantiSection();
    initGramatasSection();
    initFragmentiSection();
    initFragmentiGallery();
    initContactForm();
    
    // Initialize accessibility features
    initAccessibilityFeatures();
    
    // Preload critical resources
    preloadCriticalResources();
});

/**
 * Initialize navigation functionality
 */
function initNavigation() {
    const header = document.getElementById('header');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Add scroll effect to header
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Add active state handling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            // Add active class to clicked link
            this.classList.add('active');
        });
    });
}

/**
 * Initialize mobile menu functionality
 */
function initMobileMenu() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!navToggle || !navMenu) return;

    // Toggle mobile menu
    navToggle.addEventListener('click', function() {
        const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
        
        // Toggle menu visibility
        navMenu.classList.toggle('active');
        document.body.classList.toggle('nav-open');
        
        // Update ARIA attributes
        navToggle.setAttribute('aria-expanded', !isExpanded);
        navToggle.setAttribute('aria-label', isExpanded ? 'Atvērt navigācijas izvēlni' : 'Aizvērt navigācijas izvēlni');
    });

    // Close mobile menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            document.body.classList.remove('nav-open');
            navToggle.setAttribute('aria-expanded', 'false');
            navToggle.setAttribute('aria-label', 'Atvērt navigācijas izvēlni');
        });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('active');
            document.body.classList.remove('nav-open');
            navToggle.setAttribute('aria-expanded', 'false');
            navToggle.setAttribute('aria-label', 'Atvērt navigācijas izvēlni');
        }
    });

    // Handle escape key to close menu
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            document.body.classList.remove('nav-open');
            navToggle.setAttribute('aria-expanded', 'false');
            navToggle.setAttribute('aria-label', 'Atvērt navigācijas izvēlni');
            navToggle.focus();
        }
    });
}

/**
 * Initialize smooth scrolling for navigation links
 */
function initSmoothScrolling() {
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const headerHeight = document.getElementById('header').offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Initialize scroll spy functionality to highlight current section
 */
function initScrollSpy() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    if (sections.length === 0 || navLinks.length === 0) return;

    function updateActiveLink() {
        const scrollPosition = window.scrollY + 150; // Offset for header
        
        let currentSection = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSection = section.getAttribute('id');
            }
        });
        
        // Update active navigation link
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    }
    
    // Use requestAnimationFrame for better performance
    let ticking = false;
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateActiveLink);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', function() {
        requestTick();
        ticking = false;
    }, passiveSupported ? { passive: true } : false);
    
    // Initial call
    updateActiveLink();
}

/**
 * Initialize intersection observers for performance optimization
 */
function initIntersectionObservers() {
    // Observer for section animations
    intersectionObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                // Stop observing once animated
                intersectionObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    // Observe sections for animation
    const animatedElements = document.querySelectorAll('.section, .hero');
    animatedElements.forEach(el => {
        intersectionObserver.observe(el);
    });
}

/**
 * Initialize lazy loading for images with optimization
 */
function initLazyLoading() {
    // Enhanced lazy loading with performance optimizations
    const lazyImages = document.querySelectorAll('img[data-src], img.lazy');
    
    if (!lazyImages.length) return;
    
    // Check if browser supports native lazy loading
    if ('loading' in HTMLImageElement.prototype) {
        // Use native lazy loading for supported browsers
        lazyImages.forEach(img => {
            if (img.dataset.src) {
                // Add loading placeholder
                img.style.backgroundColor = '#f0f0f0';
                img.style.backgroundImage = 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)';
                img.style.backgroundSize = '200% 100%';
                img.style.animation = 'loading 1.5s infinite';
                
                // Load image with error handling
                loadImageWithFallback(img, img.dataset.src)
                    .then(() => {
                        img.classList.add('loaded');
                        img.style.backgroundColor = '';
                        img.style.backgroundImage = '';
                        img.style.animation = '';
                    })
                    .catch(error => {
                        console.warn('Image failed to load:', img.dataset.src, error);
                        img.alt = 'Attēls nav pieejams';
                        img.style.backgroundColor = '#f8f8f8';
                        img.style.backgroundImage = '';
                        img.style.animation = '';
                    });
                
                img.removeAttribute('data-src');
            }
        });
    } else {
        // Use Intersection Observer for older browsers
        imageObserver = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        // Add loading state
                        img.style.backgroundColor = '#f0f0f0';
                        img.style.backgroundImage = 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)';
                        img.style.backgroundSize = '200% 100%';
                        img.style.animation = 'loading 1.5s infinite';
                        
                        loadImageWithFallback(img, img.dataset.src)
                            .then(() => {
                                img.classList.add('loaded');
                                img.classList.remove('lazy');
                                img.style.backgroundColor = '';
                                img.style.backgroundImage = '';
                                img.style.animation = '';
                            })
                            .catch(error => {
                                console.warn('Image failed to load:', img.dataset.src, error);
                                img.alt = 'Attēls nav pieejams';
                                img.style.backgroundColor = '#f8f8f8';
                                img.style.backgroundImage = '';
                                img.style.animation = '';
                            });
                        
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.01
        });
        
        lazyImages.forEach(img => {
            imageObserver.observe(img);
        });
    }
}

/**
 * Load image with fallback and optimization
 */
function loadImageWithFallback(imgElement, src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        // Add loading event listeners
        img.onload = function() {
            // Optimize image display
            imgElement.src = src;
            imgElement.style.opacity = '0';
            
            // Fade in effect
            requestAnimationFrame(() => {
                imgElement.style.transition = 'opacity 0.3s ease-in-out';
                imgElement.style.opacity = '1';
            });
            
            resolve();
        };
        
        img.onerror = function() {
            reject(new Error('Failed to load image'));
        };
        
        // Start loading
        img.src = src;
    });
}

/**
 * Initialize accessibility features
 */
function initAccessibilityFeatures() {
    // Add skip link functionality
    addSkipLink();
    
    // Improve focus management
    improveFocusManagement();
    
    // Add keyboard navigation for interactive elements
    addKeyboardNavigation();
    
    // Announce dynamic content changes to screen readers
    initAriaLiveRegions();
    
    // Add reduced motion support
    respectReducedMotion();
}

/**
 * Add skip link for keyboard navigation
 */
function addSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Pāriet uz galveno saturu';
    skipLink.setAttribute('aria-label', 'Pāriet uz galveno saturu');
    
    // Insert at the beginning of body
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Add styles for skip link
    const style = document.createElement('style');
    style.textContent = `
        .skip-link {
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--color-primary-orange);
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            z-index: 10000;
            font-weight: bold;
            transition: top 0.3s;
        }
        .skip-link:focus {
            top: 6px;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Improve focus management throughout the site
 */
function improveFocusManagement() {
    // Add visible focus indicators for keyboard users
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-navigation');
        }
    });
    
    document.addEventListener('mousedown', function() {
        document.body.classList.remove('keyboard-navigation');
    });
    
    // Add focus styles for keyboard navigation
    const focusStyle = document.createElement('style');
    focusStyle.textContent = `
        .keyboard-navigation *:focus {
            outline: 3px solid var(--color-primary-orange) !important;
            outline-offset: 2px !important;
        }
        .keyboard-navigation .nav-link:focus {
            outline-color: var(--color-white) !important;
        }
    `;
    document.head.appendChild(focusStyle);
}

/**
 * Add keyboard navigation for interactive elements
 */
function addKeyboardNavigation() {
    // Make decorative images keyboard accessible when they have interactions
    const interactiveDecorations = document.querySelectorAll('.decoration-character, .decoration-character-2, .decoration-characters');
    interactiveDecorations.forEach(decoration => {
        if (!decoration.hasAttribute('tabindex')) {
            decoration.setAttribute('tabindex', '0');
            decoration.setAttribute('role', 'button');
            decoration.setAttribute('aria-label', 'Dekoratīvs elements - nospiediet, lai animētu');
        }
    });
}

/**
 * Initialize ARIA live regions for dynamic content
 */
function initAriaLiveRegions() {
    // Create live region for announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'live-region';
    
    // Add screen reader only styles
    const srStyle = document.createElement('style');
    srStyle.textContent = `
        .sr-only {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            padding: 0 !important;
            margin: -1px !important;
            overflow: hidden !important;
            clip: rect(0, 0, 0, 0) !important;
            white-space: nowrap !important;
            border: 0 !important;
        }
    `;
    document.head.appendChild(srStyle);
    document.body.appendChild(liveRegion);
}

/**
 * Announce message to screen readers
 */
function announceToScreenReader(message) {
    const liveRegion = document.getElementById('live-region');
    if (liveRegion) {
        liveRegion.textContent = message;
        // Clear after announcement
        setTimeout(() => {
            liveRegion.textContent = '';
        }, 1000);
    }
}

/**
 * Respect user's reduced motion preferences
 */
function respectReducedMotion() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // Disable animations for users who prefer reduced motion
        const style = document.createElement('style');
        style.textContent = `
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Preload critical resources and optimize loading
 */
function preloadCriticalResources() {
    // Preload critical images with responsive considerations
    const criticalImages = [
        { src: 'media/author.jpg', priority: 'high' },
        { src: 'media/characters.jpg', priority: 'high' },
        { src: 'media/character.jpg', priority: 'medium' }
    ];
    
    criticalImages.forEach(({ src, priority }) => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        if (priority === 'high') {
            link.fetchPriority = 'high';
        }
        document.head.appendChild(link);
    });
    
    // Preload critical CSS if not already loaded
    if (!document.querySelector('link[href*="performance.css"]')) {
        const perfCssLink = document.createElement('link');
        perfCssLink.rel = 'preload';
        perfCssLink.as = 'style';
        perfCssLink.href = 'css/performance.css';
        perfCssLink.onload = function() {
            this.rel = 'stylesheet';
        };
        document.head.appendChild(perfCssLink);
    }
    
    // Add resource hints for external resources
    addResourceHints();
}

/**
 * Add resource hints for better performance
 */
function addResourceHints() {
    // DNS prefetch for potential external resources
    const dnsPrefetchDomains = [
        // Add any external domains used by the site
    ];
    
    dnsPrefetchDomains.forEach(domain => {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = domain;
        document.head.appendChild(link);
    });
    
    // Preconnect to critical external resources
    const preconnectDomains = [
        // Add any critical external domains
    ];
    
    preconnectDomains.forEach(domain => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
    });
}

/**
 * Utility function to debounce function calls
 */
function debounce(func, wait) {
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
 * Initialize intersection observer for animations (optional enhancement)
 */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe sections for animation
    const animatedElements = document.querySelectorAll('.section, .hero');
    animatedElements.forEach(el => {
        observer.observe(el);
    });
}

/**
 * Initialize interactive features for the Interesanti section
 */
function initInteresantiSection() {
    const authorImage = document.querySelector('.author-image');
    const decorationCharacters = document.querySelectorAll('.decoration-character, .decoration-character-2');
    const authorBio = document.querySelector('.author-bio');
    
    // Load dynamic content from API
    loadInteresantiContent();
    
    // Add hover effects to author image
    if (authorImage) {
        authorImage.addEventListener('mouseenter', function() {
            decorationCharacters.forEach((char, index) => {
                setTimeout(() => {
                    char.style.transform = 'scale(1.2) rotate(15deg)';
                    char.style.transition = 'transform 0.3s ease-out';
                }, index * 100);
            });
        });
        
        authorImage.addEventListener('mouseleave', function() {
            decorationCharacters.forEach(char => {
                char.style.transform = '';
                char.style.transition = 'transform 0.3s ease-out';
            });
        });
    }
    
    // Add click interaction to decorative characters
    decorationCharacters.forEach(char => {
        char.addEventListener('click', function() {
            this.style.animation = 'none';
            this.style.transform = 'scale(1.3) rotate(360deg)';
            
            setTimeout(() => {
                this.style.animation = '';
                this.style.transform = '';
            }, 600);
        });
        
        // Make characters keyboard accessible
        char.setAttribute('tabindex', '0');
        char.setAttribute('role', 'button');
        char.setAttribute('aria-label', 'Spēlēties ar tēlu');
        
        char.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
    
    // Add typewriter effect to author bio (optional enhancement)
    if (authorBio && window.innerWidth > 768) {
        const paragraphs = authorBio.querySelectorAll('p:not(.author-intro):not(.signature-text):not(.signature-name)');
        
        // Initially hide bio paragraphs
        paragraphs.forEach(p => {
            p.style.opacity = '0';
            p.style.transform = 'translateY(20px)';
        });
        
        // Animate paragraphs when section comes into view
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    paragraphs.forEach((p, index) => {
                        setTimeout(() => {
                            p.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
                            p.style.opacity = '1';
                            p.style.transform = 'translateY(0)';
                        }, index * 200);
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        
        observer.observe(authorBio);
    }
    
    // Add floating animation to section decorations
    const floatingDecorations = document.querySelectorAll('.floating-decoration');
    floatingDecorations.forEach((decoration, index) => {
        decoration.addEventListener('mouseenter', function() {
            this.style.animationPlayState = 'paused';
            this.style.transform = 'scale(1.1)';
        });
        
        decoration.addEventListener('mouseleave', function() {
            this.style.animationPlayState = 'running';
            this.style.transform = '';
        });
    });
}

/**
 * Load Interesanti section content from API
 */
async function loadInteresantiContent() {
    try {
        showContentLoadingState('interesanti', true);
        
        const response = await fetch('/api/content/interesanti');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.content.length > 0) {
            renderInteresantiContent(data.content);
            showContentLoadingState('interesanti', false);
        } else {
            console.log('No content found for Interesanti section, using static content');
            showContentLoadingState('interesanti', false);
        }
        
    } catch (error) {
        console.error('Error loading Interesanti content:', error);
        showContentLoadingState('interesanti', false);
        handleContentLoadError('interesanti', error);
        console.log('Falling back to static content');
    }
}

/**
 * Render Interesanti content in the DOM
 */
function renderInteresantiContent(contentItems) {
    const authorBio = document.querySelector('.author-bio');
    
    if (!authorBio) {
        console.error('Author bio container not found');
        return;
    }
    
    // Clear existing content except for static fallback
    const existingContent = authorBio.innerHTML;
    authorBio.innerHTML = '';
    
    try {
        contentItems.forEach(item => {
            if (item.content_type === 'text') {
                // Create a div to hold the HTML content
                const contentDiv = document.createElement('div');
                contentDiv.className = 'dynamic-content';
                contentDiv.innerHTML = item.content;
                authorBio.appendChild(contentDiv);
            }
        });
        
        console.log('Interesanti content loaded successfully');
        
    } catch (error) {
        console.error('Error rendering content:', error);
        // Restore static content on error
        authorBio.innerHTML = existingContent;
    }
}

/**
 * Create DOM element for content item
 */
function createContentElement(contentData) {
    let element;
    
    switch (contentData.type) {
        case 'intro':
            element = document.createElement('p');
            element.className = 'author-intro';
            element.textContent = contentData.text;
            break;
            
        case 'paragraph':
            element = document.createElement('p');
            element.textContent = contentData.text;
            break;
            
        case 'signature':
            element = document.createElement('div');
            element.className = 'author-signature';
            
            const signatureText = document.createElement('p');
            signatureText.className = 'signature-text';
            signatureText.textContent = contentData.text;
            
            const signatureName = document.createElement('p');
            signatureName.className = 'signature-name';
            signatureName.textContent = contentData.name;
            
            element.appendChild(signatureText);
            element.appendChild(signatureName);
            break;
            
        default:
            console.warn('Unknown content type:', contentData.type);
            return null;
    }
    
    return element;
}

/**
 * Initialize Grāmatas section functionality
 */
function initGramatasSection() {
    // Load dynamic content from API
    loadGramatasContent();
}

/**
 * Load Grāmatas section content from API
 */
async function loadGramatasContent() {
    try {
        showContentLoadingState('gramatas', true);
        
        const response = await fetch('/api/content/gramatas');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.content.length > 0) {
            renderGramatasContent(data.content);
            showContentLoadingState('gramatas', false);
        } else {
            console.log('No content found for Grāmatas section, using static content');
            showContentLoadingState('gramatas', false);
        }
        
    } catch (error) {
        console.error('Error loading Grāmatas content:', error);
        showContentLoadingState('gramatas', false);
        handleContentLoadError('gramatas', error);
        console.log('Falling back to static content');
    }
}

/**
 * Render Grāmatas content in the DOM
 */
function renderGramatasContent(contentItems) {
    const booksIntro = document.querySelector('.books-intro');
    
    if (!booksIntro) {
        console.error('Books intro container not found');
        return;
    }
    
    // Clear existing content except for static fallback
    const existingContent = booksIntro.innerHTML;
    booksIntro.innerHTML = '';
    
    try {
        contentItems.forEach(item => {
            if (item.content_type === 'text') {
                // Create a div to hold the HTML content
                const contentDiv = document.createElement('div');
                contentDiv.className = 'dynamic-content books-intro-text';
                contentDiv.innerHTML = item.content;
                booksIntro.appendChild(contentDiv);
            }
        });
        
        console.log('Grāmatas content loaded successfully');
        
    } catch (error) {
        console.error('Error rendering Grāmatas content:', error);
        // Restore static content on error
        booksIntro.innerHTML = existingContent;
    }
}

/**
 * Initialize Fragmenti section functionality
 */
function initFragmentiSection() {
    // Load dynamic content from API
    loadFragmentiContent();
}

/**
 * Load Fragmenti section content from API
 */
async function loadFragmentiContent() {
    try {
        showContentLoadingState('fragmenti', true);
        
        const response = await fetch('/api/content/fragmenti');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.content.length > 0) {
            renderFragmentiContent(data.content);
            showContentLoadingState('fragmenti', false);
        } else {
            console.log('No content found for Fragmenti section, using static content');
            showContentLoadingState('fragmenti', false);
        }
        
    } catch (error) {
        console.error('Error loading Fragmenti content:', error);
        showContentLoadingState('fragmenti', false);
        handleContentLoadError('fragmenti', error);
        console.log('Falling back to static content');
    }
}

/**
 * Render Fragmenti content in the DOM
 */
function renderFragmentiContent(contentItems) {
    const sectionContent = document.querySelector('#fragmenti .section-content');
    
    if (!sectionContent) {
        console.error('Fragmenti section content container not found');
        return;
    }
    
    // Find or create content area before the gallery
    let contentArea = sectionContent.querySelector('.fragmenti-content');
    if (!contentArea) {
        contentArea = document.createElement('div');
        contentArea.className = 'fragmenti-content';
        sectionContent.insertBefore(contentArea, sectionContent.firstChild);
    }
    
    // Clear existing dynamic content
    contentArea.innerHTML = '';
    
    try {
        contentItems.forEach(item => {
            if (item.content_type === 'text') {
                // Create a div to hold the HTML content
                const contentDiv = document.createElement('div');
                contentDiv.className = 'dynamic-content';
                contentDiv.innerHTML = item.content;
                contentArea.appendChild(contentDiv);
            }
        });
        
        console.log('Fragmenti content loaded successfully');
        
    } catch (error) {
        console.error('Error rendering Fragmenti content:', error);
    }
}

/**
 * Initialize Fragmenti gallery functionality
 */
function initFragmentiGallery() {
    const galleryContainer = document.getElementById('gallery-grid');
    
    if (!galleryContainer) {
        console.error('Gallery container not found');
        return;
    }
    
    // Load gallery images
    loadGalleryImages();
    
    // Initialize lightbox functionality
    initLightbox();
    

}

/**
 * Load and display gallery images
 */
function loadGalleryImages() {
    const galleryContainer = document.getElementById('gallery-grid');
    
    if (!galleryContainer) {
        console.error('Gallery container not found');
        return;
    }
    
    console.log('Loading gallery images...');
    
    // Define available preview images with fallbacks
    const previewImages = [
        {
            src: 'media/book_preview.jpg',
            fallback: 'media/book_1.jpg', // Fallback to book cover if preview not available
            alt: 'Grāmatas fragmenta priekšskatījums 1',
            title: 'Grāmatas fragments'
        },
        {
            src: 'media/book_preview_2.jpg',
            fallback: 'media/book_2.jpg',
            alt: 'Grāmatas fragmenta priekšskatījums 2',
            title: 'Grāmatas fragments'
        },
        {
            src: 'media/book_preview_3.jpg',
            fallback: 'media/book_3.jpg',
            alt: 'Grāmatas fragmenta priekšskatījums 3',
            title: 'Grāmatas fragments'
        }
    ];
    
    // Clear placeholder content
    galleryContainer.innerHTML = '';
    
    // Add loading state
    galleryContainer.classList.add('loading');
    
    // Create gallery items
    let loadedImages = 0;
    const totalImages = previewImages.length;
    
    previewImages.forEach((image, index) => {
        console.log(`Creating gallery item ${index + 1}:`, image.src);
        const galleryItem = createGalleryItem(image, index, () => {
            loadedImages++;
            console.log(`Image ${index + 1} loaded. Total loaded: ${loadedImages}/${totalImages}`);
            if (loadedImages === totalImages) {
                galleryContainer.classList.remove('loading');
                console.log('All gallery images loaded');
            }
        });
        galleryContainer.appendChild(galleryItem);
    });
    
    console.log(`Gallery setup complete. Created ${previewImages.length} items.`);
}

/**
 * Create individual gallery item
 */
function createGalleryItem(imageData, index, onLoad) {
    const galleryItem = document.createElement('div');
    galleryItem.className = 'gallery-item';
    galleryItem.setAttribute('data-index', index);
    galleryItem.setAttribute('role', 'button');
    galleryItem.setAttribute('tabindex', '0');
    galleryItem.setAttribute('aria-label', `Atvērt ${imageData.title} lielākā izmērā`);
    
    // Add click handler to entire gallery item
    galleryItem.addEventListener('click', function() {
        openLightbox(index);
        announceToScreenReader(`Atvērts ${imageData.title} priekšskatījums`);
    });
    
    // Add keyboard support
    galleryItem.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openLightbox(index);
            announceToScreenReader(`Atvērts ${imageData.title} priekšskatījums`);
        }
    });
    
    const imageContainer = document.createElement('div');
    imageContainer.className = 'gallery-image-container';
    
    const image = document.createElement('img');
    // Load images immediately instead of lazy loading for gallery
    image.src = imageData.src;
    image.alt = imageData.alt;
    image.title = imageData.title;
    image.className = 'gallery-image';
    image.loading = 'eager';
    
    // Add loading success handler
    image.addEventListener('load', function() {
        this.classList.remove('lazy');
        this.classList.add('loaded');
        if (onLoad) onLoad();
    });
    
    // Add loading error handler with fallback
    image.addEventListener('error', function() {
        // Try fallback image if available
        if (imageData.fallback && this.src !== imageData.fallback) {
            this.src = imageData.fallback;
            return;
        }
        
        // Use placeholder if fallback also fails
        this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkF0dMSTbHMgbmVhdHJhc3RzPC90ZXh0Pjwvc3ZnPg==';
        this.alt = 'Attēls nav pieejams';
        this.classList.remove('lazy');
        this.classList.add('loaded');
        if (onLoad) onLoad();
    });
    
    // Add overlay for hover effect
    const overlay = document.createElement('div');
    overlay.className = 'gallery-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    
    const overlayIcon = document.createElement('div');
    overlayIcon.className = 'gallery-overlay-icon';
    overlayIcon.innerHTML = '🔍';
    overlayIcon.setAttribute('aria-hidden', 'true');
    
    const overlayText = document.createElement('div');
    overlayText.className = 'gallery-overlay-text';
    overlayText.textContent = 'Skatīt lielāku';
    overlayText.setAttribute('aria-hidden', 'true');
    
    overlay.appendChild(overlayIcon);
    overlay.appendChild(overlayText);
    
    imageContainer.appendChild(image);
    imageContainer.appendChild(overlay);
    galleryItem.appendChild(imageContainer);
    
    return galleryItem;
}

/**
 * Initialize lightbox functionality
 */
function initLightbox() {
    // Check if lightbox already exists
    const existingLightbox = document.getElementById('gallery-lightbox');
    if (existingLightbox) {
        existingLightbox.remove();
    }
    
    // Create lightbox HTML structure
    const lightbox = document.createElement('div');
    lightbox.id = 'gallery-lightbox';
    lightbox.className = 'lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-labelledby', 'lightbox-title');
    
    lightbox.innerHTML = `
        <div class="lightbox-backdrop"></div>
        <div class="lightbox-content">
            <div class="lightbox-header">
                <h3 id="lightbox-title" class="lightbox-title">Grāmatas fragments</h3>
                <button class="lightbox-close" aria-label="Aizvērt priekšskatījumu">×</button>
            </div>
            <div class="lightbox-body">
                <img class="lightbox-image" src="" alt="" />
                <div class="lightbox-navigation">
                    <button class="lightbox-prev" aria-label="Iepriekšējais attēls">‹</button>
                    <button class="lightbox-next" aria-label="Nākamais attēls">›</button>
                </div>
            </div>
            <div class="lightbox-footer">
                <span class="lightbox-counter">1 / 3</span>
            </div>
        </div>
    `;
    
    document.body.appendChild(lightbox);
    
    // Add event listeners
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const backdrop = lightbox.querySelector('.lightbox-backdrop');
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');
    
    closeBtn.addEventListener('click', closeLightbox);
    backdrop.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click', () => navigateLightbox(-1));
    nextBtn.addEventListener('click', () => navigateLightbox(1));
    
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (!lightbox.classList.contains('active')) return;
        
        switch(e.key) {
            case 'Escape':
                closeLightbox();
                break;
            case 'ArrowLeft':
                navigateLightbox(-1);
                break;
            case 'ArrowRight':
                navigateLightbox(1);
                break;
        }
    });
}

/**
 * Open lightbox with specific image
 */
function openLightbox(imageIndex) {
    const lightbox = document.getElementById('gallery-lightbox');
    
    if (!lightbox) {
        console.error('Lightbox element not found!');
        return;
    }
    
    const lightboxImage = lightbox.querySelector('.lightbox-image');
    const lightboxCounter = lightbox.querySelector('.lightbox-counter');
    
    const previewImages = [
        {
            src: 'media/book_preview.jpg',
            fallback: 'media/book_1.jpg',
            alt: 'Grāmatas fragmenta priekšskatījums 1',
            title: 'Grāmatas fragments'
        },
        {
            src: 'media/book_preview_2.jpg',
            fallback: 'media/book_2.jpg',
            alt: 'Grāmatas fragmenta priekšskatījums 2',
            title: 'Grāmatas fragments'
        },
        {
            src: 'media/book_preview_3.jpg',
            fallback: 'media/book_3.jpg',
            alt: 'Grāmatas fragmenta priekšskatījums 3',
            title: 'Grāmatas fragments'
        }
    ];
    
    // Store current index
    lightbox.setAttribute('data-current-index', imageIndex);
    
    // Update image and counter
    const currentImage = previewImages[imageIndex];
    lightboxImage.src = currentImage.src;
    lightboxImage.alt = currentImage.alt;
    lightboxCounter.textContent = `${imageIndex + 1} / ${previewImages.length}`;
    
    // Show lightbox
    lightbox.classList.add('active');
    document.body.classList.add('lightbox-open');
    
    // Focus management
    const closeBtn = lightbox.querySelector('.lightbox-close');
    closeBtn.focus();
}

/**
 * Close lightbox
 */
function closeLightbox() {
    const lightbox = document.getElementById('gallery-lightbox');
    lightbox.classList.remove('active');
    document.body.classList.remove('lightbox-open');
    
    // Return focus to the gallery item that was clicked
    const currentIndex = parseInt(lightbox.getAttribute('data-current-index'));
    const galleryItems = document.querySelectorAll('.gallery-image');
    if (galleryItems[currentIndex]) {
        galleryItems[currentIndex].focus();
    }
}

/**
 * Navigate lightbox images
 */
function navigateLightbox(direction) {
    const lightbox = document.getElementById('gallery-lightbox');
    const currentIndex = parseInt(lightbox.getAttribute('data-current-index'));
    const totalImages = 3; // Number of preview images
    
    let newIndex = currentIndex + direction;
    
    // Wrap around
    if (newIndex < 0) {
        newIndex = totalImages - 1;
    } else if (newIndex >= totalImages) {
        newIndex = 0;
    }
    
    openLightbox(newIndex);
}

/**
 * Initialize contact form functionality
 */
function initContactForm() {
    const contactForm = document.getElementById('contact-form');
    
    if (!contactForm) {
        console.error('Contact form not found');
        return;
    }
    
    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    const messageInput = document.getElementById('contact-message');
    const submitButton = document.getElementById('contact-submit');
    const successMessage = document.getElementById('contact-success');
    
    // Form validation rules
    const validationRules = {
        name: {
            required: true,
            minLength: 2,
            maxLength: 50,
            pattern: /^[a-zA-ZĀāČčĒēĢģĪīĶķĻļŅņŠšŪūŽž\s\-']+$/,
            errorMessages: {
                required: 'Lūdzu, ievadiet savu vārdu',
                minLength: 'Vārdam jābūt vismaz 2 simbolu garam',
                maxLength: 'Vārds nedrīkst būt garāks par 50 simboliem',
                pattern: 'Vārdā drīkst būt tikai burti, atstarpes, defises un apostrofi'
            }
        },
        email: {
            required: true,
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            maxLength: 100,
            errorMessages: {
                required: 'Lūdzu, ievadiet savu e-pasta adresi',
                pattern: 'Lūdzu, ievadiet derīgu e-pasta adresi',
                maxLength: 'E-pasta adrese nedrīkst būt garāka par 100 simboliem'
            }
        },
        message: {
            required: true,
            minLength: 10,
            maxLength: 1000,
            errorMessages: {
                required: 'Lūdzu, ievadiet savu ziņojumu',
                minLength: 'Ziņojumam jābūt vismaz 10 simbolu garam',
                maxLength: 'Ziņojums nedrīkst būt garāks par 1000 simboliem'
            }
        }
    };
    
    // Add real-time validation
    nameInput.addEventListener('blur', () => validateField('name', nameInput.value));
    nameInput.addEventListener('input', debounce(() => validateField('name', nameInput.value), 500));
    
    emailInput.addEventListener('blur', () => validateField('email', emailInput.value));
    emailInput.addEventListener('input', debounce(() => validateField('email', emailInput.value), 500));
    
    messageInput.addEventListener('blur', () => validateField('message', messageInput.value));
    messageInput.addEventListener('input', debounce(() => validateField('message', messageInput.value), 500));
    
    // Handle form submission
    contactForm.addEventListener('submit', handleFormSubmit);
    
    /**
     * Validate individual field
     */
    function validateField(fieldName, value) {
        const rules = validationRules[fieldName];
        const errorElement = document.getElementById(`${fieldName}-error`);
        const inputElement = document.getElementById(`contact-${fieldName}`);
        
        if (!rules || !errorElement || !inputElement) return true;
        
        // Clear previous error state
        clearFieldError(fieldName);
        
        // Required validation
        if (rules.required && (!value || value.trim() === '')) {
            showFieldError(fieldName, rules.errorMessages.required);
            return false;
        }
        
        // Skip other validations if field is empty and not required
        if (!value || value.trim() === '') {
            return true;
        }
        
        // Length validations
        if (rules.minLength && value.trim().length < rules.minLength) {
            showFieldError(fieldName, rules.errorMessages.minLength);
            return false;
        }
        
        if (rules.maxLength && value.trim().length > rules.maxLength) {
            showFieldError(fieldName, rules.errorMessages.maxLength);
            return false;
        }
        
        // Pattern validation
        if (rules.pattern && !rules.pattern.test(value.trim())) {
            showFieldError(fieldName, rules.errorMessages.pattern);
            return false;
        }
        
        return true;
    }
    
    /**
     * Show field error
     */
    function showFieldError(fieldName, message) {
        const errorElement = document.getElementById(`${fieldName}-error`);
        const inputElement = document.getElementById(`contact-${fieldName}`);
        
        if (errorElement && inputElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
            inputElement.classList.add('error');
            inputElement.setAttribute('aria-invalid', 'true');
        }
    }
    
    /**
     * Clear field error
     */
    function clearFieldError(fieldName) {
        const errorElement = document.getElementById(`${fieldName}-error`);
        const inputElement = document.getElementById(`contact-${fieldName}`);
        
        if (errorElement && inputElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
            inputElement.classList.remove('error');
            inputElement.setAttribute('aria-invalid', 'false');
        }
    }
    
    /**
     * Validate entire form
     */
    function validateForm() {
        const nameValid = validateField('name', nameInput.value);
        const emailValid = validateField('email', emailInput.value);
        const messageValid = validateField('message', messageInput.value);
        
        return nameValid && emailValid && messageValid;
    }
    
    /**
     * Handle form submission
     */
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        // Hide success message if visible
        successMessage.style.display = 'none';
        successMessage.classList.remove('show');
        
        // Validate form
        if (!validateForm()) {
            // Focus on first error field
            const firstErrorField = contactForm.querySelector('.error');
            if (firstErrorField) {
                firstErrorField.focus();
            }
            return;
        }
        
        // Show loading state
        submitButton.classList.add('loading');
        submitButton.disabled = true;
        
        // Prepare form data
        const formData = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            message: messageInput.value.trim()
        };
        
        try {
            // Submit form data
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                // Show success message
                showSuccessMessage();
                
                // Reset form
                contactForm.reset();
                clearAllErrors();
                
                // Scroll to success message
                successMessage.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                
            } else {
                // Show error message
                showFormError(result.message || 'Radās kļūda nosūtot ziņojumu. Lūdzu, mēģiniet vēlreiz.');
            }
            
        } catch (error) {
            console.error('Form submission error:', error);
            showFormError('Radās kļūda nosūtot ziņojumu. Lūdzu, pārbaudiet interneta savienojumu un mēģiniet vēlreiz.');
        } finally {
            // Remove loading state
            submitButton.classList.remove('loading');
            submitButton.disabled = false;
        }
    }
    
    /**
     * Show success message
     */
    function showSuccessMessage() {
        successMessage.style.display = 'block';
        successMessage.classList.add('show');
        
        // Add confetti effect (optional enhancement)
        if (typeof createConfetti === 'function') {
            createConfetti();
        }
    }
    
    /**
     * Show form error message
     */
    function showFormError(message) {
        // Create or update error message element
        let errorElement = contactForm.querySelector('.form-error-general');
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'form-error form-error-general show';
            errorElement.setAttribute('role', 'alert');
            submitButton.parentNode.insertBefore(errorElement, submitButton);
        }
        
        errorElement.textContent = message;
        errorElement.classList.add('show');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorElement.classList.remove('show');
        }, 5000);
    }
    
    /**
     * Clear all field errors
     */
    function clearAllErrors() {
        ['name', 'email', 'message'].forEach(fieldName => {
            clearFieldError(fieldName);
        });
        
        // Remove general error message
        const generalError = contactForm.querySelector('.form-error-general');
        if (generalError) {
            generalError.remove();
        }
    }
    
    /**
     * Add character counter for message field
     */
    function initCharacterCounter() {
        const maxLength = validationRules.message.maxLength;
        const counter = document.createElement('div');
        counter.className = 'character-counter';
        counter.style.cssText = `
            font-size: var(--font-size-sm);
            color: var(--color-light-text);
            text-align: right;
            margin-top: var(--spacing-xs);
        `;
        
        messageInput.parentNode.appendChild(counter);
        
        function updateCounter() {
            const currentLength = messageInput.value.length;
            counter.textContent = `${currentLength}/${maxLength}`;
            
            if (currentLength > maxLength * 0.9) {
                counter.style.color = 'var(--color-error)';
            } else if (currentLength > maxLength * 0.7) {
                counter.style.color = 'var(--color-primary-orange)';
            } else {
                counter.style.color = 'var(--color-light-text)';
            }
        }
        
        messageInput.addEventListener('input', updateCounter);
        updateCounter(); // Initial call
    }
    
    // Initialize character counter
    initCharacterCounter();
    
    // Add form accessibility enhancements
    contactForm.setAttribute('novalidate', 'true'); // Disable browser validation
    
    // Add keyboard navigation improvements
    const formElements = contactForm.querySelectorAll('input, textarea, button');
    formElements.forEach((element, index) => {
        element.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && element.tagName !== 'TEXTAREA' && element.tagName !== 'BUTTON') {
                e.preventDefault();
                const nextElement = formElements[index + 1];
                if (nextElement) {
                    nextElement.focus();
                }
            }
        });
    });
}

/**
 * Optional: Create confetti effect for successful form submission
 */
function createConfetti() {
    const colors = [
        'var(--color-primary-orange)',
        'var(--color-primary-blue)', 
        'var(--color-primary-yellow)',
        'var(--color-primary-green)',
        'var(--color-secondary-purple)',
        'var(--color-secondary-pink)'
    ];
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                top: -10px;
                left: ${Math.random() * 100}vw;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                animation: confettiFall 3s linear forwards;
            `;
            
            document.body.appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 3000);
        }, i * 50);
    }
}

// Add confetti animation CSS
const confettiStyle = document.createElement('style');
confettiStyle.textContent = `
    @keyframes confettiFall {
        0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(confettiStyle);

// Initialize scroll animations if supported
if ('IntersectionObserver' in window) {
    document.addEventListener('DOMContentLoaded', initScrollAnimations);
}
/**

 * Show/hide loading state for content sections
 */
function showContentLoadingState(section, isLoading) {
    const sectionElement = document.getElementById(section);
    if (!sectionElement) return;
    
    if (isLoading) {
        sectionElement.classList.add('content-loading');
        
        // Add loading indicator if it doesn't exist
        let loadingIndicator = sectionElement.querySelector('.content-loading-indicator');
        if (!loadingIndicator) {
            loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'content-loading-indicator';
            loadingIndicator.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner-circle"></div>
                </div>
                <span class="loading-text">Ielādē saturu...</span>
            `;
            sectionElement.appendChild(loadingIndicator);
        }
    } else {
        sectionElement.classList.remove('content-loading');
        
        // Remove loading indicator
        const loadingIndicator = sectionElement.querySelector('.content-loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }
}

/**
 * Handle content loading errors
 */
function handleContentLoadError(section, error) {
    console.error(`Content loading error for ${section}:`, error);
    
    // Show user-friendly error message
    const sectionElement = document.getElementById(section);
    if (!sectionElement) return;
    
    // Remove any existing error messages
    const existingError = sectionElement.querySelector('.content-error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Create error message element
    const errorMessage = document.createElement('div');
    errorMessage.className = 'content-error-message';
    errorMessage.innerHTML = `
        <div class="error-icon">⚠️</div>
        <div class="error-content">
            <p class="error-title">Neizdevās ielādēt saturu</p>
            <p class="error-description">Tiek izmantots rezerves saturs. Lūdzu, mēģiniet atjaunot lapu.</p>
            <button class="error-retry-btn" onclick="retryContentLoad('${section}')">
                Mēģināt vēlreiz
            </button>
        </div>
    `;
    
    // Insert error message at the top of the section
    const sectionContainer = sectionElement.querySelector('.section-container');
    if (sectionContainer) {
        sectionContainer.insertBefore(errorMessage, sectionContainer.firstChild);
    }
    
    // Auto-hide error message after 10 seconds
    setTimeout(() => {
        if (errorMessage.parentElement) {
            errorMessage.remove();
        }
    }, 10000);
}

/**
 * Retry content loading for a specific section
 */
function retryContentLoad(section) {
    // Remove error message
    const sectionElement = document.getElementById(section);
    if (sectionElement) {
        const errorMessage = sectionElement.querySelector('.content-error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }
    
    // Retry loading based on section
    switch (section) {
        case 'interesanti':
            loadInteresantiContent();
            break;
        case 'gramatas':
            loadGramatasContent();
            break;
        case 'fragmenti':
            loadFragmentiContent();
            break;
        default:
            console.warn('Unknown section for retry:', section);
    }
}

/**
 * Enhanced contact form error handling and user feedback
 */
function enhanceContactFormErrorHandling() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;
    
    const submitButton = document.getElementById('contact-submit');
    const successMessage = document.getElementById('contact-success');
    
    // Add network error handling
    const originalSubmitHandler = contactForm.onsubmit;
    
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Show loading state
        setContactFormLoadingState(true);
        clearContactFormMessages();
        
        try {
            const formData = new FormData(contactForm);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                message: formData.get('message')
            };
            
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                showContactFormSuccess(result.message);
                contactForm.reset();
            } else {
                throw new Error(result.error || 'Nezināma kļūda');
            }
            
        } catch (error) {
            console.error('Contact form submission error:', error);
            handleContactFormError(error);
        } finally {
            setContactFormLoadingState(false);
        }
    });
}

/**
 * Set contact form loading state
 */
function setContactFormLoadingState(isLoading) {
    const submitButton = document.getElementById('contact-submit');
    const submitText = submitButton.querySelector('.submit-text');
    const submitLoading = submitButton.querySelector('.submit-loading');
    
    if (isLoading) {
        submitButton.disabled = true;
        submitText.style.display = 'none';
        submitLoading.style.display = 'inline-flex';
        submitLoading.textContent = 'Nosūta...';
    } else {
        submitButton.disabled = false;
        submitText.style.display = 'inline';
        submitLoading.style.display = 'none';
    }
}

/**
 * Clear contact form messages
 */
function clearContactFormMessages() {
    const successMessage = document.getElementById('contact-success');
    const errorMessages = document.querySelectorAll('.form-error');
    
    if (successMessage) {
        successMessage.style.display = 'none';
        successMessage.textContent = '';
    }
    
    errorMessages.forEach(error => {
        error.textContent = '';
        error.style.display = 'none';
    });
    
    // Remove any existing general error messages
    const existingErrors = document.querySelectorAll('.contact-form-error');
    existingErrors.forEach(error => error.remove());
}

/**
 * Show contact form success message
 */
function showContactFormSuccess(message) {
    const successMessage = document.getElementById('contact-success');
    if (successMessage) {
        successMessage.textContent = message || 'Paldies! Jūsu ziņojums ir nosūtīts.';
        successMessage.style.display = 'block';
        
        // Scroll to success message
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Auto-hide after 8 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 8000);
    }
}

/**
 * Handle contact form errors
 */
function handleContactFormError(error) {
    const contactForm = document.getElementById('contact-form');
    
    // Create error message element
    const errorMessage = document.createElement('div');
    errorMessage.className = 'contact-form-error form-error';
    errorMessage.setAttribute('role', 'alert');
    
    // Determine error message based on error type
    let errorText = 'Radās kļūda nosūtot ziņojumu. Lūdzu, mēģiniet vēlreiz.';
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
        errorText = 'Savienojuma kļūda. Lūdzu, pārbaudiet interneta savienojumu un mēģiniet vēlreiz.';
    } else if (error.message.includes('429') || error.message.includes('Too many')) {
        errorText = 'Pārāk daudz mēģinājumu. Lūdzu, uzgaidiet un mēģiniet vēlreiz.';
    } else if (error.message.includes('400')) {
        errorText = 'Nepareizi ievadīti dati. Lūdzu, pārbaudiet formu un mēģiniet vēlreiz.';
    } else if (error.message) {
        errorText = error.message;
    }
    
    errorMessage.innerHTML = `
        <div class="error-content">
            <span class="error-icon">⚠️</span>
            <span class="error-text">${errorText}</span>
            <button class="error-retry-btn" onclick="retryContactForm()">
                Mēģināt vēlreiz
            </button>
        </div>
    `;
    
    // Insert error message before the submit button
    const submitButton = document.getElementById('contact-submit');
    contactForm.insertBefore(errorMessage, submitButton);
    
    // Scroll to error message
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        if (errorMessage.parentElement) {
            errorMessage.remove();
        }
    }, 10000);
}

/**
 * Retry contact form submission
 */
function retryContactForm() {
    // Remove error messages
    const errorMessages = document.querySelectorAll('.contact-form-error');
    errorMessages.forEach(error => error.remove());
    
    // Focus on the first form field
    const firstInput = document.getElementById('contact-name');
    if (firstInput) {
        firstInput.focus();
    }
}

/**
 * Add global error handling for network issues
 */
function initGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        
        // Show user-friendly error message for network issues
        if (event.reason && (
            event.reason.message?.includes('fetch') ||
            event.reason.message?.includes('network') ||
            event.reason.name === 'TypeError'
        )) {
            showGlobalErrorMessage('Savienojuma kļūda. Lūdzu, pārbaudiet interneta savienojumu.');
        }
        
        // Prevent the default browser error handling
        event.preventDefault();
    });
    
    // Handle JavaScript errors
    window.addEventListener('error', function(event) {
        console.error('JavaScript error:', event.error);
        
        // Only show user message for critical errors that affect functionality
        if (event.error && event.error.message?.includes('fetch')) {
            showGlobalErrorMessage('Radās tehniska kļūda. Lūdzu, atjaunojiet lapu.');
        }
    });
    
    // Handle offline/online status
    window.addEventListener('offline', function() {
        showGlobalErrorMessage('Nav interneta savienojuma. Dažas funkcijas var nedarboties.', 'warning');
    });
    
    window.addEventListener('online', function() {
        showGlobalErrorMessage('Interneta savienojums atjaunots.', 'success');
    });
}

/**
 * Show global error message
 */
function showGlobalErrorMessage(message, type = 'error') {
    // Remove existing global messages
    const existingMessages = document.querySelectorAll('.global-error-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `global-error-message global-message-${type}`;
    messageElement.setAttribute('role', 'alert');
    messageElement.innerHTML = `
        <div class="global-message-content">
            <span class="global-message-icon">
                ${type === 'error' ? '⚠️' : type === 'warning' ? '⚠️' : '✅'}
            </span>
            <span class="global-message-text">${message}</span>
            <button class="global-message-close" onclick="this.parentElement.parentElement.remove()">
                ×
            </button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(messageElement);
    
    // Auto-hide after 8 seconds (except for offline warnings)
    if (type !== 'warning' || !message.includes('Nav interneta')) {
        setTimeout(() => {
            if (messageElement.parentElement) {
                messageElement.remove();
            }
        }, 8000);
    }
}

/**
 * Initialize enhanced error handling
 */
function initEnhancedErrorHandling() {
    initGlobalErrorHandling();
    enhanceContactFormErrorHandling();
}

// Initialize enhanced error handling when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initEnhancedErrorHandling();
});
/**
 * 
Cross-browser compatibility and performance monitoring
 */

/**
 * Initialize cross-browser compatibility features
 */
function initCrossBrowserCompatibility() {
    // Add polyfills for older browsers
    addPolyfills();
    
    // Handle browser-specific optimizations
    handleBrowserSpecificOptimizations();
    
    // Initialize performance monitoring
    initPerformanceMonitoring();
    
    // Add error handling for unsupported features
    addFeatureDetection();
}

/**
 * Add polyfills for older browsers
 */
function addPolyfills() {
    // Intersection Observer polyfill for older browsers
    if (!('IntersectionObserver' in window)) {
        const script = document.createElement('script');
        script.src = 'https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver';
        script.async = true;
        document.head.appendChild(script);
    }
    
    // Smooth scroll polyfill for Safari and older browsers
    if (!('scrollBehavior' in document.documentElement.style)) {
        const script = document.createElement('script');
        script.src = 'https://polyfill.io/v3/polyfill.min.js?features=smoothscroll';
        script.async = true;
        document.head.appendChild(script);
    }
    
    // Object-fit polyfill for IE
    if (!('objectFit' in document.documentElement.style)) {
        const script = document.createElement('script');
        script.src = 'https://polyfill.io/v3/polyfill.min.js?features=object-fit';
        script.async = true;
        document.head.appendChild(script);
    }
}

/**
 * Handle browser-specific optimizations
 */
function handleBrowserSpecificOptimizations() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Safari-specific optimizations
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
        document.body.classList.add('safari');
        
        // Optimize for Safari's rendering engine
        const safariStyle = document.createElement('style');
        safariStyle.textContent = `
            .safari .hero {
                background-attachment: scroll;
            }
            .safari img {
                image-rendering: -webkit-optimize-contrast;
            }
        `;
        document.head.appendChild(safariStyle);
    }
    
    // Firefox-specific optimizations
    if (userAgent.includes('firefox')) {
        document.body.classList.add('firefox');
        
        const firefoxStyle = document.createElement('style');
        firefoxStyle.textContent = `
            .firefox .section {
                transform: none;
            }
        `;
        document.head.appendChild(firefoxStyle);
    }
    
    // Edge-specific optimizations
    if (userAgent.includes('edge')) {
        document.body.classList.add('edge');
    }
    
    // Mobile-specific optimizations
    if (/android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
        document.body.classList.add('mobile');
        
        // Optimize for mobile performance
        const mobileStyle = document.createElement('style');
        mobileStyle.textContent = `
            .mobile .floating-decoration,
            .mobile .gallery-decoration,
            .mobile .contact-decoration {
                animation-duration: 6s;
            }
            .mobile .hero {
                background-attachment: scroll;
            }
        `;
        document.head.appendChild(mobileStyle);
    }
}

/**
 * Initialize performance monitoring
 */
function initPerformanceMonitoring() {
    // Monitor Core Web Vitals
    if ('PerformanceObserver' in window) {
        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            console.log('LCP:', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        
        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
                console.log('FID:', entry.processingStart - entry.startTime);
            });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        
        // Cumulative Layout Shift (CLS)
        const clsObserver = new PerformanceObserver((list) => {
            let clsValue = 0;
            const entries = list.getEntries();
            entries.forEach(entry => {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            });
            console.log('CLS:', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
    
    // Monitor resource loading
    window.addEventListener('load', function() {
        if ('performance' in window) {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('Page Load Time:', perfData.loadEventEnd - perfData.fetchStart);
            console.log('DOM Content Loaded:', perfData.domContentLoadedEventEnd - perfData.fetchStart);
        }
    });
}

/**
 * Add feature detection and graceful degradation
 */
function addFeatureDetection() {
    // Test for CSS Grid support
    if (!CSS.supports('display', 'grid')) {
        document.body.classList.add('no-grid');
        
        // Fallback styles for browsers without grid support
        const fallbackStyle = document.createElement('style');
        fallbackStyle.textContent = `
            .no-grid .gallery-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 1rem;
            }
            .no-grid .gallery-item {
                flex: 1 1 300px;
            }
            .no-grid .author-content {
                display: block;
            }
            .no-grid .book-entry {
                display: block;
            }
        `;
        document.head.appendChild(fallbackStyle);
    }
    
    // Test for CSS custom properties support
    if (!CSS.supports('color', 'var(--test)')) {
        document.body.classList.add('no-custom-properties');
        
        // Fallback colors for browsers without custom properties
        const colorFallback = document.createElement('style');
        colorFallback.textContent = `
            .no-custom-properties .nav-link:focus {
                outline: 3px solid #FF6B35;
            }
            .no-custom-properties .skip-link {
                background: #FF6B35;
            }
        `;
        document.head.appendChild(colorFallback);
    }
    
    // Test for WebP support
    const webpSupport = document.createElement('canvas');
    webpSupport.width = 1;
    webpSupport.height = 1;
    const webpSupported = webpSupport.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    
    if (webpSupported) {
        document.body.classList.add('webp-support');
    } else {
        document.body.classList.add('no-webp');
    }
}

/**
 * Optimize images based on device capabilities
 */
function optimizeImagesForDevice() {
    const images = document.querySelectorAll('img');
    const devicePixelRatio = window.devicePixelRatio || 1;
    const connectionSpeed = getConnectionSpeed();
    
    images.forEach(img => {
        // Skip if already optimized
        if (img.dataset.optimized) return;
        
        // Optimize based on device pixel ratio and connection speed
        if (devicePixelRatio > 1 && connectionSpeed === 'fast') {
            // Use high-resolution images for retina displays with fast connections
            img.style.imageRendering = 'crisp-edges';
        } else if (connectionSpeed === 'slow') {
            // Use lower quality for slow connections
            img.style.imageRendering = 'optimizeSpeed';
        }
        
        img.dataset.optimized = 'true';
    });
}

/**
 * Get connection speed estimation
 */
function getConnectionSpeed() {
    if ('connection' in navigator) {
        const connection = navigator.connection;
        if (connection.effectiveType) {
            switch (connection.effectiveType) {
                case 'slow-2g':
                case '2g':
                    return 'slow';
                case '3g':
                    return 'medium';
                case '4g':
                    return 'fast';
                default:
                    return 'medium';
            }
        }
    }
    return 'medium';
}

/**
 * Initialize all optimizations when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize cross-browser compatibility
    initCrossBrowserCompatibility();
    
    // Optimize images for device
    optimizeImagesForDevice();
    
    // Re-optimize on resize (debounced)
    const debouncedOptimize = debounce(optimizeImagesForDevice, 250);
    window.addEventListener('resize', debouncedOptimize);
});

/**
 * Handle visibility change for performance optimization
 */
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Pause animations when page is not visible
        document.body.classList.add('page-hidden');
    } else {
        // Resume animations when page becomes visible
        document.body.classList.remove('page-hidden');
    }
});

// Add CSS for visibility optimization
const visibilityStyle = document.createElement('style');
visibilityStyle.textContent = `
    .page-hidden .floating-decoration,
    .page-hidden .author-decoration,
    .page-hidden .book-decoration,
    .page-hidden .gallery-decoration {
        animation-play-state: paused;
    }
`;
document.head.appendChild(visibilityStyle);