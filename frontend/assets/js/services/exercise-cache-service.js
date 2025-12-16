/**
 * ExerciseCacheService - Singleton service for caching and searching exercises
 * 
 * Features:
 * - Instant loading with bundled seed data (200 exercises)
 * - Fuse.js fuzzy search for typo-tolerant matching
 * - localStorage caching with version-based invalidation
 * - Background data fetching for full database
 */

class ExerciseCacheService {
    static CACHE_KEY = 'exercise_cache_v3';
    static CACHE_TTL_DAYS = 7;
    static API_BASE_URL = window.ENV?.API_URL || window.location.origin;
    
    static FUSE_OPTIONS = {
        keys: [
            { name: 'name', weight: 0.5 },
            { name: 'targetMuscleGroup', weight: 0.2 },
            { name: 'primaryEquipment', weight: 0.15 },
            { name: 'movementPattern1', weight: 0.1 },
            { name: 'classificationTags', weight: 0.05 }
        ],
        threshold: 0.4,
        distance: 100,
        minMatchCharLength: 2,
        includeScore: true,
        ignoreLocation: true,
        useExtendedSearch: true
    };
    
    constructor() {
        this.exercises = [];
        this.customExercises = [];
        this.fuseIndex = null;
        this.isFullDataLoaded = false;
        this.seedDataUsed = false;
        this.fetchPromise = null;
        this.eventListeners = {};
        this.serverVersion = null;
        
        this.USAGE_CACHE_KEY = 'exercise_usage_cache_v1';
        this.usageData = this._loadUsageData();
        
        this.metrics = {
            cacheHits: 0,
            cacheMisses: 0,
            apiRequests: 0,
            loadTime: 0
        };
    }
    
    static getInstance() {
        if (!ExerciseCacheService._instance) {
            ExerciseCacheService._instance = new ExerciseCacheService();
        }
        return ExerciseCacheService._instance;
    }
    
    async getExercisesWithInstantFallback() {
        // If we already have exercises loaded, return them immediately
        if (this.exercises.length > 0) {
            return this.exercises;
        }
        
        const cached = this.getFromLocalStorage();
        if (cached && await this.isCacheValid(cached)) {
            console.log(`[ExerciseCache] Using cached data: ${cached.exercises.length} exercises`);
            this.exercises = cached.exercises;
            this.buildFuseIndex(this.exercises);
            this.isFullDataLoaded = true;
            await this.loadCustomExercisesBackground();
            return this.exercises;
        }
        
        if (window.EXERCISE_SEED_DATA && !this.seedDataUsed) {
            console.log(`[ExerciseCache] Using seed data: ${window.EXERCISE_SEED_DATA.length} exercises`);
            this.exercises = window.EXERCISE_SEED_DATA;
            this.buildFuseIndex(this.exercises);
            this.seedDataUsed = true;
            
            this.fetchFullDataInBackground();
            
            return this.exercises;
        }
        
        // Fallback: fetch directly from server (avoid recursion)
        return this.fetchFullDataInBackground();
    }
    
    async isCacheValid(cached) {
        const cacheAge = Date.now() - (cached.timestamp || 0);
        const maxAge = ExerciseCacheService.CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
        
        if (cacheAge > maxAge) {
            console.log('[ExerciseCache] Cache expired by TTL');
            return false;
        }
        
        try {
            const metadata = await this.fetchMetadata();
            if (metadata && cached.version !== metadata.version) {
                console.log(`[ExerciseCache] Version mismatch: ${cached.version} vs ${metadata.version}`);
                return false;
            }
            this.serverVersion = metadata?.version;
        } catch (error) {
            console.warn('[ExerciseCache] Metadata check failed, using TTL only');
        }
        
        return true;
    }
    
    async fetchMetadata() {
        try {
            const response = await fetch(`${ExerciseCacheService.API_BASE_URL}/api/exercises/metadata`);
            if (!response.ok) throw new Error('Metadata fetch failed');
            return await response.json();
        } catch (error) {
            console.warn('[ExerciseCache] Could not fetch metadata:', error);
            return null;
        }
    }
    
