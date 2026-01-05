/**
 * Ghost Gym - Workout Mode Controller
 * Orchestrates workout mode functionality using existing services
 * @version 1.0.0
 * @date 2025-11-07
 */

class WorkoutModeController {
    constructor() {
        // Use existing services (85% code reuse!)
        this.sessionService = window.workoutSessionService;
        this.authService = window.authService;
        this.dataManager = window.dataManager;
        
        // Initialize card renderer
        this.cardRenderer = new window.ExerciseCardRenderer(this.sessionService);
        
        // Phase 1: Initialize UI State Manager
        this.uiStateManager = new WorkoutUIStateManager({
            loading: 'workoutLoadingState',
            error: 'workoutErrorState',
            loadingMessage: 'loadingMessage',
            errorMessage: 'workoutErrorMessage',
            content: 'exerciseCardsSection',
            footer: 'workoutModeFooter',
            header: 'workoutInfoHeader'
        });
        
        // Phase 2: Initialize Timer Manager
        this.timerManager = new WorkoutTimerManager(this.sessionService);
        
        // Phase 3: Initialize Card Manager (will be configured after workout loads)
        this.cardManager = null;
        
        // Phase 4: Initialize Workout Data Manager
        this.workoutDataManager = new WorkoutDataManager({
            sessionService: this.sessionService,
            dataManager: this.dataManager
        });
        
        // Phase 5: Initialize Lifecycle Manager
        this.lifecycleManager = new WorkoutLifecycleManager({
            sessionService: this.sessionService,
            uiStateManager: this.uiStateManager,
            authService: this.authService,
            dataManager: this.dataManager,
            timerManager: this.timerManager,
            onRenderWorkout: () => this.renderWorkout(),
            onExpandFirstCard: () => this.expandFirstExerciseCard(),
            onCollectExerciseData: () => this.collectExerciseData(),
            onUpdateTemplateWeights: async (exercises) => await this.updateWorkoutTemplateWeights(exercises),
            onLoadWorkout: async (workoutId) => await this.loadWorkout(workoutId)
        });
        
        // Phase 6: Initialize Weight Manager
        this.weightManager = new WorkoutWeightManager({
            sessionService: this.sessionService,
            onWeightUpdated: (exerciseName, weight) => this.renderWorkout(),
            onRenderWorkout: () => this.renderWorkout(),
            onAutoSave: () => this.autoSave(null)
        });
        
        // Phase 7: Initialize Exercise Operations Manager
        this.exerciseOpsManager = new WorkoutExerciseOperationsManager({
            sessionService: this.sessionService,
            dataManager: this.dataManager,
            authService: this.authService,
            onRenderWorkout: () => this.renderWorkout(),
            onAutoSave: () => this.autoSave(null),
            onGoToNext: (index) => this.goToNextExercise(index),
            onGetCurrentExerciseData: (name, index) => this._getCurrentExerciseData(name, index)
        });
        
        // State
        this.currentWorkout = null;
        this.timers = {}; // Kept for backward compatibility, delegated to timerManager
        this.globalRestTimer = null; // Kept for backward compatibility, delegated to timerManager
        this.soundEnabled = localStorage.getItem('workoutSoundEnabled') !== 'false';
        this.autoSaveTimer = null;
        this.workoutListComponent = null;
        
        // Phase 5: isStartingSession moved to lifecycleManager
        
        // Reorder mode state
        this.reorderModeEnabled = false;
        
        console.log('🎮 Workout Mode Controller initialized');
        console.log('🔍 DEBUG: Modal manager available?', !!window.ghostGymModalManager);
    }
    
    /**
     * Get modal manager (lazy load to ensure it's available)
     */
    getModalManager() {
        if (!window.ghostGymModalManager) {
            console.warn('⚠️ Modal manager not available, using fallback');
            return {
                confirm: (title, message, onConfirm) => {
                    // Strip HTML tags for plain text
                    const plainMessage = this.stripHtml(message);
                    if (confirm(`${title}\n\n${plainMessage}`)) {
                        onConfirm();
                    }
                },
                alert: (title, message, type) => {
                    // Strip HTML tags for plain text
                    const plainMessage = this.stripHtml(message);
                    alert(`${title}\n\n${plainMessage}`);
                }
            };
        }
        return window.ghostGymModalManager;
    }
    
    /**
     * Strip HTML tags from string
     * Phase 1: Delegates to WorkoutUtils
     */
    stripHtml(html) {
        return WorkoutUtils.stripHtml(html);
    }
    
    /**
     * Initialize controller
     */
    async initialize() {
        try {
            console.log('🎮 Controller initialize() called');
            console.log('🔍 DEBUG: Auth service exists?', !!this.authService);
            console.log('🔍 DEBUG: Data manager exists?', !!this.dataManager);
            console.log('🔍 DEBUG: Current storage mode:', this.dataManager?.storageMode);
            console.log('🔍 DEBUG: Is authenticated?', this.authService?.isUserAuthenticated());
            
            // Update loading message
            this.uiStateManager.updateLoadingMessage('Initializing authentication...');
            
            // Setup bonus exercise button handler
            this.setupBonusExerciseButton();
            
            // Setup auth state listener (reuse existing service)
            this.authService.onAuthStateChange((user) => {
                this.handleAuthStateChange(user);
            });
            
            // ✨ Phase 5: Check for persisted session using lifecycleManager
            const hasSession = await this.lifecycleManager.checkPersistedSession();
            if (hasSession) {
                return; // Stop normal initialization - user will choose to resume or start fresh
            }
            
            // Get workout ID from URL
            const workoutId = this.getWorkoutIdFromUrl();
            if (!workoutId) {
                // Redirect to workout database for workout selection
                console.log('🔄 No workout ID provided, redirecting to workout database...');
                window.location.href = 'workout-database.html';
                return;
            }
            
            // ✅ FIX: Wait for auth state to be ready using promise-based approach
            // This replaces the fixed timeout with a reliable promise that resolves when auth is determined
            console.log('⏳ Waiting for initial auth state...');
            this.uiStateManager.updateLoadingMessage('Determining authentication status...');
            
            const authState = await this.dataManager.waitForAuthReady();
            console.log('✅ Auth state ready:', authState);
            console.log('   Storage mode:', authState.storageMode);
            console.log('   Authenticated:', authState.isAuthenticated);
            
            // Update loading message based on auth state
            if (authState.isAuthenticated) {
                this.uiStateManager.updateLoadingMessage('Loading workout from cloud...');
            } else {
                this.uiStateManager.updateLoadingMessage('Loading workout...');
            }
            
            // Load workout
            await this.loadWorkout(workoutId);
            
            // Setup UI
            this.setupEventListeners();
            this.initializeSoundToggle();
            this.initializeShareButton();
            this.initializeReorderMode();
            
            console.log('✅ Workout Mode Controller ready');
            
        } catch (error) {
            console.error('❌ Controller initialization failed:', error);
            this.uiStateManager.showError(error.message);
        }
    }
    
