/**
 * Theme Manager Service
 * Centralized theme management for Ghost Gym V0.4.1
 * 
 * Supports 3 theme modes:
 * - 'auto': Follow system preference (prefers-color-scheme)
 * - 'dark': Force dark mode
 * - 'light': Force light mode
 * 
 * Usage:
 *   window.themeManager.setPreference('dark');
 *   window.themeManager.getActiveTheme(); // Returns 'dark' or 'light'
 * 
 * Events:
 *   'themeChanged' - Fired when theme changes
 */

(function() {
    'use strict';

    class ThemeManager {
        constructor() {
            this.preference = 'auto'; // 'auto', 'dark', 'light'
            this.systemPreference = 'light';
            this.mediaQuery = null;
            this.storageKey = 'ghost-gym-theme-preference';
        }

        /**
         * Initialize the theme manager
         * Call this as early as possible to prevent flash
         */
        init() {
            console.log('🎨 Initializing Theme Manager...');

            // Set up system preference detection
            this.setupSystemPreferenceDetection();

            // Load saved preference
            this.loadPreference();

            // Apply initial theme
            this.applyTheme();

            console.log('✅ Theme Manager initialized:', {
                preference: this.preference,
                activeTheme: this.getActiveTheme(),
                systemPreference: this.systemPreference
            });
        }

        /**
         * Set up system preference detection using media query
         */
        setupSystemPreferenceDetection() {
            // Check if browser supports prefers-color-scheme
            if (!window.matchMedia) {
                console.warn('⚠️ Browser does not support prefers-color-scheme');
                return;
            }

            // Create media query for dark mode
            this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

            // Get initial system preference
            this.systemPreference = this.mediaQuery.matches ? 'dark' : 'light';

            // Listen for system preference changes
            const handleChange = (e) => {
                this.systemPreference = e.matches ? 'dark' : 'light';
                console.log('🔄 System preference changed to:', this.systemPreference);

                // If in auto mode, apply the new system preference
                if (this.preference === 'auto') {
                    this.applyTheme();
                }
            };

            // Use addEventListener if available, otherwise use deprecated addListener
            if (this.mediaQuery.addEventListener) {
                this.mediaQuery.addEventListener('change', handleChange);
            } else {
                this.mediaQuery.addListener(handleChange);
            }
        }

        /**
         * Load theme preference from storage
         */
        loadPreference() {
            try {
                const saved = localStorage.getItem(this.storageKey);
                if (saved && ['auto', 'dark', 'light'].includes(saved)) {
                    this.preference = saved;
                    console.log('📂 Loaded theme preference from localStorage:', saved);
                } else {
                    console.log('📂 No saved preference, using default: auto');
                }
            } catch (error) {
                console.error('❌ Failed to load theme preference:', error);
            }
        }

        /**
         * Save theme preference to storage
         */
        savePreference() {
            try {
                localStorage.setItem(this.storageKey, this.preference);
                console.log('💾 Saved theme preference to localStorage:', this.preference);

                // TODO: Sync to Firebase if user is authenticated
                // This will be implemented in Phase 5
                if (window.dataManager?.isAuthenticated) {
                    this.syncToFirebase().catch(err => {
                        console.warn('⚠️ Failed to sync theme to Firebase:', err);
                    });
                }
            } catch (error) {
                console.error('❌ Failed to save theme preference:', error);
            }
        }

        /**
         * Sync theme preference to Firebase (optional)
         * Implemented in Phase 5
         */
        async syncToFirebase() {
            if (!window.dataManager?.saveThemePreference) {
                return; // Method not implemented yet
            }

            try {
                await window.dataManager.saveThemePreference(this.preference);
                console.log('☁️ Synced theme to Firebase:', this.preference);
            } catch (error) {
                throw error;
            }
        }

        /**
         * Get current theme preference ('auto', 'dark', 'light')
         */
        getPreference() {
            return this.preference;
        }

        /**
         * Get active theme ('dark' or 'light')
         * This resolves 'auto' to actual theme based on system preference
         */
        getActiveTheme() {
            if (this.preference === 'auto') {
                return this.systemPreference;
            }
            return this.preference;
        }

        /**
         * Set theme preference
         * @param {string} preference - 'auto', 'dark', or 'light'
         */
        setPreference(preference) {
            if (!['auto', 'dark', 'light'].includes(preference)) {
                console.error('❌ Invalid theme preference:', preference);
                return;
            }

            console.log('🎨 Setting theme preference to:', preference);
            this.preference = preference;
            this.savePreference();
            this.applyTheme();
        }

        /**
         * Apply the current theme to the document
         */
        applyTheme() {
            const activeTheme = this.getActiveTheme();
            const html = document.documentElement;

            // Set data-bs-theme attribute for Bootstrap
            html.setAttribute('data-bs-theme', activeTheme);

            // Also set a class for any legacy CSS that might need it
            if (activeTheme === 'dark') {
                html.classList.add('dark-mode');
                html.classList.remove('light-mode');
            } else {
                html.classList.add('light-mode');
                html.classList.remove('dark-mode');
            }

            console.log('✨ Applied theme:', activeTheme);

            // Dispatch custom event for components that need to react to theme changes
            this.dispatchThemeChangedEvent(activeTheme);
        }

        /**
         * Dispatch theme changed event
         */
        dispatchThemeChangedEvent(activeTheme) {
            const event = new CustomEvent('themeChanged', {
                detail: {
                    theme: activeTheme,
                    preference: this.preference,
                    systemPreference: this.systemPreference
                }
            });
            window.dispatchEvent(event);
        }

        /**
         * Toggle between dark and light mode
         * (Does not use auto mode)
         */
        toggle() {
            const currentTheme = this.getActiveTheme();
            const newPreference = currentTheme === 'dark' ? 'light' : 'dark';
            this.setPreference(newPreference);
        }
    }

    // Create global instance
    window.themeManager = new ThemeManager();

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.themeManager.init();
        });
    } else {
        // DOM already loaded, initialize immediately
        window.themeManager.init();
    }

    // Also initialize immediately to prevent flash
    // This runs before DOMContentLoaded for early theme application
    window.themeManager.init();

})();