/**
 * Firebase Data Manager for Ghost Gym V3 Phase 2
 * Handles dual-storage architecture and real-time synchronization
 */

class FirebaseDataManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.storageMode = 'localStorage'; // 'localStorage' or 'firestore'
        this.syncListeners = new Map();
        this.offlineQueue = [];
        this.isOnline = navigator.onLine;
        
        // Set API base URL based on environment
        this.apiBase = this.getApiBaseUrl();
        console.log('🔗 API Base URL:', this.apiBase);
        
        // Initialize when Firebase is ready
        this.waitForFirebase();
        this.setupNetworkListeners();
    }
    
    getApiBaseUrl() {
        // Check if we're in development (localhost)
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Development: use localhost backend
            return 'http://localhost:8000';
        }
        
        // Production: Check for Railway environment variable or use same origin
        // Railway typically serves both frontend and backend from same domain
        // If your backend is on a different Railway service, set VITE_API_URL or similar
        const apiUrl = window.GHOST_GYM_API_URL || '';
        
        if (apiUrl) {
            return apiUrl;
        }
        
        // Default: assume backend is on same origin (Railway single service deployment)
        // Force HTTPS in production to avoid Mixed Content errors
        let origin = window.location.origin;
        
        // Ensure HTTPS in production (Railway always provides HTTPS)
        if (origin.startsWith('http://') && !hostname.includes('localhost')) {
            origin = origin.replace('http://', 'https://');
        }
        
        return origin;
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
        
        // If user just authenticated, check for migration opportunity
        if (!wasAuthenticated && this.isAuthenticated) {
            this.checkMigrationOpportunity();
        }
        
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
    
    async executeMigration(migrationData) {
        try {
            const response = await fetch(`${this.apiBase}/api/v3/auth/migrate-data`, {
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
        
        const response = await fetch(`${this.apiBase}/api/v3/firebase/programs?${params}`, {
            headers: {
                'Authorization': `Bearer ${await this.getAuthToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch programs from Firestore');
        }
        
        const data = await response.json();
        return data.programs || [];
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
            const response = await fetch(`${this.apiBase}/api/v3/firebase/programs`, {
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
        
        const response = await fetch(`${this.apiBase}/api/v3/firebase/workouts?${params}`, {
            headers: {
                'Authorization': `Bearer ${await this.getAuthToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch workouts from Firestore');
        }
        
        const data = await response.json();
        return data.workouts || [];
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
            const response = await fetch(`${this.apiBase}/api/v3/firebase/workouts`, {
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