    async fetchFullDataInBackground() {
        if (this.fetchPromise) {
            return this.fetchPromise;
        }
        
        this.fetchPromise = (async () => {
            try {
                console.log('[ExerciseCache] Fetching full database in background...');
                const startTime = performance.now();
                
                const fullExercises = await this.fetchFromServer();
                
                this.exercises = fullExercises;
                this.buildFuseIndex(this.exercises);
                this.isFullDataLoaded = true;
                
                this.saveToLocalStorage(fullExercises);
                
                const elapsed = (performance.now() - startTime).toFixed(0);
                console.log(`[ExerciseCache] Full database loaded: ${fullExercises.length} exercises in ${elapsed}ms`);
                
                this.emit('fullDataLoaded', { count: fullExercises.length });
                
                await this.loadCustomExercisesBackground();
                
                return fullExercises;
            } catch (error) {
                console.error('[ExerciseCache] Background fetch failed:', error);
                this.emit('fetchError', { error });
                throw error;
            } finally {
                this.fetchPromise = null;
            }
        })();
        
        return this.fetchPromise;
    }
    
    async fetchFromServer() {
        const PAGE_SIZE = 500;
        let allExercises = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
            this.metrics.apiRequests++;
            const apiUrl = window.getApiUrl(`/api/v3/exercises?page=${page}&page_size=${PAGE_SIZE}`);
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            
            const data = await response.json();
            const exercises = data.exercises || [];
            allExercises = [...allExercises, ...exercises];
            
            hasMore = exercises.length === PAGE_SIZE;
            page++;
        }
        
