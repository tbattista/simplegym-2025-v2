/**
 * Workout Mode FAB Manager
 * Manages floating action buttons and inline add buttons for the workout mode page.
 * Replaces the bottom-action-bar for this page to match the workout builder pattern.
 * @version 1.0.0
 * @date 2026-02-22
 */

class WorkoutModeFabManager {
    constructor() {
        this.state = 'pre-session'; // pre-session | timed-active | quicklog-active | completed
        this.timerInterval = null;
        this._initialized = false;
        console.log('🎯 Workout Mode FAB Manager created');
    }

    /**
     * Initialize: show FABs, wire up inline buttons and FAB click handlers
     */
    initialize() {
        if (this._initialized) return;
        this._initialized = true;

        // Show the FAB container
        const fabs = document.getElementById('workoutModeFabs');
        if (fabs) fabs.style.display = 'flex';

        // Wire up inline add buttons
        this._wireInlineButtons();

        // Wire up FAB click handlers
        this._wireFabButtons();

        // Wire up header options button
        const optionsBtn = document.getElementById('workoutOptionsBtn');
        if (optionsBtn) {
            optionsBtn.addEventListener('click', () => this.openSettingsMenu());
        }

        // Set initial state
        this.updateState('pre-session');

        console.log('✅ Workout Mode FAB Manager initialized');
    }

    /**
     * Update the FAB state (shows/hides the correct slot)
     * @param {string} newState - 'pre-session' | 'timed-active' | 'quicklog-active' | 'completed'
     */
    updateState(newState) {
        this.state = newState;
        console.log('🔄 FAB state →', newState);

        const preSession = document.getElementById('wmSlotPreSession');
        const timedActive = document.getElementById('wmSlotTimedActive');
        const quickLogActive = document.getElementById('wmSlotQuickLogActive');
        const fabContainer = document.getElementById('workoutModeFabs');

        // Hide all slots
        if (preSession) preSession.style.display = 'none';
        if (timedActive) timedActive.style.display = 'none';
        if (quickLogActive) quickLogActive.style.display = 'none';

        switch (newState) {
            case 'pre-session':
                if (preSession) preSession.style.display = 'contents';
                if (fabContainer) fabContainer.style.display = 'flex';
                this._hideQuickLogBanner();
                break;
            case 'timed-active':
                if (timedActive) timedActive.style.display = 'contents';
                if (fabContainer) fabContainer.style.display = 'flex';
                this._hideQuickLogBanner();
                break;
            case 'quicklog-active':
                if (quickLogActive) quickLogActive.style.display = 'contents';
                if (fabContainer) fabContainer.style.display = 'flex';
                this._showQuickLogBanner();
                break;
            case 'completed':
                if (fabContainer) fabContainer.style.display = 'none';
                this._hideQuickLogBanner();
                break;
        }
    }

    /**
     * Start the session timer display (delegates to WorkoutTimerManager via #floatingTimer element)
     * No-op: the timer manager updates #floatingTimer directly
     */
    startTimer(startedAt) {
        // Timer display is managed by WorkoutTimerManager which updates #floatingTimer
    }

    /**
     * Stop the session timer display
     * No-op: the timer manager handles stopping
     */
    stopTimer() {
        // Timer display is managed by WorkoutTimerManager
    }

    /**
     * Wire up inline add buttons to controller methods
     * @private
     */
    _wireInlineButtons() {
        const addExerciseBtn = document.getElementById('inlineAddExerciseBtn');
        const addNoteBtn = document.getElementById('inlineAddNoteBtn');
        const reorderBtn = document.getElementById('inlineReorderBtn');

        if (addExerciseBtn) {
            addExerciseBtn.addEventListener('click', () => {
                if (window.workoutModeController?.showAddExerciseForm) {
                    window.workoutModeController.showAddExerciseForm();
                }
            });
        }

        if (addNoteBtn) {
            addNoteBtn.addEventListener('click', () => {
                if (window.workoutModeController?.handleAddNote) {
                    window.workoutModeController.handleAddNote();
                }
            });
        }

        if (reorderBtn) {
            reorderBtn.addEventListener('click', () => {
                if (window.workoutModeController?.showReorderOffcanvas) {
                    window.workoutModeController.showReorderOffcanvas();
                }
            });
        }
    }

