/**
 * ExerciseCacheService - Singleton service for caching and searching exercises
 * 
 * Features:
 * - Instant loading with bundled seed data (~150 exercises)
 * - Fuse.js fuzzy search for typo-tolerant matching
 * - localStorage caching with version-based invalidation
 * - Tiered loading: fetches Tier 1+2 by default (~400 exercises), full DB on demand
 * - GIF URL and instructions support from ExerciseDB
 */

class ExerciseCacheService {
    static CACHE_KEY = 'exercise_cache_v3';
    static FULL_CACHE_KEY = 'exercise_cache_v3_full';
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

        // Cleanup legacy cache key (was used by exercise-database page before consolidation)
        try { localStorage.removeItem('exercise_cache'); } catch(e) {}
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
        if (cached && cached.exercises && cached.exercises.length > 0 && await this.isCacheValid(cached)) {
            console.log(`[ExerciseCache] Using cached data: ${cached.exercises.length} exercises`);
            this.exercises = cached.exercises;
            this.buildFuseIndex(this.exercises);
            this.isFullDataLoaded = true;
            await this.loadCustomExercisesBackground();
            return this.exercises;
        } else if (cached && (!cached.exercises || cached.exercises.length === 0)) {
            console.warn('[ExerciseCache] Cached data has 0 exercises, removing stale cache');
            localStorage.removeItem(ExerciseCacheService.CACHE_KEY);
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
            const response = await fetch(`${ExerciseCacheService.API_BASE_URL}/api/v3/exercises/metadata`);
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

                if (fullExercises.length === 0) {
                    console.warn('[ExerciseCache] API returned 0 exercises, falling back to seed data');
                    if (window.EXERCISE_SEED_DATA && window.EXERCISE_SEED_DATA.length > 0) {
                        this.exercises = window.EXERCISE_SEED_DATA;
                        this.buildFuseIndex(this.exercises);
                        return this.exercises;
                    }
                }

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
    
    async fetchFromServer(options = {}) {
        const { maxTier = 2 } = options;
        const PAGE_SIZE = 500;
        let allExercises = [];
        let page = 1;
        let hasMore = true;

        const tierParam = maxTier ? `&max_tier=${maxTier}` : '';

        while (hasMore) {
            this.metrics.apiRequests++;
            const apiUrl = window.getApiUrl(`/api/v3/exercises?page=${page}&page_size=${PAGE_SIZE}${tierParam}`);
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

    /**
     * Fetch the full database (all tiers) for exercise database browsing page.
     * Uses a separate localStorage key so it doesn't pollute the tier-filtered cache.
     */
    async fetchFullDatabase() {
        // Check full-database localStorage cache first
        const cached = this._getFullFromLocalStorage();
        if (cached && cached.exercises && cached.exercises.length > 0 && await this.isCacheValid(cached)) {
            console.log(`[ExerciseCache] Using full DB cache: ${cached.exercises.length} exercises`);
            this.exercises = cached.exercises;
            this.buildFuseIndex(this.exercises);
            this.isFullDataLoaded = true;
            await this.loadCustomExercisesBackground();
            return this.exercises;
        } else if (cached && (!cached.exercises || cached.exercises.length === 0)) {
            console.warn('[ExerciseCache] Full DB cache has 0 exercises, removing stale cache');
            localStorage.removeItem(ExerciseCacheService.FULL_CACHE_KEY);
        }

        const fullExercises = await this.fetchFromServer({ maxTier: null });
        this.exercises = fullExercises;
        this.buildFuseIndex(this.exercises);
        this.isFullDataLoaded = true;
        this._saveFullToLocalStorage(fullExercises);
        this.emit('fullDataLoaded', { count: fullExercises.length });
        await this.loadCustomExercisesBackground();
        return fullExercises;
    }

    _getFullFromLocalStorage() {
        try {
            const data = localStorage.getItem(ExerciseCacheService.FULL_CACHE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('[ExerciseCache] Error reading full cache:', error);
            return null;
        }
    }

    _saveFullToLocalStorage(exercises) {
        try {
            if (!exercises || exercises.length === 0) {
                console.warn('[ExerciseCache] Refusing to cache empty full exercise list');
                return;
            }
            const data = {
                exercises,
                timestamp: Date.now(),
                version: this.serverVersion || 'unknown',
                count: exercises.length
            };
            localStorage.setItem(ExerciseCacheService.FULL_CACHE_KEY, JSON.stringify(data));
            console.log(`[ExerciseCache] Saved ${exercises.length} exercises to full DB cache`);
        } catch (error) {
            console.error('[ExerciseCache] Error saving full cache:', error);
        }
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

        // Hybrid search: combine Fuse fuzzy results with word-based substring matches.
        // Fuse handles typos (e.g. "bnech press" → "Bench Press") while substring
        // handles natural multi-word queries (e.g. "standard pushups" → "Push-up").
        const fuseResults = new Map();
        const substringResults = new Map();

        // 1. Fuse fuzzy search (typo tolerance)
        if (useFuzzy && this.fuseIndex) {
            const hits = this.fuseIndex.search(query, { limit: limit * 2 });
            for (const r of hits) {
                // Only accept good fuzzy matches (lower score = better in Fuse)
                if (r.score <= 0.35) {
                    const id = r.item.id || r.item.name;
                    fuseResults.set(id, {
                        ...r.item,
                        _searchScore: r.score,
                        _matchedBy: 'fuzzy'
                    });
                }
            }
        }

        // 2. Word-based substring search (handles "standard pushups" → matches "Push-up")
        // Normalize: remove hyphens, strip trailing s/es for basic depluralization
        const normalize = (s) => s.replace(/[-]/g, '').replace(/(?:es|s)$/i, '');
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
        const lowerQuery = query.toLowerCase();

        for (const ex of allExercises) {
            const id = ex.id || ex.name;
            if (fuseResults.has(id)) continue; // already found by Fuse

            const name = (ex.name || '').toLowerCase();
            const muscle = (ex.targetMuscleGroup || '').toLowerCase();
            const equip = (ex.primaryEquipment || '').toLowerCase();
            const searchable = `${name} ${muscle} ${equip}`;

            // Check full query as substring first
            if (searchable.includes(lowerQuery)) {
                substringResults.set(id, { ...ex, _searchScore: 0.05, _matchedBy: 'exact' });
                continue;
            }

            // Check individual words — normalize hyphens and plurals for comparison
            const nameNormalized = normalize(name);
            // Split exercise name into words and normalize each for matching
            const exWords = name.split(/[\s\-]+/).map(w => normalize(w));
            const searchableNormalized = `${nameNormalized} ${normalize(muscle)} ${normalize(equip)}`;

            let wordMatches = 0;
            for (const word of queryWords) {
                const wordNorm = normalize(word);
                if (searchableNormalized.includes(wordNorm) ||
                    searchableNormalized.includes(word) ||
                    exWords.some(ew => {
                        // Only allow substring matches when the shorter string is >= 4 chars
                        // to avoid "up" matching inside "pushup"
                        const shorter = ew.length < wordNorm.length ? ew : wordNorm;
                        return shorter.length >= 4 && (ew.includes(wordNorm) || wordNorm.includes(ew));
                    })) {
                    wordMatches++;
                }
            }

            if (wordMatches > 0) {
                // Score based on proportion of matched words (lower = better)
                const score = 0.1 + (1 - wordMatches / queryWords.length) * 0.3;
                substringResults.set(id, { ...ex, _searchScore: score, _matchedBy: 'substring' });
            }
        }

        // 3. Merge: Fuse results first (sorted by score), then substring matches
        let results = [
            ...Array.from(fuseResults.values()).sort((a, b) => a._searchScore - b._searchScore),
            ...Array.from(substringResults.values()).sort((a, b) => a._searchScore - b._searchScore)
        ];

        results = this.applyFilters(results, filters);

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
            if (!exercises || exercises.length === 0) {
                console.warn('[ExerciseCache] Refusing to cache empty exercise list');
                return;
            }
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
        localStorage.removeItem(ExerciseCacheService.FULL_CACHE_KEY);
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