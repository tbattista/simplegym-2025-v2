/**
 * Migration UI Manager for Ghost Gym V3 Phase 2
 * Handles user interface for data migration from anonymous to authenticated accounts
 *
 * ⚠️ DISABLED - Migration modal removed per user request
 * This file is kept for reference but functionality is disabled
 */

class MigrationUIManager {
    constructor() {
        this.migrationModal = null;
        this.progressModal = null;
        this.isReady = false;
        this.migrationInProgress = false;
        this.migrationCompleted = false;
        this.migrationDismissed = false;
        
        // Load previous migration state
        this.loadMigrationState();
        
        // ⚠️ DISABLED - Do not initialize
        // Initialize when DOM is ready
        // if (document.readyState === 'loading') {
        //     document.addEventListener('DOMContentLoaded', () => this.initialize());
        // } else {
        //     this.initialize();
        // }
        console.log('⚠️ Migration UI Manager is disabled');
    }
    
    loadMigrationState() {
        try {
            const state = localStorage.getItem('migration_state');
            if (state) {
                const parsed = JSON.parse(state);
                this.migrationCompleted = parsed.completed || false;
                this.migrationDismissed = parsed.dismissed || false;
                
                // Reset dismissed state after 7 days (in case user changes mind)
                if (parsed.timestamp && (Date.now() - parsed.timestamp) > 7 * 24 * 60 * 60 * 1000) {
                    this.migrationDismissed = false;
                }
            }
        } catch (error) {
            console.error('Error loading migration state:', error);
        }
    }
    
