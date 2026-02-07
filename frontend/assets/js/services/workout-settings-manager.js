/**
 * Ghost Gym - Workout Settings Manager
 * Manages sound toggle, rest timer settings, and share functionality
 * @version 1.0.0
 * @date 2026-02-06
 * Phase 9: Settings Management
 */

class WorkoutSettingsManager {
    constructor(options = {}) {
        // Callbacks
        this.onGetCurrentWorkout = options.onGetCurrentWorkout || (() => null);

        // State
        this.soundEnabled = localStorage.getItem('workoutSoundEnabled') !== 'false';

        console.log('🔧 Workout Settings Manager initialized');
    }

    /**
     * Initialize all settings
     */
    initialize() {
        this.initializeSoundToggle();
        this.initializeRestTimerSetting();
        this.initializeShareButton();
    }

    /**
     * Initialize sound toggle buttons
     */
    initializeSoundToggle() {
        const soundBtn = document.getElementById('soundToggleBtn');
        const soundBtnBottom = document.getElementById('soundToggleBtnBottom');

        if (!soundBtn && !soundBtnBottom) return;

        this.updateSoundUI();

        // Main sound toggle button
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                this.soundEnabled = !this.soundEnabled;
                localStorage.setItem('workoutSoundEnabled', this.soundEnabled);
                this.updateSoundUI();
            });
        }

        // Bottom bar sound toggle button
        if (soundBtnBottom) {
            soundBtnBottom.addEventListener('click', () => {
                this.soundEnabled = !this.soundEnabled;
                localStorage.setItem('workoutSoundEnabled', this.soundEnabled);
                this.updateSoundUI();
            });
        }
    }

    /**
     * Initialize rest timer setting
     * Ensures rest timer respects enabled/disabled state on page load
     */
    initializeRestTimerSetting() {
        const enabled = localStorage.getItem('workoutRestTimerEnabled') !== 'false';
        console.log(`🕐 Rest timer setting initialized: ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Update sound UI elements to reflect current state
     */
    updateSoundUI() {
        const soundIcon = document.getElementById('soundIcon');
        const soundStatus = document.getElementById('soundStatus');
        const soundBtn = document.getElementById('soundToggleBtn');
        const soundBtnBottom = document.getElementById('soundToggleBtnBottom');

        if (soundStatus) soundStatus.textContent = this.soundEnabled ? 'On' : 'Off';
        if (soundIcon) soundIcon.className = this.soundEnabled ? 'bx bx-volume-full me-1' : 'bx bx-volume-mute me-1';
        if (soundBtn) soundBtn.className = this.soundEnabled ? 'btn btn-outline-secondary' : 'btn btn-outline-danger';

        // Update bottom bar button icon
        if (soundBtnBottom) {
            const icon = soundBtnBottom.querySelector('i');
            if (icon) {
                icon.className = this.soundEnabled ? 'bx bx-volume-full' : 'bx bx-volume-mute';
            }
        }
    }

    /**
     * Initialize share button
     */
    initializeShareButton() {
        const shareBtn = document.getElementById('shareWorkoutBtn');
        if (!shareBtn) return;

        shareBtn.addEventListener('click', async () => {
            const currentWorkout = this.onGetCurrentWorkout();
            if (!currentWorkout) return;

            const shareData = {
                title: `${currentWorkout.name} - Fitness Field Notes`,
                text: this.generateShareText(currentWorkout),
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

    /**
     * Generate share text for a workout
     * @param {Object} workout - Workout object
     * @returns {string} Formatted share text
     */
    generateShareText(workout) {
        let text = `${workout.name}\n\n`;

        if (workout.description) {
            text += `${workout.description}\n\n`;
        }

        text += `Exercises:\n`;

        if (workout.exercise_groups) {
            workout.exercise_groups.forEach((group, index) => {
                const mainEx = group.exercises?.a || 'Exercise';
                text += `${index + 1}. ${mainEx} - ${group.sets}x${group.reps}\n`;
            });
        }

        text += `\nCreated with Fitness Field Notes`;
        return text;
    }

    /**
     * Fallback share using clipboard
     * @param {Object} shareData - Share data object
     */
    fallbackShare(shareData) {
        const textToCopy = `${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`;

        navigator.clipboard.writeText(textToCopy).then(() => {
            if (window.showAlert) {
                window.showAlert('Workout details copied to clipboard!', 'success');
            }
        }).catch(error => {
            console.error('Error copying to clipboard:', error);
        });
    }

    /**
     * Check if sound is enabled
     * @returns {boolean} Sound enabled state
     */
    isSoundEnabled() {
        return this.soundEnabled;
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutSettingsManager;
}

console.log('📦 Workout Settings Manager loaded');
