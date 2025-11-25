/**
 * Feedback Injection Service
 * Automatically injects and initializes the feedback system on all pages
 * Ensures feedback modal is available globally across the entire app
 * @version 1.0.0
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
            // Load scripts in order
            await loadScript('/static/assets/js/services/feedback-service.js');
            await loadScript('/static/assets/js/components/feedback-modal.js');
            
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
        // Wait for Bootstrap (required for modal)
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
     * Wait for feedback modal to be initialized
     * @param {number} maxAttempts - Maximum number of attempts
     * @returns {Promise} Resolves when modal is ready
     */
    async function waitForFeedbackModal(maxAttempts = 50) {
        for (let i = 0; i < maxAttempts; i++) {
            if (window.feedbackModal) {
                console.log('✅ Feedback modal initialized');
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.warn('⚠️ Feedback modal not initialized after waiting');
        return false;
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

            // Wait for feedback modal to initialize
            await waitForFeedbackModal();

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

    // Make functions globally available for debugging
    window.feedbackInjectionService = {
        loadScripts: loadFeedbackScripts,
        initialize: initializeFeedbackSystem,
        isLoaded: () => scriptsLoaded,
        isLoading: () => scriptsLoading
    };

    console.log('✅ Feedback Injection Service loaded');
})();