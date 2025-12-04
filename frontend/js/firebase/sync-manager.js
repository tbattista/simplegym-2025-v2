/**
 * Real-time Sync Manager for Ghost Gym V3 Phase 2
 * Handles live data synchronization and conflict resolution
 * @version 2.0.0 - Performance Optimized with Adaptive Polling
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
        
        // Adaptive polling configuration
        this.pollingIntervals = {
            active: 30000,      // 30 seconds when user is active
            idle: 120000,       // 2 minutes when idle (5+ min)
            veryIdle: 300000,   // 5 minutes when very idle (15+ min)
            hidden: null        // Pause when tab is hidden
        };
        
        this.currentInterval = this.pollingIntervals.active;
        this.lastActivityTime = Date.now();
        this.isTabVisible = !document.hidden;
        this.activityThrottleTimer = null;
        
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
            
            // Set up activity tracking
            this.setupActivityTracking();
            
            // Set up visibility change detection
            this.setupVisibilityTracking();
            
            console.log('✅ Sync Manager initialized with adaptive polling');
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
            // Set up adaptive polling for programs and workouts
            this.setupAdaptivePolling(userId);
            
            console.log('📡 Real-time listeners set up (adaptive polling mode)');
        } catch (error) {
            console.error('❌ Error setting up real-time listeners:', error);
            throw error;
        }
    }
    
    setupAdaptivePolling(userId) {
        // Single unified polling function
        const poll = async () => {
            if (!this.isActive || !this.currentUser || !this.isTabVisible) {
                return;
            }
            
            try {
                // Fetch both programs and workouts in parallel
                const [programs, workouts] = await Promise.all([
                    window.dataManager.getFirestorePrograms(),
                    window.dataManager.getFirestoreWorkouts()
                ]);
                
                this.handleProgramsUpdate(programs);
                this.handleWorkoutsUpdate(workouts);
                
            } catch (error) {
                console.warn('⚠️ Polling error:', error);
                this.handleSyncError(error);
            }
        };
        
        // Initial poll
        poll();
        
        // Set up adaptive interval
        const startPolling = () => {
            // Clear existing interval
            if (this.listeners.has('adaptive_poll')) {
                const clearFn = this.listeners.get('adaptive_poll');
                clearFn();
            }
            
            // Determine interval based on activity
            const interval = this.getAdaptiveInterval();
            
            if (interval === null) {
                console.log('⏸️ Polling paused (tab hidden)');
                return;
            }
            
            console.log(`🔄 Polling interval set to ${interval / 1000}s`);
            
            const intervalId = setInterval(poll, interval);
            this.listeners.set('adaptive_poll', () => clearInterval(intervalId));
        };
        
        // Start initial polling
        startPolling();
        
        // Store restart function for activity/visibility changes
        this.restartPolling = startPolling;
    }
    
    getAdaptiveInterval() {
        // If tab is hidden, pause polling
        if (!this.isTabVisible) {
            return null;
        }
        
        const timeSinceActivity = Date.now() - this.lastActivityTime;
        
        // Active: < 5 minutes since last activity
        if (timeSinceActivity < 5 * 60 * 1000) {
            return this.pollingIntervals.active;
        }
        
        // Idle: 5-15 minutes since last activity
        if (timeSinceActivity < 15 * 60 * 1000) {
            return this.pollingIntervals.idle;
        }
        
        // Very idle: > 15 minutes since last activity
        return this.pollingIntervals.veryIdle;
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
    
    // Activity Tracking
    
    setupActivityTracking() {
        const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        
        const handleActivity = () => {
            // Throttle activity updates to avoid excessive processing
            if (this.activityThrottleTimer) {
                return;
            }
            
            this.activityThrottleTimer = setTimeout(() => {
                this.activityThrottleTimer = null;
            }, 1000); // Throttle to once per second
            
            const previousInterval = this.currentInterval;
            this.lastActivityTime = Date.now();
            this.currentInterval = this.getAdaptiveInterval();
            
            // Restart polling if interval changed
            if (previousInterval !== this.currentInterval && this.restartPolling) {
                this.restartPolling();
            }
        };
        
        activityEvents.forEach(event => {
            document.addEventListener(event, handleActivity, { passive: true });
        });
    }
    
    setupVisibilityTracking() {
        document.addEventListener('visibilitychange', () => {
            const wasVisible = this.isTabVisible;
            this.isTabVisible = !document.hidden;
            
            if (wasVisible !== this.isTabVisible) {
                console.log(`👁️ Tab visibility changed: ${this.isTabVisible ? 'visible' : 'hidden'}`);
                
                if (this.isTabVisible) {
                    // Tab became visible - resume polling and sync immediately
                    console.log('🔄 Resuming sync after tab became visible');
                    this.lastActivityTime = Date.now();
                    
                    if (this.isActive && this.restartPolling) {
                        this.restartPolling();
                        
                        // Immediate sync when tab becomes visible
                        this.performImmediateSync();
                    }
                } else {
                    // Tab became hidden - pause polling
                    console.log('⏸️ Pausing sync while tab is hidden');
                    
                    if (this.listeners.has('adaptive_poll')) {
                        const clearFn = this.listeners.get('adaptive_poll');
                        clearFn();
                        this.listeners.delete('adaptive_poll');
                    }
                }
            }
        });
    }
    
    async performImmediateSync() {
        if (!this.isActive || !this.currentUser) {
            return;
        }
        
        try {
            const [programs, workouts] = await Promise.all([
                window.dataManager.getFirestorePrograms(),
                window.dataManager.getFirestoreWorkouts()
            ]);
            
            this.handleProgramsUpdate(programs);
            this.handleWorkoutsUpdate(workouts);
            
            console.log('✅ Immediate sync completed');
        } catch (error) {
            console.warn('⚠️ Immediate sync error:', error);
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
                // Restart polling
                if (this.restartPolling) {
                    this.restartPolling();
                }
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