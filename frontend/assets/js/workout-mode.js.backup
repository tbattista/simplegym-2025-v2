/**
 * Ghost Gym - Workout Mode JavaScript
 * Handles workout execution with rest timers, exercise navigation, and weight logging
 * @version 2.2.2
 * @date 2025-11-07
 */

/**
 * ============================================
 * REST TIMER CLASS
 * ============================================
 */
class RestTimer {
    constructor(timerId, restSeconds) {
        this.timerId = timerId;
        this.totalSeconds = restSeconds;
        this.remainingSeconds = restSeconds;
        this.state = 'ready'; // ready, counting, paused, done
        this.interval = null;
        this.element = null;
    }

    start() {
        if (this.state !== 'ready') return;
        
        this.state = 'counting';
        this.remainingSeconds = this.totalSeconds;
        this.startCountdown();
        this.render();
    }

    pause() {
        if (this.state !== 'counting') return;
        
        this.state = 'paused';
        this.stopCountdown();
        this.render();
    }

    resume() {
        if (this.state !== 'paused') return;
        
        this.state = 'counting';
        this.startCountdown();
        this.render();
    }

    reset() {
        this.state = 'ready';
        this.remainingSeconds = this.totalSeconds;
        this.stopCountdown();
        this.render();
    }

    startCountdown() {
        this.interval = setInterval(() => {
            this.remainingSeconds--;
            
            if (this.remainingSeconds <= 0) {
                this.complete();
            } else {
                this.render();
            }
        }, 1000);
    }

    stopCountdown() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    complete() {
        this.stopCountdown();
        this.state = 'done';
        this.remainingSeconds = 0;
        
        // Play beep if sound is enabled
        if (window.ghostGym.workoutMode.soundEnabled) {
            this.playBeep();
        }
        
        this.render();
    }

