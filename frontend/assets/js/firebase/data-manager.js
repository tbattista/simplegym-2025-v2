/**
 * Firebase Data Manager for Ghost Gym V3 Phase 2
 * Handles dual-storage architecture and real-time synchronization
 * @version 20251020-03-PHASES-2-5
 */

console.log('📦 Data Manager Version: 20251028-CENTRALIZED-CONFIG');

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
    
    initialize() {
        try {
            // Set up auth state listener
            if (window.authService) {
                window.authService.onAuthStateChange((user) => {
                    this.handleAuthStateChange(user);
                });
            }
            
            console.log('✅ Firebase Data Manager initialized');
        } catch (error) {
            console.warn('⚠️ Firebase Data Manager initialization failed:', error.message);
        }
    }
    
    handleAuthStateChange(user) {
        const wasAuthenticated = this.isAuthenticated;
        this.isAuthenticated = !!user;
        this.currentUser = user;
        this.storageMode = this.isAuthenticated ? 'firestore' : 'localStorage';
        
        console.log(`🔄 Auth state changed: ${this.storageMode} mode`);
        
        // Migration functionality disabled - users can manually export/import if needed
        // If user just authenticated, check for migration opportunity
        // if (!wasAuthenticated && this.isAuthenticated) {
        //     this.checkMigrationOpportunity();
        // }
        
        // Notify listeners of auth state change
        this.notifyAuthStateChange(user);
    }
    
    async checkMigrationOpportunity() {
        try {
            // Check if there's local data to migrate
            const localPrograms = this.getLocalStoragePrograms();
            const localWorkouts = this.getLocalStorageWorkouts();
            
            if (localPrograms.length > 0 || localWorkouts.length > 0) {
                console.log(`📦 Found local data: ${localPrograms.length} programs, ${localWorkouts.length} workouts`);
                
                // Show migration prompt
                this.showMigrationPrompt(localPrograms.length, localWorkouts.length);
            }
        } catch (error) {
            console.error('❌ Error checking migration opportunity:', error);
        }
    }
    
    showMigrationPrompt(programCount, workoutCount) {
        // Create and show migration modal
        const migrationModal = document.getElementById('upgradeModal');
        if (migrationModal) {
            // Update modal content with actual data counts
            const modalBody = migrationModal.querySelector('.modal-body');
            if (modalBody) {
                const dataInfo = modalBody.querySelector('p');
                if (dataInfo) {
                    dataInfo.textContent = `We found ${programCount} programs and ${workoutCount} workouts to sync to the cloud.`;
                }
            }
            
            // Show the modal
            const modal = new bootstrap.Modal(migrationModal);
            modal.show();
            
            // Set up migration buttons
            const createAccountBtn = document.getElementById('upgradeCreateAccountBtn');
            const signInBtn = document.getElementById('upgradeSignInBtn');
            
            if (createAccountBtn) {
                createAccountBtn.onclick = () => {
                    modal.hide();
                    this.startMigrationProcess();
                };
            }
            
            if (signInBtn) {
                signInBtn.onclick = () => {
                    modal.hide();
                    this.startMigrationProcess();
                };
            }
        }
    }
    
    async startMigrationProcess() {
        try {
            console.log('🚀 Starting data migration process...');
            
            // Prepare migration data
            const migrationData = await this.prepareMigrationData();
            
            if (!migrationData.success) {
                throw new Error(migrationData.error);
            }
            
            // Execute migration
            const result = await this.executeMigration(migrationData);
            
            if (result.success) {
                this.showMigrationSuccess(result);
            } else {
                this.showMigrationError(result.error);
            }
            
        } catch (error) {
            console.error('❌ Migration process failed:', error);
            this.showMigrationError(error.message);
        }
    }
    
    async prepareMigrationData() {
        try {
            const programs = this.getLocalStoragePrograms();
            const workouts = this.getLocalStorageWorkouts();
            
            return {
                success: true,
                programs: programs,
                workouts: workouts
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async executeMigration_DISABLED(migrationData) {
        try {
            const url = window.config.api.getUrl('/api/v3/auth/migrate-data');
            console.log('🔍 DEBUG: Migration URL:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify({
                    programs: migrationData.programs,
                    workouts: migrationData.workouts
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Migration failed');
            }
            
            return await response.json();
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    showMigrationSuccess(result) {
        const message = `Successfully migrated ${result.migrated_programs} programs and ${result.migrated_workouts} workouts to the cloud!`;
        this.showAlert(message, 'success');
        
        // Optionally clear local storage
        if (confirm('Migration successful! Would you like to clear local storage to avoid duplicates?')) {
            this.clearLocalStorage();
        }
        
        // Refresh the dashboard to show cloud data
        if (window.dashboard && window.dashboard.loadInitialData) {
            window.dashboard.loadInitialData();
        }
    }
    
    showMigrationError(error) {
        const message = `Migration failed: ${error}. Your local data is safe.`;
        this.showAlert(message, 'danger');
    }
    
    // Program Operations
    
    async getPrograms(options = {}) {
        const { page = 1, pageSize = 20, search = null } = options;
        
        console.log('🔍 DEBUG: getPrograms called with:', { storageMode: this.storageMode, isOnline: this.isOnline, options });
        
        try {
            if (this.storageMode === 'firestore' && this.isOnline) {
                const programs = await this.getFirestorePrograms({ page, pageSize, search });
                console.log('🔍 DEBUG: Got programs from Firestore:', programs.length);
                return programs;
            } else {
                const programs = this.getLocalStoragePrograms({ page, pageSize, search });
                console.log('🔍 DEBUG: Got programs from localStorage:', programs.length);
                return programs;
            }
        } catch (error) {
            console.error('❌ Error getting programs:', error);
            // Fallback to localStorage
            const programs = this.getLocalStoragePrograms({ page, pageSize, search });
            console.log('🔍 DEBUG: Fallback to localStorage programs:', programs.length);
            return programs;
        }
    }
    
    async getFirestorePrograms(options = {}) {
        const { page = 1, pageSize = 20, search = null } = options;
        
        const params = new URLSearchParams({
            page: page.toString(),
            page_size: pageSize.toString()
        });
        
        if (search) {
            params.append('search', search);
        }
        
        // Use centralized API config
        const url = window.config.api.getUrl(`/api/v3/firebase/programs?${params}`);
        
        // Use deduplicated fetch
        return this.deduplicatedFetch(url, async () => {
            console.log('🔍 DEBUG: Fetching programs from:', url);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch programs from Firestore');
            }
            
            const data = await response.json();
            return data.programs || [];
        });
    }
    
    getLocalStoragePrograms(options = {}) {
        const { page = 1, pageSize = 20, search = null } = options;
        
        try {
            const stored = localStorage.getItem('gym_programs');
            let programs = stored ? JSON.parse(stored) : [];
            
            // Apply search filter
            if (search) {
                const searchLower = search.toLowerCase();
                programs = programs.filter(program => 
                    program.name.toLowerCase().includes(searchLower) ||
                    program.description.toLowerCase().includes(searchLower) ||
                    (program.tags && program.tags.some(tag => tag.toLowerCase().includes(searchLower)))
                );
            }
            
            // Apply pagination
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            
            return programs.slice(startIndex, endIndex);
        } catch (error) {
            console.error('❌ Error getting local programs:', error);
            return [];
        }
    }
    
    async createProgram(programData) {
        try {
            if (this.storageMode === 'firestore' && this.isOnline) {
                return await this.createFirestoreProgram(programData);
            } else {
                return this.createLocalStorageProgram(programData);
            }
        } catch (error) {
            console.error('❌ Error creating program:', error);
            // Fallback to localStorage
            return this.createLocalStorageProgram(programData);
        }
    }
    
    async createFirestoreProgram(programData) {
        try {
            const url = window.config.api.getUrl('/api/v3/firebase/programs');
            console.log('🔍 DEBUG: Creating program at:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify(programData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Firestore program creation failed:', errorData);
                throw new Error(errorData.detail || 'Failed to create program in Firestore');
            }
            
            const program = await response.json();
            console.log('✅ Program created in Firestore:', program.name);
            return program;
        } catch (error) {
            console.error('❌ Error creating Firestore program:', error);
            throw error;
        }
    }
    
    createLocalStorageProgram(programData) {
        try {
            // Get all existing programs from localStorage
            const stored = localStorage.getItem('gym_programs');
            const programs = stored ? JSON.parse(stored) : [];
            
            // Create new program with ID
            const newProgram = {
                id: `program-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                ...programData,
                created_date: new Date().toISOString(),
                modified_date: new Date().toISOString(),
                workouts: []
            };
            
            programs.unshift(newProgram);
            localStorage.setItem('gym_programs', JSON.stringify(programs));
            
            console.log('✅ Program created in localStorage:', newProgram.name);
            return newProgram;
        } catch (error) {
            console.error('❌ Error creating local program:', error);
            throw error;
        }
    }
    
    // Workout Operations
    
    async getWorkouts(options = {}) {
        const { page = 1, pageSize = 50, search = null, tags = null } = options;
        
        console.log('🔍 DEBUG: getWorkouts called with:', { storageMode: this.storageMode, isOnline: this.isOnline, options });
        
        try {
            if (this.storageMode === 'firestore' && this.isOnline) {
                const workouts = await this.getFirestoreWorkouts({ page, pageSize, search, tags });
                console.log('🔍 DEBUG: Got workouts from Firestore:', workouts.length);
                return workouts;
            } else {
                const workouts = this.getLocalStorageWorkouts({ page, pageSize, search, tags });
                console.log('🔍 DEBUG: Got workouts from localStorage:', workouts.length);
                return workouts;
            }
        } catch (error) {
            console.error('❌ Error getting workouts:', error);
            // Fallback to localStorage
            const workouts = this.getLocalStorageWorkouts({ page, pageSize, search, tags });
            console.log('🔍 DEBUG: Fallback to localStorage workouts:', workouts.length);
            return workouts;
        }
    }
    
    async getFirestoreWorkouts(options = {}) {
        const { page = 1, pageSize = 50, search = null, tags = null } = options;
        
        const params = new URLSearchParams({
            page: page.toString(),
            page_size: pageSize.toString()
        });
        
        if (search) {
            params.append('search', search);
        }
        
        if (tags && tags.length > 0) {
            tags.forEach(tag => params.append('tags', tag));
        }
        
        // Use centralized API config
        const url = window.config.api.getUrl(`/api/v3/firebase/workouts?${params}`);
        
        // Use deduplicated fetch
        return this.deduplicatedFetch(url, async () => {
            console.log('🔍 DEBUG: Fetching workouts from:', url);
            console.log('🔍 DEBUG: Current protocol:', window.location.protocol);
            console.log('🔍 DEBUG: Current origin:', window.location.origin);
            
            try {
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${await this.getAuthToken()}`
                    }
                });
                
                if (!response.ok) {
                    const errorText = await response.text().catch(() => 'No error details');
                    console.error('❌ API Error Response:', {
                        status: response.status,
                        statusText: response.statusText,
                        url: url,
                        errorText: errorText
                    });
                    throw new Error(`Failed to fetch workouts: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log('✅ Successfully fetched workouts:', data.workouts?.length || 0);
                return data.workouts || [];
                
            } catch (error) {
                console.error('❌ Fetch Error Details:', {
                    message: error.message,
                    name: error.name,
                    url: url,
                    protocol: window.location.protocol,
                    origin: window.location.origin,
                    isSSLError: error.message.includes('SSL') || error.message.includes('ERR_SSL')
                });
                
                // Provide helpful error message for SSL issues
                if (error.message.includes('SSL') || error.message.includes('ERR_SSL')) {
                    console.error('💡 SSL Error detected - this usually means:');
                    console.error('   1. Trying to use HTTPS on localhost (should use HTTP)');
                    console.error('   2. Mixed content (HTTP page trying HTTPS resource)');
                    console.error('   3. Invalid SSL certificate');
                }
                
                throw error;
            }
        });
    }
    
    getLocalStorageWorkouts(options = {}) {
        const { page = 1, pageSize = 50, search = null, tags = null } = options;
        
        try {
            const stored = localStorage.getItem('gym_workouts');
            let workouts = stored ? JSON.parse(stored) : [];
            
            // Apply search filter
            if (search) {
                const searchLower = search.toLowerCase();
                workouts = workouts.filter(workout => 
                    workout.name.toLowerCase().includes(searchLower) ||
                    workout.description.toLowerCase().includes(searchLower) ||
                    (workout.tags && workout.tags.some(tag => tag.toLowerCase().includes(searchLower)))
                );
            }
            
            // Apply tag filter
            if (tags && tags.length > 0) {
                workouts = workouts.filter(workout => 
                    workout.tags && tags.some(tag => workout.tags.includes(tag))
                );
            }
            
            // Apply pagination
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            
            return workouts.slice(startIndex, endIndex);
        } catch (error) {
            console.error('❌ Error getting local workouts:', error);
            return [];
        }
    }
    
    async createWorkout(workoutData) {
        try {
            if (this.storageMode === 'firestore' && this.isOnline) {
                return await this.createFirestoreWorkout(workoutData);
            } else {
                return this.createLocalStorageWorkout(workoutData);
            }
        } catch (error) {
            console.error('❌ Error creating workout:', error);
            // Fallback to localStorage
            return this.createLocalStorageWorkout(workoutData);
        }
    }
    
    async createFirestoreWorkout(workoutData) {
        try {
            const url = window.config.api.getUrl('/api/v3/firebase/workouts');
            console.log('🔍 DEBUG: Creating workout at:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify(workoutData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Firestore workout creation failed:', errorData);
                throw new Error(errorData.detail || 'Failed to create workout in Firestore');
            }
            
            const workout = await response.json();
            console.log('✅ Workout created in Firestore:', workout.name);
            return workout;
        } catch (error) {
            console.error('❌ Error creating Firestore workout:', error);
            throw error;
        }
    }
    
    createLocalStorageWorkout(workoutData) {
        try {
            // Get all existing workouts from localStorage
            const stored = localStorage.getItem('gym_workouts');
            const workouts = stored ? JSON.parse(stored) : [];
            
            // Create new workout with ID
            const newWorkout = {
                id: `workout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                ...workoutData,
                created_date: new Date().toISOString(),
                modified_date: new Date().toISOString(),
                is_template: true
            };
            
            workouts.unshift(newWorkout);
            localStorage.setItem('gym_workouts', JSON.stringify(workouts));
            
            console.log('✅ Workout created in localStorage:', newWorkout.name);
            return newWorkout;
        } catch (error) {
            console.error('❌ Error creating local workout:', error);
            throw error;
        }
    }
    
    async updateWorkout(workoutId, workoutData) {
        try {
            if (this.storageMode === 'firestore' && this.isOnline) {
                return await this.updateFirestoreWorkout(workoutId, workoutData);
            } else {
                return this.updateLocalStorageWorkout(workoutId, workoutData);
            }
        } catch (error) {
            console.error('❌ Error updating workout:', error);
            // Fallback to localStorage
            return this.updateLocalStorageWorkout(workoutId, workoutData);
        }
    }
    
    async updateFirestoreWorkout(workoutId, workoutData) {
        try {
            const url = window.config.api.getUrl(`/api/v3/firebase/workouts/${workoutId}`);
            console.log('🔍 DEBUG: Updating workout at:', url);
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify(workoutData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Firestore workout update failed:', errorData);
                throw new Error(errorData.detail || 'Failed to update workout in Firestore');
            }
            
            const workout = await response.json();
            console.log('✅ Workout updated in Firestore:', workout.name);
            return workout;
        } catch (error) {
            console.error('❌ Error updating Firestore workout:', error);
            throw error;
        }
    }
    
    updateLocalStorageWorkout(workoutId, workoutData) {
        try {
            // Get all existing workouts from localStorage
            const stored = localStorage.getItem('gym_workouts');
            const workouts = stored ? JSON.parse(stored) : [];
            
            // Find and update the workout
            const index = workouts.findIndex(w => w.id === workoutId);
            if (index === -1) {
                throw new Error('Workout not found');
            }
            
            // Update workout while preserving ID and created_date
            const updatedWorkout = {
                ...workouts[index],
                ...workoutData,
                id: workoutId,
                created_date: workouts[index].created_date,
                modified_date: new Date().toISOString()
            };
            
            workouts[index] = updatedWorkout;
            localStorage.setItem('gym_workouts', JSON.stringify(workouts));
            
            console.log('✅ Workout updated in localStorage:', updatedWorkout.name);
            return updatedWorkout;
        } catch (error) {
            console.error('❌ Error updating local workout:', error);
            throw error;
        }
    }
    
    async deleteWorkout(workoutId) {
        try {
            if (this.storageMode === 'firestore' && this.isOnline) {
                return await this.deleteFirestoreWorkout(workoutId);
            } else {
                return this.deleteLocalStorageWorkout(workoutId);
            }
        } catch (error) {
            console.error('❌ Error deleting workout:', error);
            // Fallback to localStorage
            return this.deleteLocalStorageWorkout(workoutId);
        }
    }
    
    async deleteFirestoreWorkout(workoutId) {
        try {
            const url = window.config.api.getUrl(`/api/v3/firebase/workouts/${workoutId}`);
            console.log('🔍 DEBUG: Deleting workout at:', url);
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Firestore workout deletion failed:', errorData);
                throw new Error(errorData.detail || 'Failed to delete workout from Firestore');
            }
            
            console.log('✅ Workout deleted from Firestore');
            return true;
        } catch (error) {
            console.error('❌ Error deleting Firestore workout:', error);
            throw error;
        }
    }
    
    deleteLocalStorageWorkout(workoutId) {
        try {
            // Get all existing workouts from localStorage
            const stored = localStorage.getItem('gym_workouts');
            const workouts = stored ? JSON.parse(stored) : [];
            
            // Find and remove the workout
            const index = workouts.findIndex(w => w.id === workoutId);
            if (index === -1) {
                throw new Error('Workout not found');
            }
            
            workouts.splice(index, 1);
            localStorage.setItem('gym_workouts', JSON.stringify(workouts));
            
            console.log('✅ Workout deleted from localStorage');
            return true;
        } catch (error) {
            console.error('❌ Error deleting local workout:', error);
            throw error;
        }
    }
    
    // Real-time Sync Management
    
    setupRealtimeListeners() {
        if (!this.isAuthenticated || !window.firebase?.db) {
            return;
        }
        
        try {
            const userId = this.currentUser.uid;
            
            // Listen for program changes
            this.setupProgramListener(userId);
            
            // Listen for workout changes
            this.setupWorkoutListener(userId);
            
            console.log('✅ Real-time listeners set up');
        } catch (error) {
            console.error('❌ Error setting up real-time listeners:', error);
        }
    }
    
    setupProgramListener(userId) {
        // Note: This would require Firebase SDK v9+ imports
        // For now, we'll implement polling as a fallback
        console.log('📡 Program listener would be set up here');
    }
    
    setupWorkoutListener(userId) {
        // Note: This would require Firebase SDK v9+ imports
        // For now, we'll implement polling as a fallback
        console.log('📡 Workout listener would be set up here');
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
                await this.executeQueuedOperation(operation);
            } catch (error) {
                console.error('❌ Failed to process queued operation:', error);
                // Re-queue failed operations
                this.offlineQueue.push(operation);
            }
        }
    }
    
    async executeQueuedOperation(operation) {
        // Execute queued operations when back online
        console.log('⚡ Executing queued operation:', operation.type);
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
    
    /**
     * Clear request cache
     */
    clearRequestCache() {
        this.requestCache.clear();
        console.log('🧹 Request cache cleared');
    }
    
    // Utility Methods
    
    async getAuthToken() {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }
        
        try {
            return await this.currentUser.getIdToken();
        } catch (error) {
            console.error('❌ Error getting auth token:', error);
            throw error;
        }
    }
    
    clearLocalStorage() {
        try {
            localStorage.removeItem('gym_programs');
            localStorage.removeItem('gym_workouts');
            console.log('🧹 Local storage cleared');
        } catch (error) {
            console.error('❌ Error clearing local storage:', error);
        }
    }
    
    showAlert(message, type = 'info') {
        // Use the existing alert system from dashboard
        if (window.dashboard && window.dashboard.showAlert) {
            window.dashboard.showAlert(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    notifyAuthStateChange(user) {
        // Notify other components of auth state change
        window.dispatchEvent(new CustomEvent('authStateChanged', { 
            detail: { user, isAuthenticated: this.isAuthenticated } 
        }));
    }
    
    // Public API
    
    getStorageMode() {
        return this.storageMode;
    }
    
    isUserAuthenticated() {
        return this.isAuthenticated;
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    getServiceStatus() {
        return {
            storageMode: this.storageMode,
            isAuthenticated: this.isAuthenticated,
            isOnline: this.isOnline,
            offlineQueueSize: this.offlineQueue.length
        };
    }
}

// Create global data manager instance
window.dataManager = new FirebaseDataManager();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseDataManager;
}