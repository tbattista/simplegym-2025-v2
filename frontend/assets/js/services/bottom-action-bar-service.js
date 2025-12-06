/**
 * Bottom Action Bar Service
 * Automatically injects and manages the bottom action bar on pages
 * Supports both 2-FAB-2 layout (legacy) and 4-button + right FAB layout (alternative)
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
            this.isNewLayout = false;
            this.lastScrollTop = 0;
            this.scrollTimeout = null;
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

            // Detect layout type
            this.isNewLayout = this.config.buttons !== undefined;
            console.log('📐 Layout type:', this.isNewLayout ? 'Alternative (4-button + right FAB)' : 'Legacy (2-FAB-2)');

            // Render the bottom action bar
            this.render();

            // Attach event listeners
            this.attachEventListeners();

            // Enable auto-hide on scroll for new layout
            if (this.isNewLayout) {
                this.enableAutoHide();
            }

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

            // Build HTML structure based on layout type
            if (this.isNewLayout) {
                // New 4-button layout (no FAB inside)
                container.innerHTML = `
                    <div class="action-bar-container">
                        <!-- 4 Buttons Row -->
                        <div class="action-buttons-row">
                            ${this.renderButtons(this.config.buttons)}
                        </div>
                        
                        <!-- Optional Secondary FAB -->
                        ${this.renderSecondaryFAB(this.config.secondaryFab)}
                    </div>
                `;
            } else {
                // Legacy 2-FAB-2 layout
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
            }

            // Append to body
            document.body.appendChild(container);
            this.container = container;

            // Render floating FAB (new layout only)
            if (this.isNewLayout && this.config.fab) {
                if (this.config.fab.icon === 'bx-search') {
                    // Render search FAB with morphing functionality
                    this.renderFloatingSearchFAB(this.config.fab);
                    
                    // Attach event listener to floating FAB after a short delay
                    setTimeout(() => {
                        const floatingFab = document.getElementById('searchFab');
                        if (floatingFab) {
                            floatingFab.addEventListener('click', (e) => {
                                // Only handle clicks on the FAB itself when collapsed
                                // When expanded, let clicks pass through to child elements
                                const searchInput = document.getElementById('searchFabInput');
                                const searchClose = document.getElementById('searchFabClose');
                                
                                // Don't handle if clicking on input or close button
                                if (e.target === searchInput || searchInput.contains(e.target) ||
                                    e.target === searchClose || searchClose.contains(e.target)) {
                                    console.log('🔍 Click on child element, ignoring');
                                    return;
                                }
                                
                                // Only trigger action if FAB is collapsed
                                if (!floatingFab.classList.contains('expanded')) {
                                    this.handleButtonClick('fab');
                                }
                            });
                            console.log('✅ Floating search FAB event listener attached');
                        }
                    }, 100);
                } else {
                    // Render regular floating FAB (for workout mode, etc.)
                    this.renderFloatingFAB(this.config.fab);
                }
            }
            
            // Render floating timer+end combo for active workout mode
            if (this.isNewLayout && this.pageId === 'workout-mode' && this.config.floatingCombo) {
                this.renderFloatingTimerEndCombo();
            }
            
            // Also initialize global rest timer for non-active workout mode (so it's available when cards expand)
            if (this.pageId === 'workout-mode') {
                setTimeout(() => {
                    this.initializeGlobalRestTimer();
                }, 100);
            }

            console.log('✅ Bottom Action Bar rendered');
        }

        /**
         * Render floating search FAB above the action bar
         * @param {Object} fab - FAB configuration
         */
        renderFloatingSearchFAB(fab) {
            // Check if FAB already exists
            if (document.getElementById('searchFab')) {
                console.log('ℹ️ Floating search FAB already exists');
                return;
            }

            const fabHTML = `
                <div class="search-fab floating-search-fab"
                        id="searchFab"
                        data-action="fab"
                        title="${fab.title}"
                        role="button"
                        tabindex="0">
                    <!-- FAB Icon (visible when collapsed) -->
                    <i class="bx ${fab.icon} search-fab-icon"></i>
                    
                    <!-- Expanded State Content -->
                    <i class="bx bx-search search-icon-expanded"></i>
                    <input
                        type="search"
                        class="search-fab-input"
                        id="searchFabInput"
                        placeholder="Search..."
                        inputmode="search"
                        autocomplete="off"
                        autocapitalize="off"
                        spellcheck="false"
                        enterkeyhint="search"
                        aria-label="Search"
                    />
                    <button class="search-fab-close" id="searchFabClose" type="button" tabindex="-1">
                        <i class="bx bx-x"></i>
                        <span>Clear</span>
                    </button>
                </div>
            `;

            // Append to the action bar container so it moves with the bar
            this.container.insertAdjacentHTML('beforeend', fabHTML);
            
            console.log('✅ Floating search FAB rendered');
        }

        /**
         * Render floating FAB above the action bar (for workout mode, etc.)
         * @param {Object} fab - FAB configuration
         */
        renderFloatingFAB(fab) {
            // Check if FAB already exists
            if (document.getElementById('floatingFab')) {
                console.log('ℹ️ Floating FAB already exists');
                return;
            }

            const variant = fab.variant || 'primary';
            const label = fab.label || '';
            
            const fabHTML = `
                <button class="action-fab floating-action-fab ${variant}"
                        id="floatingFab"
                        data-action="fab"
                        title="${fab.title}"
                        aria-label="${fab.title}">
                    <i class="bx ${fab.icon}"></i>
                    ${label ? `<span class="fab-label">${label}</span>` : ''}
                </button>
            `;

            // Append to the action bar container so it moves with the bar
            this.container.insertAdjacentHTML('beforeend', fabHTML);
            
            console.log('✅ Floating FAB rendered');
        }

        /**
         * Render floating timer + end button combo (for active workout mode)
         */
        renderFloatingTimerEndCombo() {
            // Check if combo already exists
            if (document.getElementById('floatingTimerEndCombo')) {
                console.log('ℹ️ Floating timer+end combo already exists');
                return;
            }

            const comboHTML = `
                <div class="floating-timer-end-combo" id="floatingTimerEndCombo">
                    <!-- Global Rest Timer (now as flex item) -->
                    <div class="global-rest-timer-button" id="globalRestTimerButton"></div>
                    
                    <!-- Timer Display -->
                    <div class="floating-timer-display" id="floatingTimerDisplay">
                        <i class="bx bx-time-five"></i>
                        <span id="floatingTimer">00:00</span>
                    </div>
                    
                    <!-- End Button -->
                    <button class="floating-end-button"
                            id="floatingEndButton"
                            data-action="end-workout"
                            title="End workout session"
                            aria-label="End workout session">
                        <i class="bx bx-stop-circle"></i>
                        <span>End</span>
                    </button>
                </div>
            `;

            // Append to the action bar container so it moves with the bar
            this.container.insertAdjacentHTML('beforeend', comboHTML);
            
            // Attach event listener to End button
            const endButton = document.getElementById('floatingEndButton');
            if (endButton) {
                endButton.addEventListener('click', () => {
                    this.handleButtonClick('end-workout');
                });
            }
            
            // Initialize global rest timer if class is available
            this.initializeGlobalRestTimer();
            
            console.log('✅ Floating timer+end combo rendered');
        }
        
        /**
         * Initialize global rest timer (extracted for reuse)
         */
        initializeGlobalRestTimer() {
            if (window.GlobalRestTimer && !window.globalRestTimer) {
                window.globalRestTimer = new GlobalRestTimer();
                window.globalRestTimer.initialize();
                console.log('✅ Global rest timer initialized');
            } else if (window.globalRestTimer) {
                console.log('ℹ️ Global rest timer already exists');
            } else {
                console.warn('⚠️ GlobalRestTimer class not available');
            }
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
         * Render buttons for new 4-button layout
         * @param {Array} buttons - Array of button configurations
         * @returns {string} HTML string
         */
        renderButtons(buttons) {
            if (!buttons || buttons.length === 0) {
                return '';
            }

            return buttons.map((button, index) => `
                <button class="action-btn"
                        data-action="btn-${index}"
                        title="${button.title || button.label}">
                    <i class="bx ${button.icon}"></i>
                    <span class="action-btn-label">${button.label}</span>
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

            // For new layout, search FAB is rendered separately as floating
            // For legacy layout, render FAB normally
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
         * Render secondary FAB (optional, for new layout)
         * @param {Object} fab - Secondary FAB configuration
         * @returns {string} HTML string
         */
        renderSecondaryFAB(fab) {
            if (!fab) {
                return '';
            }

            return `
                <button class="action-fab-secondary"
                        data-action="fab-secondary"
                        title="${fab.title}">
                    ${fab.text ? fab.text : `<i class="bx ${fab.icon}"></i>`}
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
            console.log('🖱️ Bottom Action Bar button clicked:', actionKey);

            let action = null;
            let actionConfig = null;

            if (actionKey === 'fab') {
                action = this.config.fab?.action;
                actionConfig = this.config.fab;
            } else if (actionKey === 'fab-secondary') {
                action = this.config.secondaryFab?.action;
                actionConfig = this.config.secondaryFab;
            } else if (actionKey === 'end-workout') {
                // Handle end workout action from floating combo
                action = this.config.endWorkoutAction;
                actionConfig = { label: 'End Workout' };
            } else if (actionKey.startsWith('btn-')) {
                // New layout: btn-0, btn-1, btn-2, btn-3
                const index = parseInt(actionKey.split('-')[1]);
                action = this.config.buttons[index]?.action;
                actionConfig = this.config.buttons[index];
            } else if (actionKey.startsWith('left-')) {
                // Legacy layout: left-0, left-1
                const index = parseInt(actionKey.split('-')[1]);
                action = this.config.leftActions[index]?.action;
                actionConfig = this.config.leftActions[index];
            } else if (actionKey.startsWith('right-')) {
                // Legacy layout: right-0, right-1
                const index = parseInt(actionKey.split('-')[1]);
                action = this.config.rightActions[index]?.action;
                actionConfig = this.config.rightActions[index];
            }

            console.log('📋 Action config:', actionConfig);

            if (action && typeof action === 'function') {
                try {
                    console.log('▶️ Executing action for:', actionKey);
                    action();
                    console.log('✅ Action executed successfully');
                } catch (error) {
                    console.error('❌ Error executing action:', error);
                    console.error('Stack trace:', error.stack);
                }
            } else {
                console.warn('⚠️ No action found for:', actionKey);
                console.warn('Action type:', typeof action);
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
         * Update button state (for visual feedback like loading, success, error)
         * @param {string} buttonId - Button identifier (e.g., 'right-0' for save button)
         * @param {string} state - State: 'default', 'saving', 'saved', 'error'
         */
        updateButtonState(buttonId, state) {
            if (!this.container) return;

            const button = this.container.querySelector(`[data-action="${buttonId}"]`);
            if (!button) {
                console.warn('⚠️ Button not found:', buttonId);
                return;
            }

            // Remove all state classes
            button.classList.remove('saving', 'saved', 'error');

            // Add new state class
            if (state !== 'default') {
                button.classList.add(state);
            }

            // Update icon and label based on state
            const icon = button.querySelector('i');
            const label = button.querySelector('.action-btn-label');
            
            if (label) {
                const originalLabel = label.dataset.originalLabel || label.textContent;
                const originalIcon = label.dataset.originalIcon || (icon ? icon.className : 'bx bx-save');
                
                // Store originals if not already stored
                if (!label.dataset.originalLabel) {
                    label.dataset.originalLabel = originalLabel;
                }
                if (!label.dataset.originalIcon && icon) {
                    label.dataset.originalIcon = icon.className;
                }

                switch (state) {
                    case 'saving':
                        if (icon) icon.className = 'bx bx-loader-alt bx-spin';
                        label.textContent = 'Saving';
                        break;
                    case 'saved':
                        if (icon) icon.className = 'bx bx-check';
                        label.textContent = 'Saved';
                        // Reset to default after 2 seconds
                        setTimeout(() => {
                            this.updateButtonState(buttonId, 'default');
                        }, 2000);
                        break;
                    case 'error':
                        if (icon) icon.className = 'bx bx-x';
                        label.textContent = 'Failed';
                        // Reset to default after 3 seconds
                        setTimeout(() => {
                            this.updateButtonState(buttonId, 'default');
                        }, 3000);
                        break;
                    case 'default':
                        if (icon) icon.className = originalIcon;
                        label.textContent = originalLabel;
                        break;
                }
            }

            console.log('✅ Button state updated:', buttonId, state);
        }

        /**
         * Update FAB for workout mode state changes
         * @param {boolean} isActive - Whether workout is active
         */
        updateWorkoutModeState(isActive) {
            if (this.pageId !== 'workout-mode') return;

            const floatingFab = document.getElementById('floatingFab');
            const floatingCombo = document.getElementById('floatingTimerEndCombo');
            
            if (isActive) {
                // Hide regular FAB, show timer+end combo
                if (floatingFab) {
                    floatingFab.style.display = 'none';
                }
                
                // Render timer+end combo if it doesn't exist
                if (!floatingCombo) {
                    this.renderFloatingTimerEndCombo();
                } else {
                    floatingCombo.style.display = 'flex';
                }
                
                // Update config to use active state actions
                this.config = window.BOTTOM_BAR_CONFIGS['workout-mode-active'];
                this.attachEventListeners();
            } else {
                // Show regular FAB, hide timer+end combo
                if (floatingFab) {
                    floatingFab.style.display = 'inline-flex';
                }
                
                if (floatingCombo) {
                    floatingCombo.style.display = 'none';
                }
                
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
         * Hide bottom navigation bar (slide down)
         */
        hideNav() {
            const bottomNav = document.querySelector('.bottom-action-bar');
            if (bottomNav && !window.bottomNavState?.isHidden) {
                bottomNav.classList.add('search-active');
                window.bottomNavState = window.bottomNavState || {};
                window.bottomNavState.isHidden = true;
                console.log('📉 Bottom nav hidden');
            }
        }

        /**
         * Show bottom navigation bar (slide up)
         */
        showNav() {
            const bottomNav = document.querySelector('.bottom-action-bar');
            if (bottomNav && window.bottomNavState?.isHidden) {
                bottomNav.classList.remove('search-active');
                window.bottomNavState.isHidden = false;
                console.log('📈 Bottom nav shown');
            }
        }

        /**
         * Toggle bottom navigation visibility
         */
        toggleNav() {
            if (window.bottomNavState?.isHidden) {
                this.showNav();
            } else {
                this.hideNav();
            }
        }

        /**
         * Show end delete mode button (for workout database)
         */
        showEndDeleteModeButton() {
            // Check if button already exists
            let button = document.getElementById('endDeleteModeButton');
            if (button) {
                button.style.display = 'flex';
                console.log('✅ End delete mode button shown (already exists)');
                return;
            }
            
            // Create the button
            const buttonHTML = `
                <button class="floating-end-delete-button"
                        id="endDeleteModeButton"
                        title="End delete mode"
                        aria-label="End delete mode"
                        style="display: flex;">
                    <i class="bx bx-x"></i>
                    <span>End</span>
                </button>
            `;
            
            // Insert into the container (same parent as search FAB)
            if (this.container) {
                this.container.insertAdjacentHTML('beforeend', buttonHTML);
                
                // Attach click handler
                button = document.getElementById('endDeleteModeButton');
                if (button) {
                    button.addEventListener('click', () => {
                        // Toggle off delete mode
                        const toggle = document.getElementById('deleteModeToggle');
                        if (toggle) {
                            toggle.checked = false;
                            toggle.dispatchEvent(new Event('change'));
                        }
                    });
                }
                
                console.log('✅ End delete mode button created and shown');
            } else {
                console.error('❌ Container not found, cannot create end delete mode button');
            }
        }
        
        /**
         * Hide end delete mode button
         */
        hideEndDeleteModeButton() {
            const button = document.getElementById('endDeleteModeButton');
            if (button) {
                button.style.display = 'none';
                console.log('✅ End delete mode button hidden');
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

        /**
         * Enable auto-hide on scroll (for new layout)
         */
        enableAutoHide() {
            if (!this.container) return;

            const scrollThreshold = 5;

            window.addEventListener('scroll', () => {
                clearTimeout(this.scrollTimeout);

                this.scrollTimeout = setTimeout(() => {
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

                    if (Math.abs(scrollTop - this.lastScrollTop) > scrollThreshold) {
                        if (scrollTop > this.lastScrollTop && scrollTop > 100) {
                            // Scrolling down - hide
                            this.container.classList.add('hidden');
                        } else {
                            // Scrolling up - show
                            this.container.classList.remove('hidden');
                        }

                        this.lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
                    }
                }, 10);
            }, false);

            console.log('✅ Auto-hide on scroll enabled');
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
        if (filename.includes('programs')) return 'programs';

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