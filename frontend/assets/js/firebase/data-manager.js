/**
 * Fitness Field Notes - Firebase Data Manager
 * Orchestrator: auth init, network management, request dedup, utilities
 * Program/Workout ops loaded via mixins (data-manager-program-ops.js, data-manager-workout-ops.js)
 * @version 20260228-01
 */

console.log('📦 Data Manager Version: 20260228-MIXIN-SPLIT');

/**
 * NOTE: Global API utility function is now in app-config.js
 * This ensures consistent API URL handling across the entire application
 */

class FirebaseDataManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.storageMode = 'localStorage'; // 'localStorage' or 'firestore'
        this.syncListeners = new Map();
        this.offlineQueue = [];
        this.isOnline = navigator.onLine;

        // Request deduplication
        this.inFlightRequests = new Map();
        this.requestCache = new Map();
        this.CACHE_TTL = 5000; // 5 seconds cache for identical requests

        // Auth state initialization promise
        // Uses Firebase's authStateReady() for reliable initialization
        this.authReadyPromise = null;
        this.authReadyResolve = null;
        this.isAuthReady = false;

        // Create promise that resolves when initial auth state is determined
        this.authReadyPromise = new Promise((resolve) => {
            this.authReadyResolve = resolve;
        });

        // Set API base URL based on environment
        this.apiBase = this.getApiBaseUrl();
        console.log('🔗 API Base URL:', this.apiBase);

        // Initialize when Firebase is ready
        this.waitForFirebase();
        this.setupNetworkListeners();
    }

    getApiBaseUrl() {
        // Use centralized config from app-config.js
        if (window.config?.api?.baseUrl) {
            console.log('🔗 Using centralized API config:', window.config.api.baseUrl);
            return window.config.api.baseUrl;
        }

        // Fallback to current origin (Railway serves everything from same domain)
        console.log('⚠️ Centralized config not found, using origin:', window.location.origin);
        return window.location.origin;
    }

    async waitForFirebase() {
        if (window.firebaseReady) {
            this.initialize();
        } else {
            window.addEventListener('firebaseReady', () => this.initialize());
        }
    }

    async initialize() {
        try {
            console.log('🔄 Waiting for Firebase auth state to be determined...');

            // Use Firebase's authStateReady() - this resolves when Firebase has determined
            // the initial auth state (either user is logged in or not)
            // This is the official recommended approach (Firebase v9.16.0+)
            if (window.firebaseAuth?.authStateReady) {
                await window.firebaseAuth.authStateReady();
                console.log('✅ Firebase auth state ready via authStateReady()');
            } else if (window.firebaseAuthFunctions?.authStateReady) {
                await window.firebaseAuthFunctions.authStateReady();
                console.log('✅ Firebase auth state ready via firebaseAuthFunctions');
            } else {
                console.warn('⚠️ authStateReady not available, falling back to immediate check');
            }

            // Now we can safely check the current user
            const user = window.firebaseAuth?.currentUser || null;

            // Set initial auth state
            this.isAuthenticated = !!user;
            this.currentUser = user;
            this.storageMode = this.isAuthenticated ? 'firestore' : 'localStorage';

            console.log(`✅ Initial auth state determined: ${this.storageMode} mode`, {
                isAuthenticated: this.isAuthenticated,
                userEmail: user?.email,
                userId: user?.uid
            });

            // Resolve the auth ready promise
            this.isAuthReady = true;
            if (this.authReadyResolve) {
                this.authReadyResolve({
                    isAuthenticated: this.isAuthenticated,
                    storageMode: this.storageMode,
                    user: this.currentUser
                });
            }

            // Set up listener for future auth state changes (login/logout during session)
            if (window.authService) {
                window.authService.onAuthStateChange((user) => {
                    this.handleAuthStateChange(user);
                });
            }

            console.log('✅ Firebase Data Manager initialized');
        } catch (error) {
            console.warn('⚠️ Firebase Data Manager initialization failed:', error.message);

            // Even on error, resolve the promise so the app doesn't hang
            this.isAuthReady = true;
            if (this.authReadyResolve) {
                this.authReadyResolve({
                    isAuthenticated: false,
                    storageMode: 'localStorage',
                    user: null
                });
            }
        }
    }

    handleAuthStateChange(user) {
        // This is called for auth state changes DURING the session (login/logout)
        // Initial auth state is handled by initialize() using authStateReady()
        const wasAuthenticated = this.isAuthenticated;
        this.isAuthenticated = !!user;
        this.currentUser = user;
        this.storageMode = this.isAuthenticated ? 'firestore' : 'localStorage';

        console.log(`🔄 Auth state changed: ${this.storageMode} mode`, {
            isAuthenticated: this.isAuthenticated,
            userEmail: user?.email,
            userId: user?.uid,
            isAnonymous: user?.isAnonymous
        });

        // Notify listeners of auth state change
        this.notifyAuthStateChange(user);
    }

    // Network Management

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 Back online - processing offline queue');
            this.processOfflineQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📴 Gone offline - queuing operations');
        });
    }

    async processOfflineQueue() {
        if (this.offlineQueue.length === 0) {
            return;
        }

        console.log(`🔄 Processing ${this.offlineQueue.length} offline operations`);

        const queue = [...this.offlineQueue];
        this.offlineQueue = [];

        for (const operation of queue) {
            try {
                // Execute queued operations when back online
                console.log('⚡ Executing queued operation:', operation.type);
            } catch (error) {
                console.error('❌ Failed to process queued operation:', error);
                // Re-queue failed operations
                this.offlineQueue.push(operation);
            }
        }
    }

    // Request Deduplication

    /**
     * Deduplicate concurrent requests to the same URL
     * If a request is already in flight, return the existing promise
     * If a recent cached result exists, return it
     */
    async deduplicatedFetch(url, fetchFn) {
        // Check recent cache first
        const cached = this.requestCache.get(url);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            console.log(`⚡ Using cached result for: ${url}`);
            return cached.data;
        }

        // Check if request is already in flight
        if (this.inFlightRequests.has(url)) {
            console.log(`🔄 Reusing in-flight request for: ${url}`);
            return this.inFlightRequests.get(url);
        }

        // Create new request
        const promise = fetchFn()
            .then(data => {
                // Cache the result
                this.requestCache.set(url, {
                    data,
                    timestamp: Date.now()
                });

                // Clean up in-flight tracking
                this.inFlightRequests.delete(url);

                return data;
            })
            .catch(error => {
                // Clean up in-flight tracking on error
                this.inFlightRequests.delete(url);
                throw error;
            });

        // Track in-flight request
        this.inFlightRequests.set(url, promise);

        return promise;
    }

    // Utility Methods

    async getAuthToken() {
        // Use getFirebaseUser() to get the source of truth, avoiding mobile race conditions
        const user = this.getFirebaseUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        try {
            return await user.getIdToken();
        } catch (error) {
            console.error('❌ Error getting auth token:', error);
            throw error;
        }
    }

    notifyAuthStateChange(user) {
        // Notify other components of auth state change
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { user, isAuthenticated: this.isAuthenticated }
        }));
    }

    // Public API

    /**
     * Wait for initial auth state to be determined
     * Returns a promise that resolves with auth state info
     */
    async waitForAuthReady() {
        if (this.isAuthReady) {
            return {
                isAuthenticated: this.isAuthenticated,
                storageMode: this.storageMode,
                user: this.currentUser
            };
        }

        console.log('⏳ Waiting for auth state to be determined...');
        return this.authReadyPromise;
    }

    getStorageMode() {
        return this.storageMode;
    }

    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get the Firebase user directly from Firebase Auth (source of truth)
     * This avoids race conditions where this.currentUser may be stale on mobile
     */
    getFirebaseUser() {
        return window.firebaseAuth?.currentUser || this.currentUser;
    }
}

// Apply mixin methods to prototype BEFORE creating instance
if (window.DataManagerProgramOps) {
    Object.assign(FirebaseDataManager.prototype, window.DataManagerProgramOps);
    console.log('✅ DataManagerProgramOps mixin applied');
} else {
    console.warn('⚠️ DataManagerProgramOps not loaded');
}

if (window.DataManagerWorkoutOps) {
    Object.assign(FirebaseDataManager.prototype, window.DataManagerWorkoutOps);
    console.log('✅ DataManagerWorkoutOps mixin applied');
} else {
    console.warn('⚠️ DataManagerWorkoutOps not loaded');
}

// Create global data manager instance
window.dataManager = new FirebaseDataManager();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseDataManager;
}
