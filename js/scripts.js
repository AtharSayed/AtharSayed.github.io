// Mobile menu functionality
document.addEventListener('DOMContentLoaded', function() {
    // Create mobile menu structure
    const header = document.querySelector('header');
    const nav = document.querySelector('nav');
    
    // Create mobile menu toggle button
    const mobileToggle = document.createElement('button');
    mobileToggle.className = 'mobile-menu-toggle';
    mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
    mobileToggle.setAttribute('aria-label', 'Toggle mobile menu');
    
    // Create nav container
    const navContainer = document.createElement('div');
    navContainer.className = 'nav-container';
    
    // Create logo
    const logo = document.createElement('a');
    logo.href = '#';
    logo.className = 'logo';
    logo.textContent = 'Portfolio';
    
    // Clone navigation for mobile
    const mobileMenu = document.createElement('div');
    mobileMenu.className = 'mobile-menu';
    const navClone = nav.cloneNode(true);
    mobileMenu.appendChild(navClone);
    
    // Restructure header
    navContainer.appendChild(logo);
    navContainer.appendChild(nav);
    navContainer.appendChild(mobileToggle);
    header.innerHTML = '';
    header.appendChild(navContainer);
    header.appendChild(mobileMenu);
    
    // Mobile menu toggle functionality
    let isMenuOpen = false;
    
    mobileToggle.addEventListener('click', function() {
        isMenuOpen = !isMenuOpen;
        mobileMenu.classList.toggle('active', isMenuOpen);
        mobileToggle.innerHTML = isMenuOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    });
    
    // Close mobile menu when clicking on a link
    mobileMenu.addEventListener('click', function(e) {
        if (e.target.tagName === 'A') {
            isMenuOpen = false;
            mobileMenu.classList.remove('active');
            mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
            document.body.style.overflow = '';
        }
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (isMenuOpen && !header.contains(e.target)) {
            isMenuOpen = false;
            mobileMenu.classList.remove('active');
            mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
            document.body.style.overflow = '';
        }
    });
    
    // Close mobile menu on resize to desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && isMenuOpen) {
            isMenuOpen = false;
            mobileMenu.classList.remove('active');
            mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
            document.body.style.overflow = '';
        }
    });
});

// Enhanced smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            const headerHeight = document.querySelector('header').offsetHeight;
            const targetPosition = targetElement.offsetTop - headerHeight - 20;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
            
            // Update URL without refreshing
            if (history.pushState) {
                history.pushState(null, null, targetId);
            }
        }
    });
});

// Enhanced sticky header with resize handling
let lastScrollY = window.scrollY;
const header = document.querySelector('header');

function handleScroll() {
    const currentScrollY = window.scrollY;
    const scrollingDown = currentScrollY > lastScrollY;
    
    // Add sticky class
    header.classList.toggle('sticky', currentScrollY > 50);
    
    // Hide header when scrolling down, show when scrolling up (optional)
    if (window.innerWidth > 768) {
        if (scrollingDown && currentScrollY > 200) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }
    }
    
    lastScrollY = currentScrollY;
}

window.addEventListener('scroll', handleScroll, { passive: true });

// Enhanced form submission with better validation
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    // Add labels to form inputs if they don't exist
    const formInputs = contactForm.querySelectorAll('input, textarea');
    formInputs.forEach(input => {
        if (!input.previousElementSibling || input.previousElementSibling.tagName !== 'LABEL') {
            const label = document.createElement('label');
            label.setAttribute('for', input.id);
            label.textContent = input.placeholder || input.name;
            input.parentNode.insertBefore(label, input);
        }
    });
    
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const formData = new FormData(contactForm);
        const name = formData.get('name') || document.getElementById('name')?.value;
        const email = formData.get('email') || document.getElementById('email')?.value;
        const message = formData.get('message') || document.getElementById('message')?.value;
        
        // Basic validation
        if (!name || !email || !message) {
            showNotification('Please fill in all fields.', 'error');
            return;
        }
        
        if (!isValidEmail(email)) {
            showNotification('Please enter a valid email address.', 'error');
            return;
        }
        
        // Log form data (in production, send to server)
        console.log({ name, email, message });
        
        // Show success notification
        showNotification('Thank you for your message! I will get back to you soon.', 'success');
        
        // Reset the form
        contactForm.reset();
    });
}

// Email validation function
function isValidEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
}

// Enhanced notification system
function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.form-notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `form-notification ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
    const bgColor = type === 'success' ? 'var(--primary-color)' : '#e74c3c';
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    notification.style.background = bgColor;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

// Enhanced animation on scroll with better performance
document.addEventListener('DOMContentLoaded', function() {
    const animatedElements = document.querySelectorAll(
        'section, .skill-category, .project-card, .timeline-item, .certification-card, .publication-card'
    );
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    animatedElements.forEach(element => {
        element.classList.add('fade-in');
        observer.observe(element);
    });
    
    // Set current year in footer
    const currentYear = new Date().getFullYear();
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = currentYear;
    }
});

// Lazy loading for images
document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
});

// Keyboard navigation enhancement
document.addEventListener('keydown', function(e) {
    // ESC key closes mobile menu
    if (e.key === 'Escape') {
        const mobileMenu = document.querySelector('.mobile-menu');
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        
        if (mobileMenu && mobileMenu.classList.contains('active')) {
            mobileMenu.classList.remove('active');
            mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
            document.body.style.overflow = '';
        }
    }
});

// Performance optimization: debounce scroll and resize events
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

// Apply debouncing to scroll and resize events
window.addEventListener('scroll', debounce(handleScroll, 16), { passive: true });
window.addEventListener('resize', debounce(function() {
    // Handle resize events if needed
}, 250));

// Add loading states for better UX
window.addEventListener('load', function() {
    document.body.classList.add('loaded');
});

// Error handling for missing elements
function safeQuerySelector(selector) {
    try {
        return document.querySelector(selector);
    } catch (error) {
        console.warn(`Element not found: ${selector}`);
        return null;
    }
}

function safeQuerySelectorAll(selector) {
    try {
        return document.querySelectorAll(selector);
    } catch (error) {
        console.warn(`Elements not found: ${selector}`);
        return [];
    }
}
