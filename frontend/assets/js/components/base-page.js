/**
 * Ghost Gym - BasePage Component
 * Common page initialization and state management
 * @version 1.0.0
 */

class GhostGymBasePage {
    constructor(options = {}) {
        this.options = {
            // Authentication
            requireAuth: false,
            redirectOnAuthFail: null,
            
            // Data loading
            autoLoad: true,
            loadingMessage: 'Loading...',
            
            // Error handling
            showErrorAlerts: true,
            errorContainer: null,
            
            // Callbacks
            onInit: null,
            onAuthStateChange: null,
            onDataLoad: null,
            onError: null,
            
            ...options
        };
        
        // State
        this.state = {};
        this.isLoading = false;
        this.isInitialized = false;
        this.authStateListener = null;
        
        // Start initialization
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log('🚀 BasePage: Initializing...');
            
            // Wait for Firebase to be ready
            await this.waitForFirebase();
            
            // Set up auth state listener
            this.setupAuthListener();
            
            // Check authentication if required
            if (this.options.requireAuth && !this.isAuthenticated()) {
                this.handleAuthRequired();
                return;
            }
            
            // Auto-load data if enabled
            if (this.options.autoLoad) {
                await this.loadData();
            }
            
            // Call custom init callback
            if (this.options.onInit) {
                await this.options.onInit(this);
            }
            
            this.isInitialized = true;
            console.log('✅ BasePage: Initialized successfully');
            
        } catch (error) {
            console.error('❌ BasePage: Initialization failed:', error);
            this.handleError(error);
        }
    }
    
    async waitForFirebase() {
        if (window.firebaseReady) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Firebase initialization timeout'));
            }, 10000); // 10 second timeout
            
            window.addEventListener('firebaseReady', () => {
                clearTimeout(timeout);
                resolve();
            }, { once: true });
        });
    }
    
    setupAuthListener() {
        if (!window.authService) {
            console.warn('⚠️ BasePage: Auth service not available');
            return;
        }
        
        this.authStateListener = window.authService.onAuthStateChange((user) => {
            this.handleAuthStateChange(user);
        });
    }
    
    handleAuthStateChange(user) {
        console.log('🔄 BasePage: Auth state changed', user ? 'authenticated' : 'not authenticated');
        
        // Update state
        this.setState({ user, isAuthenticated: !!user });
        
        // Call custom callback
        if (this.options.onAuthStateChange) {
            this.options.onAuthStateChange(user, this);
        }
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('basePageAuthChange', {
            detail: { user, isAuthenticated: !!user }
        }));
    }
    
    handleAuthRequired() {
        console.warn('⚠️ BasePage: Authentication required but user not authenticated');
        
        if (this.options.redirectOnAuthFail) {
            window.location.href = this.options.redirectOnAuthFail;
        } else {
            this.showError('Please sign in to access this page');
            
            // Show auth modal if available
            if (window.showAuthModal) {
                window.showAuthModal();
            }
        }
    }
    
    async loadData() {
        if (this.isLoading) {
            console.warn('⚠️ BasePage: Data loading already in progress');
            return;
        }
        
        try {
            this.isLoading = true;
            this.showLoading(true);
            
            console.log('📡 BasePage: Loading data...');
            
            // Call custom data load callback
            if (this.options.onDataLoad) {
                await this.options.onDataLoad(this);
            }
            
            console.log('✅ BasePage: Data loaded successfully');
            
        } catch (error) {
            console.error('❌ BasePage: Data loading failed:', error);
            this.handleError(error);
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }
    
    handleError(error) {
        console.error('❌ BasePage: Error:', error);
        
        // Call custom error callback
        if (this.options.onError) {
            this.options.onError(error, this);
        }
        
        // Show error alert
        if (this.options.showErrorAlerts) {
            this.showError(error.message || 'An error occurred');
        }
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('basePageError', {
            detail: { error }
        }));
    }
    
    showLoading(show) {
        // Override this method in subclass or use callback
        console.log(show ? '⏳ Loading...' : '✅ Loading complete');
    }
    
    showError(message) {
        if (this.options.errorContainer) {
            const container = document.getElementById(this.options.errorContainer);
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <i class="bx bx-error-circle me-2"></i>
                        ${message}
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                `;
                return;
            }
        }
        
        // Fallback to global alert if available
        if (window.showAlert) {
            window.showAlert(message, 'danger');
        } else {
            console.error('Error:', message);
        }
    }
    
    showSuccess(message) {
        if (window.showAlert) {
            window.showAlert(message, 'success');
        } else {
            console.log('Success:', message);
        }
    }
    
    // State Management
    
    setState(newState) {
        this.state = {
            ...this.state,
            ...newState
        };
        
        // Dispatch state change event
        window.dispatchEvent(new CustomEvent('basePageStateChange', {
            detail: { state: this.state }
        }));
    }
    
    getState(key = null) {
        if (key) {
            return this.state[key];
        }
        return this.state;
    }
    
    // Authentication Helpers
    
    isAuthenticated() {
        return !!(window.firebaseAuth?.currentUser || window.dataManager?.isAuthenticated);
    }
    
    getCurrentUser() {
        return window.firebaseAuth?.currentUser || window.dataManager?.currentUser || null;
    }
    
    async getAuthToken() {
        if (!this.isAuthenticated()) {
            throw new Error('User not authenticated');
        }
        
        if (window.dataManager?.getAuthToken) {
            return await window.dataManager.getAuthToken();
        }
        
        const user = this.getCurrentUser();
        if (user && user.getIdToken) {
            return await user.getIdToken();
        }
        
        throw new Error('Unable to get auth token');
    }
    
    // Data Manager Helpers
    
    getDataManager() {
        if (!window.dataManager) {
            throw new Error('Data manager not available');
        }
        return window.dataManager;
    }
    
    async getWorkouts(options = {}) {
        return await this.getDataManager().getWorkouts(options);
    }
    
    async getPrograms(options = {}) {
        return await this.getDataManager().getPrograms(options);
    }
    
    async createWorkout(workoutData) {
        return await this.getDataManager().createWorkout(workoutData);
    }
    
    async updateWorkout(workoutId, workoutData) {
        return await this.getDataManager().updateWorkout(workoutId, workoutData);
    }
    
    async deleteWorkout(workoutId) {
        return await this.getDataManager().deleteWorkout(workoutId);
    }
    
    async createProgram(programData) {
        return await this.getDataManager().createProgram(programData);
    }
    
    // API Helpers
    
    getApiUrl(path) {
        if (window.config?.api?.getUrl) {
            return window.config.api.getUrl(path);
        }
        
        if (window.getApiUrl) {
            return window.getApiUrl(path);
        }
        
        // Fallback
        return window.location.origin + path;
    }
    
    async apiRequest(url, options = {}) {
        try {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            // Add auth token if authenticated
            if (this.isAuthenticated()) {
                try {
                    const token = await this.getAuthToken();
                    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
                } catch (error) {
                    console.warn('⚠️ Could not get auth token:', error);
                }
            }
            
            const response = await fetch(url, {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...(options.headers || {})
                }
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.detail || error.message || `Request failed: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('❌ API request failed:', error);
            throw error;
        }
    }
    
    // Utility Methods
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            
            return date.toLocaleDateString();
        } catch (error) {
            return dateString;
        }
    }
    
    // Cleanup
    
    destroy() {
        // Remove auth listener
        if (this.authStateListener) {
            // Note: Actual implementation depends on auth service API
            console.log('🧹 BasePage: Cleaning up auth listener');
        }
        
        // Clear state
        this.state = {};
        this.isInitialized = false;
        
        console.log('🧹 BasePage: Destroyed');
    }
}

// Export for global use
window.GhostGymBasePage = GhostGymBasePage;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GhostGymBasePage;
}

console.log('📦 GhostGymBasePage component loaded');