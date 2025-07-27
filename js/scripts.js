/**
 * Athar Sayed's Portfolio - Optimized Main JS
 * Mobile menu fixes, performance improvements, and cross-browser support
 */

document.addEventListener('DOMContentLoaded', function() {
    // =============================================
    // 1. ENHANCED MOBILE MENU WITH TOUCH SUPPORT
    // =============================================
    const header = document.querySelector('header');
    const nav = document.querySelector('nav');
    const navList = nav ? nav.querySelector('ul') : null;
    
    // Mobile toggle setup
    let mobileToggle = document.querySelector('.mobile-menu-toggle');
    if (!mobileToggle && nav) {
        mobileToggle = document.createElement('button');
        mobileToggle.className = 'mobile-menu-toggle';
        mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
        mobileToggle.setAttribute('aria-label', 'Toggle mobile menu');
        mobileToggle.setAttribute('aria-expanded', 'false');
        nav.appendChild(mobileToggle);
    }

    // Menu toggle function
    const toggleMenu = () => {
        if (!navList) return;
        
        const isOpening = !navList.classList.contains('active');
        
        // Toggle menu state
        navList.classList.toggle('active', isOpening);
        mobileToggle?.setAttribute('aria-expanded', isOpening);
        
        // Update icon
        if (mobileToggle) {
            mobileToggle.innerHTML = isOpening 
                ? '<i class="fas fa-times"></i>' 
                : '<i class="fas fa-bars"></i>';
        }
        
        // Lock scroll when open
        document.body.style.overflow = isOpening ? 'hidden' : '';
        
        // iOS redraw fix
        if (isOpening) {
            header.style.display = 'none';
            header.offsetHeight;
            header.style.display = '';
        }
    };

    // Event listeners with passive handling
    if (mobileToggle) {
        // Click handler
        mobileToggle.addEventListener('click', toggleMenu);
        
        // Touch handler (for mobile)
        mobileToggle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            toggleMenu();
        }, { passive: false });
    }

    // Close menu when clicking links
    if (navList) {
        navList.addEventListener('click', (e) => {
            if (e.target.closest('a')) {
                toggleMenu();
            }
        });
    }

    // Close when clicking outside
    const closeOnOutsideClick = (e) => {
        if (navList?.classList.contains('active') &&
            !e.target.closest('nav') &&
            !e.target.closest('.mobile-menu-toggle')) {
            toggleMenu();
        }
    };
    document.addEventListener('click', closeOnOutsideClick);
    document.addEventListener('touchstart', closeOnOutsideClick, { passive: true });

    // Reset on desktop resize
    window.addEventListener('resize', debounce(() => {
        if (window.innerWidth > 768 && navList?.classList.contains('active')) {
            toggleMenu();
        }
    }, 250));

    // =============================================
    // 2. SMOOTH SCROLLING
    // =============================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const headerHeight = header?.offsetHeight || 0;
                const targetPosition = targetElement.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                if (history.pushState) {
                    history.pushState(null, null, targetId);
                }
            }
        });
    });

    // =============================================
    // 3. STICKY HEADER
    // =============================================
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
        const currentScrollY = window.scrollY;
        const scrollingDown = currentScrollY > lastScrollY;
        
        header?.classList.toggle('sticky', currentScrollY > 50);
        
        if (window.innerWidth > 768) {
            header.style.transform = scrollingDown && currentScrollY > 200 
                ? 'translateY(-100%)' 
                : 'translateY(0)';
        }
        
        lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', debounce(handleScroll, 16), { passive: true });

    // =============================================
    // 4. ANIMATION ON SCROLL
    // =============================================
    const animatedElements = document.querySelectorAll(
        'section, .skill-category, .project-card, .timeline-item, .certification-card, .publication-card'
    );
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    animatedElements.forEach(element => {
        element.classList.add('fade-in');
        observer.observe(element);
    });

    // =============================================
    // 5. LAZY LOADING IMAGES
    // =============================================
    const lazyImages = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    }, { rootMargin: '200px' });
    
    lazyImages.forEach(img => imageObserver.observe(img));

    // =============================================
    // 6. FORM VALIDATION (if form exists)
    // =============================================
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        // Add missing labels
        contactForm.querySelectorAll('input, textarea').forEach(input => {
            if (!input.previousElementSibling || input.previousElementSibling.tagName !== 'LABEL') {
                const label = document.createElement('label');
                label.setAttribute('for', input.id);
                label.textContent = input.placeholder || input.name;
                input.parentNode.insertBefore(label, input);
            }
        });
        
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(contactForm);
            const name = formData.get('name');
            const email = formData.get('email');
            const message = formData.get('message');
            
            if (!name || !email || !message) {
                showNotification('Please fill in all fields.', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showNotification('Please enter a valid email address.', 'error');
                return;
            }
            
            console.log({ name, email, message });
            showNotification('Thank you for your message! I will get back to you soon.', 'success');
            contactForm.reset();
        });
    }

    // =============================================
    // 7. FOOTER YEAR UPDATE
    // =============================================
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    // =============================================
    // 8. PAGE LOAD COMPLETE
    // =============================================
    window.addEventListener('load', () => {
        document.body.classList.add('loaded');
    });
});

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Show notification popup
 */
function showNotification(message, type = 'success') {
    const existing = document.querySelector('.form-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `form-notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
        <span>${message}</span>
    `;
    notification.style.background = type === 'success' ? 'var(--primary-color)' : '#e74c3c';
    
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

/**
 * Email validation
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Debounce function for performance
 */
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Escape key handler
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const mobileMenu = document.querySelector('nav ul');
        if (mobileMenu?.classList.contains('active')) {
            mobileMenu.classList.remove('active');
            const toggle = document.querySelector('.mobile-menu-toggle');
            if (toggle) {
                toggle.innerHTML = '<i class="fas fa-bars"></i>';
                toggle.setAttribute('aria-expanded', 'false');
            }
            document.body.style.overflow = '';
        }
    }
});

/**
 * Safe DOM query helpers
 */
function safeQuery(selector) {
    try {
        return document.querySelector(selector);
    } catch (e) {
        console.warn(`Query failed: ${selector}`, e);
        return null;
    }
}

function safeQueryAll(selector) {
    try {
        return document.querySelectorAll(selector);
    } catch (e) {
        console.warn(`QueryAll failed: ${selector}`, e);
        return [];
    }
}