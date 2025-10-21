/**
 * Ghost Gym - Page Initializer
 * Simplified page initialization using component registry
 * Provides declarative API for setting up pages with components
 * @version 1.0.0
 */

class PageInitializer {
    /**
     * Create a new page initializer
     * @param {string} pageName - Name of the page for logging
     */
    constructor(pageName) {
        this.pageName = pageName;
        this.components = [];
        this.config = {
            waitForFirebase: true,
            validateDependencies: true,
            showLoadingState: true,
            onError: null,
            onSuccess: null
        };
    }
    
    /**
     * Add a component to the page
     * @param {string} componentName - Name of registered component
     * @param {string} containerId - DOM container ID
     * @param {Object} options - Component-specific options
     * @returns {PageInitializer} This instance for chaining
     */
    addComponent(componentName, containerId, options = {}) {
        this.components.push({ componentName, containerId, options });
        return this;
    }
    
    /**
     * Configure page initialization behavior
     * @param {Object} config - Configuration options
     * @param {boolean} config.waitForFirebase - Wait for Firebase before initializing
     * @param {boolean} config.validateDependencies - Validate dependencies before mounting
     * @param {boolean} config.showLoadingState - Show loading indicators
     * @param {Function} config.onError - Error callback
     * @param {Function} config.onSuccess - Success callback
     * @returns {PageInitializer} This instance for chaining
     */
    configure(config) {
        this.config = { ...this.config, ...config };
        return this;
    }
    
    /**
     * Initialize the page and mount all components
     * @returns {Promise<void>}
     */
    async init() {
        console.log(`🚀 Initializing ${this.pageName} Page`);
        console.log(`📋 Components to mount: ${this.components.length}`);
        
        try {
            // Wait for Firebase if configured
            if (this.config.waitForFirebase) {
                await this.waitForFirebase();
            }
            
            // Show loading state
            if (this.config.showLoadingState) {
                this.showLoading(true);
            }
            
            // Validate component registry exists
            if (!window.componentRegistry) {
                throw new Error('Component Registry not available. Ensure component-registry.js is loaded.');
            }
            
            // Mount all components sequentially
            const mountedInstances = [];
            for (const comp of this.components) {
                try {
                    console.log(`🔧 Mounting ${comp.componentName}...`);
                    const instanceId = await window.componentRegistry.mount(
                        comp.componentName,
                        comp.containerId,
                        comp.options
                    );
                    mountedInstances.push(instanceId);
                } catch (error) {
                    console.error(`❌ Failed to mount ${comp.componentName}:`, error);
                    // Continue with other components even if one fails
                    this.showComponentError(comp.containerId, error.message);
                }
            }
            
            console.log(`✅ ${this.pageName} Page initialized successfully`);
            console.log(`📊 Mounted ${mountedInstances.length}/${this.components.length} components`);
            
            // Call success callback if provided
            if (this.config.onSuccess) {
                this.config.onSuccess(mountedInstances);
            }
            
        } catch (error) {
            console.error(`❌ Error initializing ${this.pageName}:`, error);
            this.showError(error.message);
            
            // Call error callback if provided
            if (this.config.onError) {
                this.config.onError(error);
            }
            
            throw error;
        } finally {
            // Hide loading state
            if (this.config.showLoadingState) {
                this.showLoading(false);
            }
        }
    }
    
    /**
     * Wait for Firebase to be ready
     * @returns {Promise<void>}
     */
    waitForFirebase() {
        return new Promise((resolve) => {
            if (window.firebaseReady) {
                console.log('✅ Firebase already ready');
                resolve();
            } else {
                console.log('⏳ Waiting for Firebase...');
                window.addEventListener('firebaseReady', () => {
                    console.log('✅ Firebase ready');
                    resolve();
                });
            }
        });
    }
    
    /**
     * Show/hide loading state
     * @param {boolean} show - Whether to show loading
     */
    showLoading(show) {
        // Find all loading indicators
        const loadingElements = document.querySelectorAll('.spinner-border, [role="status"]');
        
        if (show) {
            console.log('⏳ Loading...');
            loadingElements.forEach(el => {
                el.style.display = '';
            });
        } else {
            console.log('✅ Loading complete');
            loadingElements.forEach(el => {
                el.style.display = 'none';
            });
        }
    }
    
    /**
     * Show error message to user
     * @param {string} message - Error message
     */
    showError(message) {
        console.error('❌ Page Error:', message);
        
        // Try to show alert if showAlert function exists
        if (typeof window.showAlert === 'function') {
            window.showAlert(`Error initializing page: ${message}`, 'danger');
        } else {
            // Fallback to browser alert
            alert(`Error: ${message}\n\nPlease refresh the page and try again.`);
        }
    }
    
    /**
     * Show error in specific component container
     * @param {string} containerId - Container ID
     * @param {string} message - Error message
     */
    showComponentError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <div class="d-flex align-items-center">
                        <i class="bx bx-error-circle me-2" style="font-size: 1.5rem;"></i>
                        <div>
                            <h6 class="mb-1">Component Error</h6>
                            <p class="mb-0">${this.escapeHtml(message)}</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Refresh all components on the page
     * @returns {Promise<void>}
     */
    async refresh() {
        console.log(`🔄 Refreshing ${this.pageName} Page`);
        
        // Get all active instances for this page
        const instances = window.componentRegistry.getActiveInstances();
        
        for (const instance of instances) {
            try {
                await window.componentRegistry.refresh(instance.id);
            } catch (error) {
                console.error(`❌ Error refreshing ${instance.component}:`, error);
            }
        }
        
        console.log(`✅ ${this.pageName} Page refreshed`);
    }
    
    /**
     * Get initialization statistics
     * @returns {Object} Statistics about the page
     */
    getStats() {
        return {
            pageName: this.pageName,
            componentsConfigured: this.components.length,
            activeInstances: window.componentRegistry?.getActiveInstances().length || 0,
            config: this.config
        };
    }
}

// Make PageInitializer available globally
window.PageInitializer = PageInitializer;

console.log('📦 Page Initializer loaded');