    /**
     * Wire up FAB click handlers
     * @private
     */
    _wireFabButtons() {
        // Pre-session buttons
        const quickLogBtn = document.getElementById('wmFabQuickLog');
        const startBtn = document.getElementById('wmFabStart');
        if (quickLogBtn) {
            quickLogBtn.addEventListener('click', () => {
                if (window.workoutModeController?.handleStartQuickLog) {
                    window.workoutModeController.handleStartQuickLog();
                }
            });
        }
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (window.workoutModeController?.handleStartWorkout) {
                    window.workoutModeController.handleStartWorkout();
                }
            });
        }

        // Timed active buttons
        const endBtn = document.getElementById('wmFabEnd');
        if (endBtn) {
            endBtn.addEventListener('click', () => {
                if (window.workoutModeController?.handleCompleteWorkout) {
                    window.workoutModeController.handleCompleteWorkout();
                }
            });
        }

        // Quick log active buttons
        const cancelBtn = document.getElementById('wmFabCancel');
        const saveBtn = document.getElementById('wmFabSave');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (window.workoutModeController?.handleCancelWorkout) {
                    window.workoutModeController.handleCancelWorkout();
                }
            });
        }
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (window.workoutModeController?.handleSaveQuickLog) {
                    window.workoutModeController.handleSaveQuickLog();
                }
            });
        }
    }

    /**
     * Open settings menu offcanvas (triggered from header options button)
     */
    openSettingsMenu() {
        if (!window.UnifiedOffcanvasFactory) {
            console.error('❌ UnifiedOffcanvasFactory not loaded');
            return;
        }

        const restTimerEnabled = localStorage.getItem('workoutRestTimerEnabled') !== 'false';
        const soundEnabled = localStorage.getItem('workoutSoundEnabled') !== 'false';

        window.UnifiedOffcanvasFactory.createMenuOffcanvas({
            id: 'workoutModeSettingsOffcanvas',
            title: 'Workout Settings',
            icon: 'bx-cog',
            menuItems: [
                {
                    type: 'toggle',
                    icon: 'bx-time-five',
                    title: 'Rest Timer',
                    description: 'Show rest timer between sets',
                    checked: restTimerEnabled,
                    storageKey: 'workoutRestTimerEnabled',
                    onChange: (enabled) => {
                        if (window.globalRestTimer) window.globalRestTimer.setEnabled(enabled);
                    }
                },
                {
                    type: 'toggle',
                    icon: soundEnabled ? 'bx-volume-full' : 'bx-volume-mute',
                    title: 'Sound',
                    description: 'Play sounds for timer alerts',
                    checked: soundEnabled,
                    storageKey: 'workoutSoundEnabled',
                    onChange: (enabled) => {
                        if (window.workoutModeController) {
                            window.workoutModeController.soundEnabled = enabled;
                        }
                    }
                },
                { type: 'divider' },
                {
                    icon: 'bx-share-alt',
                    title: 'Share Workout',
                    description: 'Share publicly or create private link',
                    onClick: () => {
                        if (window.workoutModeController?.initializeShareButton) {
                            window.workoutModeController.initializeShareButton();
                        }
                    }
                },
                {
                    icon: 'bx-edit',
                    title: 'Edit Workout',
                    description: 'Modify workout template',
                    onClick: () => {
                        if (window.workoutModeController?.handleEditWorkout) {
                            window.workoutModeController.handleEditWorkout();
                        }
                    }
                },
                {
                    icon: 'bx-refresh',
                    title: 'Change Workout',
                    description: 'Switch to different workout',
                    onClick: () => {
                        if (window.workoutModeController?.handleChangeWorkout) {
                            window.workoutModeController.handleChangeWorkout();
                        }
                    }
                },
                {
                    icon: 'bx-x-circle',
                    title: 'Cancel Workout',
                    description: 'Discard session and exit',
                    variant: 'danger',
                    onClick: () => {
                        if (window.workoutModeController?.handleCancelWorkout) {
                            window.workoutModeController.handleCancelWorkout();
                        }
                    }
                }
            ]
        });
    }

    /**
     * Show Quick Log mode banner
     * @private
     */
    _showQuickLogBanner() {
        let banner = document.getElementById('quickLogModeBanner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'quickLogModeBanner';
            banner.className = 'quick-log-mode-banner';
            banner.innerHTML = `
                <i class="bx bx-edit-alt"></i>
                <span>Quick Log Mode</span>
                <small>Log your completed workout</small>
            `;
            const contentWrapper = document.querySelector('.content-wrapper');
            if (contentWrapper) {
                contentWrapper.insertBefore(banner, contentWrapper.firstChild);
            }
        }
        banner.style.display = 'flex';
    }

    /**
     * Hide Quick Log mode banner
     * @private
     */
    _hideQuickLogBanner() {
        const banner = document.getElementById('quickLogModeBanner');
        if (banner) banner.style.display = 'none';
    }
}

// Make globally available
window.WorkoutModeFabManager = WorkoutModeFabManager;

console.log('📦 Workout Mode FAB Manager loaded');
