/**
 * Ghost Gym - Workout Timer Manager
 * Consolidates all timer functionality for workout mode
 * @version 1.0.0
 * @date 2025-01-05
 */

class WorkoutTimerManager {
    /**
     * @param {Object} sessionService - Workout session service instance
     */
    constructor(sessionService) {
        this.sessionService = sessionService;
        this.timers = {}; // Individual exercise rest timers
        this.globalRestTimer = null; // Global rest timer from bottom action bar
        this.sessionTimerInterval = null; // Session elapsed time interval
        
        console.log('⏱️ Workout Timer Manager initialized');
    }
    
    // ==================== Session Timer ====================
    
    /**
     * Start session timer to track workout duration
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
     * Get elapsed time in seconds
     * @returns {number} Elapsed seconds or 0 if no session
     */
    getElapsedTime() {
        const session = this.sessionService.getCurrentSession();
        if (!session) return 0;
        
        return Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
    }
    
    // ==================== Rest Timers ====================
    
    /**
     * Initialize individual exercise card rest timers
     */
    initializeCardTimers() {
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
     * Initialize global rest timer (from bottom action bar)
     */
    initializeGlobalTimer() {
        // Wait for global rest timer to be available from bottom action bar service
        if (window.globalRestTimer) {
            this.globalRestTimer = window.globalRestTimer;
            console.log('✅ Global rest timer connected to timer manager');
            
            return true;
        } else {
            // Try again after a short delay
            setTimeout(() => {
                if (window.globalRestTimer) {
                    this.globalRestTimer = window.globalRestTimer;
                    console.log('✅ Global rest timer connected to timer manager (delayed)');
                } else {
                    console.warn('⚠️ Global rest timer still not available after delay');
                }
            }, 500);
            
            return false;
        }
    }
    
    /**
     * Sync global timer with currently expanded exercise card
     * @param {number} exerciseIndex - Index of expanded exercise
     * @param {number} restSeconds - Rest time in seconds
     */
    syncWithExpandedCard(exerciseIndex, restSeconds) {
        if (!this.globalRestTimer) {
            console.warn('⚠️ Global rest timer not available for sync');
            return;
        }
        
        this.globalRestTimer.syncWithCard(exerciseIndex, restSeconds);
        console.log(`🔄 Global timer synced with exercise ${exerciseIndex}: ${restSeconds}s`);
    }
    
    /**
     * Connect to global rest timer instance
     * @param {Object} globalRestTimer - Global rest timer instance
     */
    connectGlobalTimer(globalRestTimer) {
        this.globalRestTimer = globalRestTimer;
        console.log('✅ Global rest timer manually connected');
    }
    
    /**
     * Get individual timer by ID
     * @param {string} timerId - Timer ID
     * @returns {Object|null} Timer instance or null
     */
    getTimer(timerId) {
        return this.timers[timerId] || null;
    }
    
    /**
     * Clear all timers
     */
    clearAllTimers() {
        // Clear session timer
        this.stopSessionTimer();
        
        // Clear individual rest timers
        Object.values(this.timers).forEach(timer => {
            if (timer && timer.stop) {
                timer.stop();
            }
        });
        
        this.timers = {};
    }
    
    // ==================== Event Callbacks ====================
    
    /**
     * Register callback for timer tick events
     * @param {Function} callback - Callback function
     */
    onTimerTick(callback) {
        this.timerTickCallback = callback;
    }
    
    /**
     * Register callback for rest timer complete events
     * @param {Function} callback - Callback function
     */
    onRestComplete(callback) {
        this.restCompleteCallback = callback;
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutTimerManager;
}

console.log('📦 Workout Timer Manager loaded');
