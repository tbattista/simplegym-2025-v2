/**
 * Real-time Sync Manager for Ghost Gym V3 Phase 2
 * Handles live data synchronization and conflict resolution
 */

class SyncManager {
    constructor() {
        this.isActive = false;
        this.listeners = new Map();
        this.syncStatus = 'disconnected'; // 'disconnected', 'syncing', 'synced', 'error'
        this.lastSyncTime = null;
        this.conflictQueue = [];
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        
        // Initialize when Firebase is ready
        this.waitForFirebase();
    }
    
    async waitForFirebase() {
        if (window.firebaseReady && window.dataManager) {
            this.initialize();
        } else {
            window.addEventListener('firebaseReady', () => {
                // Wait a bit for dataManager to be ready
                setTimeout(() => this.initialize(), 100);
            });
        }
    }
    
    initialize() {
        try {
            // Listen for auth state changes
            window.addEventListener('authStateChanged', (event) => {
                this.handleAuthStateChange(event.detail);
            });
            
            // Set up network listeners
            this.setupNetworkListeners();
            
            console.log('✅ Sync Manager initialized');
        } catch (error) {
            console.warn('⚠️ Sync Manager initialization failed:', error.message);
        }
    }
    
    handleAuthStateChange(authData) {
        const { user, isAuthenticated } = authData;
        
        if (isAuthenticated && user) {
            this.startSyncForUser(user);
        } else {
            this.stopSync();
        }
    }
    
    async startSyncForUser(user) {
        if (this.isActive) {
            this.stopSync();
        }
        
        try {
            this.isActive = true;
            this.currentUser = user;
            this.updateSyncStatus('syncing');
            
            // Set up real-time listeners
            await this.setupRealtimeListeners(user.uid);
            
            this.updateSyncStatus('synced');
            this.lastSyncTime = new Date();
            
            console.log(`🔄 Real-time sync started for user: ${user.uid}`);
        } catch (error) {
            console.error('❌ Failed to start sync:', error);
            this.updateSyncStatus('error');
        }
    }
    
