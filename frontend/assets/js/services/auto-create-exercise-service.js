/**
 * Auto-Create Exercise Service
 * Reusable service for seamless custom exercise creation across the application
 * @version 1.0.0
 */

class AutoCreateExerciseService {
    constructor() {
        this.cacheService = window.exerciseCacheService;
        this.dataManager = window.dataManager;
        this.initialized = false;
        this.init();
    }
    
    /**
     * Initialize the service
     */
    init() {
        if (this.initialized) return;
        
        console.log('🚀 Initializing Auto-Create Exercise Service');
        
        // Check dependencies
        if (!this.cacheService) {
            console.warn('⚠️ ExerciseCacheService not available - some features may not work');
        }
        
        if (!this.dataManager) {
            console.warn('⚠️ DataManager not available - authentication features may not work');
        }
        
        this.initialized = true;
    }
    
    /**
     * Auto-create exercise if needed, with comprehensive error handling
     * @param {string} exerciseName - Name of exercise to auto-create
     * @param {Object} options - Additional options
     * @returns {Promise<Object|null>} Created exercise or null
     */
    async autoCreateIfNeeded(exerciseName, options = {}) {
        const {
            userId = null,
            trackUsage = true,
            showError = false,
            fallbackToModal = true
        } = options;
        
        try {
            // Validate prerequisites
            if (!exerciseName?.trim()) {
                console.warn('No exercise name provided for auto-creation');
                return null;
            }
            
            const trimmedName = exerciseName.trim();
            
            // Check if exercise already exists
            const existing = await this.checkExerciseExists(trimmedName);
            if (existing) {
                console.log(`ℹ️ Exercise already exists: ${trimmedName}`);
                return existing;
            }
            
            // Check service availability
            if (!this.cacheService) {
                console.warn('ExerciseCacheService not available for auto-creation');
                return null;
            }
            
            if (!this.dataManager) {
                console.warn('DataManager not available for auto-creation');
                return null;
            }
            
            // Get user ID if not provided
            const targetUserId = userId || (this.dataManager.isUserAuthenticated() ? 
                this.dataManager.getCurrentUserId() : null);
            
            if (!targetUserId) {
                console.warn('User not authenticated for auto-creation');
                return null;
            }
            
            // Attempt auto-creation using cache service
            const exercise = await this.cacheService.autoCreateIfNeeded(trimmedName, targetUserId);
            
            if (exercise) {
                console.log(`✅ Auto-created exercise: ${trimmedName}`);
                
                // Track usage if requested
                if (trackUsage && this.cacheService._trackUsage) {
                    this.cacheService._trackUsage(exercise);
                }
                
                return exercise;
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Error in auto-creation:', error);
            
            if (showError) {
                alert(`Failed to create exercise "${exerciseName}". Please try again.`);
            }
            
            // Fallback to modal if requested and available
            if (fallbackToModal && window.showCustomExerciseModal) {
                window.showCustomExerciseModal(exerciseName);
            }
            
            return null;
        }
    }
    
    /**
     * Check if exercise exists (global or custom)
     * @param {string} exerciseName - Name to check
     * @returns {Promise<Object|null>} Existing exercise or null
     */
    async checkExerciseExists(exerciseName) {
        try {
            if (!this.cacheService) return null;
            
            const allExercises = this.cacheService.getAllExercises();
            const existing = allExercises.find(ex => 
                ex.name && ex.name.toLowerCase() === exerciseName.toLowerCase()
            );
            
            return existing || null;
        } catch (error) {
            console.error('❌ Error checking exercise existence:', error);
            return null;
        }
    }
    
    /**
     * Get usage boost for exercise ranking
     * @param {Object} exercise - Exercise object
     * @returns {number} Usage boost score (0-50)
     */
    getUsageBoost(exercise) {
        try {
            if (!this.cacheService || !exercise) return 0;
            
            if (typeof this.cacheService._getUsageBoost === 'function') {
                return this.cacheService._getUsageBoost(exercise);
            }
            
            return 0;
        } catch (error) {
            console.error('❌ Error getting usage boost:', error);
            return 0;
        }
    }
    
    /**
     * Auto-create exercise with enhanced error handling and validation
     * @param {string} exerciseName - Name of exercise to auto-create
     * @param {Object} options - Additional options
     * @returns {Promise<Object|null>} Created exercise or null
     */
    async createCustomExercise(exerciseName, options = {}) {
        const {
            userId = null,
            category = 'custom',
            equipment = [],
            forceCreate = false,
            ...autoCreateOptions
        } = options;
        
        try {
            const trimmedName = exerciseName.trim();
            
            // Validate exercise name
            if (!trimmedName || trimmedName.length < 2) {
                console.warn('Exercise name must be at least 2 characters long');
                return null;
            }
            
            // If not forcing creation, check if already exists
            if (!forceCreate) {
                const existing = await this.checkExerciseExists(trimmedName);
                if (existing) {
                    return existing;
                }
            }
            
            // Use autoCreateIfNeeded with additional options
            const exercise = await this.autoCreateIfNeeded(trimmedName, {
                userId,
                ...autoCreateOptions
            });
            
            return exercise;
            
        } catch (error) {
            console.error('❌ Error creating custom exercise:', error);
            return null;
        }
    }
    
    /**
     * Batch auto-create multiple exercises
     * @param {Array<string>} exerciseNames - Array of exercise names to create
     * @param {Object} options - Additional options
     * @returns {Promise<Array<Object>>} Array of created exercises
     */
    async batchAutoCreate(exerciseNames, options = {}) {
        const results = [];
        
        for (const name of exerciseNames) {
            try {
                const exercise = await this.autoCreateIfNeeded(name, options);
                if (exercise) {
                    results.push(exercise);
                }
            } catch (error) {
                console.error(`❌ Error auto-creating exercise "${name}":`, error);
                // Continue with other exercises
            }
        }
        
        return results;
    }
    
    /**
     * Get service status and dependencies
     * @returns {Object} Service status information
     */
    getServiceStatus() {
        return {
            initialized: this.initialized,
            cacheService: !!this.cacheService,
            dataManager: !!this.dataManager,
            userAuthenticated: this.dataManager ? this.dataManager.isUserAuthenticated() : false
        };
    }
}

// Export singleton instance
window.autoCreateExerciseService = new AutoCreateExerciseService();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutoCreateExerciseService;
}

console.log('🚀 Auto-Create Exercise Service loaded');