/**
 * Feedback Injection Service
 * Automatically injects and initializes the feedback system on all pages
 * Ensures feedback offcanvas is available globally across the entire app
 * @version 2.0.0 - Updated for offcanvas-based feedback panel
 */

(function() {
    'use strict';

    console.log('📦 Feedback Injection Service loading...');

    // Track loading state
    let scriptsLoaded = false;
    let scriptsLoading = false;

    /**
     * Load a script dynamically
     * @param {string} src - Script source URL
     * @returns {Promise} Resolves when script is loaded
     */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if script already exists
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                console.log(`ℹ️ Script already loaded: ${src}`);
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = false; // Maintain order

            script.onload = () => {
                console.log(`✅ Loaded: ${src}`);
                resolve();
            };

            script.onerror = () => {
                console.error(`❌ Failed to load: ${src}`);
                reject(new Error(`Failed to load script: ${src}`));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Load CSS file dynamically
     * @param {string} href - CSS file URL
     */
    function loadCSS(href) {
        // Check if already loaded
        const existingLink = document.querySelector(`link[href="${href}"]`);
        if (existingLink) {
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
        console.log(`✅ Loaded CSS: ${href}`);
    }

    /**
     * Load all feedback scripts in correct order
     * @returns {Promise} Resolves when all scripts are loaded
     */
    async function loadFeedbackScripts() {
        if (scriptsLoaded) {
            console.log('ℹ️ Feedback scripts already loaded');
            return;
        }

        if (scriptsLoading) {
            console.log('ℹ️ Feedback scripts already loading, waiting...');
            // Wait for loading to complete
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (scriptsLoaded) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }

        scriptsLoading = true;
        console.log('📥 Loading feedback scripts...');

        try {
            // Load CSS for feedback offcanvas
            loadCSS('/static/assets/css/components/feedback-offcanvas.css?v=20260117');

            // Load scripts in order (with cache-busting version)
            // feedback-service handles form submission, drafts, validation
            await loadScript('/static/assets/js/services/feedback-service.js?v=20260117');
            // feedback-voting-service handles loading and voting on feedback
            await loadScript('/static/assets/js/services/feedback-voting-service.js?v=20260117');
            // Standalone feedback offcanvas (works without ES modules)
            await loadScript('/static/assets/js/components/feedback-offcanvas-standalone.js?v=20260117');

            scriptsLoaded = true;
            scriptsLoading = false;
            console.log('✅ All feedback scripts loaded');
        } catch (error) {
            scriptsLoading = false;
            console.error('❌ Error loading feedback scripts:', error);
            throw error;
        }
    }

    /**
     * Wait for dependencies to be ready
     * @returns {Promise} Resolves when dependencies are ready
     */
    async function waitForDependencies() {
        // Wait for Bootstrap (required for offcanvas)
        if (typeof bootstrap === 'undefined') {
            console.log('⏳ Waiting for Bootstrap...');
            await new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (typeof bootstrap !== 'undefined') {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 50);
            });
        }

        // Wait for Firebase (optional but recommended)
        if (!window.firebaseReady) {
            console.log('⏳ Waiting for Firebase...');
            await new Promise((resolve) => {
                if (window.firebaseReady) {
                    resolve();
                } else {
                    window.addEventListener('firebaseReady', resolve, { once: true });
                }
            });
        }

        console.log('✅ Dependencies ready');
    }

    /**
     * Wait for feedback offcanvas function to be available
     * @param {number} maxAttempts - Maximum number of attempts
     * @returns {Promise<boolean>} Resolves when ready
     */
    async function waitForFeedbackOffcanvas(maxAttempts = 50) {
        for (let i = 0; i < maxAttempts; i++) {
            // Check for standalone version first, then factory
            if (window.createFeedbackOffcanvas || window.UnifiedOffcanvasFactory?.createFeedbackOffcanvas) {
                console.log('✅ Feedback offcanvas ready');
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.warn('⚠️ Feedback offcanvas not available after waiting');
        return false;
    }

    /**
     * Open the feedback offcanvas
     * @param {Object} options - Options
     * @param {string} options.tab - 'vote' or 'submit' (default: 'vote')
     * @param {string} options.type - Preset type filter ('feature', 'bug', 'general')
     */
    function openFeedbackOffcanvas(options = {}) {
        const { tab = 'vote', type = 'feature' } = options;

        // Try standalone version first
        if (window.createFeedbackOffcanvas) {
            window.createFeedbackOffcanvas({
                defaultTab: tab,
                presetType: type
            });
            return;
        }

        // Fallback to factory
        if (window.UnifiedOffcanvasFactory?.createFeedbackOffcanvas) {
            window.UnifiedOffcanvasFactory.createFeedbackOffcanvas({
                defaultTab: tab,
                presetType: type
            });
            return;
        }

        console.error('❌ Feedback offcanvas not available');
    }

    /**
     * Setup keyboard shortcut for feedback
     */
    function setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + F to open feedback
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                openFeedbackOffcanvas();
            }
        });
        console.log('✅ Feedback keyboard shortcut registered (Ctrl/Cmd + Shift + F)');
    }

    /**
     * Setup click handler for navbar feedback button
     */
    function setupNavbarButton() {
        const feedbackBtn = document.getElementById('navbarFeedbackBtn');
        if (!feedbackBtn) {
            // Button may not exist yet, try again later
            setTimeout(setupNavbarButton, 500);
            return;
        }

        // Remove existing dropdown behavior if present
        feedbackBtn.removeAttribute('data-bs-toggle');
        feedbackBtn.removeAttribute('data-bs-auto-close');
        feedbackBtn.removeAttribute('aria-expanded');

        // Add click handler for offcanvas
        feedbackBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openFeedbackOffcanvas();
        });

        console.log('✅ Navbar feedback button configured');
    }

    /**
     * Initialize the feedback system
     */
    async function initializeFeedbackSystem() {
        try {
            console.log('🚀 Initializing feedback system...');

            // Wait for dependencies
            await waitForDependencies();

            // Load feedback scripts
            await loadFeedbackScripts();

            // Wait for feedback offcanvas to be available
            await waitForFeedbackOffcanvas();

            // Setup keyboard shortcut
            setupKeyboardShortcut();

            // Setup navbar button
            setupNavbarButton();

            console.log('✅ Feedback system initialized and ready');

            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('feedbackSystemReady'));

        } catch (error) {
            console.error('❌ Failed to initialize feedback system:', error);
        }
    }

    /**
     * Main initialization function
     */
    function init() {
        console.log('🎬 Feedback Injection Service initializing...');

        // Start initialization after a short delay to let other services load
        setTimeout(() => {
            initializeFeedbackSystem();
        }, 200);
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM is already ready
        init();
    }

    // Make functions globally available
    window.openFeedbackOffcanvas = openFeedbackOffcanvas;

    window.feedbackInjectionService = {
        loadScripts: loadFeedbackScripts,
        initialize: initializeFeedbackSystem,
        openFeedbackOffcanvas: openFeedbackOffcanvas,
        isLoaded: () => scriptsLoaded,
        isLoading: () => scriptsLoading
    };

    console.log('✅ Feedback Injection Service loaded');
})();