    playBeep() {
        try {
            // Create audio context
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Configure beep sound
            oscillator.frequency.value = 800; // Hz
            oscillator.type = 'sine';
            
            // Fade in/out
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
            
            // Play beep
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.warn('Could not play beep:', error);
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    render() {
        this.element = document.querySelector(`[data-timer-id="${this.timerId}"]`);
        if (!this.element) return;
        
        let html = '';
        
        switch (this.state) {
            case 'ready':
                html = `
                    <div class="rest-timer-ready text-center py-3">
                        <div class="rest-timer-label mb-2">Rest: ${this.totalSeconds}s</div>
                        <button class="btn btn-success" onclick="window.startTimer('${this.timerId}')">
                            <i class="bx bx-play me-1"></i>Start Rest
                        </button>
                    </div>
                `;
                break;
                
            case 'counting':
                const displayClass = this.remainingSeconds <= 5 ? 'danger' : 
                                   this.remainingSeconds <= 10 ? 'warning' : '';
                html = `
                    <div class="rest-timer-counting text-center py-3">
                        <div class="rest-timer-display ${displayClass} mb-2">
                            <span class="display-4">${this.formatTime(this.remainingSeconds)}</span>
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-warning" onclick="window.pauseTimer('${this.timerId}')">
                                <i class="bx bx-pause"></i> Pause
                            </button>
                            <button class="btn btn-outline-secondary" onclick="window.resetTimer('${this.timerId}')">
                                <i class="bx bx-reset"></i> Reset
                            </button>
                        </div>
                    </div>
                `;
                break;
                
            case 'paused':
                html = `
                    <div class="rest-timer-paused text-center py-3">
                        <div class="rest-timer-display mb-2">
                            <span class="display-4">${this.formatTime(this.remainingSeconds)}</span>
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-success" onclick="window.resumeTimer('${this.timerId}')">
                                <i class="bx bx-play"></i> Resume
                            </button>
                            <button class="btn btn-outline-secondary" onclick="window.resetTimer('${this.timerId}')">
                                <i class="bx bx-reset"></i> Reset
                            </button>
                        </div>
                    </div>
                `;
                break;
                
            case 'done':
                html = `
                    <div class="rest-timer-done text-center py-3">
                        <div class="rest-timer-label mb-2 text-success">
                            <i class="bx bx-check-circle me-1"></i>Rest: Done ✓
                        </div>
                        <button class="btn btn-outline-success" onclick="window.resetTimer('${this.timerId}')">
                            <i class="bx bx-refresh me-1"></i>Start Again
                        </button>
                    </div>
                `;
                break;
        }
        
        this.element.innerHTML = html;
    }
}

/**
 * ============================================
 * TIMER CONTROL FUNCTIONS
 * ============================================
 */
window.startTimer = function(timerId) {
    const timer = window.ghostGym.workoutMode.timers[timerId];
    if (timer) timer.start();
};

window.pauseTimer = function(timerId) {
    const timer = window.ghostGym.workoutMode.timers[timerId];
    if (timer) timer.pause();
};

window.resumeTimer = function(timerId) {
    const timer = window.ghostGym.workoutMode.timers[timerId];
    if (timer) timer.resume();
};

window.resetTimer = function(timerId) {
    const timer = window.ghostGym.workoutMode.timers[timerId];
    if (timer) timer.reset();
};

/**
 * ============================================
 * WORKOUT MODE INITIALIZATION
 * ============================================
 */
async function initWorkoutMode() {
    console.log('🏋️ Initializing Workout Mode...');
    
    // Get workout ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const workoutId = urlParams.get('id');
    
    if (!workoutId) {
        showError('No workout selected. Please select a workout to begin.');
        return;
    }
    
    // Load workout
    await loadWorkout(workoutId);
    
    // Initialize sound toggle
    initializeSoundToggle();
    
    // Initialize share button
    initializeShareButton();
    
    // Initialize session controls
    initializeSessionControls();
    
    console.log('✅ Workout Mode initialized');
}

/**
 * Get Firebase auth token
 */
async function getAuthToken() {
    try {
        // Wait for Firebase to be ready
        if (!window.firebase || !window.firebase.auth) {
            console.warn('⚠️ Firebase not ready yet');
            return null;
        }
        
        const currentUser = window.firebase.auth().currentUser;
        if (!currentUser) {
            console.warn('⚠️ No current user');
            return null;
        }
        
        const token = await currentUser.getIdToken();
        console.log('✅ Got auth token for user:', currentUser.email);
        return token;
    } catch (error) {
        console.error('❌ Error getting auth token:', error);
        return null;
    }
}

/**
 * Load workout data
 */
async function loadWorkout(workoutId) {
    try {
        console.log('📥 Loading workout:', workoutId);
        
        // Show loading state
        document.getElementById('workoutLoadingState').style.display = 'block';
        document.getElementById('workoutErrorState').style.display = 'none';
        document.getElementById('exerciseCardsContainer').style.display = 'none';
        document.getElementById('workoutModeFooter').style.display = 'none';
        
        // Load workout from data manager
        const workouts = await window.dataManager.getWorkouts();
        const workout = workouts.find(w => w.id === workoutId);
        
        if (!workout) {
            throw new Error('Workout not found');
        }
        
        // Store workout
        window.ghostGym.workoutMode.currentWorkout = workout;
        
        // Initialize exercise history cache
        if (!window.ghostGym.workoutMode.exerciseHistory) {
            window.ghostGym.workoutMode.exerciseHistory = {};
        }
        
        // Update page title
        document.getElementById('workoutName').textContent = workout.name;
        document.title = `👻 ${workout.name} - Workout Mode - Ghost Gym`;
        
        // Render exercise cards
        renderExerciseCards(workout);
        
        // Initialize tooltips for Start Workout button
        initializeStartButtonTooltip();
        
        // Hide loading, show content
        document.getElementById('workoutLoadingState').style.display = 'none';
        document.getElementById('exerciseCardsContainer').style.display = 'block';
        document.getElementById('workoutModeFooter').style.display = 'block';
        
        console.log('✅ Workout loaded:', workout.name);
        
    } catch (error) {
        console.error('❌ Error loading workout:', error);
        showError(error.message);
    }
}

/**
 * Show error state
 */
function showError(message) {
    document.getElementById('workoutLoadingState').style.display = 'none';
    document.getElementById('workoutErrorState').style.display = 'block';
    document.getElementById('exerciseCardsContainer').style.display = 'none';
    document.getElementById('workoutModeFooter').style.display = 'none';
    
    // Update error message if needed
    const errorText = document.querySelector('#workoutErrorState p');
    if (errorText && message) {
        errorText.textContent = message;
    }
}

/**
 * ============================================
 * EXERCISE CARD RENDERING
 * ============================================
 */
function renderExerciseCards(workout) {
    const container = document.getElementById('exerciseCardsContainer');
    if (!container) return;
    
    let html = '';
    let exerciseIndex = 0;
    
    // Render regular exercise groups
    if (workout.exercise_groups && workout.exercise_groups.length > 0) {
        workout.exercise_groups.forEach((group, groupIndex) => {
            html += renderExerciseCard(group, exerciseIndex, false);
            exerciseIndex++;
        });
    }
    
    // Render bonus exercises
    if (workout.bonus_exercises && workout.bonus_exercises.length > 0) {
        workout.bonus_exercises.forEach((bonus, bonusIndex) => {
            const bonusGroup = {
                exercises: { a: bonus.name },
                sets: bonus.sets,
                reps: bonus.reps,
                rest: bonus.rest,
                notes: bonus.notes
            };
            html += renderExerciseCard(bonusGroup, exerciseIndex, true);
            exerciseIndex++;
        });
    }
    
    container.innerHTML = html;
    
    // Initialize timers
    initializeTimers();
}

/**
 * Render individual exercise card
 */
function renderExerciseCard(group, index, isBonus) {
    const exercises = group.exercises || {};
    const mainExercise = exercises.a || 'Unknown Exercise';
    const alternates = [];
    
    // Collect alternate exercises
    if (exercises.b) alternates.push({ label: 'Alt1', name: exercises.b });
    if (exercises.c) alternates.push({ label: 'Alt2', name: exercises.c });
    
    const sets = group.sets || '3';
    const reps = group.reps || '8-12';
    const rest = group.rest || '60s';
    const notes = group.notes || '';
    
    // Parse rest time to seconds
    const restSeconds = parseRestTime(rest);
    const timerId = `timer-${index}`;
    
    const bonusClass = isBonus ? 'bonus-exercise' : '';
    
    // Check if session is active
    const session = window.ghostGym.workoutMode.session;
    const isSessionActive = session && session.status === 'in_progress';
    
    // Get exercise history for this exercise
    const history = window.ghostGym.workoutMode.exerciseHistory?.[mainExercise];
    const lastWeight = history?.last_weight || '';
    const lastWeightUnit = history?.last_weight_unit || 'lbs';
    const lastSessionDate = history?.last_session_date ? new Date(history.last_session_date).toLocaleDateString() : null;
    
    // Get current weight from session (if already entered)
    const currentWeight = session?.exercises?.[mainExercise]?.weight || lastWeight;
    const currentUnit = session?.exercises?.[mainExercise]?.weight_unit || lastWeightUnit;
    
    return `
        <div class="card exercise-card ${bonusClass}" data-exercise-index="${index}" data-exercise-name="${escapeHtml(mainExercise)}">
            <!-- Collapsed Header -->
            <div class="card-header exercise-card-header" onclick="toggleExerciseCard(${index})">
                <div class="exercise-card-summary">
                    <h6 class="mb-1">${escapeHtml(mainExercise)}</h6>
                    <div class="exercise-card-meta text-muted small">
                        ${sets} × ${reps} • Rest: ${rest}
                        ${isSessionActive && currentWeight ? ` • ${currentWeight} ${currentUnit}` : ''}
                    </div>
                    ${alternates.length > 0 ? `
                        <div class="exercise-card-alts text-muted small mt-1">
                            ${alternates.map(alt => `<span>${alt.label}: ${escapeHtml(alt.name)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                <i class="bx bx-chevron-down expand-icon"></i>
            </div>
            
            <!-- Expanded Body -->
            <div class="card-body exercise-card-body" style="display: none;">
                <!-- Exercise Details -->
                <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h5 class="mb-0">${escapeHtml(mainExercise)}</h5>
                        <span class="badge bg-label-primary">${sets} × ${reps}</span>
                    </div>
                    
                    ${notes ? `
                        <div class="alert alert-info mb-3">
                            <i class="bx bx-info-circle me-1"></i>
                            ${escapeHtml(notes)}
                        </div>
                    ` : ''}
                    
                    ${alternates.length > 0 ? `
                        <div class="text-muted small mb-3">
                            <strong>Alternates:</strong><br>
                            ${alternates.map(alt => `${alt.label}: ${escapeHtml(alt.name)}`).join('<br>')}
                        </div>
                    ` : ''}
                </div>
                
                <!-- Weight Input (Phase 2) -->
                ${isSessionActive ? `
                    <div class="weight-input-container mb-3">
                        <label class="form-label fw-semibold">
                            <i class="bx bx-dumbbell me-1"></i>Weight
                        </label>
                        <div class="input-group">
                            <input
                                type="number"
                                class="form-control form-control-lg weight-input"
                                data-exercise-name="${escapeHtml(mainExercise)}"
                                value="${currentWeight}"
                                placeholder="Enter weight"
                                step="5"
                                min="0">
                            <select class="form-select weight-unit-select" data-exercise-name="${escapeHtml(mainExercise)}" style="max-width: 80px;">
                                <option value="lbs" ${currentUnit === 'lbs' ? 'selected' : ''}>lbs</option>
                                <option value="kg" ${currentUnit === 'kg' ? 'selected' : ''}>kg</option>
                            </select>
                            <span class="input-group-text">
                                <i class="bx bx-loader-alt bx-spin save-indicator" style="display: none;"></i>
                                <i class="bx bx-check text-success save-success" style="display: none;"></i>
                            </span>
                        </div>
                        ${lastWeight && lastSessionDate ? `
                            <small class="text-muted d-block mt-1">
                                <i class="bx bx-history me-1"></i>Last: ${lastWeight} ${lastWeightUnit} (${lastSessionDate})
                            </small>
                        ` : ''}
                    </div>
                ` : ''}
                
                <!-- Rest Timer -->
                <div class="rest-timer-container mb-3">
                    <div class="rest-timer" data-rest-seconds="${restSeconds}" data-timer-id="${timerId}">
                        <!-- Timer UI will be rendered here -->
                    </div>
                </div>
                
                <!-- Next Exercise Button -->
                <button class="btn btn-primary w-100" onclick="goToNextExercise(${index})">
                    <i class="bx bx-right-arrow-alt me-1"></i>
                    Next Exercise
                </button>
            </div>
        </div>
    `;
}

/**
 * Parse rest time string to seconds
 */
function parseRestTime(restStr) {
    const match = restStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 60;
}

/**
 * Initialize all timers
 */
function initializeTimers() {
    const timerElements = document.querySelectorAll('.rest-timer[data-timer-id]');
    
    timerElements.forEach(element => {
        const timerId = element.getAttribute('data-timer-id');
        const restSeconds = parseInt(element.getAttribute('data-rest-seconds')) || 60;
        
        const timer = new RestTimer(timerId, restSeconds);
        window.ghostGym.workoutMode.timers[timerId] = timer;
        timer.render();
    });
}

/**
 * ============================================
 * CARD INTERACTION
 * ============================================
 */
function toggleExerciseCard(index) {
    const card = document.querySelector(`.exercise-card[data-exercise-index="${index}"]`);
    if (!card) return;
    
    const isExpanded = card.classList.contains('expanded');
    
    if (isExpanded) {
        // Collapse this card
        collapseCard(card);
    } else {
        // Collapse all other cards first
        document.querySelectorAll('.exercise-card.expanded').forEach(otherCard => {
            collapseCard(otherCard);
        });
        
        // Expand this card
        expandCard(card);
    }
}

function expandCard(card) {
    card.classList.add('expanded');
    const body = card.querySelector('.exercise-card-body');
    if (body) {
        body.style.display = 'block';
    }
    
    // Scroll card into view
    setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function collapseCard(card) {
    card.classList.remove('expanded');
    const body = card.querySelector('.exercise-card-body');
    if (body) {
        body.style.display = 'none';
    }
}

/**
 * Go to next exercise
 */
function goToNextExercise(currentIndex) {
    const allCards = document.querySelectorAll('.exercise-card');
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < allCards.length) {
        // Close current card
        const currentCard = allCards[currentIndex];
        collapseCard(currentCard);
        
        // Open next card
        setTimeout(() => {
            toggleExerciseCard(nextIndex);
        }, 300);
    } else {
        // Last exercise - show completion message
        if (confirm('🎉 Workout complete! Great job!\n\nWould you like to return to the workout list?')) {
            window.location.href = 'workouts.html';
        }
    }
}

/**
 * ============================================
 * SOUND TOGGLE
 * ============================================
 */
function initializeSoundToggle() {
    const soundBtn = document.getElementById('soundToggleBtn');
    const soundIcon = document.getElementById('soundIcon');
    const soundStatus = document.getElementById('soundStatus');
    
    if (!soundBtn) return;
    
    // Update UI based on current state
    updateSoundUI();
    
    // Add click handler
    soundBtn.addEventListener('click', () => {
        window.ghostGym.workoutMode.soundEnabled = !window.ghostGym.workoutMode.soundEnabled;
        localStorage.setItem('workoutSoundEnabled', window.ghostGym.workoutMode.soundEnabled);
        updateSoundUI();
    });
    
    function updateSoundUI() {
        const enabled = window.ghostGym.workoutMode.soundEnabled;
        soundStatus.textContent = enabled ? 'On' : 'Off';
        soundIcon.className = enabled ? 'bx bx-volume-full me-1' : 'bx bx-volume-mute me-1';
        soundBtn.className = enabled ? 'btn btn-outline-secondary' : 'btn btn-outline-danger';
    }
}

/**
 * ============================================
 * SHARE FUNCTIONALITY
 * ============================================
 */
function initializeShareButton() {
    const shareBtn = document.getElementById('shareWorkoutBtn');
    if (!shareBtn) return;
    
    shareBtn.addEventListener('click', async () => {
        const workout = window.ghostGym.workoutMode.currentWorkout;
        if (!workout) return;
        
        const shareData = {
            title: `${workout.name} - Ghost Gym Workout`,
            text: generateShareText(workout),
            url: window.location.href
        };
        
        // Try Web Share API first
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                console.log('✅ Workout shared successfully');
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('❌ Error sharing:', error);
                    fallbackShare(shareData);
                }
            }
        } else {
            fallbackShare(shareData);
        }
    });
}

function generateShareText(workout) {
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
    
    if (workout.bonus_exercises && workout.bonus_exercises.length > 0) {
        text += `\n🎁 Bonus:\n`;
        workout.bonus_exercises.forEach((bonus, index) => {
            text += `${index + 1}. ${bonus.name} - ${bonus.sets}×${bonus.reps}\n`;
        });
    }
    
    text += `\n👻 Created with Ghost Gym`;
    
    return text;
}

function fallbackShare(shareData) {
    // Copy to clipboard
    const textToCopy = `${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        if (window.showAlert) {
            window.showAlert('Workout details copied to clipboard!', 'success');
        } else {
            alert('Workout details copied to clipboard!');
        }
    }).catch(error => {
        console.error('❌ Error copying to clipboard:', error);
        if (window.showAlert) {
            window.showAlert('Could not copy to clipboard', 'danger');
        } else {
            alert('Could not copy to clipboard');
        }
    });
}
/**
 * ============================================
 * SESSION MANAGEMENT (Phase 1)
 * ============================================
 */

/**
 * Initialize session controls
 */
function initializeSessionControls() {
    const startBtn = document.getElementById('startWorkoutBtn');
    const completeBtn = document.getElementById('completeWorkoutBtn');
    
    if (startBtn) {
        startBtn.addEventListener('click', handleStartWorkout);
    }
    
    if (completeBtn) {
        completeBtn.addEventListener('click', handleCompleteWorkout);
    }
}

/**
 * Initialize tooltip for Start Workout button
 */
async function initializeStartButtonTooltip() {
    const startBtn = document.getElementById('startWorkoutBtn');
    if (!startBtn) return;
    
    // Destroy existing tooltip if any
    const existingTooltip = window.bootstrap?.Tooltip?.getInstance(startBtn);
    if (existingTooltip) {
        existingTooltip.dispose();
    }
    
    // Check if user is authenticated
    const authToken = await getAuthToken();
    
    // Update button and tooltip based on auth status
    if (authToken) {
        // User is logged in - show normal tooltip
        startBtn.setAttribute('data-bs-original-title', 'Start tracking your workout with weight logging');
        startBtn.setAttribute('title', 'Start tracking your workout with weight logging');
        startBtn.classList.remove('btn-outline-primary');
        startBtn.classList.add('btn-primary');
        console.log('✅ User authenticated - button ready');
    } else {
        // User is NOT logged in - show login prompt
        startBtn.setAttribute('data-bs-original-title', '🔒 Log in to track weights and save progress');
        startBtn.setAttribute('title', '🔒 Log in to track weights and save progress');
        startBtn.classList.remove('btn-primary');
        startBtn.classList.add('btn-outline-primary');
        console.log('⚠️ User not authenticated - login required');
    }
    
    // Initialize Bootstrap tooltip
    if (window.bootstrap && window.bootstrap.Tooltip) {
        new window.bootstrap.Tooltip(startBtn);
    }
}

/**
 * Handle start workout button click
 */
async function handleStartWorkout() {
    const workout = window.ghostGym.workoutMode.currentWorkout;
    if (!workout) {
        console.error('No workout loaded');
        return;
    }
    
    // Check if user is authenticated
    const token = await getAuthToken();
    if (!token) {
        // Show login prompt
        showLoginPrompt();
        return;
    }
    
    await startWorkoutSession(workout.id, workout.name);
}

/**
 * Show login prompt when user tries to start workout without auth
 */
function showLoginPrompt() {
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
    
    if (window.showAlert) {
        window.showAlert(message, 'info');
    } else {
        alert('Please log in to track your workouts and save weight progress.');
    }
    
    // Optionally trigger login modal if available
    setTimeout(() => {
        const loginBtn = document.querySelector('[data-bs-target="#loginModal"]');
        if (loginBtn) {
            loginBtn.click();
        }
    }, 2000);
}

/**
 * Handle complete workout button click
 */
async function handleCompleteWorkout() {
    await completeWorkoutSession();
}

/**
 * Start a new workout session
 */
async function startWorkoutSession(workoutId, workoutName) {
    try {
        console.log('🏋️ Starting workout session:', workoutName);
        
        // Show loading state
        const startBtn = document.getElementById('startWorkoutBtn');
        startBtn.disabled = true;
        startBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Starting...';
        
        // Get auth token
        const token = await getAuthToken();
        if (!token) {
            throw new Error('Authentication required. Please log in to track your workout.');
        }
        
        // Create session via API
        const response = await fetch('/api/v3/workout-sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                workout_id: workoutId,
                workout_name: workoutName,
                started_at: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to create session: ${response.statusText}`);
        }
        
        const session = await response.json();
        
        // Update global state
        if (!window.ghostGym.workoutMode.session) {
            window.ghostGym.workoutMode.session = {};
        }
        
        window.ghostGym.workoutMode.session = {
            id: session.id,
            workoutId: workoutId,
            workoutName: workoutName,
            startedAt: new Date(session.started_at),
            status: 'in_progress',
            exercises: {},
            autoSaveTimer: null,
            timerInterval: null
        };
        
        // Fetch exercise history
        await fetchExerciseHistory(workoutId);
        
        // Update UI
        startBtn.style.display = 'none';
        document.getElementById('sessionActiveIndicator').style.display = 'block';
        document.getElementById('completeWorkoutBtn').style.display = 'block';
        document.getElementById('sessionInfo').style.display = 'block';
        
        // Start session timer
        startSessionTimer();
        
        // Re-render exercise cards to show weight inputs
        const workout = window.ghostGym.workoutMode.currentWorkout;
        if (workout) {
            renderExerciseCards(workout);
            
            // Initialize weight input event listeners
            initializeWeightInputs();
        }
        
        console.log('✅ Workout session started:', session.id);
        
        if (window.showAlert) {
            window.showAlert('Workout session started! 💪', 'success');
        }
        
    } catch (error) {
        console.error('❌ Error starting workout session:', error);
        
        // Reset button
        const startBtn = document.getElementById('startWorkoutBtn');
        startBtn.disabled = false;
        startBtn.innerHTML = '<i class="bx bx-play-circle me-2"></i>Start Workout';
        
        if (window.showAlert) {
            window.showAlert(error.message || 'Failed to start workout session. Please try again.', 'danger');
        } else {
            alert(error.message || 'Failed to start workout session. Please try again.');
        }
    }
}

