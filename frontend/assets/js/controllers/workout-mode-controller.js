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
            
            // Setup auth state listener (reuse existing service)
            this.authService.onAuthStateChange((user) => {
                this.handleAuthStateChange(user);
            });
            
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
            
            // Update page title and header
            document.getElementById('workoutName').textContent = this.currentWorkout.name;
            document.title = `👻 ${this.currentWorkout.name} - Workout Mode - Ghost Gym`;
            
            // Update workout details
            const detailsEl = document.getElementById('workoutDetails');
            if (detailsEl && this.currentWorkout.description) {
                detailsEl.textContent = this.currentWorkout.description;
            }
            
            // Fetch and display last completed date
            const lastCompleted = await this.fetchLastCompleted();
            const lastCompletedContainer = document.getElementById('lastCompletedContainer');
            const lastCompletedDate = document.getElementById('lastCompletedDate');
            
            if (lastCompleted && lastCompletedContainer && lastCompletedDate) {
                const formattedDate = lastCompleted.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                lastCompletedDate.textContent = formattedDate;
                lastCompletedContainer.style.display = 'flex';
            } else if (lastCompletedContainer) {
                lastCompletedContainer.style.display = 'none';
            }
            
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
     * Fetch last completed date for current workout
     */
    async fetchLastCompleted() {
        try {
            if (!this.currentWorkout || !this.authService.isUserAuthenticated()) {
                return null;
            }
            
            const token = await this.authService.getIdToken();
            if (!token) return null;
            
            // Use the history endpoint to get last session
            const url = window.config.api.getUrl(`/api/v3/workout-sessions/history/workout/${this.currentWorkout.id}`);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                console.warn('Could not fetch last completed date');
                return null;
            }
            
            const historyData = await response.json();
            
            // Get the most recent session date
            if (historyData.last_session_date) {
                return new Date(historyData.last_session_date);
            }
            
            return null;
            
        } catch (error) {
            console.error('Error fetching last completed:', error);
            return null;
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
        
        // Get current weight from session OR from workout template
        const weightData = this.sessionService.getExerciseWeight(mainExercise);
        const templateWeight = group.default_weight || '';
        const templateUnit = group.default_weight_unit || 'lbs';
        const currentWeight = weightData?.weight || templateWeight || lastWeight;
        const currentUnit = weightData?.weight_unit || templateUnit || lastWeightUnit;
        
        return `
            <div class="card exercise-card ${bonusClass}" data-exercise-index="${index}" data-exercise-name="${this.escapeHtml(mainExercise)}">
                <div class="card-header exercise-card-header" onclick="window.workoutModeController.toggleExerciseCard(${index})">
                    <div class="exercise-card-summary">
                        <div class="d-flex justify-content-between align-items-start mb-1">
                            <h6 class="mb-0">${this.escapeHtml(mainExercise)}</h6>
                            ${currentWeight ? `<span class="badge bg-primary">${currentWeight}${currentUnit !== 'other' ? ' ' + currentUnit : ''}</span>` : ''}
                        </div>
                        <div class="exercise-card-meta text-muted small">
                            ${sets} × ${reps} • Rest: ${rest}
                        </div>
                        ${alternates.length > 0 ? `
                            <div class="exercise-card-alts text-muted small mt-1">
                                ${alternates.map(alt => `<div>${alt.label}: ${this.escapeHtml(alt.name)}</div>`).join('')}
                            </div>
                        ` : ''}
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
                    
                    <!-- 2x2 Grid: Rest Timer | Start Button / Edit Weight | Next -->
                    <div class="workout-button-grid">
                        <!-- Row 1, Column 1: Rest Timer Label -->
                        <div class="rest-timer-grid-label">
                            <div class="rest-timer" data-rest-seconds="${restSeconds}" data-timer-id="${timerId}">
                            </div>
                        </div>
                        
                        <!-- Row 1, Column 2: Start Rest Button (will be rendered by timer) -->
                        <div class="rest-timer-button-slot">
                        </div>
                        
                        <!-- Row 2, Column 1: Edit Weight Button -->
                        <button
                            class="btn btn-outline-primary workout-grid-btn"
                            data-exercise-name="${this.escapeHtml(mainExercise)}"
                            data-current-weight="${currentWeight || ''}"
                            data-current-unit="${currentUnit}"
                            data-last-weight="${lastWeight || ''}"
                            data-last-weight-unit="${lastWeightUnit || ''}"
                            data-last-session-date="${lastSessionDate || ''}"
                            data-is-session-active="${isSessionActive}"
                            onclick="window.workoutModeController.handleWeightButtonClick(this); event.stopPropagation();">
                            <i class="bx bx-edit-alt me-1"></i>Edit Weight
                        </button>
                        
                        <!-- Row 2, Column 2: Next Button -->
                        <button class="btn btn-primary workout-grid-btn" onclick="window.workoutModeController.goToNextExercise(${index})">
                            Next<i class="bx bx-right-arrow-alt ms-1"></i>
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
     * Show weight modal
     */
    showWeightModal(exerciseName, currentWeight, currentUnit, lastWeight, lastWeightUnit, lastSessionDate, isSessionActive) {
        const modalManager = this.getModalManager();
        
        const modalContent = `
            <div class="weight-modal-content">
                <div class="mb-3">
                    <label class="form-label"><i class="bx bx-dumbbell me-2"></i>Weight</label>
                    <div class="d-flex gap-2">
                        <input
                            type="text"
                            class="form-control weight-input"
                            id="modalWeightInput"
                            data-exercise-name="${exerciseName}"
                            value="${currentWeight || ''}"
                            placeholder="135 or 4x45 plates"
                            maxlength="50"
                            ${!isSessionActive ? 'readonly disabled' : ''}
                            style="flex: 1;">
                        <select class="form-select weight-unit-select" id="modalWeightUnit" data-exercise-name="${exerciseName}" ${!isSessionActive ? 'disabled' : ''} style="width: 100px;">
                            <option value="lbs" ${currentUnit === 'lbs' ? 'selected' : ''}>lbs</option>
                            <option value="kg" ${currentUnit === 'kg' ? 'selected' : ''}>kg</option>
                            <option value="other" ${currentUnit === 'other' ? 'selected' : ''}>other</option>
                        </select>
                    </div>
                    <small class="text-muted">Enter weight as number or description (e.g., "4x45 plates", "135", "BW+25")</small>
                </div>
                ${lastWeight && lastSessionDate ? `
                    <div class="alert alert-info mb-0">
                        <i class="bx bx-history me-2"></i>Last: ${lastWeight} ${lastWeightUnit} (${lastSessionDate})
                    </div>
                ` : ''}
                ${!isSessionActive ? `
                    <div class="alert alert-warning mb-0 mt-3">
                        <i class="bx bx-lock-alt me-2"></i>Start workout to edit weights
                    </div>
                ` : ''}
            </div>
        `;
        
        // Create offcanvas using Bootstrap (slides up from bottom - Sneat best practice)
        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom" tabindex="-1" id="weightEditOffcanvas" aria-labelledby="weightEditOffcanvasLabel">
                <div class="offcanvas-header">
                    <h5 class="offcanvas-title" id="weightEditOffcanvasLabel">
                        <i class="bx bx-edit-alt me-2"></i>Edit Weight
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div class="offcanvas-body">
                    <h6 class="mb-3">${exerciseName}</h6>
                    ${modalContent}
                    <div class="d-flex gap-2 mt-4">
                        <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="offcanvas">Cancel</button>
                        ${isSessionActive ? '<button type="button" class="btn btn-primary flex-fill" id="saveWeightBtn">Save</button>' : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing offcanvas if any
        const existingOffcanvas = document.getElementById('weightEditOffcanvas');
        if (existingOffcanvas) {
            existingOffcanvas.remove();
        }
        
        // Add offcanvas to body
        document.body.insertAdjacentHTML('beforeend', offcanvasHtml);
        
        // Initialize Bootstrap offcanvas
        const offcanvasElement = document.getElementById('weightEditOffcanvas');
        const offcanvas = new window.bootstrap.Offcanvas(offcanvasElement);
        
        // Setup event listeners
        if (isSessionActive) {
            const saveBtn = document.getElementById('saveWeightBtn');
            const weightInput = document.getElementById('modalWeightInput');
            const unitSelect = document.getElementById('modalWeightUnit');
            
            saveBtn.addEventListener('click', async () => {
                const weight = weightInput.value.trim();
                const unit = unitSelect.value;
                
                // Update session service (now accepts string values)
                this.sessionService.updateExerciseWeight(exerciseName, weight, unit);
                
                // Explicitly trigger auto-save and wait for it
                try {
                    await this.autoSave(null);
                    console.log('✅ Weight saved successfully:', exerciseName, weight, unit);
                } catch (error) {
                    console.error('❌ Failed to save weight:', error);
                    alert('Failed to save weight. Please try again.');
                    return; // Don't close modal on error
                }
                
                // Close offcanvas
                offcanvas.hide();
                
                // Re-render workout to show updated weight
                this.renderWorkout();
            });
            
            // Also setup input listeners for real-time updates
            weightInput.addEventListener('input', (e) => {
                const weight = e.target.value.trim();
                const unit = unitSelect.value;
                this.sessionService.updateExerciseWeight(exerciseName, weight, unit);
            });
            
            unitSelect.addEventListener('change', (e) => {
                const weight = weightInput.value.trim();
                const unit = e.target.value;
                this.sessionService.updateExerciseWeight(exerciseName, weight, unit);
            });
        }
        
        // Cleanup offcanvas on hide
        offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
            offcanvasElement.remove();
        });
        
        // Show offcanvas
        offcanvas.show();
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
        // Show bottom offcanvas for workout completion (Sneat standard)
        this.showCompleteWorkoutOffcanvas();
    }
    
    /**
     * Show complete workout offcanvas (Sneat bottom offcanvas pattern)
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
        
        // Create offcanvas HTML (slides up from bottom - Sneat best practice)
        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom" tabindex="-1" id="completeWorkoutOffcanvas" aria-labelledby="completeWorkoutOffcanvasLabel">
                <div class="offcanvas-header border-bottom">
                    <h5 class="offcanvas-title" id="completeWorkoutOffcanvasLabel">
                        <i class="bx bx-check-circle me-2"></i>Complete Workout
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div class="offcanvas-body">
                    <div class="text-center mb-4">
                        <div class="mb-3">
                            <i class="bx bx-dumbbell" style="font-size: 3rem; color: var(--bs-primary);"></i>
                        </div>
                        <h5 class="mb-2">${this.escapeHtml(this.currentWorkout.name)}</h5>
                        <p class="text-muted mb-0">Ready to complete your workout?</p>
                    </div>
                    
                    <!-- Session Stats -->
                    <div class="row g-3 mb-4">
                        <div class="col-6">
                            <div class="card bg-label-primary">
                                <div class="card-body text-center py-3">
                                    <div class="h4 mb-0">${minutes} min</div>
                                    <small class="text-muted">Duration</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="card bg-label-success">
                                <div class="card-body text-center py-3">
                                    <div class="h4 mb-0">${totalExercises}</div>
                                    <small class="text-muted">Exercises</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Info Alert -->
                    <div class="alert alert-info d-flex align-items-start mb-4">
                        <i class="bx bx-info-circle me-2 mt-1"></i>
                        <div>
                            <strong>Your progress will be saved</strong>
                            <p class="mb-0 small">All weight data and exercise history will be recorded.</p>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="offcanvas">
                            <i class="bx bx-x me-1"></i>Cancel
                        </button>
                        <button type="button" class="btn btn-success flex-fill" id="confirmCompleteBtn">
                            <i class="bx bx-check me-1"></i>Complete Workout
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing offcanvas if any
        const existingOffcanvas = document.getElementById('completeWorkoutOffcanvas');
        if (existingOffcanvas) {
            existingOffcanvas.remove();
        }
        
        // Add offcanvas to body
        document.body.insertAdjacentHTML('beforeend', offcanvasHtml);
        
        // Initialize Bootstrap offcanvas
        const offcanvasElement = document.getElementById('completeWorkoutOffcanvas');
        const offcanvas = new window.bootstrap.Offcanvas(offcanvasElement);
        
        // Setup confirm button
        const confirmBtn = document.getElementById('confirmCompleteBtn');
        confirmBtn.addEventListener('click', async () => {
            // Disable button and show loading
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Completing...';
            
            try {
                const exercisesPerformed = this.collectExerciseData();
                const completedSession = await this.sessionService.completeSession(exercisesPerformed);
                
                // Close offcanvas
                offcanvas.hide();
                
                // Show success summary
                this.showCompletionSummary(completedSession);
                
            } catch (error) {
                console.error('❌ Error completing workout:', error);
                
                // Re-enable button
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="bx bx-check me-1"></i>Complete Workout';
                
                // Show error
                const modalManager = this.getModalManager();
                modalManager.alert('Error', error.message, 'danger');
            }
        });
        
        // Cleanup offcanvas on hide
        offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
            offcanvasElement.remove();
        });
        
        // Show offcanvas
        offcanvas.show();
    }
    
    /**
     * Show completion summary (success offcanvas)
     */
    showCompletionSummary(session) {
        const duration = session.duration_minutes || 0;
        const exerciseCount = session.exercises_performed?.length || 0;
        
        // Create success offcanvas HTML (slides up from bottom)
        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom" tabindex="-1" id="completionSummaryOffcanvas" aria-labelledby="completionSummaryOffcanvasLabel" data-bs-backdrop="static" data-bs-keyboard="false">
                <div class="offcanvas-header border-bottom bg-success">
                    <h5 class="offcanvas-title text-white" id="completionSummaryOffcanvasLabel">
                        <i class="bx bx-trophy me-2"></i>Workout Complete!
                    </h5>
                </div>
                <div class="offcanvas-body">
                    <div class="text-center mb-4">
                        <div class="mb-3">
                            <i class="bx bx-trophy" style="font-size: 4rem; color: var(--bs-success);"></i>
                        </div>
                        <h4 class="mb-2">Great Job! 🎉</h4>
                        <p class="text-muted">You've successfully completed your workout</p>
                    </div>
                    
                    <!-- Stats Cards -->
                    <div class="row g-3 mb-4">
                        <div class="col-6">
                            <div class="card bg-label-success">
                                <div class="card-body text-center py-3">
                                    <div class="h3 mb-0">${duration}</div>
                                    <small class="text-muted">Minutes</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="card bg-label-primary">
                                <div class="card-body text-center py-3">
                                    <div class="h3 mb-0">${exerciseCount}</div>
                                    <small class="text-muted">Exercises</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Success Message -->
                    <div class="alert alert-success d-flex align-items-start mb-4">
                        <i class="bx bx-check-circle me-2 mt-1"></i>
                        <div>
                            <strong>Progress Saved!</strong>
                            <p class="mb-0 small">Your workout data has been recorded and is ready to view in your history.</p>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="d-flex flex-column gap-2">
                        <button type="button" class="btn btn-primary" onclick="window.location.href='workout-mode.html'">
                            <i class="bx bx-dumbbell me-1"></i>Start Another Workout
                        </button>
                        <button type="button" class="btn btn-outline-primary" onclick="window.location.href='workout-builder.html'">
                            <i class="bx bx-list-ul me-1"></i>View History
                        </button>
                        <button type="button" class="btn btn-outline-secondary" onclick="window.location.href='index.html'">
                            <i class="bx bx-home me-1"></i>Dashboard
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Remove any existing offcanvas
        const existingOffcanvas = document.getElementById('completionSummaryOffcanvas');
        if (existingOffcanvas) {
            existingOffcanvas.remove();
        }
        
        // Add offcanvas to body
        document.body.insertAdjacentHTML('beforeend', offcanvasHtml);
        
        // Initialize Bootstrap offcanvas
        const offcanvasElement = document.getElementById('completionSummaryOffcanvas');
        const offcanvas = new window.bootstrap.Offcanvas(offcanvasElement);
        
        // Cleanup offcanvas on hide
        offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
            offcanvasElement.remove();
        });
        
        // Show offcanvas
        offcanvas.show();
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
            // Last exercise - show completion message
            const modalManager = this.getModalManager();
            modalManager.confirm(
                'Workout Complete! 🎉',
                'Great job! Would you like to return to the workout list?',
                () => {
                    window.location.href = 'workout-builder.html';
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
        
        // Hide all other states
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'none';
        if (footer) footer.style.display = 'none';
        
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