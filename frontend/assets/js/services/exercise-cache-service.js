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
                
                const response = await fetch(
                    window.getApiUrl(`/api/v3/exercises?page=${page}&page_size=${PAGE_SIZE}`)
                );
                
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
            includeCustom = true
        } = options;
        
        if (!query || query.length < 2) {
            return [];
        }
        
        const queryLower = query.toLowerCase();
        const allExercises = includeCustom ? this.getAllExercises() : this.exercises;
        
        // Filter exercises
        const filtered = allExercises.filter(exercise => {
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
        
        // Limit results
        return filtered.slice(0, maxResults);
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
            console.error('Error setting exercise cache:', error);
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
}

// Create and export singleton instance
window.exerciseCacheService = ExerciseCacheService.getInstance();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExerciseCacheService;
}

console.log('📦 Exercise Cache Service loaded');