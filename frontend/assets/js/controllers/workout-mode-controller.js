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
        this.soundEnabled = localStorage.getItem('workoutSoundEnabled') !== 'false';
        this.autoSaveTimer = null;
        this.workoutListComponent = null;
        
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
            
            // IMPORTANT: Wait for auth state to settle before loading workout
            // This ensures we're in the correct storage mode (localStorage vs firestore)
            console.log('⏳ Waiting for auth state to settle...');
            
            // Use longer timeout in production environments (Railway, etc.)
            const isProduction = window.location.hostname !== 'localhost' &&
                                window.location.hostname !== '127.0.0.1';
            const settleTime = isProduction ? 3000 : 1500;
            console.log(`⏱️ Using ${settleTime}ms settle time (${isProduction ? 'production' : 'local'})`);
            
            await new Promise(resolve => setTimeout(resolve, settleTime));
            console.log('✅ Auth state settled, storage mode:', this.dataManager.storageMode);
            
            // Load workout
            await this.loadWorkout(workoutId);
            
            // Setup UI
            this.setupEventListeners();
            this.initializeSoundToggle();
            this.initializeShareButton();
            
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
        
        // Render regular exercise groups
        if (this.currentWorkout.exercise_groups && this.currentWorkout.exercise_groups.length > 0) {
            this.currentWorkout.exercise_groups.forEach((group) => {
                html += this.cardRenderer.renderCard(group, exerciseIndex, false, totalCards);
                exerciseIndex++;
            });
        }
        
        // Render bonus exercises from SESSION or PRE-WORKOUT list
        if (bonusExercises && bonusExercises.length > 0) {
            bonusExercises.forEach((bonus) => {
                const bonusGroup = {
                    exercises: { a: bonus.name },
                    sets: bonus.sets,
                    reps: bonus.reps,
                    rest: bonus.rest || '60s',
                    default_weight: bonus.weight,
                    default_weight_unit: bonus.weight_unit || 'lbs',
                    notes: bonus.notes
                };
                html += this.cardRenderer.renderCard(bonusGroup, exerciseIndex, true, totalCards);
                exerciseIndex++;
            });
        }
        
        container.innerHTML = html;
        
        // Initialize timers
        this.initializeTimers();
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
     */
    collectExerciseData() {
        const exercisesPerformed = [];
        let orderIndex = 0;
        
        // Collect from exercise groups
        if (this.currentWorkout.exercise_groups) {
            this.currentWorkout.exercise_groups.forEach((group, groupIndex) => {
                const mainExercise = group.exercises?.a;
                if (!mainExercise) return;
                
                const weightData = this.sessionService.getExerciseWeight(mainExercise);
                const history = this.sessionService.getExerciseHistory(mainExercise);
                
                exercisesPerformed.push({
                    exercise_name: mainExercise,
                    exercise_id: null,
                    group_id: group.group_id || `group-${groupIndex}`,
                    sets_completed: parseInt(group.sets) || 0,
                    target_sets: group.sets || '3',
                    target_reps: group.reps || '8-12',
                    weight: weightData?.weight || 0,
                    weight_unit: weightData?.weight_unit || 'lbs',
                    previous_weight: history?.last_weight || null,
                    weight_change: weightData?.weight_change || 0,
                    order_index: orderIndex++,
                    is_bonus: false
                });
            });
        }
        
        // Collect from SESSION bonus exercises (not template)
        const bonusExercises = this.sessionService.getBonusExercises();
        if (bonusExercises && bonusExercises.length > 0) {
            bonusExercises.forEach((bonus, bonusIndex) => {
                const exerciseName = bonus.name || bonus.exercise_name;
                const weightData = this.sessionService.getExerciseWeight(exerciseName);
                const history = this.sessionService.getExerciseHistory(exerciseName);
                
                exercisesPerformed.push({
                    exercise_name: exerciseName,
                    exercise_id: null,
                    group_id: `bonus-${bonusIndex}`,
                    sets_completed: parseInt(bonus.sets || bonus.target_sets) || 0,
                    target_sets: bonus.sets || bonus.target_sets || '3',
                    target_reps: bonus.reps || bonus.target_reps || '12',
                    weight: weightData?.weight || bonus.weight || 0,
                    weight_unit: weightData?.weight_unit || bonus.weight_unit || 'lbs',
                    previous_weight: history?.last_weight || null,
                    weight_change: weightData?.weight_change || 0,
                    order_index: orderIndex++,
                    is_bonus: true
                });
            });
        }
        
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
        
        // Check if user is authenticated (reuse existing service)
        if (!this.authService.isUserAuthenticated()) {
            this.showLoginPrompt();
            return;
        }
        
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
                }
            );
            return;
        }
        
        await this.startNewSession();
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
            // Start session using service
            await this.sessionService.startSession(this.currentWorkout.id, this.currentWorkout.name);
            
            // Transfer pre-workout bonus exercises to session
            this.sessionService.transferPreWorkoutBonusToSession();
            
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
            exerciseCount: session.exercises_performed?.length || 0
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
     */
    
    /**
     * Handle bonus exercises button click
     * Now works BEFORE and DURING workout session
     */
    async handleBonusExercises() {
        await this.showBonusExerciseModal();
    }
    
    /**
     * Show bonus exercise modal (now uses factory)
     */
    async showBonusExerciseModal() {
        try {
            const previousBonusExercises = await this.sessionService
                .getLastSessionBonusExercises(this.currentWorkout.id);
            
            window.UnifiedOffcanvasFactory.createBonusExercise(
                { previousExercises: previousBonusExercises },
                async (data) => {
                    // Handle adding new exercise
                    this.sessionService.addBonusExercise({
                        name: data.name,
                        sets: data.sets || '3',
                        reps: data.reps || '12',
                        weight: data.weight || '',
                        weight_unit: data.unit,
                        rest: '60s'
                    });
                    this.renderWorkout();
                    
                    const message = !this.sessionService.isSessionActive()
                        ? `${data.name} added! It will be included when you start the workout. 💪`
                        : `${data.name} added to your workout! 💪`;
                    if (window.showAlert) window.showAlert(message, 'success');
                },
                async (index) => {
                    // Handle adding previous exercise
                    const exercise = previousBonusExercises[index];
                    if (exercise) {
                        this.sessionService.addBonusExercise({
                            name: exercise.exercise_name,
                            sets: exercise.target_sets || '3',
                            reps: exercise.target_reps || '12',
                            weight: exercise.weight || '',
                            weight_unit: exercise.weight_unit || 'lbs',
                            rest: '60s'
                        });
                        this.renderWorkout();
                        
                        const message = !this.sessionService.isSessionActive()
                            ? `${exercise.exercise_name} added! It will be included when you start the workout. 💪`
                            : `${exercise.exercise_name} added to your workout! 💪`;
                        if (window.showAlert) window.showAlert(message, 'success');
                    }
                }
            );
        } catch (error) {
            console.error('❌ Error showing bonus exercise modal:', error);
            const modalManager = this.getModalManager();
            modalManager.alert('Error', 'Failed to load bonus exercise modal. Please try again.', 'danger');
        }
    }
    
    
    
    /**
     * Update session UI
     */
    updateSessionUI(isActive) {
        const startBtn = document.getElementById('startWorkoutBtn');
        const completeBtn = document.getElementById('completeWorkoutBtn');
        const sessionIndicator = document.getElementById('sessionActiveIndicator');
        const sessionInfo = document.getElementById('sessionInfo');
        const footer = document.getElementById('workoutModeFooter');
        
        // Always show footer when workout is loaded
        if (footer) footer.style.display = 'block';
        
        if (isActive) {
            if (startBtn) startBtn.style.display = 'none';
            if (completeBtn) completeBtn.style.display = 'block';
            if (sessionIndicator) sessionIndicator.style.display = 'block';
            if (sessionInfo) sessionInfo.style.display = 'block';
            
            // Update bottom action bar FAB to show "Complete" button
            if (window.bottomActionBar) {
                console.log('🔄 Updating bottom action bar FAB to Complete mode');
                window.bottomActionBar.updateButton('fab', {
                    icon: 'bx-stop-circle',
                    title: 'Complete workout',
                    variant: 'danger'
                });
                
                // Update the FAB action to show complete workout offcanvas
                const fabBtn = document.querySelector('[data-action="fab"]');
                if (fabBtn) {
                    // Remove old listener by cloning
                    const newFabBtn = fabBtn.cloneNode(true);
                    fabBtn.parentNode.replaceChild(newFabBtn, fabBtn);
                    
                    // Add new listener for complete workout
                    newFabBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        console.log('⏹️ Complete workout FAB clicked');
                        if (window.workoutModeController && window.workoutModeController.handleCompleteWorkout) {
                            window.workoutModeController.handleCompleteWorkout();
                        }
                    });
                }
            }
            
            // Start session timer
            this.startSessionTimer();
        } else {
            if (startBtn) startBtn.style.display = 'block';
            if (completeBtn) completeBtn.style.display = 'none';
            if (sessionIndicator) sessionIndicator.style.display = 'none';
            if (sessionInfo) sessionInfo.style.display = 'none';
            
            // Update bottom action bar FAB back to "Start" button
            if (window.bottomActionBar) {
                console.log('🔄 Updating bottom action bar FAB to Start mode');
                window.bottomActionBar.updateButton('fab', {
                    icon: 'bx-play',
                    title: 'Start workout',
                    variant: 'success'
                });
                
                // Update the FAB action to start workout
                const fabBtn = document.querySelector('[data-action="fab"]');
                if (fabBtn) {
                    // Remove old listener by cloning
                    const newFabBtn = fabBtn.cloneNode(true);
                    fabBtn.parentNode.replaceChild(newFabBtn, fabBtn);
                    
                    // Add new listener for start workout
                    newFabBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        console.log('▶️ Start workout FAB clicked');
                        if (window.workoutModeController && window.workoutModeController.handleStartWorkout) {
                            window.workoutModeController.handleStartWorkout();
                        }
                    });
                }
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
        
        // Show floating timer widget
        const floatingWidget = document.getElementById('floatingTimerWidget');
        if (floatingWidget) {
            floatingWidget.style.display = 'block';
        }
        
        this.sessionTimerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            const sessionTimer = document.getElementById('sessionTimer');
            const footerTimer = document.getElementById('footerSessionTimer');
            const floatingTimer = document.getElementById('floatingTimerDisplay');
            
            if (sessionTimer) sessionTimer.textContent = timeStr;
            if (footerTimer) footerTimer.textContent = timeStr;
            if (floatingTimer) floatingTimer.textContent = timeStr;
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
        
        // Hide floating timer widget
        const floatingWidget = document.getElementById('floatingTimerWidget');
        if (floatingWidget) {
            floatingWidget.style.display = 'none';
        }
    }
    
    /**
     * Handle auth state change
     */
    async handleAuthStateChange(user) {
        console.log('🔄 Auth state changed:', user ? 'authenticated' : 'anonymous');
        this.initializeStartButtonTooltip();
        
        // Auth state changed - no special handling needed since we redirect to workout database
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
        
        if (isExpanded) {
            this.collapseCard(card);
        } else {
            // Collapse all other cards
            document.querySelectorAll('.exercise-card.expanded').forEach(otherCard => {
                this.collapseCard(otherCard);
            });
            this.expandCard(card);
        }
    }
    
    expandCard(card) {
        card.classList.add('expanded');
        const body = card.querySelector('.exercise-card-body');
        if (body) {
            body.style.display = 'block';
        }
        
        setTimeout(() => {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
    
    collapseCard(card) {
        card.classList.remove('expanded');
        const body = card.querySelector('.exercise-card-body');
        if (body) {
            body.style.display = 'none';
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
     */
    goToNextExercise(currentIndex) {
        const allCards = document.querySelectorAll('.exercise-card');
        const nextIndex = currentIndex + 1;
        
        if (nextIndex < allCards.length) {
            const currentCard = allCards[currentIndex];
            this.collapseCard(currentCard);
            
            setTimeout(() => {
                this.toggleExerciseCard(nextIndex);
            }, 300);
        } else {
            // Last exercise - show complete workout dialog
            console.log('🎉 Last exercise completed, showing complete workout dialog');
            this.handleCompleteWorkout();
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
        
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';
        if (footer) footer.style.display = 'block';
        if (workoutInfoHeader) workoutInfoHeader.style.display = 'block';
        
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