    /**
     * Get workout ID from URL
     */
    getWorkoutIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }
    
    /**
     * Load workout data
     */
    async loadWorkout(workoutId) {
        try {
            console.log('📥 Loading workout:', workoutId);
            
            // Show loading state
            this.uiStateManager.showLoading('Loading workout...');
            
            // Debug environment info
            console.log('🔍 DEBUG: Environment Info:', {
                protocol: window.location.protocol,
                origin: window.location.origin,
                storageMode: this.dataManager?.storageMode,
                isAuthenticated: this.authService?.isUserAuthenticated(),
                isOnline: navigator.onLine
            });
            
            // Use existing data manager
            console.log('🔍 DEBUG: Calling dataManager.getWorkouts()...');
            console.log('🔍 DEBUG: dataManager exists?', !!this.dataManager);
            console.log('🔍 DEBUG: dataManager.getWorkouts exists?', !!this.dataManager?.getWorkouts);
            
            const workouts = await this.dataManager.getWorkouts();
            console.log('🔍 DEBUG: Got workouts:', workouts?.length || 0, 'workouts');
            console.log('🔍 DEBUG: Looking for workout ID:', workoutId);
            console.log('🔍 DEBUG: Available workout IDs:', workouts?.map(w => w.id) || []);
            
            this.currentWorkout = workouts.find(w => w.id === workoutId);
            console.log('🔍 DEBUG: Found workout?', !!this.currentWorkout);
            
            if (!this.currentWorkout) {
                // Enhanced error message with helpful context
                const availableIds = workouts?.map(w => w.id).join(', ') || 'none';
                const errorMsg = `Workout not found (ID: ${workoutId})

Available workouts: ${workouts?.length || 0}
Available IDs: ${availableIds}

This could mean:
• The workout was deleted
• You're in ${this.dataManager?.storageMode || 'unknown'} mode (try ${this.dataManager?.storageMode === 'localStorage' ? 'logging in' : 'logging out'})
• The URL has an incorrect workout ID
• The workout exists in a different storage location

Current storage mode: ${this.dataManager?.storageMode || 'unknown'}
Authenticated: ${this.authService?.isUserAuthenticated() ? 'Yes' : 'No'}`;
                
                throw new Error(errorMsg);
            }
            
            // Update page title and header
            document.getElementById('workoutName').textContent = this.currentWorkout.name;
            document.title = `👻 ${this.currentWorkout.name} - Workout Mode - Ghost Gym`;
            
            // Show workout info header
            const workoutInfoHeader = document.getElementById('workoutInfoHeader');
            if (workoutInfoHeader) {
                workoutInfoHeader.style.display = 'block';
            }
            
            // Fetch and display last completed date
            const lastCompleted = await this.fetchLastCompleted();
            const lastCompletedDate = document.getElementById('lastCompletedDate');
            
            if (lastCompleted && lastCompletedDate) {
                const formattedDate = lastCompleted.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                lastCompletedDate.textContent = formattedDate;
                console.log('✅ Last completed date set:', formattedDate);
            } else if (lastCompletedDate) {
                lastCompletedDate.textContent = 'Never';
                console.log('ℹ️ No last completed date found, showing "Never"');
            }
            
            // CRITICAL FIX: Fetch exercise history BEFORE rendering
            // This ensures weights from history are available on initial load
            if (this.authService.isUserAuthenticated()) {
                console.log('📊 Fetching exercise history before render...');
                await this.sessionService.fetchExerciseHistory(this.currentWorkout.id);
            }
            
            // Set workout context for lifecycle manager
            this.lifecycleManager.setWorkout(this.currentWorkout);
            
            // Render workout (now has history available)
            this.renderWorkout();
            
            // Initialize start button tooltip
            await this.uiStateManager.updateStartButtonTooltip(this.authService.isUserAuthenticated());
            
            // Hide loading, show content
            this.uiStateManager.hideLoading();
            
            console.log('✅ Workout loaded:', this.currentWorkout.name);
            
        } catch (error) {
            console.error('❌ Error loading workout:', error);
            this.uiStateManager.showError(error.message);
        }
    }
    
    /**
     * Fetch last completed date for current workout
     */
    async fetchLastCompleted() {
        try {
            if (!this.currentWorkout || !this.authService.isUserAuthenticated()) {
                console.log('ℹ️ No workout or not authenticated, skipping last completed fetch');
                return null;
            }
            
            const token = await this.authService.getIdToken();
            if (!token) {
                console.log('ℹ️ No auth token, skipping last completed fetch');
                return null;
            }
            
            // Use the history endpoint to get exercise histories
            const url = window.config.api.getUrl(`/api/v3/workout-sessions/history/workout/${this.currentWorkout.id}`);
            
            console.log('📡 Fetching workout history from:', url);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                console.warn('⚠️ Could not fetch last completed date, status:', response.status);
                return null;
            }
            
            const historyData = await response.json();
            console.log('📊 History data received:', historyData);
            
            // The response contains exercises object with exercise histories
            // Each exercise history has a last_session_date
            // We need to find the most recent date across all exercises
            if (historyData.exercises && Object.keys(historyData.exercises).length > 0) {
                let mostRecentDate = null;
                
                for (const exerciseName in historyData.exercises) {
                    const exerciseHistory = historyData.exercises[exerciseName];
                    if (exerciseHistory.last_session_date) {
                        const sessionDate = new Date(exerciseHistory.last_session_date);
                        if (!mostRecentDate || sessionDate > mostRecentDate) {
                            mostRecentDate = sessionDate;
                        }
                    }
                }
                
                if (mostRecentDate) {
                    console.log('✅ Found most recent session date:', mostRecentDate);
                    return mostRecentDate;
                }
            }
            
            console.log('ℹ️ No session history found for this workout');
            return null;
            
        } catch (error) {
            console.error('❌ Error fetching last completed:', error);
            return null;
        }
    }
    
    /**
     * Render workout cards (now uses ExerciseCardRenderer)
     * PHASE 2: Now respects custom exercise order
     */
    renderWorkout() {
        const container = document.getElementById('exerciseCardsContainer');
        if (!container) return;
        
        let html = '';
        let exerciseIndex = 0;
        
        // Calculate total cards first
        const regularCount = this.currentWorkout.exercise_groups?.length || 0;
        const bonusExercises = this.sessionService.getBonusExercises();
        const bonusCount = bonusExercises?.length || 0;
        const totalCards = regularCount + bonusCount;
        
        // PHASE 2: Build combined exercise list
        const allExercises = [];
        
        // Add regular exercises
        if (this.currentWorkout.exercise_groups && this.currentWorkout.exercise_groups.length > 0) {
            this.currentWorkout.exercise_groups.forEach((group) => {
                allExercises.push({
                    type: 'regular',
                    data: group,
                    name: group.exercises?.a
                });
            });
        }
        
        // Add bonus exercises
        if (bonusExercises && bonusExercises.length > 0) {
            bonusExercises.forEach((bonus) => {
                allExercises.push({
                    type: 'bonus',
                    data: {
                        exercises: { a: bonus.name },
                        sets: bonus.sets,
                        reps: bonus.reps,
                        rest: bonus.rest || '60s',
                        default_weight: bonus.weight,
                        default_weight_unit: bonus.weight_unit || 'lbs',
                        notes: bonus.notes
                    },
                    name: bonus.name
                });
            });
        }
        
        // PHASE 2: Apply custom order if exists
        const customOrder = this.sessionService.getExerciseOrder();
        if (customOrder.length > 0) {
            console.log('📋 Applying custom exercise order:', customOrder);
            
            // Reorder exercises based on custom order
            const orderedExercises = [];
            customOrder.forEach(name => {
                const exercise = allExercises.find(ex => ex.name === name);
                if (exercise) {
                    orderedExercises.push(exercise);
                }
            });
            
            // Add any exercises not in custom order (shouldn't happen, but safety)
            allExercises.forEach(ex => {
                if (!customOrder.includes(ex.name)) {
                    orderedExercises.push(ex);
                }
            });
            
            // Replace with ordered list
            allExercises.splice(0, allExercises.length, ...orderedExercises);
        }
        
        // Render exercises in order
        allExercises.forEach((exercise) => {
            const isBonus = exercise.type === 'bonus';
            html += this.cardRenderer.renderCard(exercise.data, exerciseIndex, isBonus, totalCards);
            exerciseIndex++;
        });
        
        container.innerHTML = html;
        
        // Phase 3: Initialize Card Manager with workout data
        if (!this.cardManager) {
            this.cardManager = new ExerciseCardManager({
                containerSelector: '#exerciseCardsContainer',
                sessionService: this.sessionService,
                timerManager: this.timerManager,
                workout: this.currentWorkout
            });
        } else {
            // Update existing manager with new workout data
            this.cardManager.updateWorkout(this.currentWorkout);
        }
        
        // Phase 2: Delegate to timer manager
        this.timerManager.initializeGlobalTimer();
        this.timerManager.initializeCardTimers();
        
        // PHASE 2: Initialize drag-and-drop reordering
        this.initializeSortable();
    }
    
    /**
     * Initialize timers (FACADE - delegates to timerManager)
     * @deprecated Use timerManager.initializeCardTimers() directly
     */
    initializeTimers() {
        this.timerManager.initializeCardTimers();
    }
    
    /**
     * Initialize global rest timer (FACADE - delegates to timerManager)
     * @deprecated Use timerManager.initializeGlobalTimer() directly
     */
    initializeGlobalRestTimer() {
        this.timerManager.initializeGlobalTimer();
    }
    
    /**
     * Sync global timer with currently expanded exercise card (FACADE - delegates to timerManager)
     * @deprecated Use timerManager.syncWithExpandedCard() directly
     */
    syncGlobalTimerWithExpandedCard() {
        this.timerManager.syncWithExpandedCard(this.currentWorkout);
    }
    
    /**
     * PHASE 2: Initialize drag-and-drop sorting with SortableJS
     * UPDATED: Starts disabled, enabled via reorder mode toggle
     */
    initializeSortable() {
        const container = document.getElementById('exerciseCardsContainer');
        if (!container || typeof Sortable === 'undefined') {
            console.warn('⚠️ Sortable not initialized - container or library missing');
            return;
        }
        
        this.sortable = Sortable.create(container, {
            animation: 150,
            handle: '.exercise-drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            fallbackClass: 'sortable-fallback',
            forceFallback: false,
            scroll: true,
            scrollSensitivity: 60,
            scrollSpeed: 10,
            bubbleScroll: true,
            
            // Start disabled, enabled via toggle
            disabled: !this.reorderModeEnabled,
            
            onStart: (evt) => {
                console.log('🎯 Drag started:', evt.oldIndex);
                container.classList.add('sortable-container-dragging');
            },
            
            onEnd: (evt) => {
                console.log('🎯 Drag ended:', evt.oldIndex, '→', evt.newIndex);
                container.classList.remove('sortable-container-dragging');
                
                // If order changed, update the session service
                if (evt.oldIndex !== evt.newIndex) {
                    this.handleExerciseReorder(evt.oldIndex, evt.newIndex);
                }
            }
        });
        
        console.log('✅ SortableJS initialized for exercise reordering');
    }
    
    /**
     * Initialize reorder mode toggle
     */
    initializeReorderMode() {
        const toggle = document.getElementById('reorderModeToggle');
        if (!toggle) return;
        
        toggle.addEventListener('change', () => {
            if (toggle.checked) {
                this.enterReorderMode();
            } else {
                this.exitReorderMode();
            }
        });
        
        console.log('✅ Reorder mode toggle initialized');
    }
    
    /**
     * Enter reorder mode
     */
    enterReorderMode() {
        const container = document.getElementById('exerciseCardsContainer');
        if (!container) return;
        
        this.reorderModeEnabled = true;
        
        // Add active class to container
        container.classList.add('reorder-mode-active');
        
        // Collapse any expanded cards for cleaner drag experience
        document.querySelectorAll('.exercise-card.expanded').forEach(card => {
            this.collapseCard(card);
        });
        
        // Ensure sortable is initialized
        if (!this.sortable) {
            this.initializeSortable();
        }
        
        // Enable sortable
        if (this.sortable) {
            this.sortable.option('disabled', false);
        }
        
        // Show feedback
        if (window.showAlert) {
            window.showAlert('Reorder mode active - Drag exercises to reorder', 'info');
        }
        
        console.log('✅ Reorder mode entered');
    }
    
    /**
     * Exit reorder mode
     */
    exitReorderMode() {
        const container = document.getElementById('exerciseCardsContainer');
        if (!container) return;
        
        this.reorderModeEnabled = false;
        
        // Remove active class from container
        container.classList.remove('reorder-mode-active');
        
        // Disable sortable to prevent accidental dragging
        if (this.sortable) {
            this.sortable.option('disabled', true);
        }
        
        console.log('✅ Reorder mode exited');
    }
    
    /**
     * PHASE 2: Handle exercise reorder event
     * @param {number} oldIndex - Original index
     * @param {number} newIndex - New index
     */
    handleExerciseReorder(oldIndex, newIndex) {
        console.log(`📋 Reordering exercise from ${oldIndex} to ${newIndex}`);
        
        // Get current exercise order from the DOM
        const cards = document.querySelectorAll('.exercise-card');
        const exerciseNames = Array.from(cards).map(card =>
            card.getAttribute('data-exercise-name')
        );
        
        // Save the new order
        this.sessionService.setExerciseOrder(exerciseNames);
        
        // Show feedback
        if (window.showAlert) {
            window.showAlert('Exercise order updated - changes will apply when you start the workout', 'success');
        }
        
        console.log('✅ New exercise order saved:', exerciseNames);
    }
    
    /**
     * Get exercise group by index (FACADE - delegates to cardManager)
     * @deprecated Use cardManager.getExerciseGroup() directly
     */
    getExerciseGroupByIndex(index) {
        if (this.cardManager) {
            return this.cardManager.getExerciseGroup(index);
        }
        // Fallback for before cardManager is initialized
        if (this.currentWorkout.exercise_groups && index < this.currentWorkout.exercise_groups.length) {
            return this.currentWorkout.exercise_groups[index];
        }
        return null;
    }
    
    /**
     * Handle weight button click
     * Phase 6: Delegates to WorkoutWeightManager
     */
    handleWeightButtonClick(button) {
        return this.weightManager.handleWeightButtonClick(button);
    }
    
    /**
     * Show weight modal (DEPRECATED - for backward compatibility)
     * Phase 6: Delegates to WorkoutWeightManager
     * @deprecated Use weightManager.showWeightModal() directly
     */
    showWeightModal(exerciseName, currentWeight, currentUnit, lastWeight, lastWeightUnit, lastSessionDate, isSessionActive) {
        return this.weightManager.showWeightModal(exerciseName, {
            currentWeight,
            currentUnit,
            lastWeight,
            lastWeightUnit,
            lastSessionDate,
            isSessionActive
        });
    }
    
    /**
     * Handle weight direction indicator toggle
     * Phase 6: Delegates to WorkoutWeightManager
     */
    handleWeightDirection(button) {
        return this.weightManager.handleWeightDirection(button);
    }
    
    /**
     * Update weight direction button states (DEPRECATED - for backward compatibility)
     * Phase 6: Delegates to WorkoutWeightManager
     * @deprecated Use weightManager.updateWeightDirectionButtons() directly
     */
    updateWeightDirectionButtons(exerciseName, direction) {
        return this.weightManager.updateWeightDirectionButtons(exerciseName, direction);
    }
    
    /**
     * Toggle weight direction with inline buttons
     * Phase 6: Delegates to WorkoutWeightManager
     */
    toggleWeightDirection(button, exerciseName, direction) {
        return this.weightManager.toggleWeightDirection(button, exerciseName, direction);
    }
    
    /**
     * Update weight direction button states in the DOM without re-rendering
     * Phase 6: Delegates to WorkoutWeightManager
     * @private
     */
    _updateWeightDirectionButtonsUI(exerciseName, direction) {
        return this.weightManager._updateWeightDirectionButtonsUI(exerciseName, direction);
    }
    
    /**
     * Toggle weight history expansion
     * Phase 6: Delegates to WorkoutWeightManager
     */
    toggleWeightHistory(historyId) {
        return this.weightManager.toggleWeightHistory(historyId);
    }
    
    /**
     * Show quick notes popover for weight direction (DEPRECATED)
     * Phase 6: Delegates to WorkoutWeightManager
     * @deprecated Replaced by toggleWeightDirection() inline button system
     */
    showQuickNotes(trigger) {
        return this.weightManager.showQuickNotes(trigger);
    }
    
    /**
     * Handle quick note action (DEPRECATED - for backward compatibility)
     * Phase 6: Delegates to WorkoutWeightManager
     * @deprecated Use weightManager.handleQuickNoteAction() directly
     */
    handleQuickNoteAction(exerciseName, action, data) {
        return this.weightManager.handleQuickNoteAction(exerciseName, action, data);
    }
    
    /**
     * Update quick note trigger button state (DEPRECATED - for backward compatibility)
     * Phase 6: Delegates to WorkoutWeightManager
     * @deprecated Use weightManager.updateQuickNoteTrigger() directly
     */
    updateQuickNoteTrigger(exerciseName, value) {
        return this.weightManager.updateQuickNoteTrigger(exerciseName, value);
    }
    
    /**
     * Update collapsed badge (DEPRECATED - for backward compatibility)
     * Phase 6: Delegates to WorkoutWeightManager
     * @deprecated Use weightManager._updateCollapsedBadge() directly
     * @private
     */
    _updateCollapsedBadge(exerciseName, direction) {
        return this.weightManager._updateCollapsedBadge(exerciseName, direction);
    }
    
    /**
     * Get direction label (DEPRECATED - for backward compatibility)
     * Phase 6: Delegates to WorkoutWeightManager
     * @deprecated Use weightManager.getDirectionLabel() directly
     * @private
     */
    _getDirectionLabel(direction) {
        return this.weightManager.getDirectionLabel(direction);
    }
    
    /**
     * Show plate calculator settings
     * Phase 6: Delegates to WorkoutWeightManager
     */
    showPlateSettings() {
        return this.weightManager.showPlateSettings();
    }
    
    /**
     * Find exercise group by exercise name
     * Helper for weight adjustment
     * Phase 4: Delegates to WorkoutDataManager
     * @param {string} exerciseName - Exercise name to find
     * @returns {Object|null} Exercise group or null if not found
     * @private
     */
    _findExerciseGroupByName(exerciseName) {
        return this.workoutDataManager.findExerciseByName(exerciseName, this.currentWorkout);
    }
    
    
    /**
     * Auto-save session
     */
    async autoSave(card) {
        try {
            const exercisesPerformed = this.collectExerciseData();
            await this.sessionService.autoSaveSession(exercisesPerformed);
            
            if (card) {
                this.uiStateManager.showSaveIndicator(card, 'success');
            }
            
            console.log('✅ Auto-save successful');
            
        } catch (error) {
            console.error('❌ Auto-save failed:', error);
            if (card) {
                this.uiStateManager.showSaveIndicator(card, 'error');
            }
        }
    }
    
    /**
     * Show save indicator
     * Phase 1: Delegates to WorkoutUIStateManager
     */
    showSaveIndicator(card, state) {
        return this.uiStateManager.showSaveIndicator(card, state);
    }
    
    /**
     * Collect exercise data for session
     * Phase 4: Delegates to WorkoutDataManager
     */
    collectExerciseData() {
        return this.workoutDataManager.collectExerciseData(this.currentWorkout);
    }
    
    /**
     * Update workout template with final weights from completed session
     * This ensures the workout builder shows the most recent weights
     * Phase 4: Delegates to WorkoutDataManager
     */
    async updateWorkoutTemplateWeights(exercisesPerformed) {
        return await this.workoutDataManager.updateWorkoutTemplate(this.currentWorkout, exercisesPerformed);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Start workout button
        const startBtn = document.getElementById('startWorkoutBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.handleStartWorkout());
        }
        
        // Complete workout button
        const completeBtn = document.getElementById('completeWorkoutBtn');
        if (completeBtn) {
            completeBtn.addEventListener('click', () => this.handleCompleteWorkout());
        }
        
        // Edit workout button
        const editBtn = document.getElementById('editWorkoutBtn');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.handleEditWorkout());
        }
        
        // Change workout button
        const changeBtn = document.getElementById('changeWorkoutBtn');
        if (changeBtn) {
            changeBtn.addEventListener('click', () => this.handleChangeWorkout());
        }
    }
    
    /**
     * Initialize start button tooltip
     * Phase 1: Delegates to WorkoutUIStateManager
     */
    async initializeStartButtonTooltip() {
        return this.uiStateManager.updateStartButtonTooltip(this.authService.isUserAuthenticated());
    }
    
    /**
     * Handle start workout
     * Phase 5: Delegates to WorkoutLifecycleManager
     */
    async handleStartWorkout() {
        return await this.lifecycleManager.handleStartWorkout();
    }
    
    /**
     * Setup bonus exercise button handler
     */
    setupBonusExerciseButton() {
        // Add click handler for bonus exercise button (will be added to HTML)
        document.addEventListener('click', (e) => {
            if (e.target.closest('#addBonusExerciseBtn')) {
                e.preventDefault();
                this.handleBonusExercises();
            }
        });
    }
    
    /**
     * Start a new workout session (DEPRECATED - for backward compatibility)
     * Phase 5: Delegates to WorkoutLifecycleManager
     * @deprecated Use lifecycleManager.startNewSession() directly
     */
    async startNewSession() {
        return await this.lifecycleManager.startNewSession();
    }
    
    /**
     * Auto-expand first exercise card when workout starts
     */
    expandFirstExerciseCard() {
        const firstCard = document.querySelector('.exercise-card[data-exercise-index="0"]');
        if (firstCard && !firstCard.classList.contains('expanded')) {
            console.log('✨ Auto-expanding first exercise card');
            this.toggleExerciseCard(0);
        }
    }
    
    /**
     * Handle complete workout
     * Phase 5: Delegates to WorkoutLifecycleManager
     */
    async handleCompleteWorkout() {
        return this.lifecycleManager.handleCompleteWorkout();
    }
    
    /**
     * Show complete workout offcanvas (DEPRECATED - for backward compatibility)
     * Phase 5: Delegates to WorkoutLifecycleManager
     * @deprecated Use lifecycleManager.showCompleteWorkoutOffcanvas() directly
     */
    showCompleteWorkoutOffcanvas() {
        return this.lifecycleManager.showCompleteWorkoutOffcanvas();
    }
    
    /**
     * Show completion summary (DEPRECATED - for backward compatibility)
     * Phase 5: Delegates to WorkoutLifecycleManager
     * @deprecated Use lifecycleManager.showCompletionSummary() directly
     */
    showCompletionSummary(session) {
        return this.lifecycleManager.showCompletionSummary(session);
    }
    
    /**
     * Show login prompt (DEPRECATED - for backward compatibility)
     * Phase 5: Delegates to WorkoutLifecycleManager
     * @deprecated Use lifecycleManager.showLoginPrompt() directly
     */
    showLoginPrompt() {
        return this.lifecycleManager.showLoginPrompt();
    }
    
    /**
     * SESSION PERSISTENCE METHODS
     * Handle resuming interrupted workout sessions
     */
    
    /**
     * Show resume session prompt (DEPRECATED - for backward compatibility)
     * Phase 5: Delegates to WorkoutLifecycleManager
     * @param {Object} sessionData - Persisted session data
     * @deprecated Use lifecycleManager.showResumeSessionPrompt() directly
     */
    async showResumeSessionPrompt(sessionData) {
        return await this.lifecycleManager.showResumeSessionPrompt(sessionData);
    }
    
    /**
     * Resume a persisted session (DEPRECATED - for backward compatibility)
     * Phase 5: Delegates to WorkoutLifecycleManager
     * @param {Object} sessionData - Persisted session data
     * @deprecated Use lifecycleManager.resumeSession() directly
     */
    async resumeSession(sessionData) {
        return await this.lifecycleManager.resumeSession(sessionData);
    }
    
    /**
     * BONUS EXERCISE METHODS
     * Phase 7: Delegates to WorkoutExerciseOperationsManager
     */
    
    /**
     * Handle bonus exercises button click
     * Phase 7: Delegates to WorkoutExerciseOperationsManager
     */
    async handleBonusExercises() {
        return await this.exerciseOpsManager.handleBonusExercises();
    }
    
    /**
     * Show add exercise form
     * Phase 7: Delegates to WorkoutExerciseOperationsManager
     */
    async showAddExerciseForm() {
        return await this.exerciseOpsManager.showAddExerciseForm();
    }
    
    /**
     * Show exercise search offcanvas
     * Phase 7: Delegates to WorkoutExerciseOperationsManager
     */
    showExerciseSearchOffcanvas(populateCallback) {
        return this.exerciseOpsManager.showExerciseSearchOffcanvas(populateCallback);
    }
    
    /**
     * Show bonus exercise modal (DEPRECATED)
     * Phase 7: Delegates to WorkoutExerciseOperationsManager
     */
    async showBonusExerciseModal() {
        return await this.exerciseOpsManager.showBonusExerciseModal();
    }
    
    
    
    /**
     * Update session UI
     * Phase 5: Delegates to WorkoutLifecycleManager
     */
    updateSessionUI(isActive) {
        return this.lifecycleManager.updateSessionUI(isActive);
    }
    
    /**
     * Start session timer (FACADE - delegates to timerManager)
     * @deprecated Use timerManager.startSessionTimer() directly
     */
    startSessionTimer() {
        this.timerManager.startSessionTimer(this.sessionService.getCurrentSession());
    }
    
    /**
     * Stop session timer (FACADE - delegates to timerManager)
     * @deprecated Use timerManager.stopSessionTimer() directly
     */
    stopSessionTimer() {
        this.timerManager.stopSessionTimer();
    }
    
    /**
     * Handle auth state change
     */
    async handleAuthStateChange(user) {
        console.log('🔄 Auth state changed:', user ? 'authenticated' : 'anonymous');
        
        // Only update tooltip, don't reload workout
        // The workout loads once after initial auth state is determined
        this.uiStateManager.updateStartButtonTooltip(this.authService.isUserAuthenticated());
    }
    
    /**
     * Initialize sound toggle
     */
    initializeSoundToggle() {
        const soundBtn = document.getElementById('soundToggleBtn');
        const soundIcon = document.getElementById('soundIcon');
        const soundStatus = document.getElementById('soundStatus');
        
        if (!soundBtn) return;
        
        this.updateSoundUI();
        
        soundBtn.addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            localStorage.setItem('workoutSoundEnabled', this.soundEnabled);
            this.updateSoundUI();
        });
    }
    
    updateSoundUI() {
        const soundIcon = document.getElementById('soundIcon');
        const soundStatus = document.getElementById('soundStatus');
        const soundBtn = document.getElementById('soundToggleBtn');
        
        if (soundStatus) soundStatus.textContent = this.soundEnabled ? 'On' : 'Off';
        if (soundIcon) soundIcon.className = this.soundEnabled ? 'bx bx-volume-full me-1' : 'bx bx-volume-mute me-1';
        if (soundBtn) soundBtn.className = this.soundEnabled ? 'btn btn-outline-secondary' : 'btn btn-outline-danger';
    }
    
    /**
     * Initialize share button
     */
    initializeShareButton() {
        const shareBtn = document.getElementById('shareWorkoutBtn');
        if (!shareBtn) return;
        
        shareBtn.addEventListener('click', async () => {
            if (!this.currentWorkout) return;
            
            const shareData = {
                title: `${this.currentWorkout.name} - Ghost Gym Workout`,
                text: this.generateShareText(this.currentWorkout),
                url: window.location.href
            };
            
            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        this.fallbackShare(shareData);
                    }
                }
            } else {
                this.fallbackShare(shareData);
            }
        });
    }
    
    generateShareText(workout) {
        let text = `💪 ${workout.name}\n\n`;
        
        if (workout.description) {
            text += `${workout.description}\n\n`;
        }
        
        text += `📋 Exercises:\n`;
        
        if (workout.exercise_groups) {
            workout.exercise_groups.forEach((group, index) => {
                const mainEx = group.exercises?.a || 'Exercise';
                text += `${index + 1}. ${mainEx} - ${group.sets}×${group.reps}\n`;
            });
        }
        
        text += `\n👻 Created with Ghost Gym`;
        return text;
    }
    
    fallbackShare(shareData) {
        const textToCopy = `${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`;
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            if (window.showAlert) {
                window.showAlert('Workout details copied to clipboard!', 'success');
            }
        }).catch(error => {
            console.error('❌ Error copying to clipboard:', error);
        });
    }
    
    /**
     * Handle edit workout button click
     * Navigate to builder with current workout loaded
     */
    handleEditWorkout() {
        if (!this.currentWorkout) {
            console.error('No workout to edit');
            return;
        }
        
        // Navigate to workout-builder.html (builder page) with workout ID
        window.location.href = `workout-builder.html?id=${this.currentWorkout.id}`;
    }
    
    /**
     * Handle change workout button click
     * Navigate to workout database
     */
    handleChangeWorkout() {
        // Navigate to workout database page
        window.location.href = 'workout-database.html';
    }
    
    /**
     * Toggle exercise card (FACADE - delegates to cardManager)
     * @deprecated Use cardManager.toggle() directly
     */
    toggleExerciseCard(index) {
        if (this.cardManager) {
            this.cardManager.toggle(index);
        }
    }
    
    /**
     * Expand exercise card (FACADE - delegates to cardManager)
     * @deprecated Use cardManager.expand() directly
     */
    expandCard(card) {
        if (this.cardManager) {
            this.cardManager.expand(card);
        }
    }
    
    /**
     * Collapse exercise card (FACADE - delegates to cardManager)
     * @deprecated Use cardManager.collapse() directly
     */
    collapseCard(card) {
        if (this.cardManager) {
            this.cardManager.collapse(card);
        }
    }
    
    /**
     * Stop current exercise (FACADE - delegates to cardManager)
     * @deprecated Use cardManager methods directly
     */
    stopExercise(index) {
        const card = document.querySelector(`.exercise-card[data-exercise-index="${index}"]`);
        if (card && this.cardManager) {
            this.cardManager.collapse(card);
        }
    }
    
    /**
     * Go to next exercise (FACADE - delegates to cardManager)
     * @deprecated Use cardManager.goToNext() directly
     */
    goToNextExercise(currentIndex) {
        if (this.cardManager) {
            this.cardManager.goToNext(currentIndex, () => this.handleCompleteWorkout());
        }
    }
    
    /**
     * PHASE 2: Handle skipping an exercise
     * @param {string} exerciseName - Exercise name
     * @param {number} index - Exercise index
     */
    handleSkipExercise(exerciseName, index) {
        if (!this.sessionService.isSessionActive()) {
            console.warn('⚠️ Cannot skip exercise - no active session');
            return;
        }
        
        // Show skip reason offcanvas
        window.UnifiedOffcanvasFactory.createSkipExercise(
            { exerciseName },
            async (reason) => {
                // Mark as skipped in session
                this.sessionService.skipExercise(exerciseName, reason);
                
                // Update UI - re-render to show skipped state
                this.renderWorkout();
                
                // Auto-advance to next exercise
                setTimeout(() => {
                    this.goToNextExercise(index);
                }, 300);
                
                // Show success message
                if (window.showAlert) {
                    const message = reason
                        ? `${exerciseName} skipped: ${reason}`
                        : `${exerciseName} skipped`;
                    window.showAlert(message, 'warning');
                }
                
                // Auto-save session
                try {
                    await this.autoSave(null);
                } catch (error) {
                    console.error('❌ Failed to auto-save after skip:', error);
                }
            }
        );
    }
    
    /**
     * PHASE 2: Handle unskipping an exercise
     * @param {string} exerciseName - Exercise name
     * @param {number} index - Exercise index
     */
    handleUnskipExercise(exerciseName, index) {
        if (!this.sessionService.isSessionActive()) {
            console.warn('⚠️ Cannot unskip exercise - no active session');
            return;
        }
        
        const modalManager = this.getModalManager();
        modalManager.confirm(
            'Unskip Exercise',
            `Resume <strong>${WorkoutUtils.escapeHtml(exerciseName)}</strong>?`,
            async () => {
                // Mark as not skipped in session
                this.sessionService.unskipExercise(exerciseName);
                
                // Update UI - re-render to remove skipped state
                this.renderWorkout();
                
                // Show success message
                if (window.showAlert) {
                    window.showAlert(`${exerciseName} resumed`, 'success');
                }
                
                // Auto-save session
                try {
                    await this.autoSave(null);
                } catch (error) {
                    console.error('❌ Failed to auto-save after unskip:', error);
                }
            }
        );
    }
    
    /**
     * Handle editing an exercise's details (sets, reps, rest, weight)
     * PHASE 1: Now works BEFORE and DURING workout session
     * @param {string} exerciseName - Exercise name
     * @param {number} index - Exercise index
     */
    handleEditExercise(exerciseName, index) {
        // PHASE 1: Get current exercise data from appropriate source
        const currentData = this._getCurrentExerciseData(exerciseName, index);
        
        console.log('✏️ Opening exercise editor for:', exerciseName, currentData);
        
        const isSessionActive = this.sessionService.isSessionActive();
        
        // Show edit offcanvas
        window.UnifiedOffcanvasFactory.createExerciseDetailsEditor(
            currentData,
            async (updatedData) => {
                console.log('💾 Saving updated exercise details:', updatedData);
                
                if (isSessionActive) {
                    // ACTIVE SESSION: Save to session (existing behavior)
                    this.sessionService.updateExerciseDetails(exerciseName, updatedData);
                    
                    // Auto-save to server
                    try {
                        await this.autoSave(null);
                        if (window.showAlert) {
                            window.showAlert(`${exerciseName} updated`, 'success');
                        }
                    } catch (error) {
                        console.error('❌ Failed to save exercise updates:', error);
                        if (window.showAlert) {
                            window.showAlert('Failed to save changes. Please try again.', 'danger');
                        }
                    }
                } else {
                    // PRE-SESSION: Save to pre-session edits (new behavior)
                    this.sessionService.updatePreSessionExercise(exerciseName, updatedData);
                    
                    if (window.showAlert) {
                        window.showAlert(`${exerciseName} updated - changes will apply when you start the workout`, 'success');
                    }
                }
                
                // Re-render to show updated values
                this.renderWorkout();
            }
        );
    }
    
    /**
     * PHASE 1: Get current exercise data from appropriate source
     * Priority: Active Session > Pre-Session Edits > Template
     * Phase 4: Delegates to WorkoutDataManager
     * @param {string} exerciseName - Exercise name
     * @param {number} index - Exercise index
     * @returns {Object} Current exercise data
     * @private
     */
    _getCurrentExerciseData(exerciseName, index) {
        return this.workoutDataManager.getCurrentExerciseData(exerciseName, this.currentWorkout, index);
    }
    
    /**
     * Handle completing an exercise
     * @param {string} exerciseName - Exercise name
     * @param {number} index - Exercise index
     */
    handleCompleteExercise(exerciseName, index) {
        if (!this.sessionService.isSessionActive()) {
            console.warn('⚠️ Cannot complete exercise - no active session');
            return;
        }
        
        // Clear auto-complete timer since user manually completed
        this.sessionService.clearAutoCompleteTimer(exerciseName);
        
        // Mark as completed
        this.sessionService.completeExercise(exerciseName);
        
        // Re-render to show completed state
        this.renderWorkout();
        
        // Show success message
        if (window.showAlert) {
            window.showAlert(`${exerciseName} completed! 💪`, 'success');
        }
        
        // Auto-save session
        this.autoSave(null).catch(error => {
            console.error('❌ Failed to auto-save after completion:', error);
        });
        
        // Auto-advance to next exercise after short delay
        setTimeout(() => {
            this.goToNextExercise(index);
        }, 500);
    }
    
    /**
     * Handle uncompleting an exercise
     * @param {string} exerciseName - Exercise name
     * @param {number} index - Exercise index
     */
    handleUncompleteExercise(exerciseName, index) {
        if (!this.sessionService.isSessionActive()) {
            console.warn('⚠️ Cannot uncomplete exercise - no active session');
            return;
        }
        
        const modalManager = this.getModalManager();
        modalManager.confirm(
            'Uncomplete Exercise',
            `Mark <strong>${WorkoutUtils.escapeHtml(exerciseName)}</strong> as not completed?`,
            async () => {
                // Mark as not completed
                this.sessionService.uncompleteExercise(exerciseName);
                
                // Re-render to remove completed state
                this.renderWorkout();
                
                // Show message
                if (window.showAlert) {
                    window.showAlert(`${exerciseName} marked as not completed`, 'info');
                }
                
                // Auto-save session
                try {
                    await this.autoSave(null);
                } catch (error) {
                    console.error('❌ Failed to auto-save after uncomplete:', error);
                }
            }
        );
    }
    
    /**
     * Skip current exercise (called from action bar)
     * Skips the currently expanded exercise card
     */
    skipExercise() {
        if (!this.sessionService.isSessionActive()) {
            console.warn('⚠️ Cannot skip exercise - no active session');
            if (window.showAlert) {
                window.showAlert('Please start your workout session first', 'warning');
            }
            return;
        }
        
        // Find currently expanded card
        const expandedCard = document.querySelector('.exercise-card.expanded');
        
        if (!expandedCard) {
            console.warn('⚠️ No exercise card is expanded');
            if (window.showAlert) {
                window.showAlert('Please expand an exercise to skip it', 'warning');
            }
            return;
        }
        
        const exerciseIndex = parseInt(expandedCard.getAttribute('data-exercise-index'));
        const exerciseName = expandedCard.getAttribute('data-exercise-name');
        
        console.log(`⏭️ Skip button clicked for: ${exerciseName} (index: ${exerciseIndex})`);
        
        // Call existing skip handler
        this.handleSkipExercise(exerciseName, exerciseIndex);
    }
    
    /**
     * Update loading message
     * Phase 1: Delegates to WorkoutUIStateManager
     */
    updateLoadingMessage(message) {
        return this.uiStateManager.updateLoadingMessage(message);
    }
    
    /**
     * Show loading state
     * Phase 1: Delegates to WorkoutUIStateManager
     */
    showLoadingState() {
        return this.uiStateManager.showLoading('Loading...');
    }
    
    /**
     * Hide loading state
     * Phase 1: Delegates to WorkoutUIStateManager
     */
    hideLoadingState() {
        return this.uiStateManager.hideLoading();
    }
    
    /**
     * Show error state
     * Phase 1: Delegates to WorkoutUIStateManager
     */
    showError(message) {
        return this.uiStateManager.showError(message);
    }
    
    /**
     * Utility: Parse rest time
     * Phase 1: Delegates to WorkoutUtils
     */
    parseRestTime(restStr) {
        return WorkoutUtils.parseRestTime(restStr);
    }
    
    /**
     * Utility: Escape HTML
     * Phase 1: Delegates to WorkoutUtils
     */
    escapeHtml(text) {
        return WorkoutUtils.escapeHtml(text);
    }
    
    /**
     * Debug helper - shows comprehensive environment info
     * Call from console: window.workoutModeController.showDebugInfo()
     */
    showDebugInfo() {
        console.group('🔍 Workout Mode Debug Info');
        console.log('Protocol:', window.location.protocol);
        console.log('Hostname:', window.location.hostname);
        console.log('Origin:', window.location.origin);
        console.log('Full URL:', window.location.href);
        console.log('---');
        console.log('API Base URL:', window.config?.api?.baseUrl);
        console.log('Storage Mode:', this.dataManager?.storageMode);
        console.log('Is Online:', navigator.onLine);
        console.log('Is Authenticated:', this.authService?.isUserAuthenticated());
        console.log('---');
        console.log('Current Workout ID:', this.currentWorkout?.id);
        console.log('Current Workout Name:', this.currentWorkout?.name);
        console.log('Session Active:', this.sessionService?.isSessionActive());
        console.groupEnd();
        
        // Return info object for programmatic access
        return {
            protocol: window.location.protocol,
            hostname: window.location.hostname,
            origin: window.location.origin,
            apiBase: window.config?.api?.baseUrl,
            storageMode: this.dataManager?.storageMode,
            isOnline: navigator.onLine,
            isAuthenticated: this.authService?.isUserAuthenticated(),
            currentWorkoutId: this.currentWorkout?.id,
            sessionActive: this.sessionService?.isSessionActive()
        };
    }
}

// Initialize controller on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Controller DOMContentLoaded event fired');
    window.workoutModeController = new WorkoutModeController();
    console.log('🎮 Controller instance created');
    window.workoutModeController.initialize();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutModeController;
}

console.log('📦 Workout Mode Controller loaded');
