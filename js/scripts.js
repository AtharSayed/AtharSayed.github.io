/**
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
        'section, .skill-category, .project-card, .timeline-item, .certification-card, .publication-card, .achievement-card'
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
        initParticleNetworkAnimation(); // Initialize the particle network animation on load
    });

    // =============================================
    // 9. AI TERMINAL
    // =============================================
    function initAITerminal() {
        const terminalToggle = document.getElementById('terminal-toggle');
        const terminal = document.getElementById('ai-terminal');
        const terminalOutput = document.getElementById('terminal-output');
        const terminalInput = document.getElementById('terminal-input');
        const closeBtn = terminal.querySelector('.close');
        if (!terminalToggle || !terminal || !terminalOutput || !terminalInput || !closeBtn) return;

        // Boot sequence messages
        function initAITerminal() {
            const terminalToggle = document.getElementById('terminal-toggle');
            const terminal = document.getElementById('ai-terminal');
            const terminalOutput = document.getElementById('terminal-output');
            const terminalInput = document.getElementById('terminal-input');
            const closeBtn = terminal?.querySelector('.close');
            if (!terminalToggle || !terminal || !terminalOutput || !terminalInput) return;

            // Conversation state and pending request controller
            const convo = {
                history: [], // {role: 'user'|'assistant', content: '...'}
                booted: false,
                pendingRequest: null
            };

            // Gather short profile context from visible page content to ground replies
            function gatherProfileContext() {
                try {
                    const about = document.querySelector('#about .about-text')?.innerText || '';
                    const projects = Array.from(document.querySelectorAll('#projects .project-card h3'))
                        .map(h => h.innerText).join(' · ');
                    const skills = Array.from(document.querySelectorAll('#skills .skill-category h3'))
                        .map(h => h.innerText).join(' · ');
                    const experience = Array.from(document.querySelectorAll('#experience .timeline-item h3'))
                        .map(h => h.innerText).join(' · ');
                    return `Profile context:\nAbout: ${about}\nProjects: ${projects}\nSkills: ${skills}\nExperience: ${experience}`;
                } catch (e) {
                    return '';
                }
            }

            // Append line to terminal output
            function appendLine(text, kind = 'system') {
                const p = document.createElement('p');
                p.className = `terminal-line ${kind}`;
                p.innerHTML = text;
                terminalOutput.appendChild(p);
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
                return p;
            }

            // Boot messages
            const bootMessages = [
                'Initializing portfolio_v3.2...',
                'Loading neural weights...',
                'Fetching projects from memory...',
                'System ready. Welcome, user.'
            ];

            let messageIndex = 0;
            function displayBootMessage() {
                if (messageIndex < bootMessages.length) {
                    const p = document.createElement('p');
                    p.textContent = `> ${bootMessages[messageIndex]}`;
                    p.style.animationDelay = `${messageIndex * 0.5}s`;
                    terminalOutput.appendChild(p);
                    terminalOutput.scrollTop = terminalOutput.scrollHeight;
                    messageIndex++;
                    setTimeout(displayBootMessage, 500);
                } else {
                    terminalInput.disabled = false;
                    terminalInput.focus();
                    convo.booted = true;
                }
            }

            // Basic sanitizer to avoid injecting raw HTML
            function sanitize(str) {
                const s = String(str || '');
                return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
            }

            // Determine API base for local dev vs production
            // If you're serving the frontend with Live Server (127.0.0.1:5500),
            // point requests to the local Express proxy at http://localhost:5173
            const API_BASE = (['127.0.0.1', 'localhost'].includes(window.location.hostname) && window.location.port === '5500')
                ? 'http://localhost:5173'
                : '';

            // Helper to build the correct API endpoint depending on environment
            function apiEndpoint(path) {
                if (API_BASE) return API_BASE + path;
                return path; // same-origin (useful when deployed to Vercel)
            }
            /**
             * Robustly extract readable text from API response objects.
             * Returns a short string or null if nothing found.
             */
           /**
 * Robustly extract readable text from API response objects or JSON strings.
 * - If payload is a JSON string, try to parse it and extract text from parsed object.
 * - Handles shapes like:
 *    { reply: "..." }                 (reply can be plain text or a JSON string)
 *    { text: "..." }
 *    { content: { parts: [{ text: "..." }] } }   (Gemini-like)
 *    { choices: [{ message: { content: { parts: [...] } } }] } (OpenAI-like)
 * - Returns null if no useful readable text found.
 */
            function extractModelText(payload) {
            // small helper to detect JSON-string
            function looksLikeJsonString(s) {
                return typeof s === 'string' && s.trim().length > 0 && /^[\[\{]\s*["'A-Za-z0-9]/.test(s.trim());
            }

            // Try to parse if payload itself is a JSON string
            if (typeof payload === 'string' && looksLikeJsonString(payload)) {
                try {
                const parsed = JSON.parse(payload);
                const inner = extractModelText(parsed);
                if (inner) return inner;
                } catch (e) {
                // not parseable JSON — continue to return the raw string later if nothing else
                }
            }

            // If payload is null/undefined
            if (payload === null || payload === undefined) return null;

            // If payload is a plain string (non-JSON), return it (trimmed)
            if (typeof payload === 'string') {
                const t = payload.trim();
                return t.length ? t : null;
            }

            // If payload.reply exists and is a string that itself contains JSON, parse it
            if (typeof payload.reply === 'string') {
                const candidate = payload.reply.trim();
                if (looksLikeJsonString(candidate)) {
                try {
                    const parsed = JSON.parse(candidate);
                    const inner = extractModelText(parsed);
                    if (inner) return inner;
                } catch (e) {
                    // If we can't parse, continue below and only return the raw string as last resort
                }
                } else if (candidate.length) {
                return candidate; // plain text reply (good)
                }
            }

            // If payload.text is plain text
            if (typeof payload.text === 'string' && payload.text.trim()) {
                return payload.text.trim();
            }

            // Common Gemini-like shape: payload.content.parts[*].text
            try {
                if (payload.content && Array.isArray(payload.content.parts) && payload.content.parts.length) {
                const txt = payload.content.parts.map(p => (typeof p === 'string' ? p : (p?.text || p?.content || ''))).join('\n\n').trim();
                if (txt) return txt;
                }
            } catch (e) { /* ignore */ }

            // OpenAI-like: choices -> message -> content -> parts
            try {
                if (Array.isArray(payload.choices) && payload.choices.length) {
                for (const c of payload.choices) {
                    // choices[].message.content.parts
                    const parts = c?.message?.content?.parts || c?.message?.content || c?.message;
                    if (Array.isArray(parts) && parts.length) {
                    const txt = parts.map(p => (typeof p === 'string' ? p : (p?.text || ''))).join('\n\n').trim();
                    if (txt) return txt;
                    }
                    // choices[].text
                    if (typeof c.text === 'string' && c.text.trim()) return c.text.trim();
                    // choices[].message?.content as string
                    if (typeof c?.message?.content === 'string' && c.message.content.trim()) return c.message.content.trim();
                }
                }
            } catch (e) { /* ignore */ }

            // Some APIs nest under `result`, `data`, `response`
            const altKeys = ['result', 'data', 'response', 'output'];
            for (const k of altKeys) {
                if (payload[k]) {
                const sub = extractModelText(payload[k]);
                if (sub) return sub;
                }
            }

            // Fallback: try to find first reasonably-sized string anywhere (defensive)
            try {
                const seen = new Set();
                function findFirstString(obj) {
                if (!obj || typeof obj === 'number' || typeof obj === 'boolean') return null;
                if (typeof obj === 'string') {
                    const s = obj.trim();
                    return s.length ? s : null;
                }
                if (seen.has(obj)) return null;
                seen.add(obj);
                if (Array.isArray(obj)) {
                    for (const it of obj) {
                    const s = findFirstString(it);
                    if (s) return s;
                    }
                } else if (typeof obj === 'object') {
                    for (const key of Object.keys(obj)) {
                    const s = findFirstString(obj[key]);
                    if (s) return s;
                    }
                }
                return null;
                }
                const found = findFirstString(payload);
                if (found) return found;
            } catch (e) { /* ignore */ }

            // Nothing useful found
            return null;
            }

            // Send message to backend proxy (/api/gemini)
            async function askGemini(userMessage) {
                convo.history.push({ role: 'user', content: userMessage });

                const trimmedHistory = convo.history.slice(-8);
                const profileContext = gatherProfileContext();

                const payload = {
                    model: 'gemini-2.5',
                    prompt: userMessage,
                    context: profileContext,
                    history: trimmedHistory
                };

                const respPlaceholder = appendLine('> Thinking...', 'assistant');
                respPlaceholder.classList.add('typing');

                if (convo.pendingRequest && convo.pendingRequest.controller) {
                    convo.pendingRequest.controller.abort();
                }
                const controller = new AbortController();
                convo.pendingRequest = { controller };

                try {
                    const res = await fetch(apiEndpoint('/api/gemini'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        signal: controller.signal
                    });

                    if (!res.ok) {
                        const txt = await res.text();
                        respPlaceholder.remove();
                        appendLine(`> Error from server: ${res.status} ${sanitize(txt)}`, 'error');
                        return;
                    }

                    const contentType = res.headers.get('content-type') || '';
                    if (contentType.includes('text/event-stream') || contentType.includes('stream')) {
                        const reader = res.body.getReader();
                        const decoder = new TextDecoder();
                        respPlaceholder.innerHTML = '';
                        respPlaceholder.classList.remove('typing');

                        while (true) {
                            const { value, done } = await reader.read();
                            if (done) break;
                            const chunk = decoder.decode(value, { stream: true });
                            respPlaceholder.innerHTML += sanitize(chunk);
                            terminalOutput.scrollTop = terminalOutput.scrollHeight;
                        }
                        } else {
                            // parse JSON safely and extract readable text only
                            let data;
                            try {
                                data = await res.json();
                            } catch (e) {
                                // not JSON — show raw text
                                const txt = await res.text().catch(() => '');
                                respPlaceholder.innerHTML = sanitize(txt || 'No readable response from server.');
                                convo.history.push({ role: 'assistant', content: respPlaceholder.innerText || respPlaceholder.textContent });
                                return;
                            }

                            // Try to extract a human-readable string
                            const extracted = extractModelText(data);
                            if (extracted) {
                                respPlaceholder.innerHTML = sanitize(extracted);
                            } else {
                                // fallback: keep output short and helpful for debugging
                                const small = JSON.stringify(data).slice(0, 800); // keep it small
                                respPlaceholder.innerHTML = sanitize(small + (small.length >= 800 ? '... (truncated)' : ''));
                            }
                        }


                    convo.history.push({ role: 'assistant', content: respPlaceholder.innerText || respPlaceholder.textContent });
                } catch (err) {
                    if (err.name === 'AbortError') {
                        appendLine('> Request aborted.', 'system');
                    } else {
                        appendLine(`> Network or server error: ${sanitize(err.message)}`, 'error');
                    }
                } finally {
                    convo.pendingRequest = null;
                    terminalOutput.scrollTop = terminalOutput.scrollHeight;
                }
            }

            // Local commands fallback
            const localCommands = {
                help: () => {
                    return [
                        'Available commands: help, projects, skills, contact, about, clear, stop',
                        'You can also type any question about the profile (e.g., "Tell me about Athar\'s projects").'
                    ].join('<br>');
                },
                projects: () => {
                    const nodes = Array.from(document.querySelectorAll('#projects .project-card'));
                    if (!nodes.length) return 'No project details found on the page.';
                    return nodes.map(n => n.querySelector('h3')?.innerText || '').join('<br>');
                },
                skills: () => {
                    return gatherProfileContext().split('\n').find(l => l.startsWith('Skills')) || 'Skills info not found.';
                },
                contact: () => {
                    return 'Email: <a href="mailto:sayedathar242@gmail.com">sayedathar242@gmail.com</a>';
                },
                about: () => {
                    return document.querySelector('#about .about-text')?.innerText || 'About section not found.';
                },
                clear: () => {
                    terminalOutput.innerHTML = '';
                    return 'Terminal cleared.';
                },
                stop: () => {
                    if (convo.pendingRequest && convo.pendingRequest.controller) {
                        convo.pendingRequest.controller.abort();
                        return 'Stopping current request...';
                    }
                    return 'No request in progress.';
                }
            };

            terminalInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !terminalInput.disabled) {
                    const input = terminalInput.value.trim();
                    if (!input) return;
                    terminalInput.value = '';
                    appendLine(`> ${sanitize(input)}`, 'user');

                    const key = input.toLowerCase();
                    if (Object.prototype.hasOwnProperty.call(localCommands, key)) {
                        const out = localCommands[key]();
                        appendLine(out, 'system');
                        return;
                    }

                    askGemini(input);
                }
            });

            function toggleTerminal() {
                terminal.classList.toggle('active');
                if (terminal.classList.contains('active')) {
                    if (!convo.booted) {
                        displayBootMessage();
                    } else {
                        terminalInput.focus();
                    }
                } else {
                    terminalInput.blur();
                }
            }

            terminalToggle.addEventListener('click', toggleTerminal);
            if (closeBtn) closeBtn.addEventListener('click', toggleTerminal);
        }

        initAITerminal();
    const heroSection = document.querySelector('.hero');
    const animatedWords = document.querySelectorAll('.animate-word');

    if (heroSection && animatedWords.length > 0) {
        const triggerHeroAnimation = () => {
            animatedWords.forEach(word => {
                word.style.animation = 'none';
                word.offsetHeight; // Trigger reflow
                word.style.animation = null; // Re-apply original animation
            });
        };

        const heroObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    triggerHeroAnimation();
                    heroObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        heroObserver.observe(heroSection);
    }

        // Toggle terminal
        function toggleTerminal() {
            terminal.classList.toggle('active');
            if (terminal.classList.contains('active')) {
                if (terminalOutput.innerHTML === '') { // Start boot only if not already booted
                    displayBootMessage();
                }
                terminalInput.focus();
            }
        }

        terminalToggle.addEventListener('click', toggleTerminal);
        closeBtn.addEventListener('click', toggleTerminal);
    }

    initAITerminal();
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
// ---------- Blog fetch & render (Medium RSS) ----------
(async function initMediumBlogSection(){
  const BLOG_USERNAME = 'YOUR_MEDIUM_USERNAME'; // <-- set this to your Medium username (no @)
  const MAX_POSTS = 6;
  const blogGrid = document.getElementById('blog-grid');
  const fallback = document.getElementById('blog-fallback');

  if (!blogGrid) return;

  // Helpers
  function createCard({title, link, pubDate, excerpt, thumbnail}) {
    const a = document.createElement('a');
    a.href = link;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'blog-card-link';

    const card = document.createElement('article');
    card.className = 'blog-card';

    if (thumbnail) {
      const img = document.createElement('img');
      img.src = thumbnail;
      img.alt = title;
      img.className = 'blog-thumb';
      card.appendChild(img);
    }

    const titleEl = document.createElement('div');
    titleEl.className = 'title';
    titleEl.textContent = title;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = new Date(pubDate).toLocaleDateString();

    const excerptEl = document.createElement('p');
    excerptEl.className = 'excerpt';
    excerptEl.innerHTML = excerpt || '';

    card.appendChild(titleEl);
    card.appendChild(meta);
    card.appendChild(excerptEl);

    a.appendChild(card);
    return a;
  }

  // Strategy: try rss2json API (simple); fallback to AllOrigins + parse RSS
  async function fetchViaRss2Json(rssUrl) {
    // rss2json public endpoint - note: rate limits may apply for heavy usage
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('rss2json failed');
    return res.json();
  }

  async function fetchViaAllOrigins(rssUrl) {
    const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('allorigins failed');
    const text = await res.text();
    // parse XML
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'application/xml');
    return xml;
  }

  try {
    const rssUrl = `https://medium.com/feed/@${BLOG_USERNAME}`; // Medium RSS
    // Try rss2json first
    let data = await fetchViaRss2Json(rssUrl);

    if (data && data.items) {
      // Render items
      blogGrid.innerHTML = '';
      data.items.slice(0, MAX_POSTS).forEach(item => {
        const thumbnail = item.thumbnail || parseThumbnailFromContent(item.content);
        const card = createCard({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate || item.pubDate,
          excerpt: item.description || stripHtml(item.content).slice(0, 220) + '...',
          thumbnail
        });
        blogGrid.appendChild(card);
      });
      return;
    }
    throw new Error('rss2json returned no items');
  } catch (e) {
    // fallback path: use AllOrigins + parse RSS manually
    try {
      const rssUrl = `https://medium.com/feed/@${BLOG_USERNAME}`;
      const xml = await fetchViaAllOrigins(rssUrl);

      // parse item nodes
      const items = Array.from(xml.querySelectorAll('item')).slice(0, MAX_POSTS);
      if (!items.length) throw new Error('no items parsed');

      blogGrid.innerHTML = '';
      items.forEach(item => {
        const title = item.querySelector('title')?.textContent || 'Untitled';
        const link = item.querySelector('link')?.textContent || '#';
        const pubDate = item.querySelector('pubDate')?.textContent || '';
        // some RSS put content:encoded with HTML
        const contentNode = item.querySelector('content\\:encoded') || item.querySelector('description');
        const content = contentNode ? contentNode.textContent : '';
        const excerpt = stripHtml(content).slice(0, 220) + '...';
        const thumbnail = parseThumbnailFromHtml(content);
        const card = createCard({ title, link, pubDate, excerpt, thumbnail });
        blogGrid.appendChild(card);
      });
      return;
    } catch (err) {
      console.warn('Blog fetch failed:', e, err);
      // show fallback manual links
      if (fallback) fallback.hidden = false;
      return;
    }
  }

  // small helpers
  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || '';
  }

  function parseThumbnailFromHtml(html) {
    try {
      const div = document.createElement('div');
      div.innerHTML = html || '';
      const img = div.querySelector('img');
      return img ? img.src : null;
    } catch (e) { return null; }
  }

  function parseThumbnailFromContent(content) {
    // rss2json sometimes returns `content` with <img> tags
    return parseThumbnailFromHtml(content);
  }
})();