/**
 * Fetch exercise history for workout
 */
async function fetchExerciseHistory(workoutId) {
    try {
        console.log('📊 Fetching exercise history for workout:', workoutId);
        
        const token = await getAuthToken();
        if (!token) {
            console.warn('No auth token, skipping history fetch');
            window.ghostGym.workoutMode.exerciseHistory = {};
            return;
        }
        
        const response = await fetch(`/api/v3/exercise-history/workout/${workoutId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch history: ${response.statusText}`);
        }
        
        const historyData = await response.json();
        
        // Cache exercise history
        window.ghostGym.workoutMode.exerciseHistory = historyData.exercises || {};
        
        console.log('✅ Exercise history loaded:', Object.keys(historyData.exercises || {}).length, 'exercises');
        
    } catch (error) {
        console.error('❌ Error fetching exercise history:', error);
        // Non-fatal error - continue without history
        window.ghostGym.workoutMode.exerciseHistory = {};
    }
}

/**
 * Complete the current workout session
 */
async function completeWorkoutSession() {
    try {
        const session = window.ghostGym.workoutMode.session;
        
        if (!session || !session.id || session.status !== 'in_progress') {
            throw new Error('No active session to complete');
        }
        
        console.log('🏁 Completing workout session:', session.id);
        
        // Show loading state
        const completeBtn = document.getElementById('completeWorkoutBtn');
        completeBtn.disabled = true;
        completeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Completing...';
        
        // Collect all exercise data
        const exercisesPerformed = collectExerciseData();
        
        // Get auth token
        const token = await getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }
        
        // Complete session via API
        const response = await fetch(`/api/v3/workout-sessions/${session.id}/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                completed_at: new Date().toISOString(),
                exercises_performed: exercisesPerformed,
                notes: ''
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to complete session: ${response.statusText}`);
        }
        
        const completedSession = await response.json();
        
        // Update state
        session.status = 'completed';
        session.completedAt = new Date(completedSession.completed_at);
        
        // Stop session timer
        stopSessionTimer();
        
        // Show success message
        showCompletionSummary(completedSession);
        
        console.log('✅ Workout session completed:', session.id);
        
    } catch (error) {
        console.error('❌ Error completing workout session:', error);
        
        // Reset button
        const completeBtn = document.getElementById('completeWorkoutBtn');
        completeBtn.disabled = false;
        completeBtn.innerHTML = '<i class="bx bx-check-circle me-2"></i>Complete Workout';
        
        if (window.showAlert) {
            window.showAlert(error.message || 'Failed to complete workout. Please try again.', 'danger');
        } else {
            alert(error.message || 'Failed to complete workout. Please try again.');
        }
    }
}