        return allExercises;
    }
    
    buildFuseIndex(exercises) {
        if (typeof Fuse === 'undefined') {
            console.warn('[ExerciseCache] Fuse.js not loaded, using fallback search');
            this.fuseIndex = null;
            return;
        }
        
        const startTime = performance.now();
        this.fuseIndex = new Fuse(exercises, ExerciseCacheService.FUSE_OPTIONS);
        console.log(`[ExerciseCache] Fuse index built in ${(performance.now() - startTime).toFixed(1)}ms`);
    }
    
    searchExercises(query, options = {}) {
        const {
            limit = 50,
            filters = {},
            useFuzzy = true
        } = options;
        
        const allExercises = [...this.exercises, ...this.customExercises];
        
        if (!query || query.trim().length < 2) {
            let results = [...allExercises];
            results = this.applyFilters(results, filters);
            results = this.applyRankingBoost(results);
            return results.slice(0, limit);
        }
        
        let results;
        
        if (useFuzzy && this.fuseIndex) {
            const fuseResults = this.fuseIndex.search(query, { limit: limit * 2 });
            results = fuseResults.map(r => ({
                ...r.item,
                _searchScore: r.score,
                _matchedBy: 'fuzzy'
            }));
        } else {
            const lowerQuery = query.toLowerCase();
            results = allExercises.filter(ex =>
                ex.name?.toLowerCase().includes(lowerQuery) ||
                ex.targetMuscleGroup?.toLowerCase().includes(lowerQuery) ||
                ex.primaryEquipment?.toLowerCase().includes(lowerQuery)
            );
        }
        
        results = this.applyFilters(results, filters);
        results = this.applyRankingBoost(results);
        
        if (!this.isFullDataLoaded && results.length < 10) {
            results._moreResultsPending = true;
        }
        
        return results.slice(0, limit);
    }
    
    applyFilters(results, filters) {
        if (filters.muscleGroup) {
            if (Array.isArray(filters.muscleGroup) && filters.muscleGroup.length > 0) {
                results = results.filter(ex => filters.muscleGroup.includes(ex.targetMuscleGroup));
            } else if (typeof filters.muscleGroup === 'string') {
                results = results.filter(ex => ex.targetMuscleGroup === filters.muscleGroup);
            }
        }
        if (filters.equipment) {
            if (Array.isArray(filters.equipment)) {
                results = results.filter(ex => filters.equipment.includes(ex.primaryEquipment));
            } else {
                results = results.filter(ex => ex.primaryEquipment === filters.equipment);
            }
        }
        if (filters.difficulty) {
            results = results.filter(ex => ex.difficultyLevel === filters.difficulty);
        }
        if (filters.tier) {
            results = results.filter(ex => ex.exerciseTier === filters.tier);
        }
        return results;
    }
    
    applyRankingBoost(results) {
        return results.sort((a, b) => {
            const aIsCustom = !a.isGlobal;
            const bIsCustom = !b.isGlobal;
            
            if (aIsCustom !== bIsCustom) {
                return aIsCustom ? -1 : 1;
            }
            
            if (a.exerciseTier !== b.exerciseTier) {
                return (a.exerciseTier || 2) - (b.exerciseTier || 2);
            }
            
            return (b.foundationalScore || 50) - (a.foundationalScore || 50);
        });
    }
    
    getFromLocalStorage() {
        try {
            const data = localStorage.getItem(ExerciseCacheService.CACHE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('[ExerciseCache] Error reading cache:', error);
            return null;
        }
    }
    
    saveToLocalStorage(exercises) {
        try {
            const data = {
                exercises,
                timestamp: Date.now(),
                version: this.serverVersion || 'unknown',
                count: exercises.length
            };
            localStorage.setItem(ExerciseCacheService.CACHE_KEY, JSON.stringify(data));
            console.log(`[ExerciseCache] Saved ${exercises.length} exercises to cache`);
        } catch (error) {
            console.error('[ExerciseCache] Error saving cache:', error);
        }
    }
    
    async refreshCache() {
        localStorage.removeItem(ExerciseCacheService.CACHE_KEY);
        this.isFullDataLoaded = false;
        this.seedDataUsed = false;
        return this.getExercisesWithInstantFallback();
    }
    
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }
    
    emit(event, data) {
        const listeners = this.eventListeners[event] || [];
        listeners.forEach(cb => cb(data));
    }
    
    async getAllExercises() {
        return this.getExercisesWithInstantFallback();
    }
    
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
                this.emit('customLoaded', { count: this.customExercises.length });
            }
        } catch (error) {
            console.warn('⚠️ Could not load custom exercises:', error.message);
            this.customExercises = [];
        }
    }
    
    getExerciseById(id) {
        const allExercises = [...this.exercises, ...this.customExercises];
        return allExercises.find(ex => ex.id === id);
    }
    
    async autoCreateIfNeeded(exerciseName, userId) {
        try {
            if (!exerciseName || !userId) {
                return null;
            }
            
            const allExercises = [...this.exercises, ...this.customExercises];
            const existingExercise = allExercises.find(ex =>
                ex.name.toLowerCase() === exerciseName.toLowerCase()
            );
            
            if (existingExercise) {
                this._trackUsage(existingExercise);
                return existingExercise;
            }
            
            const token = await window.dataManager.getAuthToken();
            const encodedName = encodeURIComponent(exerciseName);
            const apiUrl = window.getApiUrl(`/api/v3/exercises/auto-create?exercise_name=${encodedName}`);
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const newExercise = await response.json();
                this.customExercises.push(newExercise);
                this._trackUsage(newExercise);
                this.emit('customExerciseCreated', { exercise: newExercise });
                return newExercise;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error in autoCreateIfNeeded:', error);
            return null;
        }
    }
    
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
            this._saveUsageData();
        } catch (error) {
            console.error('❌ Error tracking exercise usage:', error);
        }
    }
    
    _loadUsageData() {
        try {
            const cached = localStorage.getItem(this.USAGE_CACHE_KEY);
            return cached ? JSON.parse(cached) : {};
        } catch (error) {
            return {};
        }
    }
    
    _saveUsageData() {
        try {
            localStorage.setItem(this.USAGE_CACHE_KEY, JSON.stringify(this.usageData));
        } catch (error) {
            console.error('Error saving usage data:', error);
        }
    }
}

const exerciseCacheService = ExerciseCacheService.getInstance();
window.exerciseCacheService = exerciseCacheService;

console.log('📦 Exercise Cache Service loaded (v3 with Fuse.js)');