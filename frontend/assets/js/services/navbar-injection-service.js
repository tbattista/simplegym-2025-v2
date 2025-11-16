/**
 * Navbar Injection Service
 * Automatically injects the top navigation bar into pages
 * Works alongside the existing menu injection service
 */

(function() {
    'use strict';

    console.log('📦 Navbar Injection Service loading...');

    /**
     * Page configuration mapping
     * Maps page identifiers to their display titles, icons, and search settings
     */
    const PAGE_CONFIGS = {
        'index.html': {
            title: 'Dashboard',
            icon: 'bx-home',
            showSearch: false
        },
        'workout-mode.html': {
            title: 'Workout Mode',
            icon: 'bx-play-circle',
            showSearch: false
        },
        'workout-builder.html': {
            title: 'Workout Builder',
            icon: 'bx-dumbbell',
            showSearch: false
        },
        'exercise-database.html': {
            title: 'Exercise Database',
            icon: 'bx-book-content',
            showSearch: true,
            searchPlaceholder: 'Search exercises...'
        },
        'workout-database.html': {
            title: 'Workout Database',
            icon: 'bx-library',
            showSearch: true,
            searchPlaceholder: 'Search workouts...'
        },
        'programs.html': {
            title: 'My Programs',
            icon: 'bx-folder',
            showSearch: false
        },
        'public-workouts.html': {
            title: 'Public Workouts',
            icon: 'bx-globe',
            showSearch: false
        },
        
        // Fallback for unknown pages
        'default': {
            title: 'Ghost Gym',
            icon: 'bx-home',
            showSearch: false
        }
    };

    /**
     * Get current page configuration
     * @returns {Object} Page config with title and icon
     */
    function getCurrentPageConfig() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';
        
        // Check if we have a specific config for this page
        if (PAGE_CONFIGS[filename]) {
            return PAGE_CONFIGS[filename];
        }
        
        // Check for partial matches (e.g., exercise-database-refactored.html)
        for (const [key, config] of Object.entries(PAGE_CONFIGS)) {
            if (filename.includes(key.replace('.html', ''))) {
                return config;
            }
        }
        
        // Return default config
        return PAGE_CONFIGS.default;
    }

    /**
     * Inject navbar into the page
     * Finds the navbar container and injects the HTML
     */
    function injectNavbar() {
        console.log('🔧 Injecting navbar...');

        // Check if navbar template function is available
        if (typeof window.getNavbarHTML !== 'function') {
            console.error('❌ getNavbarHTML function not found. Make sure navbar-template.js is loaded first.');
            return false;
        }

        // Find the navbar container
        // The navbar should be injected right after .layout-page opens
        const layoutPage = document.querySelector('.layout-page');
        if (!layoutPage) {
            console.error('❌ .layout-page element not found');
            return false;
        }

        // Check if navbar already exists
        if (document.getElementById('layout-navbar')) {
            console.log('ℹ️ Navbar already exists, skipping injection');
            return true;
        }

        // Get page configuration
        const pageConfig = getCurrentPageConfig();
        console.log('📄 Page config:', pageConfig);

        // Generate navbar HTML with search options
        const navbarHTML = window.getNavbarHTML(pageConfig.title, pageConfig.icon, {
            showSearch: pageConfig.showSearch || false,
            searchPlaceholder: pageConfig.searchPlaceholder || 'Search...'
        });

        // Create a temporary container to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = navbarHTML.trim();
        const navbarElement = tempDiv.firstChild;

        // Insert navbar as the first child of layout-page
        layoutPage.insertBefore(navbarElement, layoutPage.firstChild);

        console.log('✅ Navbar injected successfully');
        return true;
    }

    /**
     * Initialize navbar functionality
     * Sets up theme toggle, auth UI, and other interactive features
     */
    function initializeNavbar() {
        console.log('🎬 Initializing navbar functionality...');

        // Wait a bit for other services to be ready
        setTimeout(() => {
            // Initialize theme toggle
            if (typeof window.initializeNavbarThemeToggle === 'function') {
                window.initializeNavbarThemeToggle();
            } else {
                console.warn('⚠️ initializeNavbarThemeToggle not available');
            }

            // Initialize auth UI
            if (typeof window.initializeNavbarAuth === 'function') {
                window.initializeNavbarAuth();
            } else {
                console.warn('⚠️ initializeNavbarAuth not available');
            }

            // Initialize search if enabled on this page
            if (typeof window.initializeNavbarSearch === 'function') {
                window.initializeNavbarSearch();
            } else {
                console.warn('⚠️ initializeNavbarSearch not available');
            }

            console.log('✅ Navbar functionality initialized');
        }, 100);
    }

    /**
     * Main initialization function
     * Called when DOM is ready
     */
    function init() {
        console.log('🚀 Navbar Injection Service initializing...');

        // Inject the navbar
        const injected = injectNavbar();

        if (injected) {
            // Initialize navbar functionality
            initializeNavbar();
        } else {
            console.error('❌ Failed to inject navbar');
        }
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM is already ready
        init();
    }

    // Make functions globally available for debugging
    window.navbarInjectionService = {
        inject: injectNavbar,
        initialize: initializeNavbar,
        getPageConfig: getCurrentPageConfig
    };

    console.log('✅ Navbar Injection Service loaded');
})();