    stopSync() {
        if (!this.isActive) {
            return;
        }
        
        try {
            // Unsubscribe from all listeners
            this.listeners.forEach((unsubscribe, key) => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
            
            this.listeners.clear();
            this.isActive = false;
            this.currentUser = null;
            this.updateSyncStatus('disconnected');
            
            console.log('🔌 Real-time sync stopped');
        } catch (error) {
            console.error('❌ Error stopping sync:', error);
        }
    }
    
    async setupRealtimeListeners(userId) {
        try {
            // For now, we'll use polling as a fallback since we need to import Firebase modules properly
            // In a full implementation, this would use onSnapshot from Firestore
            
            // Set up polling for programs
            this.setupProgramPolling(userId);
            
            // Set up polling for workouts
            this.setupWorkoutPolling(userId);
            
            console.log('📡 Real-time listeners set up (polling mode)');
        } catch (error) {
            console.error('❌ Error setting up real-time listeners:', error);
            throw error;
        }
    }
    
    setupProgramPolling(userId) {
        const pollInterval = 5000; // 5 seconds
        
        const pollPrograms = async () => {
            if (!this.isActive || !this.currentUser) {
                return;
            }
            
            try {
                const programs = await window.dataManager.getFirestorePrograms();
                this.handleProgramsUpdate(programs);
            } catch (error) {
                console.warn('⚠️ Program polling error:', error);
                this.handleSyncError(error);
            }
        };
        
        const intervalId = setInterval(pollPrograms, pollInterval);
        this.listeners.set('programs_poll', () => clearInterval(intervalId));
    }
    
    setupWorkoutPolling(userId) {
        const pollInterval = 5000; // 5 seconds
        
        const pollWorkouts = async () => {
            if (!this.isActive || !this.currentUser) {
                return;
            }
            
            try {
                const workouts = await window.dataManager.getFirestoreWorkouts();
                this.handleWorkoutsUpdate(workouts);
            } catch (error) {
                console.warn('⚠️ Workout polling error:', error);
                this.handleSyncError(error);
            }
        };
        
        const intervalId = setInterval(pollWorkouts, pollInterval);
        this.listeners.set('workouts_poll', () => clearInterval(intervalId));
    }
    
    handleProgramsUpdate(programs) {
        // Update the dashboard if programs have changed
        if (window.dashboard && window.dashboard.programs) {
            const currentPrograms = window.dashboard.programs;
            
            // Simple change detection (in production, use proper diff)
            if (JSON.stringify(currentPrograms) !== JSON.stringify(programs)) {
                window.dashboard.programs = programs;
                window.dashboard.renderPrograms();
                
                console.log('🔄 Programs updated from sync');
                this.showSyncNotification('Programs synced', 'success');
            }
        }
    }
    
    handleWorkoutsUpdate(workouts) {
        // Update the dashboard if workouts have changed
        if (window.dashboard && window.dashboard.workouts) {
            const currentWorkouts = window.dashboard.workouts;
            
            // Simple change detection (in production, use proper diff)
            if (JSON.stringify(currentWorkouts) !== JSON.stringify(workouts)) {
                window.dashboard.workouts = workouts;
                window.dashboard.renderWorkouts();
                
                console.log('🔄 Workouts updated from sync');
                this.showSyncNotification('Workouts synced', 'success');
            }
        }
    }
    
    handleSyncError(error) {
        const errorKey = error.message || 'unknown';
        const attempts = this.retryAttempts.get(errorKey) || 0;
        
        if (attempts < this.maxRetries) {
            this.retryAttempts.set(errorKey, attempts + 1);
            console.log(`🔄 Retrying sync (attempt ${attempts + 1}/${this.maxRetries})`);
            
            // Retry after delay
            setTimeout(() => {
                if (this.isActive) {
                    this.updateSyncStatus('syncing');
                }
            }, Math.pow(2, attempts) * 1000); // Exponential backoff
        } else {
            console.error('❌ Max sync retries exceeded');
            this.updateSyncStatus('error');
            this.showSyncNotification('Sync error - working offline', 'warning');
        }
    }
    
    // Network Management
    
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            console.log('🌐 Network back online');
            if (this.isActive) {
                this.updateSyncStatus('syncing');
                // Reset retry attempts
                this.retryAttempts.clear();
            }
        });
        
        window.addEventListener('offline', () => {
            console.log('📴 Network offline');
            this.updateSyncStatus('offline');
        });
    }
    
    // Conflict Resolution
    
    async resolveConflict(conflictData) {
        try {
            console.log('⚠️ Resolving data conflict:', conflictData);
            
            // For now, implement last-write-wins strategy
            // In production, this could be more sophisticated
            const resolution = await this.applyLastWriteWins(conflictData);
            
            if (resolution.success) {
                this.showSyncNotification('Conflict resolved', 'info');
            } else {
                this.showSyncNotification('Conflict resolution failed', 'warning');
            }
            
            return resolution;
        } catch (error) {
            console.error('❌ Error resolving conflict:', error);
            return { success: false, error: error.message };
        }
    }
    
    async applyLastWriteWins(conflictData) {
        // Simple conflict resolution: use the most recently modified version
        try {
            const { local, remote, type, id } = conflictData;
            
            const localTime = new Date(local.modified_date);
            const remoteTime = new Date(remote.modified_date);
            
            const winner = localTime > remoteTime ? local : remote;
            
            console.log(`🏆 Conflict resolved: ${localTime > remoteTime ? 'local' : 'remote'} version wins`);
            
            return { success: true, resolution: winner };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Status Management
    
    updateSyncStatus(status) {
        const previousStatus = this.syncStatus;
        this.syncStatus = status;
        
        // Update UI indicators
        this.updateSyncUI(status);
        
        // Dispatch status change event
        window.dispatchEvent(new CustomEvent('syncStatusChanged', {
            detail: { status, previousStatus }
        }));
        
        console.log(`📊 Sync status: ${previousStatus} → ${status}`);
    }
    
    updateSyncUI(status) {
        // Update sync status indicators in the UI
        const statusIndicators = document.querySelectorAll('.sync-status-indicator');
        
        statusIndicators.forEach(indicator => {
            // Remove all status classes
            indicator.classList.remove('sync-disconnected', 'sync-syncing', 'sync-synced', 'sync-error', 'sync-offline');
            
            // Add current status class
            indicator.classList.add(`sync-${status}`);
            
            // Update text content
            const statusText = this.getStatusText(status);
            const textElement = indicator.querySelector('.sync-status-text');
            if (textElement) {
                textElement.textContent = statusText;
            }
        });
    }
    
    getStatusText(status) {
        const statusTexts = {
            'disconnected': 'Offline',
            'syncing': 'Syncing...',
            'synced': 'Synced',
            'error': 'Sync Error',
            'offline': 'Offline'
        };
        
        return statusTexts[status] || 'Unknown';
    }
    
    showSyncNotification(message, type = 'info') {
        // Show subtle sync notifications
        if (window.dashboard && window.dashboard.showAlert) {
            // Only show important sync messages to avoid spam
            if (type === 'warning' || type === 'danger') {
                window.dashboard.showAlert(message, type);
            }
        }
    }
    
    // Public API
    
    getSyncStatus() {
        return {
            status: this.syncStatus,
            isActive: this.isActive,
            lastSyncTime: this.lastSyncTime,
            conflictCount: this.conflictQueue.length,
            retryAttempts: Object.fromEntries(this.retryAttempts)
        };
    }
    
    async forcSync() {
        if (!this.isActive || !this.currentUser) {
            throw new Error('Sync not active or user not authenticated');
        }
        
        try {
            this.updateSyncStatus('syncing');
            
            // Force refresh data from Firestore
            if (window.dashboard) {
                await window.dashboard.loadInitialData();
            }
            
            this.updateSyncStatus('synced');
            this.lastSyncTime = new Date();
            
            this.showSyncNotification('Data synchronized', 'success');
            
            return { success: true };
        } catch (error) {
            this.updateSyncStatus('error');
            throw error;
        }
    }
    
    pauseSync() {
        if (this.isActive) {
            this.stopSync();
            console.log('⏸️ Sync paused');
        }
    }
    
    resumeSync() {
        if (this.currentUser && !this.isActive) {
            this.startSyncForUser(this.currentUser);
            console.log('▶️ Sync resumed');
        }
    }
}

// Create global sync manager instance
window.syncManager = new SyncManager();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncManager;
}