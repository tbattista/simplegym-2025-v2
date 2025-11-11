/**
 * Ghost Gym - Autosave Manager Module
 * Provides reusable autosave functionality for forms
 * @version 1.0.0
 */

class AutosaveManager {
    /**
     * Create an autosave manager instance
     * @param {Object} options - Configuration options
     * @param {string} options.namespace - Namespace for state storage (e.g., 'workoutBuilder')
     * @param {number} options.debounceMs - Debounce delay in milliseconds (default: 3000)
     * @param {Function} options.saveCallback - Async function to call when saving
     * @param {Function} options.updateIndicatorCallback - Function to update save status indicator
     * @param {boolean} options.enabled - Whether autosave is enabled (default: true)
     */
    constructor(options = {}) {
        this.namespace = options.namespace || 'autosave';
        this.debounceMs = options.debounceMs || 3000;
        this.saveCallback = options.saveCallback;
        this.updateIndicatorCallback = options.updateIndicatorCallback;
        this.enabled = options.enabled !== false;
        
        // Internal state
        this.timeout = null;
        this.lastSaveTime = null;
        this.relativeTimeInterval = null;
        
        // Initialize state in global namespace
        window.ghostGym = window.ghostGym || {};
        window.ghostGym[this.namespace] = window.ghostGym[this.namespace] || {};
        
        // Set default state properties
        this.state.isDirty = false;
        this.state.isAutosaving = false;
        this.state.selectedItemId = null;
        this.state.autosaveEnabled = this.enabled;
        
        console.log(`✅ AutosaveManager initialized for namespace: ${this.namespace}`);
    }
    
    /**
     * Get state object for this namespace
     */
    get state() {
        return window.ghostGym[this.namespace];
    }
    
    /**
     * Mark editor as having unsaved changes
     */
    markDirty() {
        if (!this.state.selectedItemId) {
            // Don't mark dirty for new unsaved items
            return;
        }
        
        this.state.isDirty = true;
        this.updateIndicator('unsaved');
        this.scheduleAutosave();
    }
    
    /**
     * Schedule autosave with debounce
     */
    scheduleAutosave() {
        if (!this.state.autosaveEnabled) {
            return;
        }
        
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            if (this.state.isDirty && this.state.selectedItemId) {
                this.performAutosave();
            }
        }, this.debounceMs);
    }
    
    /**
     * Perform autosave
     */
    async performAutosave() {
        if (this.state.isAutosaving) {
            return; // Prevent concurrent saves
        }
        
        if (!this.saveCallback) {
            console.error('❌ No save callback provided to AutosaveManager');
            return;
        }
        
        try {
            this.state.isAutosaving = true;
            this.updateIndicator('saving');
            
            // Call the provided save callback (pass true for silent mode)
            await this.saveCallback(true);
            
            this.state.isDirty = false;
            this.lastSaveTime = new Date();
            this.updateIndicator('saved');
            
            console.log('✅ Autosave successful');
            
        } catch (error) {
            console.error('❌ Autosave failed:', error);
            this.updateIndicator('error');
        } finally {
            this.state.isAutosaving = false;
        }
    }
    
    /**
     * Update save status indicator
     * @param {string} status - Status: 'saving', 'saved', 'unsaved', 'error'
     */
    updateIndicator(status) {
        // Use custom callback if provided
        if (this.updateIndicatorCallback) {
            this.updateIndicatorCallback(status);
            return;
        }
        
        // Fallback to default implementation
        const indicator = document.getElementById('saveStatus');
        if (!indicator) return;
        
        indicator.className = `save-status ${status}`;
        
        switch (status) {
            case 'saving':
                indicator.textContent = 'Saving...';
                break;
            case 'saved':
                indicator.textContent = 'All changes saved';
                break;
            case 'unsaved':
                indicator.textContent = 'Unsaved changes';
                break;
            case 'error':
                indicator.textContent = 'Save failed';
                break;
            default:
                indicator.textContent = '';
        }
    }
    
    /**
     * Update relative save time display
     */
    updateRelativeSaveTime() {
        if (!this.lastSaveTime) return;
        
        const indicator = document.getElementById('saveStatus');
        if (!indicator) return;
        
        const now = new Date();
        const seconds = Math.floor((now - this.lastSaveTime) / 1000);
        
        let timeText = '';
        if (seconds < 60) {
            timeText = 'Saved just now';
        } else if (seconds < 120) {
            timeText = 'Saved 1 min ago';
        } else if (seconds < 3600) {
            timeText = `Saved ${Math.floor(seconds / 60)} mins ago`;
        } else {
            timeText = 'Saved';
        }
        
        indicator.textContent = timeText;
    }
    
    /**
     * Start relative time updates (every 30 seconds)
     */
    startRelativeTimeUpdates() {
        if (this.relativeTimeInterval) {
            clearInterval(this.relativeTimeInterval);
        }
        
        this.relativeTimeInterval = setInterval(() => {
            this.updateRelativeSaveTime();
        }, 30000);
    }
    
    /**
     * Stop relative time updates
     */
    stopRelativeTimeUpdates() {
        if (this.relativeTimeInterval) {
            clearInterval(this.relativeTimeInterval);
            this.relativeTimeInterval = null;
        }
    }
    
    /**
     * Initialize autosave listeners on form inputs
     * @param {Array<string>} inputIds - Array of input element IDs to monitor
     */
    initializeListeners(inputIds = []) {
        inputIds.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', () => this.markDirty());
                input.addEventListener('change', () => this.markDirty());
            }
        });
        
        console.log(`✅ Autosave listeners initialized for ${inputIds.length} inputs`);
    }
    
    /**
     * Add autosave listeners to a container element's inputs
     * @param {HTMLElement} containerElement - Container element
     */
    addListenersToContainer(containerElement) {
        if (!containerElement) return;
        
        const inputs = containerElement.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.markDirty());
            input.addEventListener('change', () => this.markDirty());
        });
    }
    
    /**
     * Set up beforeunload warning for unsaved changes
     */
    setupBeforeUnloadWarning() {
        window.addEventListener('beforeunload', (e) => {
            if (this.state.isDirty) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }
    
    /**
     * Reset autosave state (for new items)
     */
    reset() {
        this.state.selectedItemId = null;
        this.state.isDirty = false;
        this.state.isAutosaving = false;
        this.lastSaveTime = null;
        clearTimeout(this.timeout);
        this.updateIndicator();
    }
    
    /**
     * Set the selected item ID
     * @param {string} itemId - Item ID
     */
    setSelectedItemId(itemId) {
        this.state.selectedItemId = itemId;
        this.state.isDirty = false;
        this.lastSaveTime = new Date();
        this.updateIndicator('saved');
    }
    
    /**
     * Enable autosave
     */
    enable() {
        this.state.autosaveEnabled = true;
        this.enabled = true;
    }
    
    /**
     * Disable autosave
     */
    disable() {
        this.state.autosaveEnabled = false;
        this.enabled = false;
        clearTimeout(this.timeout);
    }
    
    /**
     * Destroy the autosave manager
     */
    destroy() {
        clearTimeout(this.timeout);
        this.stopRelativeTimeUpdates();
        console.log(`✅ AutosaveManager destroyed for namespace: ${this.namespace}`);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutosaveManager;
}

// Make available globally
window.AutosaveManager = AutosaveManager;

console.log('📦 Autosave Manager module loaded');