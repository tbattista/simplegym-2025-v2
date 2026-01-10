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
            onWeightUpdated: (exerciseName, weight) => {
                this.renderWorkout();
            },
            onRenderWorkout: () => this.renderWorkout(true), // Force render when explicitly requested
            onAutoSave: () => this.autoSave(null)
        });
        
        // Phase 7: Initialize Exercise Operations Manager
        this.exerciseOpsManager = new WorkoutExerciseOperationsManager({
            sessionService: this.sessionService,
            dataManager: this.dataManager,
            authService: this.authService,
            onRenderWorkout: () => this.renderWorkout(true), // Force render for exercise changes
            onAutoSave: () => this.autoSave(null),
            onGoToNext: (index) => this.goToNextExercise(index),
            onGetCurrentExerciseData: (name, index) => this._getCurrentExerciseData(name, index),
            onGetAllExerciseNames: () => this._getAllExerciseNames(),
            onGetCurrentWorkout: () => this.currentWorkout,
            onUpdateExerciseInTemplate: (exerciseName, exerciseData) => this._updateExerciseInTemplate(exerciseName, exerciseData)
        });
        
        // State
        this.currentWorkout = null;
        this.timers = {}; // Kept for backward compatibility, delegated to timerManager
        this.globalRestTimer = null; // Kept for backward compatibility, delegated to timerManager
        this.soundEnabled = localStorage.getItem('workoutSoundEnabled') !== 'false';
        this.autoSaveTimer = null;
        this.workoutListComponent = null;
        
        // Phase 5: isStartingSession moved to lifecycleManager
        
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
            
            // ✅ FIX: Track when user leaves page for accurate "time away" measurement
            // Use lastPageActive (separate from lastUpdated) to track page visibility
            // This ensures threshold check works even if user changes weights/completes exercises
            const updatePageActiveTimestamp = () => {
                const stored = localStorage.getItem('ghost_gym_active_workout_session');
                if (stored) {
                    try {
                        const sessionData = JSON.parse(stored);
                        sessionData.lastPageActive = new Date().toISOString();
                        localStorage.setItem('ghost_gym_active_workout_session', JSON.stringify(sessionData));
                        console.log('📝 Page active timestamp updated');
                    } catch (e) {
                        console.warn('⚠️ Failed to update page active timestamp:', e);
                    }
                }
            };
            
            // beforeunload: Fires on page refresh, close, navigate away
            window.addEventListener('beforeunload', updatePageActiveTimestamp);
            
            // visibilitychange: Fires on tab switch/minimize (backup for mobile)
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    updatePageActiveTimestamp();
                }
            });
            
            // ✅ CRITICAL FIX: Wait for auth state BEFORE checking persisted session
            // This ensures the correct storage mode is set before attempting auto-resume
            console.log('⏳ Waiting for initial auth state...');
            this.uiStateManager.updateLoadingMessage('Determining authentication status...');
            
            const authState = await this.dataManager.waitForAuthReady();
            console.log('✅ Auth state ready:', authState);
            console.log('   Storage mode:', authState.storageMode);
            console.log('   Authenticated:', authState.isAuthenticated);
            
            // ✨ Phase 5: Check for persisted session using lifecycleManager
            // NOW auth is ready, so storage mode is correct for workout lookup
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
            this.initializeRestTimerSetting();
            this.initializeShareButton();
            
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
    renderWorkout(forceRender = false) {
        const container = document.getElementById('exerciseCardsContainer');
        if (!container) return;
        
        // Safety check: Don't try to render if workout hasn't loaded
        if (!this.currentWorkout) {
            console.warn('⚠️ Cannot render workout: currentWorkout is undefined');
            return;
        }
        
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
        
        // Initialize inline rest timers for each exercise card
        this.initializeInlineTimers();
    }
    
    /**
     * Initialize inline rest timers for exercise cards
     * Creates InlineRestTimer instances for each card with data-inline-timer attribute
     */
    initializeInlineTimers() {
        // Clear existing inline timers
        this.timerManager.clearAllInlineTimers();
        
        // Find all inline timer containers
        const timerContainers = document.querySelectorAll('[data-inline-timer]');
        
        timerContainers.forEach(container => {
            const exerciseIndex = parseInt(container.getAttribute('data-inline-timer'));
            const restSeconds = parseInt(container.getAttribute('data-rest-seconds')) || 60;
            const restDisplay = container.getAttribute('data-rest-display') || `${restSeconds}s`;
            
            // Create inline timer instance
            if (window.InlineRestTimer) {
                const timer = new window.InlineRestTimer(exerciseIndex, restSeconds);
                
                // Set the original rest display text (e.g., "60s", "2min")
                timer.setRestDisplayText(restDisplay);
                
                // Register with timer manager for single-timer enforcement
                this.timerManager.registerInlineTimer(exerciseIndex, timer);
                
                // Render initial state
                timer.render();
                
                console.log(`⏱️ Inline timer initialized for exercise ${exerciseIndex}: ${restDisplay}`);
            }
        });
        
        console.log(`✅ Initialized ${timerContainers.length} inline timers`);
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
     * EXERCISE REORDER METHODS
     * Phase 7: Handle exercise reordering via offcanvas
     */
    
    /**
     * Show reorder exercise offcanvas
     * Allows user to reorder exercises (regular + bonus) via drag-and-drop
     */
    showReorderOffcanvas() {
        try {
            console.log('📋 Building exercise list for reorder...');
            
            // Build exercise list with current order
            const exerciseList = this.buildExerciseList();
            
            if (exerciseList.length === 0) {
                window.showAlert('No exercises to reorder', 'warning');
                return;
            }
            
            console.log('📋 Exercise list built:', exerciseList);
            
            // Create reorder offcanvas using UnifiedOffcanvasFactory
            if (!window.UnifiedOffcanvasFactory) {
                console.error('❌ UnifiedOffcanvasFactory not available');
                window.showAlert('Reorder feature not available', 'error');
                return;
            }
            
            // Create offcanvas with correct argument format
            // Note: createReorderOffcanvas() already calls show() internally with proper timing
            const result = window.UnifiedOffcanvasFactory.createReorderOffcanvas(
                exerciseList,
                (reorderedExercises) => {
                    console.log('💾 Saving new exercise order:', reorderedExercises);
                    // Extract exercise names from reordered exercise objects
                    const newOrder = reorderedExercises.map(ex => ex.name);
                    this.applyExerciseOrder(newOrder);
                }
            );
            
            // Verify offcanvas was created successfully
            // Don't call show() here - createOffcanvas already handles that with proper timing
            if (!result) {
                console.error('❌ Failed to create reorder offcanvas');
                window.showAlert('Failed to open reorder panel', 'error');
            }
            
        } catch (error) {
            console.error('❌ Error showing reorder offcanvas:', error);
            window.showAlert('Failed to open reorder panel', 'error');
        }
    }
    
    /**
     * Build exercise list for reorder offcanvas
     * Combines regular exercises and bonus exercises with current custom order applied
     * @returns {Array} Array of exercise objects with name and isBonus properties
     */
    buildExerciseList() {
        const exerciseList = [];
        
        // Gather regular exercises from workout template
        if (this.currentWorkout?.exercise_groups && this.currentWorkout.exercise_groups.length > 0) {
            this.currentWorkout.exercise_groups.forEach((group) => {
                const exerciseName = group.exercises?.a;
                if (exerciseName) {
                    exerciseList.push({
                        name: exerciseName,
                        isBonus: false
                    });
                }
            });
        }
        
        // Gather bonus exercises from session
        const bonusExercises = this.sessionService.getBonusExercises();
        if (bonusExercises && bonusExercises.length > 0) {
            bonusExercises.forEach((bonus) => {
                exerciseList.push({
                    name: bonus.name,
                    isBonus: true
                });
            });
        }
        
        // Apply current custom order if exists
        const customOrder = this.sessionService.getExerciseOrder();
        if (customOrder.length > 0) {
            console.log('📋 Applying current custom order:', customOrder);
            
            // Reorder based on current custom order
            const orderedList = [];
            customOrder.forEach(name => {
                const exercise = exerciseList.find(ex => ex.name === name);
                if (exercise) {
                    orderedList.push(exercise);
                }
            });
            
            // Add any exercises not in custom order (safety check)
            exerciseList.forEach(ex => {
                if (!customOrder.includes(ex.name)) {
                    orderedList.push(ex);
                }
            });
            
            return orderedList;
        }
        
        return exerciseList;
    }
    
    /**
     * Apply new exercise order
     * Saves order to session and re-renders workout
     * @param {Array} newOrder - Array of exercise names in new order
     */
    applyExerciseOrder(newOrder) {
        try {
            // Validate input
            if (!Array.isArray(newOrder) || newOrder.length === 0) {
                console.error('❌ Invalid order array:', newOrder);
                window.showAlert('Invalid exercise order', 'error');
                return;
            }
            
            console.log('✅ Applying new exercise order:', newOrder);
            
            // TIMER FIX: Preserve timer state before re-render
            // The timer display can be reset during DOM manipulation in renderWorkout()
            const timerDisplay = document.getElementById('floatingTimer');
            const preservedTime = timerDisplay ? timerDisplay.textContent : null;
            const isSessionActive = this.sessionService.isSessionActive();
            
            if (isSessionActive && preservedTime) {
                console.log('🕐 Preserving timer state before reorder:', preservedTime);
            }
            
            // Save to session service
            this.sessionService.setExerciseOrder(newOrder);
            
            // Re-render workout with new order
            this.renderWorkout(true); // Force render
            
            // TIMER FIX: Restore timer state if it was inadvertently cleared
            if (isSessionActive && preservedTime && timerDisplay) {
                const currentTime = timerDisplay.textContent;
                if (currentTime === '00:00' && preservedTime !== '00:00') {
                    timerDisplay.textContent = preservedTime;
                    console.log('🔄 Timer restored after reorder:', preservedTime);
                }
            }
            
            // Show success feedback
            window.showAlert('Exercise order updated successfully', 'success');
            
            // Auto-save if session is active
            if (this.sessionService.isSessionActive()) {
                console.log('💾 Auto-saving session with new order...');
                this.autoSave(null);
            }
            
            console.log('✅ Exercise order applied successfully');
            
        } catch (error) {
            console.error('❌ Error applying exercise order:', error);
            window.showAlert('Failed to update exercise order', 'error');
        }
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
    
    /**
     * Initialize rest timer setting
     * Ensures rest timer respects enabled/disabled state on page load
     */
    initializeRestTimerSetting() {
        // Rest timer will be initialized by timerManager.initializeGlobalTimer()
        // during renderWorkout(), but we ensure the setting is ready
        const enabled = localStorage.getItem('workoutRestTimerEnabled') !== 'false';
        console.log(`🕐 Rest timer setting initialized: ${enabled ? 'enabled' : 'disabled'}`);
        
        // The actual timer initialization happens in timerManager during renderWorkout()
        // This method just ensures the setting is logged and ready
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
     * Handle skipping an exercise
     * Phase 7: Delegates to WorkoutExerciseOperationsManager
     * @param {string} exerciseName - Exercise name
     * @param {number} index - Exercise index
     */
    handleSkipExercise(exerciseName, index) {
        return this.exerciseOpsManager.handleSkipExercise(exerciseName, index);
    }
    
    /**
     * Handle unskipping an exercise
     * Phase 7: Delegates to WorkoutExerciseOperationsManager
     * @param {string} exerciseName - Exercise name
     * @param {number} index - Exercise index
     */
    handleUnskipExercise(exerciseName, index) {
        return this.exerciseOpsManager.handleUnskipExercise(exerciseName, index);
    }
    
    /**
     * Handle replacing an exercise (skip + add new)
     * Phase 7: Delegates to WorkoutExerciseOperationsManager
     * @param {string} exerciseName - Exercise name to replace
     * @param {number} index - Exercise index
     */
    async handleReplaceExercise(exerciseName, index) {
        return await this.exerciseOpsManager.handleReplaceExercise(exerciseName, index);
    }
    
    /**
     * Handle editing an exercise's details (sets, reps, rest, weight)
     * Phase 7: Delegates to WorkoutExerciseOperationsManager
     * @param {string} exerciseName - Exercise name
     * @param {number} index - Exercise index
     */
    handleEditExercise(exerciseName, index) {
        return this.exerciseOpsManager.handleEditExercise(exerciseName, index);
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
     * Update a single exercise in the workout template
     * Called when user enables "Update Template" toggle in exercise edit offcanvas
     * @param {string} exerciseName - Exercise name to update
     * @param {Object} exerciseData - Updated exercise data (sets, reps, rest, weight, weightUnit)
     * @returns {Promise<boolean>} Success status
     * @private
     */
    async _updateExerciseInTemplate(exerciseName, exerciseData) {
        if (!this.currentWorkout) {
            console.warn('⚠️ Cannot update template - no current workout');
            return false;
        }
        
        return await this.workoutDataManager.updateExerciseInTemplate(
            this.currentWorkout,
            exerciseName,
            exerciseData
        );
    }
    
    /**
     * Handle completing an exercise
     * Phase 7: Delegates to WorkoutExerciseOperationsManager
     * @param {string} exerciseName - Exercise name
     * @param {number} index - Exercise index
     */
    handleCompleteExercise(exerciseName, index) {
        return this.exerciseOpsManager.handleCompleteExercise(exerciseName, index);
    }
    
    /**
     * Handle uncompleting an exercise
     * Phase 7: Delegates to WorkoutExerciseOperationsManager
     * @param {string} exerciseName - Exercise name
     * @param {number} index - Exercise index
     */
    handleUncompleteExercise(exerciseName, index) {
        return this.exerciseOpsManager.handleUncompleteExercise(exerciseName, index);
    }
    
    /**
     * Skip current exercise (called from action bar)
     * Phase 7: Delegates to WorkoutExerciseOperationsManager
     */
    skipExercise() {
        return this.exerciseOpsManager.skipExercise();
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
     * Get all exercise names in their current render order
     * Used for updating pre-session exercise order during replacements
     * @returns {string[]} Array of exercise names in current order
     * @private
     */
    _getAllExerciseNames() {
        const exerciseNames = [];
        
        // Build combined exercise list (same logic as renderWorkout)
        const allExercises = [];
        
        // Add regular exercises
        if (this.currentWorkout?.exercise_groups && this.currentWorkout.exercise_groups.length > 0) {
            this.currentWorkout.exercise_groups.forEach((group) => {
                const exerciseName = group.exercises?.a;
                if (exerciseName) {
                    allExercises.push({
                        type: 'regular',
                        name: exerciseName
                    });
                }
            });
        }
        
        // Add bonus exercises
        const bonusExercises = this.sessionService.getBonusExercises();
        if (bonusExercises && bonusExercises.length > 0) {
            bonusExercises.forEach((bonus) => {
                allExercises.push({
                    type: 'bonus',
                    name: bonus.name
                });
            });
        }
        
        // Apply custom order if exists (same logic as renderWorkout)
        const customOrder = this.sessionService.getExerciseOrder();
        if (customOrder.length > 0) {
            // Reorder exercises based on custom order
            const orderedExercises = [];
            customOrder.forEach(name => {
                const exercise = allExercises.find(ex => ex.name === name);
                if (exercise) {
                    orderedExercises.push(exercise);
                }
            });
            
            // Add any exercises not in custom order (safety)
            allExercises.forEach(ex => {
                if (!customOrder.includes(ex.name)) {
                    orderedExercises.push(ex);
                }
            });
            
            // Extract names from ordered list
            return orderedExercises.map(ex => ex.name);
        }
        
        // No custom order - return in default order
        return allExercises.map(ex => ex.name);
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
