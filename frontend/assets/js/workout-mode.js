/**
 * Ghost Gym - Workout Mode JavaScript
 * Handles workout execution with rest timers and exercise navigation
 * @version 1.0.0
 * @date 2025-01-29
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
    
    console.log('✅ Workout Mode initialized');
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
        
        // Update page title
        document.getElementById('workoutName').textContent = workout.name;
        document.title = `👻 ${workout.name} - Workout Mode - Ghost Gym`;
        
        // Render exercise cards
        renderExerciseCards(workout);
        
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
    
    return `
        <div class="card exercise-card ${bonusClass}" data-exercise-index="${index}">
            <!-- Collapsed Header -->
            <div class="card-header exercise-card-header" onclick="toggleExerciseCard(${index})">
                <div class="exercise-card-summary">
                    <h6 class="mb-1">${escapeHtml(mainExercise)}</h6>
                    <div class="exercise-card-meta text-muted small">
                        ${sets} × ${reps} • Rest: ${rest}
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
        }
    });
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

console.log('📦 Workout Mode module loaded');