/**
 * Ghost Gym - Inline Rest Timer Component
 * Text-based rest timer that appears inline with exercise card details
 * Extends RestTimer with inline text display
 * @version 1.0.0
 * @date 2026-01-09
 */

/**
 * InlineRestTimer Class
 * Extends the base RestTimer with inline text-based UI for exercise cards
 */
class InlineRestTimer extends RestTimer {
    /**
     * @param {number} exerciseIndex - Index of the exercise in the card list
     * @param {number} restSeconds - Rest time in seconds
     */
    constructor(exerciseIndex, restSeconds) {
        super(`inline-${exerciseIndex}`, restSeconds);
        this.exerciseIndex = exerciseIndex;
        this.onTimerStart = null; // Callback when timer starts (for single-timer enforcement)
        this.restDisplayText = null; // Original rest display text (e.g., "60s", "2min")
    }
    
    /**
     * Set the original rest display text from the data attribute
     * @param {string} displayText - Original rest time text (e.g., "60s", "2min")
     */
    setRestDisplayText(displayText) {
        this.restDisplayText = displayText;
    }

    /**
     * Override start to notify manager (single timer enforcement)
     */
    start() {
        if (this.state !== 'ready') return;
        
        // Notify manager to stop other timers before starting
        if (this.onTimerStart) {
            this.onTimerStart(this);
        }
        
        super.start();
    }

    /**
     * Override render for inline text-based display
     * States:
     * - ready: "Start Rest" link with play icon
     * - counting: "0:45" countdown with pause icon
     * - paused: "0:45" with resume/reset icons
     * - done: "Done! ✓" with restart icon
     */
    render() {
        const container = document.querySelector(`[data-inline-timer="${this.exerciseIndex}"]`);
        const displayElement = document.querySelector(`[data-inline-timer-display="${this.exerciseIndex}"]`);
        
        if (!container) {
            console.warn(`⚠️ Inline timer container not found for index ${this.exerciseIndex}`);
            return;
        }

        let buttonHtml = '';
        
        switch (this.state) {
            case 'ready':
                buttonHtml = this.renderReadyState();
                // Reset display to original rest time
                if (displayElement) {
                    displayElement.innerHTML = `<strong><i class="bx bx-time-five me-1"></i>${this.restDisplayText || this.totalSeconds + 's'}</strong>`;
                    displayElement.className = 'inline-timer-display';
                }
                break;
                
            case 'counting':
                buttonHtml = this.renderCountingState();
                // Update display with countdown in m:ss format
                if (displayElement) {
                    const displayClass = this.remainingSeconds <= 5 ? 'text-danger' :
                                       this.remainingSeconds <= 10 ? 'text-warning' : 'text-primary';
                    // Use formatTime() for minutes:seconds display (e.g., 190s → 3:10)
                    const formattedTime = WorkoutUtils.formatTime(this.remainingSeconds);
                    displayElement.innerHTML = `<strong class="${displayClass}"><i class="bx bx-time-five me-1"></i>${formattedTime}</strong>`;
                    displayElement.className = `inline-timer-display ${displayClass}`;
                }
                break;
                
            case 'paused':
                buttonHtml = this.renderPausedState();
                // Show paused state in display with m:ss format
                if (displayElement) {
                    const formattedTime = WorkoutUtils.formatTime(this.remainingSeconds);
                    displayElement.innerHTML = `<strong class="text-warning"><i class="bx bx-pause me-1"></i>${formattedTime}</strong>`;
                    displayElement.className = 'inline-timer-display text-warning';
                }
                break;
                
            case 'done':
                buttonHtml = this.renderDoneState();
                // Show done state in display
                if (displayElement) {
                    displayElement.innerHTML = `<strong class="text-success"><i class="bx bx-check-circle me-1"></i>Done!</strong>`;
                    displayElement.className = 'inline-timer-display text-success';
                }
                break;
        }
        
        container.innerHTML = buttonHtml;
    }

