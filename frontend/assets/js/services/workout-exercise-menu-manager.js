/**
 * Ghost Gym - Workout Exercise Menu Manager
 * Manages exercise context menus (three-dot menus) for workout mode
 * @version 1.0.0
 * @date 2026-02-06
 * Phase 8: Exercise Menu Management
 */

class WorkoutExerciseMenuManager {
    constructor() {
        // State
        this._clickOutsideHandler = null;

        console.log('📋 Workout Exercise Menu Manager initialized');
    }

    /**
     * Toggle exercise more menu (three-dot menu)
     * @param {HTMLElement} button - The more button that was clicked
     * @param {string} exerciseName - Exercise name
     * @param {number} index - Exercise index
     */
    toggleExerciseMenu(button, exerciseName, index) {
        if (!button || !button.classList.contains('workout-more-btn')) {
            console.warn('⚠️ Invalid button element for menu toggle');
            return;
        }

        // Find the menu element (sibling of the button)
        const menu = button.parentElement.querySelector('.workout-menu');
        if (!menu) {
            console.warn('⚠️ Menu element not found');
            return;
        }

        const isOpen = menu.classList.contains('show');

        // Close all other open menus first
        document.querySelectorAll('.workout-menu.show').forEach(m => {
            if (m !== menu) {
                m.classList.remove('show');
            }
        });

        // Toggle this menu
        if (isOpen) {
            menu.classList.remove('show');
            menu.classList.remove('dropup');
            this.removeClickOutsideListener();
        } else {
            // Reset dropup class before showing
            menu.classList.remove('dropup');
            menu.classList.add('show');

            // Check if menu overflows viewport and flip to dropup if needed
            const menuRect = menu.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const bottomBarHeight = 100; // Account for bottom action bar
            const safeBottom = viewportHeight - bottomBarHeight;

            if (menuRect.bottom > safeBottom) {
                // Not enough space below, flip to dropup
                menu.classList.add('dropup');
            }

            this.addClickOutsideListener();
        }

        console.log(`📋 Menu toggled for ${exerciseName} (index ${index}): ${isOpen ? 'closed' : 'opened'}`);
    }

    /**
     * Close all open exercise menus
     */
    closeAllMenus() {
        document.querySelectorAll('.workout-menu.show').forEach(menu => {
            menu.classList.remove('show');
            menu.classList.remove('dropup');
        });
        this.removeClickOutsideListener();
    }

    /**
     * Add click-outside listener to close menus
     * @private
     */
    addClickOutsideListener() {
        // Remove existing listener first to prevent duplicates
        this.removeClickOutsideListener();

        // Create new listener
        this._clickOutsideHandler = (event) => {
            // Check if click is outside all menus
            if (!event.target.closest('.workout-menu') && !event.target.closest('.workout-more-btn')) {
                document.querySelectorAll('.workout-menu.show').forEach(menu => {
                    menu.classList.remove('show');
                });
                this.removeClickOutsideListener();
            }
        };

        // Add listener with slight delay to prevent immediate triggering
        setTimeout(() => {
            document.addEventListener('click', this._clickOutsideHandler);
        }, 10);
    }

    /**
     * Remove click-outside listener
     * @private
     */
    removeClickOutsideListener() {
        if (this._clickOutsideHandler) {
            document.removeEventListener('click', this._clickOutsideHandler);
            this._clickOutsideHandler = null;
        }
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutExerciseMenuManager;
}

console.log('📦 Workout Exercise Menu Manager loaded');
