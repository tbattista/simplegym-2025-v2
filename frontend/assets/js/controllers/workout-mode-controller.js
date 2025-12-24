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
        
        // State
        this.currentWorkout = null;
        this.timers = {};
        this.globalRestTimer = null;
        this.soundEnabled = localStorage.getItem('workoutSoundEnabled') !== 'false';
        this.autoSaveTimer = null;
        this.workoutListComponent = null;
        
        // 🔧 FIX: Add state flag to prevent concurrent session creation
        this.isStartingSession = false;
        
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
     */
    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
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
            this.updateLoadingMessage('Initializing authentication...');
            
            // Setup bonus exercise button handler
            this.setupBonusExerciseButton();
            
            // Setup auth state listener (reuse existing service)
            this.authService.onAuthStateChange((user) => {
                this.handleAuthStateChange(user);
            });
            
            // ✨ SESSION PERSISTENCE: Check for persisted session FIRST
            const persistedSession = this.sessionService.restoreSession();
            
            if (persistedSession) {
                console.log('🔄 Found persisted session, showing resume prompt...');
                await this.showResumeSessionPrompt(persistedSession);
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
            this.updateLoadingMessage('Determining authentication status...');
            
            const authState = await this.dataManager.waitForAuthReady();
            console.log('✅ Auth state ready:', authState);
            console.log('   Storage mode:', authState.storageMode);
            console.log('   Authenticated:', authState.isAuthenticated);
            
            // Update loading message based on auth state
            if (authState.isAuthenticated) {
                this.updateLoadingMessage('Loading workout from cloud...');
            } else {
                this.updateLoadingMessage('Loading workout...');
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
            this.showError(error.message);
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
            this.showLoadingState();
            
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
            
            // Render workout (now has history available)
            this.renderWorkout();
            
            // Initialize start button tooltip
            await this.initializeStartButtonTooltip();
            
            // Hide loading, show content
            this.hideLoadingState();
            
            console.log('✅ Workout loaded:', this.currentWorkout.name);
            
        } catch (error) {
            console.error('❌ Error loading workout:', error);
            this.showError(error.message);
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
        
        // Initialize global rest timer
        this.initializeGlobalRestTimer();
        
        // Initialize individual timers (will be removed later)
        this.initializeTimers();
        
        // PHASE 2: Initialize drag-and-drop reordering
        this.initializeSortable();
    }
    
    /**
     * Initialize timers
     */
    initializeTimers() {
        const timerElements = document.querySelectorAll('.rest-timer[data-timer-id]');
        
        timerElements.forEach(element => {
            const timerId = element.getAttribute('data-timer-id');
            const restSeconds = parseInt(element.getAttribute('data-rest-seconds')) || 60;
            
            // Use existing RestTimer class from workout-mode.js
            const timer = new RestTimer(timerId, restSeconds);
            this.timers[timerId] = timer;
            timer.render();
        });
    }
    
    /**
     * Initialize global rest timer
     */
    initializeGlobalRestTimer() {
        // Wait for global rest timer to be available from bottom action bar service
        if (window.globalRestTimer) {
            this.globalRestTimer = window.globalRestTimer;
            console.log('✅ Global rest timer connected to controller');
            
            // Sync with first expanded card if any
            this.syncGlobalTimerWithExpandedCard();
        } else {
            // Try again after a short delay
            setTimeout(() => {
                if (window.globalRestTimer) {
                    this.globalRestTimer = window.globalRestTimer;
                    console.log('✅ Global rest timer connected to controller (delayed)');
                    this.syncGlobalTimerWithExpandedCard();
                } else {
                    console.warn('⚠️ Global rest timer still not available after delay');
                }
            }, 500);
        }
    }
    
    /**
     * Sync global timer with currently expanded exercise card
     */
    syncGlobalTimerWithExpandedCard() {
        if (!this.globalRestTimer || !this.currentWorkout) return;
        
        // Find currently expanded card
        const expandedCard = document.querySelector('.exercise-card.expanded');
        if (!expandedCard) return;
        
        const exerciseIndex = parseInt(expandedCard.getAttribute('data-exercise-index'));
        const exerciseGroup = this.getExerciseGroupByIndex(exerciseIndex);
        
        if (exerciseGroup) {
            const restSeconds = this.parseRestTime(exerciseGroup.rest || '60s');
            this.globalRestTimer.syncWithCard(exerciseIndex, restSeconds);
            console.log(`🔄 Global timer synced with exercise ${exerciseIndex}: ${restSeconds}s`);
        }
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
     * Get exercise group by index
     */
    getExerciseGroupByIndex(index) {
        // Check regular exercise groups first
        if (this.currentWorkout.exercise_groups && index < this.currentWorkout.exercise_groups.length) {
            return this.currentWorkout.exercise_groups[index];
        }
        
        // Check bonus exercises
        const bonusExercises = this.sessionService.getBonusExercises();
        const bonusIndex = index - (this.currentWorkout.exercise_groups?.length || 0);
        if (bonusExercises && bonusIndex >= 0 && bonusIndex < bonusExercises.length) {
            const bonus = bonusExercises[bonusIndex];
            return {
                exercises: { a: bonus.name },
                sets: bonus.sets,
                reps: bonus.reps,
                rest: bonus.rest || '60s',
                default_weight: bonus.weight,
                default_weight_unit: bonus.weight_unit || 'lbs'
            };
        }
        
        return null;
    }
    
    /**
     * Handle weight button click
     */
    handleWeightButtonClick(button) {
        const exerciseName = button.getAttribute('data-exercise-name');
        const currentWeight = button.getAttribute('data-current-weight');
        const currentUnit = button.getAttribute('data-current-unit');
        const lastWeight = button.getAttribute('data-last-weight');
        const lastWeightUnit = button.getAttribute('data-last-weight-unit');
        const lastSessionDate = button.getAttribute('data-last-session-date');
        const isSessionActive = button.getAttribute('data-is-session-active') === 'true';
        
        this.showWeightModal(exerciseName, currentWeight, currentUnit, lastWeight, lastWeightUnit, lastSessionDate, isSessionActive);
    }
    
    /**
     * Show weight modal (now delegates to factory)
     */
    showWeightModal(exerciseName, currentWeight, currentUnit, lastWeight, lastWeightUnit, lastSessionDate, isSessionActive) {
        // Use the unified factory to create the offcanvas
        window.UnifiedOffcanvasFactory.createWeightEdit(exerciseName, {
            currentWeight,
            currentUnit,
            lastWeight,
            lastWeightUnit,
            lastSessionDate,
            isSessionActive
        });
    }
    
    
    /**
     * Auto-save session
     */
    async autoSave(card) {
        try {
            const exercisesPerformed = this.collectExerciseData();
            await this.sessionService.autoSaveSession(exercisesPerformed);
            
            if (card) {
                this.showSaveIndicator(card, 'success');
            }
            
            console.log('✅ Auto-save successful');
            
        } catch (error) {
            console.error('❌ Auto-save failed:', error);
            if (card) {
                this.showSaveIndicator(card, 'error');
            }
        }
    }
    
    /**
     * Show save indicator
     */
    showSaveIndicator(card, state) {
        if (!card) return;
        
        const saveIndicator = card.querySelector('.save-indicator');
        const saveSuccess = card.querySelector('.save-success');
        
        if (!saveIndicator || !saveSuccess) return;
        
        saveIndicator.style.display = 'none';
        saveSuccess.style.display = 'none';
        
        switch (state) {
            case 'saving':
                saveIndicator.style.display = 'inline-block';
                break;
            case 'success':
                saveSuccess.style.display = 'inline-block';
                setTimeout(() => {
                    saveSuccess.style.display = 'none';
                }, 2000);
                break;
        }
    }
    
    /**
     * Collect exercise data for session
     * 🔧 ENHANCED: Added validation and logging for bonus exercises
     */
    collectExerciseData() {
        const exercisesPerformed = [];
        let orderIndex = 0;
        
        console.log('📊 Collecting exercise data for session...');
        
        // Collect from exercise groups
        if (this.currentWorkout.exercise_groups) {
            this.currentWorkout.exercise_groups.forEach((group, groupIndex) => {
                const mainExercise = group.exercises?.a;
                if (!mainExercise) return;
                
                const exerciseData = this.sessionService.getExerciseWeight(mainExercise);
                const history = this.sessionService.getExerciseHistory(mainExercise);
                
                // PHASE 1: Use nullish coalescing to preserve template defaults
                // Support both numeric and text weights (Body, BW+25, 4x45, etc.)
                const finalWeight = exerciseData?.weight ?? group.default_weight ?? null;
                const finalUnit = exerciseData?.weight_unit || group.default_weight_unit || 'lbs';
                
                // 🔧 FIX: Read sets/reps/rest from session first, then fall back to template
                const finalSets = exerciseData?.target_sets || group.sets || '3';
                const finalReps = exerciseData?.target_reps || group.reps || '8-12';
                const finalRest = exerciseData?.rest || group.rest || '60s';
                
                // PHASE 3: Calculate weight change properly
                const previousWeight = history?.last_weight || null;
                let weightChange = null;
                if (finalWeight !== null && previousWeight !== null && typeof finalWeight === 'number' && typeof previousWeight === 'number') {
                    weightChange = finalWeight - previousWeight;
                }
                
                exercisesPerformed.push({
                    exercise_name: mainExercise,
                    exercise_id: null,
                    group_id: group.group_id || `group-${groupIndex}`,
                    sets_completed: parseInt(finalSets) || 0,
                    target_sets: finalSets,
                    target_reps: finalReps,
                    rest: finalRest,  // 🔧 FIX: Include rest in session data
                    weight: finalWeight,  // Can be string or null
                    weight_unit: finalUnit,
                    previous_weight: previousWeight,
                    weight_change: weightChange,  // PHASE 3: Calculated from current - previous
                    order_index: orderIndex++,
                    is_bonus: false,
                    is_modified: exerciseData?.is_modified || false,  // PHASE 1
                    is_skipped: exerciseData?.is_skipped || false,    // PHASE 2
                    skip_reason: exerciseData?.skip_reason || null    // PHASE 2
                });
            });
        }
        
        console.log('✅ Collected', exercisesPerformed.length, 'regular exercises');
        
        // 🔧 FIX: Collect from SESSION bonus exercises with enhanced validation
        const bonusExercises = this.sessionService.getBonusExercises();
        console.log('🔍 Checking for bonus exercises...');
        console.log('  getBonusExercises() returned:', bonusExercises?.length || 0, 'exercises');
        
        if (bonusExercises && bonusExercises.length > 0) {
            console.log('📋 Processing', bonusExercises.length, 'bonus exercises:');
            
            bonusExercises.forEach((bonus, bonusIndex) => {
                const exerciseName = bonus.name || bonus.exercise_name;
                console.log(`  ${bonusIndex + 1}. ${exerciseName}`);
                
                const exerciseData = this.sessionService.getExerciseWeight(exerciseName);
                const history = this.sessionService.getExerciseHistory(exerciseName);
                
                // PHASE 1: Use nullish coalescing for bonus exercises too
                // Support both numeric and text weights
                const finalWeight = exerciseData?.weight ?? bonus.weight ?? null;
                
                // 🔧 FIX: Read sets/reps/rest from session first, then fall back to bonus template
                const finalSets = exerciseData?.target_sets || bonus.sets || bonus.target_sets || '3';
                const finalReps = exerciseData?.target_reps || bonus.reps || bonus.target_reps || '12';
                const finalRest = exerciseData?.rest || bonus.rest || '60s';
                
                // PHASE 3: Calculate weight change properly
                const previousWeight = history?.last_weight || null;
                let weightChange = null;
                if (finalWeight !== null && previousWeight !== null && typeof finalWeight === 'number' && typeof previousWeight === 'number') {
                    weightChange = finalWeight - previousWeight;
                }
                
                const bonusExerciseData = {
                    exercise_name: exerciseName,
                    exercise_id: null,
                    group_id: `bonus-${bonusIndex}`,
                    sets_completed: parseInt(finalSets) || 0,
                    target_sets: finalSets,
                    target_reps: finalReps,
                    rest: finalRest,  // 🔧 FIX: Include rest in session data
                    weight: finalWeight,  // Can be string or null
                    weight_unit: exerciseData?.weight_unit || bonus.weight_unit || 'lbs',
                    previous_weight: previousWeight,
                    weight_change: weightChange,  // PHASE 3: Calculated from current - previous
                    order_index: orderIndex++,
                    is_bonus: true,
                    is_modified: exerciseData?.is_modified || false,
                    is_skipped: exerciseData?.is_skipped || false,    // PHASE 2
                    skip_reason: exerciseData?.skip_reason || null    // PHASE 2
                };
                
                exercisesPerformed.push(bonusExerciseData);
                console.log(`     ✅ Added: ${exerciseName} (order: ${bonusExerciseData.order_index})`);
            });
            
            console.log('✅ Collected', bonusExercises.length, 'bonus exercises');
        } else {
            console.log('ℹ️ No bonus exercises to collect');
        }
        
        console.log('📊 Total exercises collected:', exercisesPerformed.length);
        console.log('   Regular:', exercisesPerformed.filter(e => !e.is_bonus).length);
        console.log('   Bonus:', exercisesPerformed.filter(e => e.is_bonus).length);
        
        return exercisesPerformed;
    }
    
    /**
     * Update workout template with final weights from completed session
     * This ensures the workout builder shows the most recent weights
     */
    async updateWorkoutTemplateWeights(exercisesPerformed) {
        try {
            if (!this.currentWorkout || !exercisesPerformed || exercisesPerformed.length === 0) {
                console.log('⏭️ Skipping template weight update - no data to update');
                return;
            }
            
            console.log('🔄 Updating workout template with final weights...');
            
            // Create a map of exercise names to their weights
            const weightMap = new Map();
            exercisesPerformed.forEach(exercise => {
                if (exercise.weight) {
                    weightMap.set(exercise.exercise_name, {
                        weight: exercise.weight,
                        weight_unit: exercise.weight_unit || 'lbs'
                    });
                }
            });
            
            // Update exercise groups with new weights
            let updated = false;
            if (this.currentWorkout.exercise_groups) {
                this.currentWorkout.exercise_groups.forEach(group => {
                    const mainExercise = group.exercises?.a;
                    if (mainExercise && weightMap.has(mainExercise)) {
                        const weightData = weightMap.get(mainExercise);
                        group.default_weight = weightData.weight;
                        group.default_weight_unit = weightData.weight_unit;
                        updated = true;
                        console.log(`✅ Updated ${mainExercise}: ${weightData.weight} ${weightData.weight_unit}`);
                    }
                });
            }
            
            // Update bonus exercises with new weights
            if (this.currentWorkout.bonus_exercises) {
                this.currentWorkout.bonus_exercises.forEach(bonus => {
                    if (bonus.name && weightMap.has(bonus.name)) {
                        const weightData = weightMap.get(bonus.name);
                        bonus.default_weight = weightData.weight;
                        bonus.default_weight_unit = weightData.weight_unit;
                        updated = true;
                        console.log(`✅ Updated bonus ${bonus.name}: ${weightData.weight} ${weightData.weight_unit}`);
                    }
                });
            }
            
            // Save updated workout template to database
            if (updated) {
                await this.dataManager.updateWorkout(this.currentWorkout.id, this.currentWorkout);
                console.log('✅ Workout template weights updated successfully');
            } else {
                console.log('ℹ️ No weights to update in template');
            }
            
        } catch (error) {
            console.error('❌ Error updating workout template weights:', error);
            // Don't throw - this is a non-critical enhancement
            // The workout completion should still succeed even if template update fails
        }
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
     */
    async initializeStartButtonTooltip() {
        const startBtn = document.getElementById('startWorkoutBtn');
        if (!startBtn) return;
        
        // Destroy existing tooltip
        const existingTooltip = window.bootstrap?.Tooltip?.getInstance(startBtn);
        if (existingTooltip) {
            existingTooltip.dispose();
        }
        
        // Check if user is authenticated
        const isAuthenticated = this.authService.isUserAuthenticated();
        
        if (isAuthenticated) {
            startBtn.setAttribute('data-bs-original-title', 'Start tracking your workout with weight logging');
            startBtn.classList.remove('btn-outline-primary');
            startBtn.classList.add('btn-primary');
        } else {
            startBtn.setAttribute('data-bs-original-title', '🔒 Log in to track weights and save progress');
            startBtn.classList.remove('btn-primary');
            startBtn.classList.add('btn-outline-primary');
        }
        
        // Initialize Bootstrap tooltip
        if (window.bootstrap && window.bootstrap.Tooltip) {
            new window.bootstrap.Tooltip(startBtn);
        }
    }
    
    /**
     * Handle start workout
     */
    async handleStartWorkout() {
        if (!this.currentWorkout) {
            console.error('No workout loaded');
            return;
        }
        
        // 🔧 FIX: Prevent concurrent session creation using state flag
        if (this.isStartingSession) {
            console.log('🚫 Session already being created, ignoring click');
            return;
        }
        
        // Check if user is authenticated (reuse existing service)
        if (!this.authService.isUserAuthenticated()) {
            this.showLoginPrompt();
            return;
        }
        
        try {
            // Set flag to prevent concurrent calls
            this.isStartingSession = true;
            
            // ✨ SESSION PERSISTENCE: Check if there's a different persisted session
            const persistedSession = this.sessionService.restoreSession();
            if (persistedSession && persistedSession.workoutId !== this.currentWorkout.id) {
                const modalManager = this.getModalManager();
                modalManager.confirm(
                    'Active Session Found',
                    `You have an active session for <strong>${this.escapeHtml(persistedSession.workoutName)}</strong>. Starting a new workout will end that session. Continue?`,
                    async () => {
                        // User chose to start fresh - clear old session and start new one
                        this.sessionService.clearPersistedSession();
                        await this.startNewSession();
                    },
                    () => {
                        // User cancelled - reset flag
                        this.isStartingSession = false;
                    }
                );
                return;
            }
            
            await this.startNewSession();
            
        } catch (error) {
            console.error('❌ Error starting workout:', error);
            this.isStartingSession = false;
            
            const modalManager = this.getModalManager();
            modalManager.alert('Error', error.message, 'danger');
        }
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
     * Start a new workout session (extracted for reuse)
     */
    async startNewSession() {
        try {
            // PHASE 1: Pass workout data to pre-populate exercises
            // 🔧 FIXED: Transfer happens INSIDE startSession() now
            await this.sessionService.startSession(
                this.currentWorkout.id,
                this.currentWorkout.name,
                this.currentWorkout  // Pass full workout data for template initialization
            );
            
            // Fetch exercise history
            await this.sessionService.fetchExerciseHistory(this.currentWorkout.id);
            
            // Update UI
            this.updateSessionUI(true);
            
            // Re-render to show weight inputs and transferred bonus exercises
            this.renderWorkout();
            
            // Auto-expand first exercise card after render completes
            setTimeout(() => {
                this.expandFirstExerciseCard();
            }, 300);
            
            // Show success (reuse existing modal manager)
            if (window.showAlert) {
                window.showAlert('Workout session started! 💪', 'success');
            }
            
        } catch (error) {
            console.error('❌ Error starting workout:', error);
            const modalManager = this.getModalManager();
            modalManager.alert('Error', error.message, 'danger');
        }
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
     */
    async handleCompleteWorkout() {
        // Show bottom offcanvas for workout completion (Sneat standard)
        this.showCompleteWorkoutOffcanvas();
    }
    
    /**
     * Show complete workout offcanvas (now uses factory)
     */
    showCompleteWorkoutOffcanvas() {
        const session = this.sessionService.getCurrentSession();
        if (!session) return;
        
        // Calculate session stats
        const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const exerciseCount = this.currentWorkout?.exercise_groups?.length || 0;
        const bonusCount = this.currentWorkout?.bonus_exercises?.length || 0;
        const totalExercises = exerciseCount + bonusCount;
        
        // Use unified factory to create offcanvas
        window.UnifiedOffcanvasFactory.createCompleteWorkout({
            workoutName: this.currentWorkout.name,
            minutes,
            totalExercises
        }, async () => {
            const exercisesPerformed = this.collectExerciseData();
            const completedSession = await this.sessionService.completeSession(exercisesPerformed);
            await this.updateWorkoutTemplateWeights(exercisesPerformed);
            this.showCompletionSummary(completedSession);
        });
    }
    
    /**
     * Show completion summary (now uses factory)
     */
    showCompletionSummary(session) {
        window.UnifiedOffcanvasFactory.createCompletionSummary({
            duration: session.duration_minutes || 0,
            exerciseCount: session.exercises_performed?.length || 0,
            workoutId: this.currentWorkout?.id  // Pass workout ID for history link
        });
    }
    
    /**
     * Show login prompt
     */
    showLoginPrompt() {
        const modalHtml = `
            <div class="modal fade" id="loginPromptModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header border-0 pb-0">
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body text-center pt-0">
                            <div class="mb-4">
                                <i class="bx bx-lock-alt" style="font-size: 4rem; color: var(--bs-primary);"></i>
                            </div>
                            <h4 class="mb-3">Login Required</h4>
                            <p class="text-muted mb-4">You need to be logged in to track your workouts and save weight progress.</p>
                            
                            <div class="mb-4">
                                <p class="mb-3"><strong>With an account you can:</strong></p>
                                <ul class="list-unstyled text-start" style="max-width: 300px; margin: 0 auto;">
                                    <li class="mb-2">
                                        <i class="bx bx-check-circle text-success me-2"></i>
                                        Track weight progress
                                    </li>
                                    <li class="mb-2">
                                        <i class="bx bx-check-circle text-success me-2"></i>
                                        Save workout history
                                    </li>
                                    <li class="mb-2">
                                        <i class="bx bx-check-circle text-success me-2"></i>
                                        See personal records
                                    </li>
                                    <li class="mb-2">
                                        <i class="bx bx-check-circle text-success me-2"></i>
                                        Auto-save during workouts
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div class="modal-footer border-0 justify-content-center">
                            <button type="button" class="btn btn-primary" onclick="window.authService.showLoginModal(); bootstrap.Modal.getInstance(document.getElementById('loginPromptModal')).hide();">
                                <i class="bx bx-log-in me-2"></i>Log In
                            </button>
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('loginPromptModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Initialize Bootstrap modal
        const modalElement = document.getElementById('loginPromptModal');
        const modal = new window.bootstrap.Modal(modalElement);
        
        // Cleanup modal on hide
        modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
        });
        
        // Show modal
        modal.show();
    }
    
    /**
     * SESSION PERSISTENCE METHODS
     * Handle resuming interrupted workout sessions
     */
    
    /**
     * Show resume session prompt (now uses factory)
     * @param {Object} sessionData - Persisted session data
     */
    async showResumeSessionPrompt(sessionData) {
        // Calculate elapsed time
        const startedAt = new Date(sessionData.startedAt);
        const elapsedMinutes = Math.floor((Date.now() - startedAt.getTime()) / (1000 * 60));
        const elapsedHours = Math.floor(elapsedMinutes / 60);
        const remainingMinutes = elapsedMinutes % 60;
        
        // Format elapsed time display
        const elapsedDisplay = elapsedHours > 0
            ? `${elapsedHours}h ${remainingMinutes}m ago`
            : `${elapsedMinutes} minutes ago`;
        
        // Count exercises with weights
        const exercisesWithWeights = Object.keys(sessionData.exercises || {})
            .filter(name => sessionData.exercises[name].weight).length;
        const totalExercises = Object.keys(sessionData.exercises || {}).length;
        
        // Use unified factory to create offcanvas
        window.UnifiedOffcanvasFactory.createResumeSession({
            workoutName: sessionData.workoutName,
            elapsedDisplay,
            exercisesWithWeights,
            totalExercises
        },
        async () => await this.resumeSession(sessionData),
        () => {
            this.sessionService.clearPersistedSession();
            setTimeout(() => this.initialize(), 300);
        });
    }
    
    /**
     * Resume a persisted session
     * @param {Object} sessionData - Persisted session data
     */
    async resumeSession(sessionData) {
        try {
            console.log('🔄 Resuming workout session...');
            
            // Restore session to service
            this.sessionService.currentSession = {
                id: sessionData.sessionId,
                workoutId: sessionData.workoutId,
                workoutName: sessionData.workoutName,
                startedAt: new Date(sessionData.startedAt),
                status: sessionData.status,
                exercises: sessionData.exercises || {}
            };
            
            // Load the workout
            await this.loadWorkout(sessionData.workoutId);
            
            // Update UI to show active session
            this.updateSessionUI(true);
            
            // Start timer (will calculate from original start time)
            this.startSessionTimer();
            
            // Calculate elapsed time for display
            const elapsedMinutes = Math.floor(
                (Date.now() - this.sessionService.currentSession.startedAt.getTime()) / (1000 * 60)
            );
            
            // Show success message
            if (window.showAlert) {
                window.showAlert(
                    `Workout resumed! You've been working out for ${elapsedMinutes} minutes.`,
                    'success'
                );
            }
            
            console.log('✅ Session resumed successfully');
            
        } catch (error) {
            console.error('❌ Error resuming session:', error);
            
            // Clear invalid session
            this.sessionService.clearPersistedSession();
            
            // Show error and redirect
            this.showError('Failed to resume workout. The workout may have been deleted.');
            
            setTimeout(() => {
                window.location.href = 'workout-database.html';
            }, 3000);
            
            throw error;
        }
    }
    
    /**
     * BONUS EXERCISE METHODS
     * Handle bonus exercise modal and management
     * UPDATED: Now uses two-offcanvas approach (Add Exercise + Exercise Search)
     */
    
    /**
     * Handle bonus exercises button click
     * Now works BEFORE and DURING workout session
     */
    async handleBonusExercises() {
        await this.showAddExerciseForm();
    }
    
    /**
     * Show add exercise form (new two-offcanvas approach)
     * Opens the Add Exercise form with search button integration
     */
    async showAddExerciseForm() {
        try {
            window.UnifiedOffcanvasFactory.createExerciseGroupEditor(
                {
                    mode: 'single',
                    title: 'Add Bonus Exercise',
                    exercises: { a: '', b: '', c: '' },
                    sets: '3',
                    reps: '12',
                    rest: '60s',
                    weight: '',
                    weightUnit: 'lbs',
                    isNew: true
                },
                // onSave callback
                async (groupData) => {
                    // Handle adding exercise with weight data
                    this.sessionService.addBonusExercise({
                        name: groupData.exercises.a,
                        sets: groupData.sets || '3',
                        reps: groupData.reps || '12',
                        rest: groupData.rest || '60s',
                        weight: groupData.default_weight || '',
                        weight_unit: groupData.default_weight_unit || 'lbs'
                    });
                    this.renderWorkout();
                    
                    const message = !this.sessionService.isSessionActive()
                        ? `${groupData.exercises.a} added! It will be included when you start the workout. 💪`
                        : `${groupData.exercises.a} added to your workout! 💪`;
                    if (window.showAlert) window.showAlert(message, 'success');
                },
                // onDelete callback (not used in single mode)
                async () => {
                    console.warn('⚠️ Delete not applicable in single mode');
                },
                // onSearchClick callback
                (slotKey, populateCallback) => {
                    // Open Exercise Search offcanvas
                    this.showExerciseSearchOffcanvas(populateCallback);
                }
            );
        } catch (error) {
            console.error('❌ Error showing add exercise form:', error);
            const modalManager = this.getModalManager();
            modalManager.alert('Error', 'Failed to load add exercise form. Please try again.', 'danger');
        }
    }
    
    /**
     * Show exercise search offcanvas
     * Opens the standalone exercise search interface
     * @param {Function} populateCallback - Callback to populate the Add Exercise form with selected exercise
     */
    showExerciseSearchOffcanvas(populateCallback) {
        try {
            window.UnifiedOffcanvasFactory.createExerciseSearchOffcanvas(
                {
                    title: 'Search Exercise Library',
                    showFilters: true,
                    buttonText: 'Select',
                    buttonIcon: 'bx-check'
                },
                (selectedExercise) => {
                    // Exercise selected from search
                    // Populate the Add Exercise form via callback
                    populateCallback(selectedExercise);
                    
                    console.log('✅ Exercise selected:', selectedExercise.name);
                }
            );
        } catch (error) {
            console.error('❌ Error showing exercise search:', error);
            const modalManager = this.getModalManager();
            modalManager.alert('Error', 'Failed to load exercise search. Please try again.', 'danger');
        }
    }
    
    /**
     * Show bonus exercise modal (DEPRECATED - kept for backward compatibility)
     * Use showAddExerciseForm() instead
     */
    async showBonusExerciseModal() {
        console.warn('⚠️ showBonusExerciseModal() is deprecated, use showAddExerciseForm() instead');
        await this.showAddExerciseForm();
    }
    
    
    
    /**
     * Update session UI
     */
    updateSessionUI(isActive) {
        const sessionIndicator = document.getElementById('sessionActiveIndicator');
        const sessionInfo = document.getElementById('sessionInfo');
        const footer = document.getElementById('workoutModeFooter');
        
        // Always show footer when workout is loaded
        if (footer) footer.style.display = 'block';
        
        if (isActive) {
            if (sessionIndicator) sessionIndicator.style.display = 'block';
            if (sessionInfo) sessionInfo.style.display = 'block';
            
            // Update floating timer/end combo to show active state
            if (window.bottomActionBar) {
                console.log('🔄 Updating timer/end combo to active mode');
                window.bottomActionBar.updateWorkoutModeState(true);
            }
            
            // Start session timer
            this.startSessionTimer();
        } else {
            if (sessionIndicator) sessionIndicator.style.display = 'none';
            if (sessionInfo) sessionInfo.style.display = 'none';
            
            // Update timer/end combo to show inactive state (Start button)
            if (window.bottomActionBar) {
                console.log('🔄 Updating timer/end combo to inactive mode');
                window.bottomActionBar.updateWorkoutModeState(false);
            }
            
            // Stop session timer
            this.stopSessionTimer();
        }
    }
    
    /**
     * Start session timer
     */
    startSessionTimer() {
        const session = this.sessionService.getCurrentSession();
        if (!session) return;
        
        if (this.sessionTimerInterval) {
            clearInterval(this.sessionTimerInterval);
        }
        
        // Timer combo is always visible, just update the timer and button state
        this.sessionTimerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Update floating timer in combo
            const floatingTimer = document.getElementById('floatingTimer');
            if (floatingTimer) floatingTimer.textContent = timeStr;
            
            // Keep old timers for backward compatibility
            const sessionTimer = document.getElementById('sessionTimer');
            const footerTimer = document.getElementById('footerSessionTimer');
            const oldFloatingTimer = document.getElementById('floatingTimerDisplay');
            
            if (sessionTimer) sessionTimer.textContent = timeStr;
            if (footerTimer) footerTimer.textContent = timeStr;
            if (oldFloatingTimer) oldFloatingTimer.textContent = timeStr;
        }, 1000);
    }
    
    /**
     * Stop session timer
     */
    stopSessionTimer() {
        if (this.sessionTimerInterval) {
            clearInterval(this.sessionTimerInterval);
            this.sessionTimerInterval = null;
        }
        
        // Reset timer display to 00:00
        const floatingTimer = document.getElementById('floatingTimer');
        if (floatingTimer) floatingTimer.textContent = '00:00';
        
        // Timer combo stays visible, just shows 00:00 and "Start" button
    }
    
    /**
     * Handle auth state change
     */
    async handleAuthStateChange(user) {
        console.log('🔄 Auth state changed:', user ? 'authenticated' : 'anonymous');
        
        // Only update tooltip, don't reload workout
        // The workout loads once after initial auth state is determined
        this.initializeStartButtonTooltip();
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
     * Toggle exercise card
     */
    toggleExerciseCard(index) {
        const card = document.querySelector(`.exercise-card[data-exercise-index="${index}"]`);
        if (!card) return;
        
        const isExpanded = card.classList.contains('expanded');
        const exerciseName = card.getAttribute('data-exercise-name');
        
        if (isExpanded) {
            this.collapseCard(card);
            // Clear auto-complete timer when collapsing
            if (exerciseName && this.sessionService.isSessionActive()) {
                this.sessionService.clearAutoCompleteTimer(exerciseName);
            }
        } else {
            // Collapse all other cards and clear their timers
            document.querySelectorAll('.exercise-card.expanded').forEach(otherCard => {
                const otherName = otherCard.getAttribute('data-exercise-name');
                this.collapseCard(otherCard);
                // Clear timer for collapsed cards
                if (otherName && this.sessionService.isSessionActive()) {
                    this.sessionService.clearAutoCompleteTimer(otherName);
                }
            });
            this.expandCard(card);
            
            // Start auto-complete timer when expanding (only during active session)
            if (exerciseName && this.sessionService.isSessionActive()) {
                this.sessionService.startAutoCompleteTimer(exerciseName, 10); // 10 minutes
            }
            
            // Sync global timer with newly expanded card
            this.syncGlobalTimerWithExpandedCard();
        }
    }
    
    expandCard(card) {
        // Show body immediately so CSS transitions can take effect
        const body = card.querySelector('.exercise-card-body');
        if (body) {
            body.style.display = 'block';
            // Force reflow to ensure initial state is set before transition
            void body.offsetHeight;
        }
        
        // Add expanded class to trigger CSS transitions
        card.classList.add('expanded');
        
        // OPTIMIZED: Faster scroll for snappier feel
        setTimeout(() => {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
    
    collapseCard(card) {
        // Remove expanded class to trigger reverse CSS transitions
        card.classList.remove('expanded');
        
        // OPTIMIZED: Wait for faster transitions to complete before hiding
        const body = card.querySelector('.exercise-card-body');
        if (body) {
            setTimeout(() => {
                // Only hide if card is still collapsed (user didn't re-expand)
                if (!card.classList.contains('expanded')) {
                    body.style.display = 'none';
                }
            }, 200); // Match new faster CSS transition duration (0.2s)
        }
    }
    
    /**
     * Stop current exercise (placeholder)
     */
    stopExercise(index) {
        const card = document.querySelector(`.exercise-card[data-exercise-index="${index}"]`);
        if (card) {
            this.collapseCard(card);
        }
    }
    
    /**
     * Go to next exercise
     * OPTIMIZED: Overlapping animations for snappier transitions
     */
    goToNextExercise(currentIndex) {
        const allCards = document.querySelectorAll('.exercise-card');
        const nextIndex = currentIndex + 1;
        
        if (nextIndex < allCards.length) {
            const currentCard = allCards[currentIndex];
            this.collapseCard(currentCard);
            
            // OPTIMIZED: Start next card opening while current is still closing (overlapping animations)
            setTimeout(() => {
                this.toggleExerciseCard(nextIndex);
            }, 50); // Reduced from 300ms to 50ms for overlapping effect
        } else {
            // Last exercise - show complete workout dialog
            console.log('🎉 Last exercise completed, showing complete workout dialog');
            this.handleCompleteWorkout();
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
            `Resume <strong>${this.escapeHtml(exerciseName)}</strong>?`,
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
     * @param {string} exerciseName - Exercise name
     * @param {number} index - Exercise index
     * @returns {Object} Current exercise data
     * @private
     */
    _getCurrentExerciseData(exerciseName, index) {
        const exerciseGroup = this.getExerciseGroupByIndex(index);
        
        // Check if session is active
        if (this.sessionService.isSessionActive()) {
            // ACTIVE SESSION: Get from session data
            const exerciseData = this.sessionService.getExerciseWeight(exerciseName);
            
            return {
                exerciseName,
                sets: exerciseData?.target_sets || exerciseGroup?.sets || '3',
                reps: exerciseData?.target_reps || exerciseGroup?.reps || '8-12',
                rest: exerciseData?.rest || exerciseGroup?.rest || '60s',
                weight: exerciseData?.weight || exerciseGroup?.default_weight || '',
                weightUnit: exerciseData?.weight_unit || exerciseGroup?.default_weight_unit || 'lbs'
            };
        } else {
            // PRE-SESSION: Check pre-session edits first, then template
            const preSessionEdit = this.sessionService.getPreSessionEdits(exerciseName);
            
            return {
                exerciseName,
                sets: preSessionEdit?.target_sets || exerciseGroup?.sets || '3',
                reps: preSessionEdit?.target_reps || exerciseGroup?.reps || '8-12',
                rest: preSessionEdit?.rest || exerciseGroup?.rest || '60s',
                weight: preSessionEdit?.weight || exerciseGroup?.default_weight || '',
                weightUnit: preSessionEdit?.weight_unit || exerciseGroup?.default_weight_unit || 'lbs'
            };
        }
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
            `Mark <strong>${this.escapeHtml(exerciseName)}</strong> as not completed?`,
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
     */
    updateLoadingMessage(message) {
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) {
            loadingMessage.textContent = message;
        }
    }
    
    /**
     * Show loading state
     */
    showLoadingState() {
        const loading = document.getElementById('workoutLoadingState');
        const error = document.getElementById('workoutErrorState');
        const content = document.getElementById('exerciseCardsContainer');
        const footer = document.getElementById('workoutModeFooter');
        const workoutInfoHeader = document.getElementById('workoutInfoHeader');
        
        if (loading) loading.style.display = 'block';
        if (error) error.style.display = 'none';
        if (content) content.style.display = 'none';
        if (footer) footer.style.display = 'none';
        if (workoutInfoHeader) workoutInfoHeader.style.display = 'none';
    }
    
    /**
     * Hide loading state
     */
    hideLoadingState() {
        const loading = document.getElementById('workoutLoadingState');
        const content = document.getElementById('exerciseCardsContainer');
        const footer = document.getElementById('workoutModeFooter');
        const workoutInfoHeader = document.getElementById('workoutInfoHeader');
        const exerciseCardsHeader = document.getElementById('exerciseCardsHeader');
        
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';
        if (footer) footer.style.display = 'block';
        if (workoutInfoHeader) workoutInfoHeader.style.display = 'block';
        if (exerciseCardsHeader) exerciseCardsHeader.style.display = 'flex';
        
        // Update session UI to show correct button
        const isActive = this.sessionService.isSessionActive();
        this.updateSessionUI(isActive);
    }
    
    /**
     * Show error state
     */
    showError(message) {
        console.error('❌ Showing error:', message);
        
        const loading = document.getElementById('workoutLoadingState');
        const error = document.getElementById('workoutErrorState');
        const errorMessage = document.getElementById('workoutErrorMessage');
        const content = document.getElementById('exerciseCardsContainer');
        const footer = document.getElementById('workoutModeFooter');
        const workoutInfoHeader = document.getElementById('workoutInfoHeader');
        
        // Hide all other states
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'none';
        if (footer) footer.style.display = 'none';
        if (workoutInfoHeader) workoutInfoHeader.style.display = 'none';
        
        // Show error with detailed message and troubleshooting tips
        if (error) {
            error.style.display = 'block';
            if (errorMessage && message) {
                errorMessage.innerHTML = `
                    <strong>${this.escapeHtml(message)}</strong>
                    <br><br>
                    <small class="text-muted">
                        <strong>Troubleshooting tips:</strong><br>
                        1. Refresh the page (Ctrl+R or Cmd+R)<br>
                        2. Clear browser cache and try again<br>
                        3. Check browser console for details (F12)<br>
                        4. Try a different browser<br>
                        <br>
                        <em>If this persists, the app may still be initializing. Wait a moment and refresh.</em>
                    </small>
                `;
            }
        }
    }
    
    /**
     * Utility: Parse rest time
     */
    parseRestTime(restStr) {
        const match = restStr.match(/(\d+)/);
        return match ? parseInt(match[1]) : 60;
    }
    
    /**
     * Utility: Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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