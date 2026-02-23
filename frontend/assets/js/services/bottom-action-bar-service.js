/**
 * Bottom Action Bar Service
 * Automatically injects and manages the bottom action bar on pages
 * Uses 4-button + right FAB layout for all pages
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

            // Enable auto-hide on scroll for new layout (except workout-builder, workout-database, and workout-mode)
            if (this.isNewLayout && this.pageId !== 'workout-builder' && this.pageId !== 'workout-database' && this.pageId !== 'workout-mode') {
                this.enableAutoHide();
            }

            // Fix for Chrome mobile dynamic viewport (address bar hide/show)
            this.setupMobileViewportFix();

            console.log('✅ Bottom Action Bar initialized');
            return true;
        }

        /**
         * Setup fix for Chrome mobile dynamic viewport
         * When Chrome's UI hides/shows, the viewport changes and fixed elements need to reposition
         */
        setupMobileViewportFix() {
            if (!window.visualViewport) {
                return; // Not supported, use CSS fallback only
            }

            const updatePosition = () => {
                const bar = this.container;
                if (!bar) return;

                // Force browser to recalculate position by triggering reflow
                // This fixes Chrome Android issue where fixed elements don't reposition
                // when the browser UI hides/shows
                bar.style.display = 'none';
                void bar.offsetHeight; // Force reflow
                bar.style.display = '';
            };

            // Debounce the update to prevent jank
            let rafId = null;
            const debouncedUpdate = () => {
                if (rafId) {
                    cancelAnimationFrame(rafId);
                }
                rafId = requestAnimationFrame(updatePosition);
            };

            window.visualViewport.addEventListener('resize', debouncedUpdate);
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

            // Build HTML structure - 4-button layout
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

            // Append to body
            document.body.appendChild(container);
            this.container = container;

            // Mark body as having bottom action bar for CSS scoping
            document.body.classList.add('has-bottom-action-bar');

            // Render floating FAB (new layout only)
            if (this.isNewLayout) {
                // Render search FAB if configured (either as main FAB or searchFab)
                const searchConfig = this.config.searchFab || (this.config.fab?.icon === 'bx-search' ? this.config.fab : null);
                if (searchConfig) {
                    // Render search FAB with morphing functionality (hidden, triggered by button)
                    this.renderFloatingSearchFAB(searchConfig);
                    // Note: No click handler attached - search FAB is triggered by the Search button
                }
                
                // Render main FAB if it's not a search FAB
                if (this.config.fab && this.config.fab.icon !== 'bx-search') {
                    // For workout mode, always render timer combo (not regular FAB)
                    if (this.pageId === 'workout-mode') {
                        this.renderFloatingTimerEndCombo();
                    } else {
                        // Render regular floating FAB for other pages
                        this.renderFloatingFAB(this.config.fab);
                    }
                }

                // Render dual FAB for workout-mode (Quick Log + Timed buttons)
                if (this.pageId === 'workout-mode' && this.config.dualFab) {
                    console.log('🎯 Rendering dual FAB for workout-mode (Quick Log + Timed)');
                    this.renderFloatingTimerEndCombo();
                }
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
                        title="${fab.title}"
                        role="button"
                        tabindex="0"
                        style="display: none;">
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
         * Render floating timer + end button combo (for workout mode)
         * Shows dual buttons (Quick Log + Timed) when inactive, timer+End when timed active, badge+Save when Quick Log active
         */
        renderFloatingTimerEndCombo() {
            // Check if combo already exists
            if (document.getElementById('floatingTimerEndCombo')) {
                console.log('ℹ️ Floating timer+end combo already exists');
                return;
            }

            const comboHTML = `
                <!-- Dual Buttons Container (shown before workout starts) -->
                <div class="floating-dual-buttons" id="floatingDualButtons" style="display: flex;">
                    <!-- Quick Log Button (secondary) - NO floating-action-fab class (container handles positioning) -->
                    <button class="floating-quicklog-button"
                            id="floatingQuickLogButton"
                            data-action="start-quick-log"
                            title="Log a completed workout (no timer)"
                            aria-label="Quick Log">
                        <i class="bx bx-edit-alt"></i>
                        <span>Quick Log</span>
                    </button>
                    <!-- Timed Session Button (primary) - NO floating-action-fab class (container handles positioning) -->
                    <button class="floating-start-button"
                            id="floatingStartButton"
                            data-action="start-workout"
                            title="Start timed workout session"
                            aria-label="Start timed session">
                        <i class="bx bx-play"></i>
                        <span>Timed</span>
                    </button>
                </div>

                <!-- Timer + End Combo (shown during timed workout) -->
                <div class="floating-timer-end-combo" id="floatingTimerEndCombo" style="display: none;">
                    <!-- Global Rest Timer (now as flex item) -->
                    <div class="global-rest-timer-button" id="globalRestTimerButton"></div>

                    <!-- Timer Display -->
                    <div class="floating-timer-display" id="floatingTimerDisplay">
                        <i class="bx bx-time-five"></i>
                        <span id="floatingTimer">0:00:00</span>
                    </div>

                    <!-- Stop Button -->
                    <button class="floating-end-button"
                            id="floatingEndButton"
                            data-action="end-workout"
                            title="Stop workout session"
                            aria-label="Stop workout">
                        <i class="bx bx-stop-circle"></i>
                        <span>Stop</span>
                    </button>
                </div>

                <!-- Quick Log Save + Cancel Combo (shown during Quick Log) -->
                <div class="floating-quicklog-combo" id="floatingQuickLogCombo" style="display: none;">
                    <!-- Save Button (primary action, comes first) -->
                    <button class="floating-save-button"
                            id="floatingSaveButton"
                            data-action="save-quick-log"
                            title="Save Quick Log"
                            aria-label="Save Quick Log">
                        <i class="bx bx-check"></i>
                        <span>Save</span>
                    </button>

                    <!-- Cancel Button -->
                    <button class="floating-cancel-button"
                            id="floatingCancelButton"
                            data-action="cancel-quick-log"
                            title="Cancel Quick Log"
                            aria-label="Cancel Quick Log">
                        <i class="bx bx-x"></i>
                    </button>
                </div>
            `;

            // Append to the action bar container so it moves with the bar
            this.container.insertAdjacentHTML('beforeend', comboHTML);

            // Attach event listener to Quick Log button
            const quickLogButton = document.getElementById('floatingQuickLogButton');
            if (quickLogButton) {
                quickLogButton.addEventListener('click', () => {
                    this.handleButtonClick('start-quick-log');
                });
            }

            // Attach event listener to Timed/Start button
            const startButton = document.getElementById('floatingStartButton');
            if (startButton) {
                startButton.addEventListener('click', () => {
                    this.handleButtonClick('start-workout');
                });
            }

            // Attach event listener to End button in timed combo
            const endButton = document.getElementById('floatingEndButton');
            if (endButton) {
                endButton.addEventListener('click', () => {
                    this.handleButtonClick('end-workout');
                });
            }

            // Attach event listener to Save button in Quick Log combo
            const saveButton = document.getElementById('floatingSaveButton');
            if (saveButton) {
                saveButton.addEventListener('click', () => {
                    this.handleButtonClick('save-quick-log');
                });
            }

            // Attach event listener to Cancel button in Quick Log combo
            const cancelButton = document.getElementById('floatingCancelButton');
            if (cancelButton) {
                cancelButton.addEventListener('click', () => {
                    this.handleButtonClick('cancel-quick-log');
                });
            }

            // Initialize global rest timer if class is available
            this.initializeGlobalRestTimer();

            console.log('✅ Floating dual buttons + combos rendered');
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
            } else if (actionKey === 'start-workout') {
                // Handle start timed workout action from dual buttons
                action = this.config.dualFab?.primary?.action || this.config.fab?.action || this.config.startWorkoutAction;
                actionConfig = { label: 'Start Timed Workout' };
            } else if (actionKey === 'start-quick-log') {
                // Handle start Quick Log action from dual buttons
                action = this.config.dualFab?.secondary?.action || this.config.startQuickLogAction;
                actionConfig = { label: 'Start Quick Log' };
            } else if (actionKey === 'end-workout') {
                // Handle end workout action from timed combo (active state)
                action = this.config.endWorkoutAction;
                actionConfig = { label: 'End Workout' };
            } else if (actionKey === 'save-quick-log') {
                // Handle save Quick Log action from Quick Log combo
                action = this.config.saveQuickLogAction;
                actionConfig = { label: 'Save Quick Log' };
            } else if (actionKey === 'cancel-quick-log') {
                // Handle cancel Quick Log action from Quick Log combo
                action = this.config.cancelQuickLogAction;
                actionConfig = { label: 'Cancel Quick Log' };
            } else if (actionKey.startsWith('btn-')) {
                // Button click: btn-0, btn-1, btn-2, btn-3
                const index = parseInt(actionKey.split('-')[1]);
                action = this.config.buttons[index]?.action;
                actionConfig = this.config.buttons[index];
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
         * @param {string} sessionMode - Session mode: 'timed' (default) or 'quick_log'
         */
        updateWorkoutModeState(isActive, sessionMode = 'timed') {
            console.log('🔄 updateWorkoutModeState called:', { isActive, sessionMode, pageId: this.pageId });

            if (this.pageId !== 'workout-mode') {
                console.log('⚠️ Not on workout-mode page, skipping state update');
                return;
            }

            const dualButtons = document.getElementById('floatingDualButtons');
            const timedCombo = document.getElementById('floatingTimerEndCombo');
            const quickLogCombo = document.getElementById('floatingQuickLogCombo');

            console.log('🔍 Elements found:', {
                dualButtons: !!dualButtons,
                timedCombo: !!timedCombo,
                quickLogCombo: !!quickLogCombo
            });

            if (!dualButtons) {
                console.warn('⚠️ Dual buttons container not found');
                return;
            }

            if (isActive) {
                // Hide dual buttons with redundant properties for safety
                dualButtons.style.display = 'none';
                dualButtons.style.visibility = 'hidden';
                dualButtons.style.pointerEvents = 'none';
                console.log('✅ Dual buttons hidden');

                if (sessionMode === 'quick_log') {
                    // Quick Log mode: Show Save + Cancel buttons
                    if (timedCombo) {
                        timedCombo.style.display = 'none';
                        timedCombo.style.visibility = 'hidden';
                    }
                    if (quickLogCombo) {
                        quickLogCombo.style.display = 'flex';
                        quickLogCombo.style.visibility = 'visible';
                        quickLogCombo.style.pointerEvents = 'auto';
                        console.log('✅ Quick Log combo shown');
                    }

                    // Show Quick Log mode banner
                    this.showQuickLogBanner(true);

                    // Update config to Quick Log active state
                    this.config = window.BOTTOM_BAR_CONFIGS['workout-mode-quick-log-active'];
                    console.log('✅ Workout mode state updated: Quick Log active');
                } else {
                    // Timed mode: Show timer + End button
                    if (timedCombo) {
                        timedCombo.style.display = 'flex';
                        timedCombo.style.visibility = 'visible';
                        timedCombo.style.pointerEvents = 'auto';
                    }
                    if (quickLogCombo) {
                        quickLogCombo.style.display = 'none';
                        quickLogCombo.style.visibility = 'hidden';
                    }

                    // Hide Quick Log mode banner (in case switching from quick_log to timed)
                    this.showQuickLogBanner(false);

                    // Update config to timed active state
                    this.config = window.BOTTOM_BAR_CONFIGS['workout-mode-active'];
                    console.log('✅ Workout mode state updated: Timed active');
                }

                this.attachEventListeners();
            } else {
                // Inactive: Show dual buttons, hide both combos
                dualButtons.style.display = 'flex';
                dualButtons.style.visibility = 'visible';
                dualButtons.style.pointerEvents = 'auto';

                if (timedCombo) {
                    timedCombo.style.display = 'none';
                    timedCombo.style.visibility = 'hidden';
                }
                if (quickLogCombo) {
                    quickLogCombo.style.display = 'none';
                    quickLogCombo.style.visibility = 'hidden';
                }

                // Hide Quick Log mode banner
                this.showQuickLogBanner(false);

                // Update config to inactive state
                this.config = window.BOTTOM_BAR_CONFIGS['workout-mode'];
                this.attachEventListeners();

                console.log('✅ Workout mode state updated: inactive (dual buttons visible)');
            }
        }

        /**
         * Show/hide Quick Log mode banner on the page
         * @param {boolean} show - True to show, false to hide
         */
        showQuickLogBanner(show) {
            const bannerId = 'quickLogModeBanner';
            let banner = document.getElementById(bannerId);

            if (show) {
                // Create banner if it doesn't exist
                if (!banner) {
                    banner = document.createElement('div');
                    banner.id = bannerId;
                    banner.className = 'quick-log-mode-banner';
                    banner.innerHTML = `
                        <i class="bx bx-edit-alt"></i>
                        <span>Quick Log Mode</span>
                        <small>Log your completed workout</small>
                    `;

                    // Insert after navbar or at top of main content
                    const mainContent = document.querySelector('.content-wrapper') || document.querySelector('main') || document.body;
                    mainContent.insertBefore(banner, mainContent.firstChild);
                    console.log('✅ Quick Log banner shown');
                }
                banner.style.display = 'flex';
            } else {
                // Hide banner if it exists
                if (banner) {
                    banner.style.display = 'none';
                    console.log('✅ Quick Log banner hidden');
                }
            }
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
                // Remove body class when bar is destroyed
                document.body.classList.remove('has-bottom-action-bar');
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
        if (filename.includes('workout-mode-demo')) return 'workout-mode-demo';
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

        // Skip workout-mode — it uses its own floating FABs (workout-mode-fab-manager.js)
        if (pageId === 'workout-mode') {
            console.log('ℹ️ Skipping bottom action bar for workout-mode (uses floating FABs)');
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