/**
 * Collect all exercise data for session completion
 */
function collectExerciseData() {
    const workout = window.ghostGym.workoutMode.currentWorkout;
    const session = window.ghostGym.workoutMode.session;
    const exercisesPerformed = [];
    
    let orderIndex = 0;
    
    // Collect from exercise groups
    if (workout.exercise_groups) {
        workout.exercise_groups.forEach((group, groupIndex) => {
            const mainExercise = group.exercises?.a;
            if (!mainExercise) return;
            
            const exerciseData = session.exercises[mainExercise] || {};
            const history = window.ghostGym.workoutMode.exerciseHistory?.[mainExercise];
            
            exercisesPerformed.push({
                exercise_name: mainExercise,
                exercise_id: exerciseData.exercise_id || null,
                group_id: group.group_id || `group-${groupIndex}`,
                sets_completed: parseInt(group.sets) || 0,
                target_sets: group.sets || '3',
                target_reps: group.reps || '8-12',
                weight: exerciseData.weight || 0,
                weight_unit: exerciseData.weight_unit || 'lbs',
                previous_weight: history?.last_weight || null,
                weight_change: exerciseData.weight_change || 0,
                order_index: orderIndex++,
                is_bonus: false
            });
        });
    }
    
    // Collect from bonus exercises
    if (workout.bonus_exercises) {
        workout.bonus_exercises.forEach((bonus, bonusIndex) => {
            const exerciseData = session.exercises[bonus.name] || {};
            const history = window.ghostGym.workoutMode.exerciseHistory?.[bonus.name];
            
            exercisesPerformed.push({
                exercise_name: bonus.name,
                exercise_id: bonus.exercise_id || null,
                group_id: bonus.exercise_id || `bonus-${bonusIndex}`,
                sets_completed: parseInt(bonus.sets) || 0,
                target_sets: bonus.sets || '2',
                target_reps: bonus.reps || '15',
                weight: exerciseData.weight || 0,
                weight_unit: exerciseData.weight_unit || 'lbs',
                previous_weight: history?.last_weight || null,
                weight_change: exerciseData.weight_change || 0,
                order_index: orderIndex++,
                is_bonus: true
            });
        });
    }
    
    return exercisesPerformed;
}