    /**
     * Render ready state - "Start Rest" button
     * @returns {string} HTML string
     */
    renderReadyState() {
        const displayText = this.restDisplayText || `${this.totalSeconds}s`;
        return `<a href="#" class="inline-timer-link"
                   onclick="window.inlineTimerStart(${this.exerciseIndex}); return false;"
                   title="Start ${displayText} rest timer">
            <i class="bx bx-play-circle bx-sm"></i> Start Rest
        </a>`;
    }

    /**
     * Render counting state - Pause button
     * @returns {string} HTML string
     */
    renderCountingState() {
        return `<a href="#" class="inline-timer-link text-warning"
           onclick="window.inlineTimerPause(${this.exerciseIndex}); return false;"
           title="Pause timer">
            <i class="bx bx-pause-circle bx-sm"></i> Pause
        </a>`;
    }

    /**
     * Render paused state - Resume and Reset buttons
     * @returns {string} HTML string
     */
    renderPausedState() {
        return `<a href="#" class="inline-timer-link text-primary"
           onclick="window.inlineTimerResume(${this.exerciseIndex}); return false;"
           title="Resume timer">
            <i class="bx bx-play-circle bx-sm"></i> Resume
        </a>
        <a href="#" class="inline-timer-action ms-2"
           onclick="window.inlineTimerReset(${this.exerciseIndex}); return false;"
           title="Reset timer">
            <i class="bx bx-reset bx-sm"></i> Reset
        </a>`;
    }

    /**
     * Render done state - Restart button
     * @returns {string} HTML string
     */
    renderDoneState() {
        const displayText = this.restDisplayText || `${this.totalSeconds}s`;
        return `<a href="#" class="inline-timer-link text-success"
           onclick="window.inlineTimerReset(${this.exerciseIndex}); return false;"
           title="Restart ${displayText} timer">
            <i class="bx bx-refresh bx-sm"></i> Restart
        </a>`;
    }

    /**
     * Override complete to add visual feedback
     */
    complete() {
        super.complete();
        
        // Add brief pulse animation to draw attention
        const container = document.querySelector(`[data-inline-timer="${this.exerciseIndex}"]`);
        if (container) {
            container.classList.add('inline-timer-complete-pulse');
            setTimeout(() => {
                container.classList.remove('inline-timer-complete-pulse');
            }, 1500);
        }
    }
}

/**
 * Global control functions for inline timers
 * These are called from onclick handlers in the rendered HTML
 */

window.inlineTimerStart = function(exerciseIndex) {
    const timerId = `inline-${exerciseIndex}`;
    const timer = window.workoutModeController?.timerManager?.inlineTimers?.[timerId];
    if (timer) {
        timer.start();
    } else {
        console.warn('⚠️ Inline timer not found for index:', exerciseIndex);
    }
};

window.inlineTimerPause = function(exerciseIndex) {
    const timerId = `inline-${exerciseIndex}`;
    const timer = window.workoutModeController?.timerManager?.inlineTimers?.[timerId];
    if (timer) {
        timer.pause();
    } else {
        console.warn('⚠️ Inline timer not found for index:', exerciseIndex);
    }
};

window.inlineTimerResume = function(exerciseIndex) {
    const timerId = `inline-${exerciseIndex}`;
    const timer = window.workoutModeController?.timerManager?.inlineTimers?.[timerId];
    if (timer) {
        timer.resume();
    } else {
        console.warn('⚠️ Inline timer not found for index:', exerciseIndex);
    }
};

window.inlineTimerReset = function(exerciseIndex) {
    const timerId = `inline-${exerciseIndex}`;
    const timer = window.workoutModeController?.timerManager?.inlineTimers?.[timerId];
    if (timer) {
        timer.reset();
    } else {
        console.warn('⚠️ Inline timer not found for index:', exerciseIndex);
    }
};

/**
 * Export the InlineRestTimer class
 */
window.InlineRestTimer = InlineRestTimer;

console.log('📦 Inline Rest Timer component loaded');