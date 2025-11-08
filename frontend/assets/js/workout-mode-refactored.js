/**
 * Ghost Gym - Workout Mode (Refactored)
 * Entry point that delegates to controller
 * @version 3.0.0
 * @date 2025-11-07
 * 
 * REFACTORED: Now uses service layer and controller pattern
 * - Session management → workout-session-service.js
 * - UI orchestration → workout-mode-controller.js
 * - This file: RestTimer class + backward compatibility
 */

/**
 * ============================================
 * REST TIMER CLASS
 * ============================================
 * Kept as-is - it works perfectly!
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
        if (window.workoutModeController && window.workoutModeController.soundEnabled) {
            this.playBeep();
        }
        
        this.render();
    }

    playBeep() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
            
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
        
        let labelHtml = '';
        let buttonHtml = '';
        
        switch (this.state) {
            case 'ready':
                labelHtml = `Rest: ${this.totalSeconds}s`;
                buttonHtml = `<button class="btn btn-success flex-fill" onclick="window.startTimer('${this.timerId}')">
                    <i class="bx bx-play me-1"></i>Start Rest
                </button>`;
                break;
                
            case 'counting':
                const displayClass = this.remainingSeconds <= 5 ? 'text-danger' :
                                   this.remainingSeconds <= 10 ? 'text-warning' : 'text-success';
                labelHtml = `<span class="${displayClass}">${this.formatTime(this.remainingSeconds)}</span>`;
                buttonHtml = `<button class="btn btn-outline-secondary flex-fill" onclick="window.pauseTimer('${this.timerId}')">
                    <i class="bx bx-stop-circle me-1"></i>Stop
                </button>`;
                break;
                
            case 'paused':
                labelHtml = `<span class="text-warning">${this.formatTime(this.remainingSeconds)}</span>`;
                buttonHtml = `<button class="btn btn-outline-secondary flex-fill" onclick="window.resetTimer('${this.timerId}')">
                    <i class="bx bx-reset me-1"></i>Reset
                </button>`;
                break;
                
            case 'done':
                labelHtml = `<span class="text-success"><i class="bx bx-check-circle me-1"></i>Done!</span>`;
                buttonHtml = `<button class="btn btn-success flex-fill" onclick="window.resetTimer('${this.timerId}')">
                    <i class="bx bx-refresh me-1"></i>Start
                </button>`;
                break;
        }
        
        // Render as two separate elements that will be placed in flex row
        this.element.innerHTML = `
            <div class="rest-timer-label-col flex-fill d-flex align-items-center justify-content-center">
                ${labelHtml}
            </div>
            ${buttonHtml}
        `;
    }
}

/**
 * ============================================
 * TIMER CONTROL FUNCTIONS
 * ============================================
 * Global functions for timer controls
 */
window.startTimer = function(timerId) {
    const timer = window.workoutModeController?.timers[timerId];
    if (timer) timer.start();
};

window.pauseTimer = function(timerId) {
    const timer = window.workoutModeController?.timers[timerId];
    if (timer) timer.pause();
};

window.resumeTimer = function(timerId) {
    const timer = window.workoutModeController?.timers[timerId];
    if (timer) timer.resume();
};

window.resetTimer = function(timerId) {
    const timer = window.workoutModeController?.timers[timerId];
    if (timer) timer.reset();
};

/**
 * ============================================
 * BACKWARD COMPATIBILITY EXPORTS
 * ============================================
 * These functions delegate to the controller
 */

// Export RestTimer class globally
window.RestTimer = RestTimer;

// Card interaction functions
window.toggleExerciseCard = function(index) {
    if (window.workoutModeController) {
        window.workoutModeController.toggleExerciseCard(index);
    }
};

window.goToNextExercise = function(index) {
    if (window.workoutModeController) {
        window.workoutModeController.goToNextExercise(index);
    }
};

// Utility function
window.escapeHtml = function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

/**
 * ============================================
 * INITIALIZATION
 * ============================================
 * Note: Controller auto-initializes via its own DOMContentLoaded listener
 * This file just provides the RestTimer class and compatibility functions
 */

console.log('📦 Workout Mode (Refactored) loaded');
console.log('✅ RestTimer class available');
console.log('✅ Timer control functions available');
console.log('✅ Backward compatibility exports available');
console.log('🎮 Controller will initialize automatically');