/**
 * Start session timer
 */
function startSessionTimer() {
    const session = window.ghostGym.workoutMode.session;
    
    if (session.timerInterval) {
        clearInterval(session.timerInterval);
    }
    
    session.timerInterval = setInterval(() => {
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
function stopSessionTimer() {
    const session = window.ghostGym.workoutMode.session;
    
    if (session && session.timerInterval) {
        clearInterval(session.timerInterval);
        session.timerInterval = null;
    }
}

/**
 * Show completion summary modal
 */
function showCompletionSummary(session) {
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
    
    if (window.showAlert) {
        window.showAlert(message, 'success');
    } else {
        alert('Workout completed successfully!');
    }
    
    // Redirect to workouts page after 3 seconds
    setTimeout(() => {
        window.location.href = 'workouts.html';
    }, 3000);
}

/**
 * ============================================
 * WEIGHT INPUT & AUTO-SAVE (Phase 2)
 * ============================================
 */

/**
 * Initialize weight input event listeners
 */
function initializeWeightInputs() {
    console.log('🏋️ Initializing weight inputs...');
    
    // Get all weight inputs
    const weightInputs = document.querySelectorAll('.weight-input');
    const unitSelects = document.querySelectorAll('.weight-unit-select');
    
    // Add event listeners to weight inputs
    weightInputs.forEach(input => {
        input.addEventListener('input', handleWeightChange);
        input.addEventListener('blur', handleWeightBlur);
    });
    
    // Add event listeners to unit selects
    unitSelects.forEach(select => {
        select.addEventListener('change', handleUnitChange);
    });
    
    console.log('✅ Weight inputs initialized:', weightInputs.length, 'inputs');
}

/**
 * Handle weight input change (debounced auto-save)
 */
function handleWeightChange(event) {
    const input = event.target;
    const exerciseName = input.getAttribute('data-exercise-name');
    const weight = parseFloat(input.value) || 0;
    
    // Get unit
    const card = input.closest('.exercise-card');
    const unitSelect = card.querySelector('.weight-unit-select');
    const unit = unitSelect ? unitSelect.value : 'lbs';
    
    // Update session state
    updateExerciseWeight(exerciseName, weight, unit);
    
    // Show saving indicator
    showSaveIndicator(card, 'saving');
    
    // Debounced auto-save (2 seconds)
    const session = window.ghostGym.workoutMode.session;
    if (session.autoSaveTimer) {
        clearTimeout(session.autoSaveTimer);
    }
    
    session.autoSaveTimer = setTimeout(async () => {
        await autoSaveSession(card);
    }, 2000);
}

/**
 * Handle weight input blur (immediate save)
 */
function handleWeightBlur(event) {
    const input = event.target;
    const card = input.closest('.exercise-card');
    
    // Cancel debounced save and save immediately
    const session = window.ghostGym.workoutMode.session;
    if (session.autoSaveTimer) {
        clearTimeout(session.autoSaveTimer);
        session.autoSaveTimer = null;
    }
    
    autoSaveSession(card);
}

/**
 * Handle unit change
 */
function handleUnitChange(event) {
    const select = event.target;
    const exerciseName = select.getAttribute('data-exercise-name');
    const unit = select.value;
    
    // Get weight
    const card = select.closest('.exercise-card');
    const weightInput = card.querySelector('.weight-input');
    const weight = parseFloat(weightInput.value) || 0;
    
    // Update session state
    updateExerciseWeight(exerciseName, weight, unit);
    
    // Show saving indicator
    showSaveIndicator(card, 'saving');
    
    // Immediate save on unit change
    autoSaveSession(card);
}

/**
 * Update exercise weight in session state
 */
function updateExerciseWeight(exerciseName, weight, unit) {
    const session = window.ghostGym.workoutMode.session;
    if (!session || !session.exercises) {
        session.exercises = {};
    }
    
    // Get previous weight for change calculation
    const history = window.ghostGym.workoutMode.exerciseHistory?.[exerciseName];
    const previousWeight = history?.last_weight || 0;
    const weightChange = weight - previousWeight;
    
    // Update session state
    session.exercises[exerciseName] = {
        weight: weight,
        weight_unit: unit,
        previous_weight: previousWeight,
        weight_change: weightChange
    };
    
    console.log('💪 Updated weight:', exerciseName, weight, unit);
}

/**
 * Auto-save session progress
 */
async function autoSaveSession(card) {
    try {
        const session = window.ghostGym.workoutMode.session;
        
        if (!session || !session.id || session.status !== 'in_progress') {
            console.warn('No active session to save');
            return;
        }
        
        console.log('💾 Auto-saving session...');
        
        // Get auth token
        const token = await getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }
        
        // Collect exercise data
        const exercisesPerformed = collectExerciseData();
        
        // Save via PATCH API
        const response = await fetch(`/api/v3/workout-sessions/${session.id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                exercises_performed: exercisesPerformed
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save: ${response.statusText}`);
        }
        
        // Show success indicator
        if (card) {
            showSaveIndicator(card, 'success');
        }
        
        // Update auto-save status in header
        const autoSaveStatus = document.getElementById('autoSaveStatus');
        if (autoSaveStatus) {
            autoSaveStatus.textContent = 'Saved';
            setTimeout(() => {
                autoSaveStatus.textContent = 'Ready';
            }, 2000);
        }
        
        console.log('✅ Session auto-saved');
        
    } catch (error) {
        console.error('❌ Error auto-saving session:', error);
        
        // Show error indicator
        if (card) {
            showSaveIndicator(card, 'error');
        }
        
        // Show error message
        if (window.showAlert) {
            window.showAlert('Failed to save weight. Please try again.', 'warning');
        }
    }
}

/**
 * Show save indicator in exercise card
 */
function showSaveIndicator(card, state) {
    if (!card) return;
    
    const saveIndicator = card.querySelector('.save-indicator');
    const saveSuccess = card.querySelector('.save-success');
    
    if (!saveIndicator || !saveSuccess) return;
    
    // Hide all indicators first
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
        case 'error':
            // Could add error icon here
            break;
    }
}

/**
 * ============================================
 * UTILITY FUNCTIONS
 * ============================================
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * ============================================
 * GLOBAL EXPORTS
 * ============================================
 */
window.initWorkoutMode = initWorkoutMode;
window.loadWorkout = loadWorkout;
window.toggleExerciseCard = toggleExerciseCard;
window.goToNextExercise = goToNextExercise;
window.initializeStartButtonTooltip = initializeStartButtonTooltip;

console.log('📦 Workout Mode module loaded');