    saveMigrationState() {
        try {
            localStorage.setItem('migration_state', JSON.stringify({
                completed: this.migrationCompleted,
                dismissed: this.migrationDismissed,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Error saving migration state:', error);
        }
    }
    
    initialize() {
        // ⚠️ DISABLED
        // this.setupModals();
        // this.setupEventListeners();
        this.isReady = false;
        console.log('⚠️ Migration UI Manager is disabled - no initialization');
    }
    
    setupModals() {
        // Set up existing upgrade modal for migration prompts
        const upgradeModal = document.getElementById('upgradeModal');
        if (upgradeModal && window.bootstrap) {
            this.migrationModal = new bootstrap.Modal(upgradeModal);
        }
        
        // Create progress modal if it doesn't exist
        this.createProgressModal();
    }
    
    createProgressModal() {
        // Check if progress modal already exists
        if (document.getElementById('migrationProgressModal')) {
            return;
        }
        
        const progressModalHtml = `
            <div class="modal fade" id="migrationProgressModal" tabindex="-1" aria-labelledby="migrationProgressLabel" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header border-0">
                            <h5 class="modal-title" id="migrationProgressLabel">
                                <i class="bi bi-cloud-arrow-up me-2"></i>
                                Migrating Your Data
                            </h5>
                        </div>
                        
                        <div class="modal-body text-center">
                            <div class="mb-4">
                                <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                                    <span class="visually-hidden">Migrating...</span>
                                </div>
                            </div>
                            
                            <h6 id="migrationProgressTitle">Preparing migration...</h6>
                            <p class="text-muted mb-4" id="migrationProgressDescription">
                                Please wait while we transfer your data to the cloud.
                            </p>
                            
                            <div class="progress mb-3" style="height: 8px;">
                                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                     role="progressbar" id="migrationProgressBar" 
                                     style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                                </div>
                            </div>
                            
                            <small class="text-muted" id="migrationProgressDetails">
                                Initializing...
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', progressModalHtml);
        this.progressModal = new bootstrap.Modal(document.getElementById('migrationProgressModal'));
    }
    
    setupEventListeners() {
        // ⚠️ DISABLED - Do not listen for auth changes
        // Listen for auth state changes to trigger migration prompts
        // window.addEventListener('authStateChanged', (event) => {
        //     this.handleAuthStateChange(event.detail);
        // });
        
        // Set up migration buttons in upgrade modal
        const upgradeCreateBtn = document.getElementById('upgradeCreateAccountBtn');
        const upgradeSignInBtn = document.getElementById('upgradeSignInBtn');
        
        if (upgradeCreateBtn) {
            upgradeCreateBtn.addEventListener('click', () => this.handleMigrationRequest('create'));
        }
        
        if (upgradeSignInBtn) {
            upgradeSignInBtn.addEventListener('click', () => this.handleMigrationRequest('signin'));
        }
        
        // Track modal dismissal
        const upgradeModal = document.getElementById('upgradeModal');
        if (upgradeModal) {
            upgradeModal.addEventListener('hidden.bs.modal', () => {
                if (!this.migrationInProgress) {
                    this.migrationDismissed = true;
                    this.saveMigrationState();
                    console.log('📝 Migration prompt dismissed by user');
                }
            });
        }
    }
    
    handleAuthStateChange(authData) {
        const { user, isAuthenticated } = authData;
        
        // Only check migration for authenticated users
        if (isAuthenticated && user && !this.migrationInProgress) {
            // Prevent checking on every page load - use session storage
            const lastAuthCheck = sessionStorage.getItem('last_auth_check');
            const now = Date.now();
            
            // Only check once per session (or after 1 minute)
            if (!lastAuthCheck || (now - parseInt(lastAuthCheck)) > 60000) {
                sessionStorage.setItem('last_auth_check', now.toString());
                
                // Only proceed if not already handled
                if (!this.migrationCompleted && !this.migrationDismissed) {
                    setTimeout(() => this.checkMigrationNeeded(), 1000);
                }
            }
        }
    }
    
    async checkMigrationNeeded() {
        try {
            // Skip if already handled
            if (this.migrationCompleted || this.migrationDismissed) {
                console.log('⏭️ Migration already handled, skipping check');
                return;
            }
            
            // Check if user has local data that could be migrated
            const localPrograms = this.getLocalStorageData('gym_programs');
            const localWorkouts = this.getLocalStorageData('gym_workouts');
            
            if (localPrograms.length === 0 && localWorkouts.length === 0) {
                console.log('⏭️ No local data to migrate');
                return;
            }
            
            // Check if data already exists in cloud
            const cloudData = await this.getCloudData();
            const hasNewLocalData = this.hasDataNotInCloud(
                localPrograms,
                localWorkouts,
                cloudData
            );
            
            if (!hasNewLocalData) {
                console.log('⏭️ All local data already in cloud');
                this.migrationCompleted = true;
                this.saveMigrationState();
                return;
            }
            
            // Check migration eligibility via API
            const eligibility = await this.checkMigrationEligibility();
            
            if (eligibility.eligible) {
                this.showMigrationPrompt(localPrograms.length, localWorkouts.length);
            }
        } catch (error) {
            console.error('❌ Error checking migration need:', error);
        }
    }
    
    hasDataNotInCloud(localPrograms, localWorkouts, cloudData) {
        const cloudProgramIds = new Set(cloudData.programs.map(p => p.id));
        const cloudWorkoutIds = new Set(cloudData.workouts.map(w => w.id));
        
        const newPrograms = localPrograms.filter(p => !cloudProgramIds.has(p.id));
        const newWorkouts = localWorkouts.filter(w => !cloudWorkoutIds.has(w.id));
        
        console.log(`📊 Migration check: ${newPrograms.length} new programs, ${newWorkouts.length} new workouts`);
        
        return newPrograms.length > 0 || newWorkouts.length > 0;
    }
    
    async getCloudData() {
        try {
            const token = await window.dataManager.getAuthToken();
            const [programsRes, workoutsRes] = await Promise.all([
                fetch(getApiUrl('/api/v3/user/programs'), {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(getApiUrl('/api/v3/user/workouts'), {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);
            
            const programs = programsRes.ok ? (await programsRes.json()).programs || [] : [];
            const workouts = workoutsRes.ok ? (await workoutsRes.json()).workouts || [] : [];
            
            return { programs, workouts };
        } catch (error) {
            console.error('Error fetching cloud data:', error);
            return { programs: [], workouts: [] };
        }
    }
    
    async checkMigrationEligibility() {
        try {
            const token = await window.dataManager.getAuthToken();
            const response = await fetch(getApiUrl('/api/v3/migration/eligibility'), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to check migration eligibility');
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ Error checking migration eligibility:', error);
            return { eligible: false, reason: 'API error' };
        }
    }
    
    getLocalStorageData(key) {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error(`❌ Error reading ${key} from localStorage:`, error);
            return [];
        }
    }
    
    showMigrationPrompt(programCount, workoutCount) {
        const upgradeModal = document.getElementById('upgradeModal');
        if (!upgradeModal) {
            console.warn('⚠️ Upgrade modal not found');
            return;
        }
        
        // Update modal content with actual data counts
        const modalBody = upgradeModal.querySelector('.modal-body');
        if (modalBody) {
            const dataInfo = modalBody.querySelector('p');
            if (dataInfo) {
                dataInfo.textContent = `We found ${programCount} programs and ${workoutCount} workouts that can be synced to the cloud for access from any device.`;
            }
        }
        
        // Show the modal
        if (this.migrationModal) {
            this.migrationModal.show();
        }
    }
    
    handleMigrationRequest(action) {
        if (action === 'create') {
            // User wants to create account and migrate
            this.startMigrationFlow();
        } else if (action === 'signin') {
            // User already has account, just migrate
            this.startMigrationFlow();
        }
    }
    
    async startMigrationFlow() {
        if (this.migrationInProgress) {
            console.warn('⚠️ Migration already in progress');
            return;
        }
        
        try {
            this.migrationInProgress = true;
            
            // Hide upgrade modal
            if (this.migrationModal) {
                this.migrationModal.hide();
            }
            
            // Show progress modal
            this.showProgressModal();
            
            // Execute migration
            await this.executeMigration();
            
        } catch (error) {
            console.error('❌ Migration flow failed:', error);
            this.showMigrationError(error.message);
        } finally {
            this.migrationInProgress = false;
        }
    }
    
    showProgressModal() {
        if (this.progressModal) {
            this.updateProgress(0, 'Preparing migration...', 'Gathering your data...');
            this.progressModal.show();
        }
    }
    
    updateProgress(percentage, title, description) {
        const progressBar = document.getElementById('migrationProgressBar');
        const progressTitle = document.getElementById('migrationProgressTitle');
        const progressDescription = document.getElementById('migrationProgressDescription');
        const progressDetails = document.getElementById('migrationProgressDetails');
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            progressBar.setAttribute('aria-valuenow', percentage.toString());
        }
        
        if (progressTitle) {
            progressTitle.textContent = title;
        }
        
        if (progressDescription) {
            progressDescription.textContent = description;
        }
        
        if (progressDetails) {
            progressDetails.textContent = `${percentage}% complete`;
        }
    }
    
    async executeMigration() {
        try {
            // Step 1: Prepare migration data
            this.updateProgress(10, 'Preparing data...', 'Reading your local programs and workouts...');
            
            const preparationResult = await this.prepareMigrationData();
            if (!preparationResult.success) {
                throw new Error(preparationResult.error);
            }
            
            // Step 2: Validate data
            this.updateProgress(30, 'Validating data...', 'Checking data integrity...');
            
            const { programs, workouts } = preparationResult;
            
            // Step 3: Execute migration
            this.updateProgress(50, 'Uploading to cloud...', `Migrating ${programs.length} programs and ${workouts.length} workouts...`);
            
            const migrationResult = await this.executeMigrationAPI(programs, workouts);
            
            if (!migrationResult.success) {
                throw new Error(migrationResult.error);
            }
            
            // Step 4: Verify migration
            this.updateProgress(80, 'Verifying migration...', 'Ensuring all data transferred correctly...');
            
            await this.verifyMigration();
            
            // Step 5: Complete
            this.updateProgress(100, 'Migration complete!', 'Your data is now synced to the cloud.');
            
            // Show success and close modal
            setTimeout(() => {
                this.showMigrationSuccess(migrationResult);
                this.hideProgressModal();
            }, 2000);
            
        } catch (error) {
            console.error('❌ Migration execution failed:', error);
            this.showMigrationError(error.message);
            this.hideProgressModal();
        }
    }
    
    async prepareMigrationData() {
        try {
            const programs = this.getLocalStorageData('gym_programs');
            const workouts = this.getLocalStorageData('gym_workouts');
            
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
    
    async executeMigrationAPI(programs, workouts) {
        try {
            const token = await window.dataManager.getAuthToken();
            const response = await fetch(getApiUrl('/api/v3/migration/execute'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    programs: programs,
                    workouts: workouts,
                    options: {
                        clear_local_after_success: false // Keep local data for safety
                    }
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Migration API call failed');
            }
            
            return await response.json();
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async verifyMigration() {
        try {
            // Verify by fetching data from the cloud
            const token = await window.dataManager.getAuthToken();
            
            const [programsResponse, workoutsResponse] = await Promise.all([
                fetch(getApiUrl('/api/v3/user/programs'), {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(getApiUrl('/api/v3/user/workouts'), {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);
            
            if (!programsResponse.ok || !workoutsResponse.ok) {
                throw new Error('Failed to verify migrated data');
            }
            
            const programsData = await programsResponse.json();
            const workoutsData = await workoutsResponse.json();
            
            console.log(`✅ Migration verified: ${programsData.programs?.length || 0} programs, ${workoutsData.workouts?.length || 0} workouts`);
            
            return true;
        } catch (error) {
            console.error('❌ Migration verification failed:', error);
            throw error;
        }
    }
    
    showMigrationSuccess(result) {
        const message = `🎉 Migration successful! ${result.migrated_programs} programs and ${result.migrated_workouts} workouts are now synced to the cloud.`;
        
        // Mark migration as completed
        this.migrationCompleted = true;
        this.saveMigrationState();
        
        if (window.dashboard && window.dashboard.showAlert) {
            window.dashboard.showAlert(message, 'success');
        }
        
        // Refresh dashboard to show cloud data
        if (window.dashboard && window.dashboard.loadInitialData) {
            setTimeout(() => {
                window.dashboard.loadInitialData();
            }, 1000);
        }
        
        // Optionally prompt to clear local storage
        setTimeout(() => {
            this.promptClearLocalStorage();
        }, 3000);
    }
    
    showMigrationError(error) {
        const message = `❌ Migration failed: ${error}. Your local data is safe and unchanged.`;
        
        if (window.dashboard && window.dashboard.showAlert) {
            window.dashboard.showAlert(message, 'danger');
        }
        
        console.error('❌ Migration error:', error);
    }
    
    promptClearLocalStorage() {
        const shouldClear = confirm(
            'Migration completed successfully! Would you like to clear your local storage to avoid duplicates?\n\n' +
            'Your data is now safely stored in the cloud and will sync across all your devices.'
        );
        
        if (shouldClear) {
            this.clearLocalStorage();
        }
    }
    
    clearLocalStorage() {
        try {
            localStorage.removeItem('gym_programs');
            localStorage.removeItem('gym_workouts');
            
            const message = '🧹 Local storage cleared. Your data is now exclusively in the cloud.';
            if (window.dashboard && window.dashboard.showAlert) {
                window.dashboard.showAlert(message, 'info');
            }
            
            console.log('🧹 Local storage cleared after migration');
        } catch (error) {
            console.error('❌ Error clearing local storage:', error);
        }
    }
    
    hideProgressModal() {
        if (this.progressModal) {
            this.progressModal.hide();
        }
    }
    
    // Public API for manual migration triggers
    
    async triggerMigration() {
        if (!window.dataManager.isUserAuthenticated()) {
            throw new Error('User must be authenticated to migrate data');
        }
        
        await this.startMigrationFlow();
    }
    
    async getMigrationStatus() {
        try {
            if (!window.dataManager.isUserAuthenticated()) {
                return { status: 'not_authenticated' };
            }
            
            const token = await window.dataManager.getAuthToken();
            const response = await fetch(getApiUrl('/api/v3/migration/status'), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to get migration status');
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ Error getting migration status:', error);
            return { status: 'error', error: error.message };
        }
    }
    
    // Utility methods
    
    showMigrationOption() {
        // Show migration option in UI (e.g., in user menu)
        const userMenu = document.querySelector('.auth-sign-out .dropdown-menu');
        if (userMenu && !document.getElementById('migrationMenuItem')) {
            const migrationItem = document.createElement('li');
            migrationItem.innerHTML = `
                <a class="dropdown-item" href="#" id="migrationMenuItem">
                    <i class="bi bi-cloud-arrow-up me-2"></i>
                    Migrate Local Data
                </a>
            `;
            
            // Insert before the divider
            const divider = userMenu.querySelector('.dropdown-divider');
            if (divider) {
                userMenu.insertBefore(migrationItem, divider);
            } else {
                userMenu.appendChild(migrationItem);
            }
            
            // Add click listener
            document.getElementById('migrationMenuItem').addEventListener('click', (e) => {
                e.preventDefault();
                this.triggerMigration();
            });
        }
    }
    
    hideMigrationOption() {
        const migrationItem = document.getElementById('migrationMenuItem');
        if (migrationItem) {
            migrationItem.remove();
        }
    }
    
    // Status indicator methods
    
    addSyncStatusIndicator() {
        // Add sync status indicator to header
        const header = document.querySelector('.v3-header .col-md-6.text-md-end');
        if (header && !document.getElementById('syncStatusIndicator')) {
            const statusHtml = `
                <div id="syncStatusIndicator" class="sync-status-indicator me-3 d-inline-block">
                    <small class="text-muted">
                        <i class="bi bi-circle-fill sync-status-icon me-1"></i>
                        <span class="sync-status-text">Offline</span>
                    </small>
                </div>
            `;
            
            header.insertAdjacentHTML('afterbegin', statusHtml);
        }
    }
    
    updateSyncStatus(status) {
        const indicator = document.getElementById('syncStatusIndicator');
        if (!indicator) {
            return;
        }
        
        const icon = indicator.querySelector('.sync-status-icon');
        const text = indicator.querySelector('.sync-status-text');
        
        // Remove all status classes
        indicator.classList.remove('sync-disconnected', 'sync-syncing', 'sync-synced', 'sync-error', 'sync-offline');
        
        // Add current status class
        indicator.classList.add(`sync-${status}`);
        
        // Update icon and text
        const statusConfig = {
            'disconnected': { icon: 'bi-circle', text: 'Offline', color: 'text-muted' },
            'syncing': { icon: 'bi-arrow-repeat', text: 'Syncing...', color: 'text-warning' },
            'synced': { icon: 'bi-check-circle-fill', text: 'Synced', color: 'text-success' },
            'error': { icon: 'bi-exclamation-triangle-fill', text: 'Sync Error', color: 'text-danger' },
            'offline': { icon: 'bi-wifi-off', text: 'Offline', color: 'text-muted' }
        };
        
        const config = statusConfig[status] || statusConfig['offline'];
        
        if (icon) {
            icon.className = `bi ${config.icon} sync-status-icon me-1 ${config.color}`;
        }
        
        if (text) {
            text.textContent = config.text;
            text.className = `sync-status-text ${config.color}`;
        }
    }
}

// ⚠️ DISABLED - Do not create instance
// Create global migration UI manager instance
// window.migrationUI = new MigrationUIManager();

// Listen for sync status changes
// window.addEventListener('syncStatusChanged', (event) => {
//     if (window.migrationUI) {
//         window.migrationUI.updateSyncStatus(event.detail.status);
//     }
// });

console.log('⚠️ Migration UI Manager disabled - modal functionality removed');

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MigrationUIManager;
}