// =============================================
// PARTICLE NETWORK BACKGROUND ANIMATION
// =============================================
function initParticleNetworkAnimation() {
    const canvas = document.getElementById('hero-background-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Define breakpoints for particle behavior
    const MOBILE_BREAKPOINT = 768; // Common breakpoint for mobile vs. desktop

    // Determine particle count and max distance based on screen size
    let particleCount;
    let maxDistance;
    let particleSpeedMultiplier; // New variable for dynamic speed

    const setParticleConfig = () => {
        if (window.innerWidth <= MOBILE_BREAKPOINT) {
            particleCount = 50;   // Reduced for mobile to prevent clutter
            maxDistance = 100;    // Reduced connection distance for mobile
            particleSpeedMultiplier = 0.3; // Slower speed for mobile
        } else {
            particleCount = 150;  // Desktop particle count
            maxDistance = 180;    // Desktop connection distance
            particleSpeedMultiplier = 0.5; // Desktop speed
        }
    };

    // Set canvas dimensions and handle resize
    const setCanvasSize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Re-evaluate particle config on resize
        setParticleConfig(); 

        // Important: Re-initialize particles if count changes significantly or for new distribution
        // Clear existing particles and recreate them with new counts/positions
        particles.length = 0; // Clear the array
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle()); // Re-add particles with new settings
        }
        // Ensure initial positions are correctly set for new particles
        particles.forEach(p => p.resetInitialPosition());
    };

    // Particle properties
    const particles = []; // Initialize as empty, filled by setCanvasSize
    const particleMinRadius = 1.0; 
    const particleMaxRadius = 2.5; 

    // Particle class
    class Particle {
        constructor() {
            this.resetInitialPosition(); // Call this on construction
            this.speedX = (Math.random() - 0.5) * particleSpeedMultiplier; 
            this.speedY = (Math.random() - 0.5) * particleSpeedMultiplier;
            this.opacity = Math.random() * 0.6 + 0.2; 
            this.radius = Math.random() * (particleMaxRadius - particleMinRadius) + particleMinRadius; 
        }

        // Separate method for setting initial position
        resetInitialPosition() {
            this.x = Math.random() * canvas.width; 
            this.y = Math.random() * canvas.height; 
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            // Wrap particles around the screen
            if (this.x < 0) this.x = canvas.width;
            if (this.x > canvas.width) this.x = 0;
            if (this.y < 0) this.y = canvas.height;
            if (this.y > canvas.height) this.y = 0;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.fill();
        }
    }

    // Initial setup for canvas size and particle configuration
    setCanvasSize(); // This will also call setParticleConfig and populate 'particles' array

    // Draw lines between nearby particles
    const drawLines = () => {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const p1 = particles[i];
                const p2 = particles[j];

                const distance = Math.sqrt(
                    (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2
                );

                if (distance < maxDistance) { // Use the dynamically set maxDistance
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    // Line opacity based on distance (fades out as distance increases)
                    ctx.strokeStyle = `rgba(255, 255, 255, ${((maxDistance - distance) / maxDistance) * 0.6})`; 
                    ctx.lineWidth = 1.9; 
                    ctx.stroke();
                }
            }
        }
    };

    // Animation loop
    const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        drawLines();

        animationFrameId = requestAnimationFrame(animate);
    };

    // Handle resize event
    const handleResize = () => {
        cancelAnimationFrame(animationFrameId); // Stop current animation frame
        setCanvasSize(); // This will re-evaluate config and re-initialize particles
        animate(); // Start new animation loop
    };

    animate(); // Start animation

    window.addEventListener('resize', debounce(handleResize, 250)); // Debounce resize more for dynamic particle counts
}