/**
 * Bottom Action Bar Service
 * Automatically injects and manages the bottom action bar on pages
 * Follows the same pattern as navbar-injection-service.js and menu-injection-service.js
 */

(function() {
    'use strict';

    console.log('📦 Bottom Action Bar Service loading...');

    /**
     * Bottom Action Bar Service Class
     */
    class BottomActionBarService {
        constructor() {
            this.config = null;
            this.container = null;
            this.pageId = null;
        }

        /**
         * Initialize the service with a page configuration
         * @param {string} pageId - The page identifier (e.g., 'workout-database')
         */
        init(pageId) {
            console.log('🔧 Initializing Bottom Action Bar for page:', pageId);

            // Store page ID
            this.pageId = pageId;

            // Get configuration for this page
            if (!window.BOTTOM_BAR_CONFIGS || !window.BOTTOM_BAR_CONFIGS[pageId]) {
                console.warn('⚠️ No configuration found for page:', pageId);
                return false;
            }

            this.config = window.BOTTOM_BAR_CONFIGS[pageId];

            // Render the bottom action bar
            this.render();

            // Attach event listeners
            this.attachEventListeners();

            console.log('✅ Bottom Action Bar initialized');
            return true;
        }

        /**
         * Render the bottom action bar HTML
         */
        render() {
            // Check if bar already exists
            if (document.getElementById('bottomActionBar')) {
                console.log('ℹ️ Bottom Action Bar already exists, skipping render');
                return;
            }

            // Create container
            const container = document.createElement('div');
            container.id = 'bottomActionBar';
            container.className = 'bottom-action-bar';

            // Build HTML structure
            container.innerHTML = `
                <div class="action-bar-container">
                    <!-- Left Actions -->
                    <div class="action-group action-group-left">
                        ${this.renderActionButtons(this.config.leftActions, 'left')}
                    </div>
                    
                    <!-- Center FAB -->
                    ${this.renderFAB(this.config.fab)}
                    
                    <!-- Right Actions -->
                    <div class="action-group action-group-right">
                        ${this.renderActionButtons(this.config.rightActions, 'right')}
                    </div>
                </div>
            `;

            // Append to body
            document.body.appendChild(container);
            this.container = container;

            console.log('✅ Bottom Action Bar rendered');
        }

        /**
         * Render action buttons
         * @param {Array} actions - Array of action button configurations
         * @param {string} side - 'left' or 'right'
         * @returns {string} HTML string
         */
        renderActionButtons(actions, side) {
            if (!actions || actions.length === 0) {
                return '';
            }

            return actions.map((action, index) => `
                <button class="action-btn" 
                        data-action="${side}-${index}"
                        title="${action.title || action.label}">
                    <i class="bx ${action.icon}"></i>
                    <span class="action-btn-label">${action.label}</span>
                </button>
            `).join('');
        }

        /**
         * Render the FAB (Floating Action Button)
         * @param {Object} fab - FAB configuration
         * @returns {string} HTML string
         */
        renderFAB(fab) {
            if (!fab) {
                return '';
            }

            const variant = fab.variant || 'primary';
            return `
                <button class="action-fab ${variant}" 
                        data-action="fab"
                        title="${fab.title}">
                    <i class="bx ${fab.icon}"></i>
                </button>
            `;
        }

        /**
         * Attach event listeners to all buttons
         */
        attachEventListeners() {
            if (!this.container) {
                console.warn('⚠️ Container not found, cannot attach listeners');
                return;
            }

            // Get all buttons
            const buttons = this.container.querySelectorAll('[data-action]');

            buttons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleButtonClick(button.dataset.action);
                });
            });

            console.log('✅ Event listeners attached to', buttons.length, 'buttons');
        }

        /**
         * Handle button click
         * @param {string} actionKey - The action key (e.g., 'left-0', 'fab', 'right-1')
         */
        handleButtonClick(actionKey) {
            console.log('🖱️ Button clicked:', actionKey);

            let action = null;

            if (actionKey === 'fab') {
                action = this.config.fab?.action;
            } else if (actionKey.startsWith('left-')) {
                const index = parseInt(actionKey.split('-')[1]);
                action = this.config.leftActions[index]?.action;
            } else if (actionKey.startsWith('right-')) {
                const index = parseInt(actionKey.split('-')[1]);
                action = this.config.rightActions[index]?.action;
            }

            if (action && typeof action === 'function') {
                try {
                    action();
                } catch (error) {
                    console.error('❌ Error executing action:', error);
                }
            } else {
                console.warn('⚠️ No action found for:', actionKey);
            }
        }

        /**
         * Update a specific button
         * @param {string} buttonId - Button identifier
         * @param {Object} config - New button configuration
         */
        updateButton(buttonId, config) {
            if (!this.container) return;

            const button = this.container.querySelector(`[data-action="${buttonId}"]`);
            if (!button) {
                console.warn('⚠️ Button not found:', buttonId);
                return;
            }

            // Update icon
            if (config.icon) {
                const icon = button.querySelector('i');
                if (icon) {
                    icon.className = `bx ${config.icon}`;
                }
            }

            // Update label
            if (config.label) {
                const label = button.querySelector('.action-btn-label');
                if (label) {
                    label.textContent = config.label;
                }
            }

            // Update title
            if (config.title) {
                button.title = config.title;
            }

            // Update variant (for FAB)
            if (config.variant && buttonId === 'fab') {
                button.className = `action-fab ${config.variant}`;
            }

            console.log('✅ Button updated:', buttonId);
        }

        /**
         * Update FAB for workout mode state changes
         * @param {boolean} isActive - Whether workout is active
         */
        updateWorkoutModeState(isActive) {
            if (this.pageId !== 'workout-mode') return;

            if (isActive) {
                // Switch to "Complete" state
                this.updateButton('fab', {
                    icon: 'bx-check',
                    title: 'Complete current set',
                    variant: 'success'
                });
                
                // Update config to use active state actions
                this.config = window.BOTTOM_BAR_CONFIGS['workout-mode-active'];
                this.attachEventListeners();
            } else {
                // Switch to "Start" state
                this.updateButton('fab', {
                    icon: 'bx-play',
                    title: 'Start workout',
                    variant: 'success'
                });
                
                // Update config to use inactive state actions
                this.config = window.BOTTOM_BAR_CONFIGS['workout-mode'];
                this.attachEventListeners();
            }

            console.log('✅ Workout mode state updated:', isActive ? 'active' : 'inactive');
        }

        /**
         * Show the bottom action bar
         */
        show() {
            if (this.container) {
                this.container.classList.remove('hidden');
            }
        }

        /**
         * Hide the bottom action bar
         */
        hide() {
            if (this.container) {
                this.container.classList.add('hidden');
            }
        }

        /**
         * Destroy the bottom action bar
         */
        destroy() {
            if (this.container) {
                this.container.remove();
                this.container = null;
                this.config = null;
                console.log('✅ Bottom Action Bar destroyed');
            }
        }
    }

    /**
     * Get page ID from current URL
     * @returns {string|null} Page identifier
     */
    function getPageIdFromURL() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';

        // Map filenames to page identifiers
        if (filename.includes('workout-database')) return 'workout-database';
        if (filename.includes('workout-builder')) return 'workout-builder';
        if (filename.includes('exercise-database')) return 'exercise-database';
        if (filename.includes('workout-mode')) return 'workout-mode';

        return null;
    }

    /**
     * Auto-initialize the service when DOM is ready
     */
    function autoInit() {
        console.log('🚀 Bottom Action Bar Service auto-initializing...');

        // Check if configurations are loaded
        if (!window.BOTTOM_BAR_CONFIGS) {
            console.error('❌ BOTTOM_BAR_CONFIGS not found. Make sure bottom-action-bar-config.js is loaded first.');
            return;
        }

        // Get page ID
        const pageId = getPageIdFromURL();
        if (!pageId) {
            console.log('ℹ️ No bottom action bar configuration for this page');
            return;
        }

        // Check if configuration exists for this page
        if (!window.BOTTOM_BAR_CONFIGS[pageId]) {
            console.log('ℹ️ No configuration found for page:', pageId);
            return;
        }

        // Create and initialize service
        const service = new BottomActionBarService();
        const initialized = service.init(pageId);

        if (initialized) {
            // Make service globally available
            window.bottomActionBar = service;
            
            // Dispatch event for other scripts
            window.dispatchEvent(new CustomEvent('bottomActionBarReady', {
                detail: { service, pageId }
            }));
        }
    }

    /**
     * Initialize when DOM is ready
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        // DOM is already ready
        autoInit();
    }

    // Make service class globally available for manual initialization
    window.BottomActionBarService = BottomActionBarService;

    console.log('✅ Bottom Action Bar Service loaded');
})();