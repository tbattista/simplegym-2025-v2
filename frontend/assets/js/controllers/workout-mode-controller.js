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
        
        // State
        this.currentWorkout = null;
        this.timers = {};
        this.soundEnabled = localStorage.getItem('workoutSoundEnabled') !== 'false';
        this.autoSaveTimer = null;
        
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
            
            // Setup auth state listener (reuse existing service)
            this.authService.onAuthStateChange((user) => {
                this.handleAuthStateChange(user);
            });
            
            // Get workout ID from URL
            const workoutId = this.getWorkoutIdFromUrl();
            if (!workoutId) {
                this.showError('No workout selected. Please select a workout to begin.');
                return;
            }
            
            // IMPORTANT: Wait for auth state to settle before loading workout
            // This ensures we're in the correct storage mode (localStorage vs firestore)
            console.log('⏳ Waiting for auth state to settle...');
            await new Promise(resolve => setTimeout(resolve, 1500));
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
                throw new Error('Workout not found');
            }
            
            // Update page title
            document.getElementById('workoutName').textContent = this.currentWorkout.name;
            document.title = `👻 ${this.currentWorkout.name} - Workout Mode - Ghost Gym`;
            
            // Render workout
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
     * Render workout cards
     */
    renderWorkout() {
        const container = document.getElementById('exerciseCardsContainer');
        if (!container) return;
        
        let html = '';
        let exerciseIndex = 0;
        
        // Render regular exercise groups
        if (this.currentWorkout.exercise_groups && this.currentWorkout.exercise_groups.length > 0) {
            this.currentWorkout.exercise_groups.forEach((group) => {
                html += this.renderExerciseCard(group, exerciseIndex, false);
                exerciseIndex++;
            });
        }
        
        // Render bonus exercises
        if (this.currentWorkout.bonus_exercises && this.currentWorkout.bonus_exercises.length > 0) {
            this.currentWorkout.bonus_exercises.forEach((bonus) => {
                const bonusGroup = {
                    exercises: { a: bonus.name },
                    sets: bonus.sets,
                    reps: bonus.reps,
                    rest: bonus.rest,
                    notes: bonus.notes
                };
                html += this.renderExerciseCard(bonusGroup, exerciseIndex, true);
                exerciseIndex++;
            });
        }
        
        container.innerHTML = html;
        
        // Initialize timers
        this.initializeTimers();
        
        // Initialize weight inputs if session is active
        if (this.sessionService.isSessionActive()) {
            this.initializeWeightInputs();
        }
    }
    
    /**
     * Render individual exercise card
     * (Keeping existing rendering logic - it works!)
     */
    renderExerciseCard(group, index, isBonus) {
        const exercises = group.exercises || {};
        const mainExercise = exercises.a || 'Unknown Exercise';
        const alternates = [];
        
        if (exercises.b) alternates.push({ label: 'Alt1', name: exercises.b });
        if (exercises.c) alternates.push({ label: 'Alt2', name: exercises.c });
        
        const sets = group.sets || '3';
        const reps = group.reps || '8-12';
        const rest = group.rest || '60s';
        const notes = group.notes || '';
        
        const restSeconds = this.parseRestTime(rest);
        const timerId = `timer-${index}`;
        const bonusClass = isBonus ? 'bonus-exercise' : '';
        
        // Check if session is active
        const isSessionActive = this.sessionService.isSessionActive();
        
        // Get exercise history
        const history = this.sessionService.getExerciseHistory(mainExercise);
        const lastWeight = history?.last_weight || '';
        const lastWeightUnit = history?.last_weight_unit || 'lbs';
        const lastSessionDate = history?.last_session_date ? new Date(history.last_session_date).toLocaleDateString() : null;
        
        // Get current weight from session
        const weightData = this.sessionService.getExerciseWeight(mainExercise);
        const currentWeight = weightData?.weight || lastWeight;
        const currentUnit = weightData?.weight_unit || lastWeightUnit;
        
        return `
            <div class="card exercise-card ${bonusClass}" data-exercise-index="${index}" data-exercise-name="${this.escapeHtml(mainExercise)}">
                <div class="card-header exercise-card-header" onclick="window.workoutModeController.toggleExerciseCard(${index})">
                    <div class="exercise-card-summary">
                        <h6 class="mb-1">${this.escapeHtml(mainExercise)}</h6>
                        <div class="exercise-card-meta text-muted small">
                            ${sets} × ${reps} • Rest: ${rest}
                        </div>
                        ${alternates.length > 0 ? `
                            <div class="exercise-card-alts text-muted small mt-1">
                                ${alternates.map(alt => `<div>${alt.label}: ${this.escapeHtml(alt.name)}</div>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="weight-display-compact" onclick="event.stopPropagation();">
                        <input
                            type="number"
                            class="form-control form-control-sm weight-input weight-input-compact"
                            data-exercise-name="${this.escapeHtml(mainExercise)}"
                            value="${currentWeight}"
                            placeholder="135"
                            step="5"
                            min="0"
                            ${!isSessionActive ? 'readonly disabled' : ''}>
                        <select class="form-select form-select-sm weight-unit-select weight-unit-compact" data-exercise-name="${this.escapeHtml(mainExercise)}" ${!isSessionActive ? 'disabled' : ''}>
                            <option value="lbs" ${currentUnit === 'lbs' ? 'selected' : ''}>lbs</option>
                            <option value="kg" ${currentUnit === 'kg' ? 'selected' : ''}>kg</option>
                        </select>
                    </div>
                    <i class="bx bx-chevron-down expand-icon"></i>
                </div>
                
                <div class="card-body exercise-card-body" style="display: none;">
                    ${isSessionActive && lastWeight && lastSessionDate ? `
                        <div class="text-muted small mb-3">
                            <i class="bx bx-history me-1"></i>Last: ${lastWeight} ${lastWeightUnit} (${lastSessionDate})
                        </div>
                    ` : ''}
                    
                    ${notes ? `
                        <div class="alert alert-info mb-3" style="font-size: 0.875rem; padding: 0.75rem;">
                            <i class="bx bx-info-circle me-1"></i>
                            ${this.escapeHtml(notes)}
                        </div>
                    ` : ''}
                    
                    <!-- COMPACT: Rest timer + Buttons in a row (equal width) -->
                    <div class="d-flex gap-2 align-items-stretch" style="margin-top: 1rem;">
                        <div class="rest-timer-inline flex-fill">
                            <div class="rest-timer" data-rest-seconds="${restSeconds}" data-timer-id="${timerId}">
                            </div>
                        </div>
                        <button class="btn btn-primary flex-fill" onclick="window.workoutModeController.goToNextExercise(${index})" style="min-height: 100%;">
                            Next Exercise<i class="bx bx-right-arrow-alt ms-1"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
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
     * Initialize weight inputs
     */
    initializeWeightInputs() {
        console.log('🏋️ Initializing weight inputs...');
        
        const weightInputs = document.querySelectorAll('.weight-input');
        const unitSelects = document.querySelectorAll('.weight-unit-select');
        
        weightInputs.forEach(input => {
            input.addEventListener('input', (e) => this.handleWeightChange(e));
            input.addEventListener('blur', (e) => this.handleWeightBlur(e));
        });
        
        unitSelects.forEach(select => {
            select.addEventListener('change', (e) => this.handleUnitChange(e));
        });
        
        console.log('✅ Weight inputs initialized:', weightInputs.length, 'inputs');
    }
    
    /**
     * Handle weight input change (debounced auto-save)
     */
    handleWeightChange(event) {
        const input = event.target;
        const exerciseName = input.getAttribute('data-exercise-name');
        const weight = parseFloat(input.value) || 0;
        
        const card = input.closest('.exercise-card');
        const unitSelect = card.querySelector('.weight-unit-select');
        const unit = unitSelect ? unitSelect.value : 'lbs';
        
        // Update session service
        this.sessionService.updateExerciseWeight(exerciseName, weight, unit);
        
        // Show saving indicator
        this.showSaveIndicator(card, 'saving');
        
        // Debounced auto-save (2 seconds)
        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = setTimeout(async () => {
            await this.autoSave(card);
        }, 2000);
    }
    
    /**
     * Handle weight input blur (immediate save)
     */
    handleWeightBlur(event) {
        const input = event.target;
        const card = input.closest('.exercise-card');
        
        // Cancel debounced save and save immediately
        clearTimeout(this.autoSaveTimer);
        this.autoSave(card);
    }
    
    /**
     * Handle unit change
     */
    handleUnitChange(event) {
        const select = event.target;
        const exerciseName = select.getAttribute('data-exercise-name');
        const unit = select.value;
        
        const card = select.closest('.exercise-card');
        const weightInput = card.querySelector('.weight-input');
        const weight = parseFloat(weightInput.value) || 0;
        
        // Update session service
        this.sessionService.updateExerciseWeight(exerciseName, weight, unit);
        
        // Show saving indicator
        this.showSaveIndicator(card, 'saving');
        
        // Immediate save on unit change
        this.autoSave(card);
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
            
            // Update auto-save status in header
            const autoSaveStatus = document.getElementById('autoSaveStatus');
            if (autoSaveStatus) {
                autoSaveStatus.textContent = 'Saved';
                setTimeout(() => {
                    autoSaveStatus.textContent = 'Ready';
                }, 2000);
            }
            
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
        
        // Collect from bonus exercises
        if (this.currentWorkout.bonus_exercises) {
            this.currentWorkout.bonus_exercises.forEach((bonus, bonusIndex) => {
                const weightData = this.sessionService.getExerciseWeight(bonus.name);
                const history = this.sessionService.getExerciseHistory(bonus.name);
                
                exercisesPerformed.push({
                    exercise_name: bonus.name,
                    exercise_id: bonus.exercise_id || null,
                    group_id: bonus.exercise_id || `bonus-${bonusIndex}`,
                    sets_completed: parseInt(bonus.sets) || 0,
                    target_sets: bonus.sets || '2',
                    target_reps: bonus.reps || '15',
                    weight: weightData?.weight || 0,
                    weight_unit: weightData?.weight_unit || 'lbs',
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
        
        try {
            // Start session using service
            await this.sessionService.startSession(this.currentWorkout.id, this.currentWorkout.name);
            
            // Fetch exercise history
            await this.sessionService.fetchExerciseHistory(this.currentWorkout.id);
            
            // Update UI
            this.updateSessionUI(true);
            
            // Re-render to show weight inputs
            this.renderWorkout();
            
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
     * Handle complete workout
     */
    async handleCompleteWorkout() {
        // Use modal manager for confirmation
        const modalManager = this.getModalManager();
        modalManager.confirm(
            'Complete Workout?',
            'Are you sure you want to complete this workout?',
            async () => {
                try {
                    const exercisesPerformed = this.collectExerciseData();
                    const completedSession = await this.sessionService.completeSession(exercisesPerformed);
                    
                    // Show success
                    this.showCompletionSummary(completedSession);
                    
                } catch (error) {
                    console.error('❌ Error completing workout:', error);
                    const modalManager = this.getModalManager();
                    modalManager.alert('Error', error.message, 'danger');
                }
            }
        );
    }
    
    /**
     * Show completion summary
     */
    showCompletionSummary(session) {
        const duration = session.duration_minutes || 0;
        const exerciseCount = session.exercises_performed?.length || 0;
        
        const message = `
            <div class="text-center">
                <i class="bx bx-trophy display-1 text-success mb-3"></i>
                <h4>Workout Complete! 🎉</h4>
                <p class="text-muted">Great job on completing your workout!</p>
                <div class="mt-3">
                    <div class="d-flex justify-content-center gap-4">
                        <div>
                            <div class="h5 mb-0">${duration} min</div>
                            <small class="text-muted">Duration</small>
                        </div>
                        <div>
                            <div class="h5 mb-0">${exerciseCount}</div>
                            <small class="text-muted">Exercises</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const modalManager = this.getModalManager();
        modalManager.alert('Success', message, 'success');
        
        // Redirect after delay
        setTimeout(() => {
            window.location.href = 'workouts.html';
        }, 3000);
    }
    
    /**
     * Show login prompt
     */
    showLoginPrompt() {
        const message = `
            <div class="text-center">
                <i class="bx bx-lock-alt display-1 text-primary mb-3"></i>
                <h4>Login Required</h4>
                <p class="text-muted">You need to be logged in to track your workouts and save weight progress.</p>
                <div class="mt-3">
                    <p class="mb-2"><strong>With an account you can:</strong></p>
                    <ul class="list-unstyled text-start" style="max-width: 300px; margin: 0 auto;">
                        <li class="mb-2"><i class="bx bx-check text-success me-2"></i>Track weight progress</li>
                        <li class="mb-2"><i class="bx bx-check text-success me-2"></i>Save workout history</li>
                        <li class="mb-2"><i class="bx bx-check text-success me-2"></i>See personal records</li>
                        <li class="mb-2"><i class="bx bx-check text-success me-2"></i>Auto-save during workouts</li>
                    </ul>
                </div>
            </div>
        `;
        
        const modalManager = this.getModalManager();
        modalManager.alert('Login Required', message, 'info');
    }
    
    /**
     * Update session UI
     */
    updateSessionUI(isActive) {
        const startBtn = document.getElementById('startWorkoutBtn');
        const completeBtn = document.getElementById('completeWorkoutBtn');
        const sessionIndicator = document.getElementById('sessionActiveIndicator');
        const sessionInfo = document.getElementById('sessionInfo');
        
        if (isActive) {
            if (startBtn) startBtn.style.display = 'none';
            if (completeBtn) completeBtn.style.display = 'block';
            if (sessionIndicator) sessionIndicator.style.display = 'block';
            if (sessionInfo) sessionInfo.style.display = 'block';
            
            // Start session timer
            this.startSessionTimer();
        } else {
            if (startBtn) startBtn.style.display = 'block';
            if (completeBtn) completeBtn.style.display = 'none';
            if (sessionIndicator) sessionIndicator.style.display = 'none';
            if (sessionInfo) sessionInfo.style.display = 'none';
            
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
        
        this.sessionTimerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            const sessionTimer = document.getElementById('sessionTimer');
            const footerTimer = document.getElementById('footerSessionTimer');
            
            if (sessionTimer) sessionTimer.textContent = timeStr;
            if (footerTimer) footerTimer.textContent = timeStr;
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
    }
    
    /**
     * Handle auth state change
     */
    handleAuthStateChange(user) {
        console.log('🔄 Auth state changed:', user ? 'authenticated' : 'anonymous');
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
            // Last exercise - show completion message
            const modalManager = this.getModalManager();
            modalManager.confirm(
                'Workout Complete! 🎉',
                'Great job! Would you like to return to the workout list?',
                () => {
                    window.location.href = 'workouts.html';
                }
            );
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
        
        if (loading) loading.style.display = 'block';
        if (error) error.style.display = 'none';
        if (content) content.style.display = 'none';
        if (footer) footer.style.display = 'none';
    }
    
    /**
     * Hide loading state
     */
    hideLoadingState() {
        const loading = document.getElementById('workoutLoadingState');
        const content = document.getElementById('exerciseCardsContainer');
        const footer = document.getElementById('workoutModeFooter');
        
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';
        if (footer) footer.style.display = 'block';
    }
    
    /**
     * Show error state
     */
    showError(message) {
        const loading = document.getElementById('workoutLoadingState');
        const error = document.getElementById('workoutErrorState');
        const content = document.getElementById('exerciseCardsContainer');
        const footer = document.getElementById('workoutModeFooter');
        
        if (loading) loading.style.display = 'none';
        if (error) {
            error.style.display = 'block';
            const errorText = error.querySelector('p');
            if (errorText && message) {
                errorText.textContent = message;
            }
        }
        if (content) content.style.display = 'none';
        if (footer) footer.style.display = 'none';
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