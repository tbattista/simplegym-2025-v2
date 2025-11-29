/**
 * Global Exercise Cache Service for Ghost Gym V2
 * Singleton pattern to share exercise data across all components
 * Implements request deduplication, lazy loading, and smart caching
 * @version 1.0.0
 */

class ExerciseCacheService {
    constructor() {
        if (ExerciseCacheService.instance) {
            return ExerciseCacheService.instance;
        }
        
        this.exercises = [];
        this.customExercises = [];
        this.isLoading = false;
        this.isLoaded = false;
        this.loadPromise = null;
        this.lastLoadTime = null;
        this.listeners = new Set();
        
        // Cache configuration
        this.CACHE_KEY = 'exercise_cache_v2';
        this.CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
        this.CACHE_VERSION = '2.0';
        
        // Usage tracking for auto-created exercises
        this.USAGE_CACHE_KEY = 'exercise_usage_cache_v1';
        this.usageData = this._loadUsageData();
        
        // Performance metrics
        this.metrics = {
            cacheHits: 0,
            cacheMisses: 0,
            apiRequests: 0,
            loadTime: 0
        };
        
        ExerciseCacheService.instance = this;
        console.log('📦 Exercise Cache Service initialized (Singleton)');
    }
    
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!ExerciseCacheService.instance) {
            ExerciseCacheService.instance = new ExerciseCacheService();
        }
        return ExerciseCacheService.instance;
    }
    
    /**
     * Load exercises with request deduplication
     * Multiple simultaneous calls will share the same promise
     */
    async loadExercises(forceRefresh = false) {
        // If already loading, return the existing promise
        if (this.isLoading && this.loadPromise) {
            console.log('🔄 Reusing in-flight exercise load request');
            return this.loadPromise;
        }
        
        // If already loaded and not forcing refresh, return cached data
        if (this.isLoaded && !forceRefresh) {
            console.log(`✅ Using cached exercises (${this.exercises.length} exercises)`);
            this.metrics.cacheHits++;
            return {
                exercises: this.exercises,
                customExercises: this.customExercises,
                fromCache: true
            };
        }
        
        // Check localStorage cache first
        if (!forceRefresh) {
            const cached = this.getCache();
            if (cached && this.isCacheValid(cached)) {
                this.exercises = cached.exercises;
                this.isLoaded = true;
                this.lastLoadTime = cached.timestamp;
                console.log(`✅ Loaded ${this.exercises.length} exercises from localStorage cache`);
                this.metrics.cacheHits++;
                this.notifyListeners('loaded', { fromCache: true });
                
                // Load custom exercises in background
                this.loadCustomExercisesBackground();
                
                return {
                    exercises: this.exercises,
                    customExercises: this.customExercises,
                    fromCache: true
                };
            }
        }
        
        // Create new load promise
        this.isLoading = true;
        this.metrics.cacheMisses++;
        
        this.loadPromise = this.fetchExercisesFromAPI()
            .then(result => {
                this.exercises = result.exercises;
                this.isLoaded = true;
                this.isLoading = false;
                this.lastLoadTime = Date.now();
                this.loadPromise = null;
                
                // Cache the results
                this.setCache(this.exercises);
                
                // Load custom exercises
                return this.loadCustomExercisesBackground().then(() => ({
                    exercises: this.exercises,
                    customExercises: this.customExercises,
                    fromCache: false
                }));
            })
            .catch(error => {
                this.isLoading = false;
                this.loadPromise = null;
                console.error('❌ Error loading exercises:', error);
                throw error;
            });
        
        return this.loadPromise;
    }
    
    /**
     * Fetch exercises from API with pagination
     */
    async fetchExercisesFromAPI() {
        const startTime = performance.now();
        console.log('📡 Loading exercises from API...');
        
        const PAGE_SIZE = 500;
        let allExercises = [];
        let page = 1;
        let hasMore = true;
        
        try {
            while (hasMore) {
                this.metrics.apiRequests++;
                
                const apiUrl = window.getApiUrl(`/api/v3/exercises?page=${page}&page_size=${PAGE_SIZE}`);
                console.log('🔍 DEBUG: Fetching from URL:', apiUrl);
                console.log('🔍 DEBUG: window.location.origin:', window.location.origin);
                
                const response = await fetch(apiUrl);
                
                if (!response.ok) {
                    throw new Error(`Failed to load exercises (page ${page}): ${response.statusText}`);
                }
                
                const data = await response.json();
                const exercises = data.exercises || [];
                
                allExercises = [...allExercises, ...exercises];
                console.log(`📦 Loaded page ${page}: ${exercises.length} exercises (total: ${allExercises.length})`);
                
                // Check if there are more pages
                hasMore = exercises.length === PAGE_SIZE;
                page++;
            }
            
            const loadTime = performance.now() - startTime;
            this.metrics.loadTime = loadTime;
            
            console.log(`✅ Loaded ${allExercises.length} exercises from API in ${loadTime.toFixed(0)}ms`);
            this.notifyListeners('loaded', { fromCache: false, loadTime });
            
            return { exercises: allExercises };
            
        } catch (error) {
            console.error('❌ Error fetching exercises from API:', error);
            this.notifyListeners('error', { error });
            throw error;
        }
    }
    
    /**
     * Load custom exercises in background
     */
    async loadCustomExercisesBackground() {
        try {
            if (!window.dataManager || !window.dataManager.isUserAuthenticated()) {
                return;
            }
            
            const token = await window.dataManager.getAuthToken();
            const response = await fetch(window.getApiUrl('/api/v3/users/me/exercises'), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.customExercises = data.exercises || [];
                console.log(`✅ Loaded ${this.customExercises.length} custom exercises`);
                this.notifyListeners('customLoaded', { count: this.customExercises.length });
            }
        } catch (error) {
            console.warn('⚠️ Could not load custom exercises:', error.message);
            this.customExercises = [];
        }
    }
    
    /**
     * Get all exercises (global + custom)
     */
    getAllExercises() {
        return [...this.exercises, ...this.customExercises];
    }
    
    /**
     * Search exercises by query
     */
    searchExercises(query, options = {}) {
        const {
            maxResults = 20,
            includeCustom = true,
            preferFoundational = false,
            tierFilter = null
        } = options;
        
        if (!query || query.length < 2) {
            return [];
        }
        
        const queryLower = query.toLowerCase();
        const allExercises = includeCustom ? this.getAllExercises() : this.exercises;
        
        // Filter exercises
        const filtered = allExercises.filter(exercise => {
            // Apply tier filter if specified
            if (tierFilter && exercise.exerciseTier !== tierFilter) {
                return false;
            }
            
            // Search in name
            if (exercise.name && exercise.name.toLowerCase().includes(queryLower)) {
                return true;
            }
            
            // Search in muscle group
            if (exercise.targetMuscleGroup &&
                exercise.targetMuscleGroup.toLowerCase().includes(queryLower)) {
                return true;
            }
            
            // Search in equipment
            if (exercise.primaryEquipment &&
                exercise.primaryEquipment.toLowerCase().includes(queryLower)) {
                return true;
            }
            
            return false;
        });
        
        // Rank exercises
        const ranked = this._rankExercises(filtered, queryLower, preferFoundational);
        
        // Limit results
        return ranked.slice(0, maxResults);
    }
    
    _rankExercises(exercises, query, preferFoundational) {
        const queryLower = query.toLowerCase();
        
        // Calculate scores for each exercise
        const scoredExercises = exercises.map(exercise => {
            const nameLower = (exercise.name || '').toLowerCase();
            const isCustom = !exercise.isGlobal;
            const isExactMatch = nameLower === queryLower;
            const startsWithQuery = nameLower.startsWith(queryLower);
            const containsQuery = nameLower.includes(queryLower);
            
            let score = 0;
            
            // PRIORITY 1: Custom Exercise Exact Match (HIGHEST)
            if (isCustom && isExactMatch) {
                score = 1000;
            }
            // PRIORITY 2: Custom Exercise Partial Match
            else if (isCustom && containsQuery) {
                score = 500;
                // Add enhanced usage boost (0-200 points) for frequently used custom exercises
                score += this._getUsageBoost(exercise);
            }
            // PRIORITY 3: Global Exercise Exact Match
            else if (!isCustom && isExactMatch) {
                score = 400;
            }
            // PRIORITY 4: Global Exercise Starts With Query
            else if (!isCustom && startsWithQuery) {
                score = 300;
                score += this._getTierBoost(exercise);
            }
            // PRIORITY 5: Global Exercise Contains Query
            else if (!isCustom && containsQuery) {
                score = 200;
                score += this._getTierBoost(exercise);
            }
            // PRIORITY 6: Muscle Group/Equipment Match
            else {
                score = 100;
            }
            
            // Add popularity boost for all exercises (0-25 points)
            score += Math.min(25, (exercise.popularityScore || 0) / 4);
            
            // Add foundational preference if requested
            if (preferFoundational && exercise.isFoundational) {
                score += 20;
            }
            
            return { exercise, score };
        });
        
        // Sort by score (descending)
        scoredExercises.sort((a, b) => b.score - a.score);
        
        // Return sorted exercises
        return scoredExercises.map(item => item.exercise);
    }
    
    /**
     * Get tier boost for global exercises
     */
    _getTierBoost(exercise) {
        const tier = exercise.exerciseTier || 2;
        if (tier === 1) return 50;
        if (tier === 2) return 25;
        return 0;
    }
    
    /**
     * Get exercise by ID
     */
    getExerciseById(id) {
        const allExercises = this.getAllExercises();
        return allExercises.find(ex => ex.id === id);
    }
    
    /**
     * Add listener for cache events
     */
    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
    
    /**
     * Notify all listeners
     */
    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in cache listener:', error);
            }
        });
    }
    
    /**
     * Cache management
     */
    getCache() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Error reading exercise cache:', error);
            return null;
        }
    }
    
    setCache(exercises) {
        try {
            const cacheData = {
                exercises: exercises,
                timestamp: Date.now(),
                version: this.CACHE_VERSION
            };
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
            console.log(`💾 Cached ${exercises.length} exercises to localStorage`);
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('⚠️ localStorage quota exceeded. Clearing old cache and retrying...');
                // Clear the exercise cache to free up space
                try {
                    localStorage.removeItem(this.CACHE_KEY);
                    console.log('🧹 Cleared exercise cache to free up space');
                    
                    // Try again with fresh space
                    const cacheData = {
                        exercises: exercises,
                        timestamp: Date.now(),
                        version: this.CACHE_VERSION
                    };
                    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
                    console.log(`💾 Successfully cached ${exercises.length} exercises after clearing space`);
                } catch (retryError) {
                    console.error('❌ Still cannot cache exercises after clearing:', retryError);
                    console.warn('⚠️ Exercise caching disabled due to storage limitations');
                }
            } else {
                console.error('❌ Error setting exercise cache:', error);
            }
        }
    }
    
    isCacheValid(cached) {
        if (!cached || cached.version !== this.CACHE_VERSION) {
            return false;
        }
        
        const age = Date.now() - cached.timestamp;
        return age < this.CACHE_DURATION;
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        try {
            localStorage.removeItem(this.CACHE_KEY);
            this.exercises = [];
            this.customExercises = [];
            this.isLoaded = false;
            this.lastLoadTime = null;
            console.log('🧹 Exercise cache cleared');
            this.notifyListeners('cleared', {});
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    }
    
    /**
     * Force refresh cache
     */
    async refreshCache() {
        console.log('🔄 Force refreshing exercise cache...');
        return this.loadExercises(true);
    }
    
    /**
     * Get cache status
     */
    getStatus() {
        return {
            isLoaded: this.isLoaded,
            isLoading: this.isLoading,
            exerciseCount: this.exercises.length,
            customExerciseCount: this.customExercises.length,
            lastLoadTime: this.lastLoadTime,
            cacheAge: this.lastLoadTime ? Date.now() - this.lastLoadTime : null,
            metrics: { ...this.metrics }
        };
    }
    
    /**
     * Get performance metrics
     */
    getMetrics() {
        const hitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0
            ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(1)
            : 0;
        
        return {
            ...this.metrics,
            hitRate: `${hitRate}%`,
            avgLoadTime: this.metrics.loadTime ? `${this.metrics.loadTime.toFixed(0)}ms` : 'N/A'
        };
    }
    
    /**
     * Auto-create custom exercise if needed
     * Called from workout mode when user enters unknown exercise name
     */
    async autoCreateIfNeeded(exerciseName, userId) {
        try {
            if (!exerciseName || !userId) {
                console.warn('⚠️ Missing exercise name or user ID for auto-creation');
                return null;
            }
            
            console.log(`🔍 AUTO-CREATE DEBUG: Checking exercise "${exerciseName}" (length: ${exerciseName.length} chars)`);
            
            // Check if exercise already exists (global or custom)
            const existingExercise = this.getAllExercises().find(ex =>
                ex.name.toLowerCase() === exerciseName.toLowerCase()
            );
            
            if (existingExercise) {
                console.log(`✅ Exercise '${exerciseName}' already exists (ID: ${existingExercise.id}), tracking usage`);
                this._trackUsage(existingExercise);
                return existingExercise;
            }
            
            // Create new custom exercise via API
            // Note: exercise_name must be passed as query parameter, not in body
            console.log(`🚀 AUTO-CREATE DEBUG: Creating new custom exercise "${exerciseName}"`);
            const token = await window.dataManager.getAuthToken();
            const encodedName = encodeURIComponent(exerciseName);
            const apiUrl = window.getApiUrl(`/api/v3/exercises/auto-create?exercise_name=${encodedName}`);
            console.log(`📡 AUTO-CREATE DEBUG: API URL: ${apiUrl}`);
            console.log(`📡 AUTO-CREATE DEBUG: Encoded name: ${encodedName}`);
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log(`📥 AUTO-CREATE DEBUG: Response status: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const newExercise = await response.json();
                console.log(`✅ AUTO-CREATE SUCCESS: Created exercise "${newExercise.name}" (ID: ${newExercise.id})`);
                console.log(`📊 AUTO-CREATE DEBUG: Full response:`, newExercise);
                
                // Verify the name matches what we sent
                if (newExercise.name !== exerciseName) {
                    console.warn(`⚠️ AUTO-CREATE WARNING: Name mismatch!`);
                    console.warn(`   Sent: "${exerciseName}" (${exerciseName.length} chars)`);
                    console.warn(`   Received: "${newExercise.name}" (${newExercise.name.length} chars)`);
                }
                
                // Add to custom exercises cache
                this.customExercises.push(newExercise);
                
                // Track initial usage
                this._trackUsage(newExercise);
                
                // Notify listeners about new custom exercise
                this.notifyListeners('customExerciseCreated', { exercise: newExercise });
                
                return newExercise;
            } else {
                const errorText = await response.text();
                console.error(`❌ AUTO-CREATE FAILED: ${response.status} ${response.statusText}`);
                console.error(`❌ Error details:`, errorText);
                return null;
            }
            
        } catch (error) {
            console.error('❌ Error in autoCreateIfNeeded:', error);
            return null;
        }
    }
    
    /**
     * Track exercise usage frequency
     */
    _trackUsage(exercise) {
        try {
            if (!exercise || !exercise.id) return;
            
            const exerciseKey = exercise.id;
            if (!this.usageData[exerciseKey]) {
                this.usageData[exerciseKey] = {
                    name: exercise.name,
                    count: 0,
                    lastUsed: null,
                    isCustom: !exercise.isGlobal
                };
            }
            
            this.usageData[exerciseKey].count++;
            this.usageData[exerciseKey].lastUsed = Date.now();
            
            // Save to localStorage
            this._saveUsageData();
            
            console.log(`📊 Tracked usage for: ${exercise.name} (${this.usageData[exerciseKey].count} times)`);
            
        } catch (error) {
            console.error('❌ Error tracking exercise usage:', error);
        }
    }
    
    /**
     * Get usage boost score for exercise ranking
     * Enhanced to provide 0-200 points for frequently used custom exercises
     */
    _getUsageBoost(exercise) {
        try {
            if (!exercise || !exercise.id) return 0;
            
            const usage = this.usageData[exercise.id];
            if (!usage) return 0;
            
            // ENHANCED: 0-200 points based on usage count (was 0-50)
            // This ensures frequently-used custom exercises rank very high
            const boost = Math.min(200, usage.count * 10);
            
            return boost;
            
        } catch (error) {
            console.error('❌ Error getting usage boost:', error);
            return 0;
        }
    }
    
    /**
     * Load usage data from localStorage
     */
    _loadUsageData() {
        try {
            const cached = localStorage.getItem(this.USAGE_CACHE_KEY);
            return cached ? JSON.parse(cached) : {};
        } catch (error) {
            console.error('Error loading usage data:', error);
            return {};
        }
    }
    
    /**
     * Save usage data to localStorage
     */
    _saveUsageData() {
        try {
            localStorage.setItem(this.USAGE_CACHE_KEY, JSON.stringify(this.usageData));
        } catch (error) {
            console.error('Error saving usage data:', error);
        }
    }
}

// Create and export singleton instance
window.exerciseCacheService = ExerciseCacheService.getInstance();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExerciseCacheService;
}

console.log('📦 Exercise Cache Service loaded');