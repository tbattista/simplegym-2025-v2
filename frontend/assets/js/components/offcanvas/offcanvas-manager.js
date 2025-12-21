/**
 * Ghost Gym - Offcanvas Manager
 * Centralized offcanvas lifecycle management
 * Similar pattern to GhostGymModalManager
 * @version 1.0.0
 */

class OffcanvasManager {
    constructor() {
        this.instances = new Map();
        this.instanceCounter = 0;
    }

    /**
     * Create and show an offcanvas
     * @param {string} id - Unique offcanvas ID
     * @param {string} html - Offcanvas HTML content
     * @param {Function} setupCallback - Optional setup callback (offcanvas, element) => void
     * @returns {Object} { offcanvas, offcanvasElement }
     */
    create(id, html, setupCallback = null) {
        // Clean up existing instance if present
        this.destroy(id);
        
        // Clean up orphaned backdrops
        this.cleanupBackdrops();

        // Insert HTML into DOM
        document.body.insertAdjacentHTML('beforeend', html);
        const offcanvasElement = document.getElementById(id);

        if (!offcanvasElement) {
            console.error('❌ Failed to create offcanvas element:', id);
            return null;
        }

        // Force scroll to false before Bootstrap initialization
        offcanvasElement.setAttribute('data-bs-scroll', 'false');
        
        // Force layout reflow
        void offcanvasElement.offsetHeight;

        // Initialize Bootstrap Offcanvas
        let offcanvas;
        try {
            offcanvas = new window.bootstrap.Offcanvas(offcanvasElement, {
                scroll: false
            });
        } catch (error) {
            console.error('❌ Bootstrap Offcanvas initialization failed:', error);
            return null;
        }

        // Store instance
        this.instances.set(id, { offcanvas, offcanvasElement, setupCallback });

        // Run setup callback
        if (setupCallback) {
            setupCallback(offcanvas, offcanvasElement);
        }

        // Setup cleanup on hide
        offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
            this.destroy(id);
        });

        // Show with proper timing (prevents jutter)
        this._showWithTiming(offcanvas, offcanvasElement);

        return { offcanvas, offcanvasElement };
    }

    /**
     * Show offcanvas with proper timing to prevent Bootstrap errors
     * @private
     */
    _showWithTiming(offcanvas, offcanvasElement) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    if (offcanvas && offcanvasElement && offcanvasElement.isConnected) {
                        try {
                            const currentInstance = window.bootstrap.Offcanvas.getInstance(offcanvasElement);
                            if (currentInstance === offcanvas) {
                                offcanvas.show();
                            }
                        } catch (error) {
                            console.error('❌ Error showing offcanvas:', error);
                        }
                    }
                }, 10);
            });
        });
    }

    /**
     * Hide an offcanvas by ID
     * @param {string} id - Offcanvas ID
     */
    hide(id) {
        const instance = this.instances.get(id);
        if (instance?.offcanvas) {
            instance.offcanvas.hide();
        }
    }

    /**
     * Destroy an offcanvas instance
     * @param {string} id - Offcanvas ID
     */
    destroy(id) {
        const instance = this.instances.get(id);
        if (instance) {
            try {
                const bsInstance = window.bootstrap.Offcanvas.getInstance(instance.offcanvasElement);
                if (bsInstance) {
                    bsInstance.dispose();
                }
            } catch (error) {
                // Ignore disposal errors
            }
            
            instance.offcanvasElement?.remove();
            this.instances.delete(id);
        }
        
        // Also check for orphaned elements
        const orphaned = document.getElementById(id);
        if (orphaned) {
            orphaned.remove();
        }
        
        // Clean up backdrops
        setTimeout(() => this.cleanupBackdrops(), 50);
    }

    /**
     * Clean up orphaned backdrops
     */
    cleanupBackdrops() {
        const backdrops = document.querySelectorAll('.offcanvas-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        return backdrops.length;
    }

    /**
     * Check if an offcanvas exists
     * @param {string} id - Offcanvas ID
     * @returns {boolean}
     */
    exists(id) {
        return this.instances.has(id);
    }

    /**
     * Get an offcanvas instance
     * @param {string} id - Offcanvas ID
     * @returns {Object|null}
     */
    get(id) {
        return this.instances.get(id) || null;
    }

    /**
     * Get all active offcanvas IDs
     * @returns {Array<string>}
     */
    getActiveIds() {
        return Array.from(this.instances.keys());
    }

    /**
     * Destroy all offcanvas instances
     */
    destroyAll() {
        this.instances.forEach((_, id) => this.destroy(id));
    }
}

// Create singleton instance
const offcanvasManager = new OffcanvasManager();

// Export to window
window.OffcanvasManager = OffcanvasManager;
window.offcanvasManager = offcanvasManager;

// Expose cleanup utility for debugging
window.cleanupOffcanvasBackdrops = () => offcanvasManager.cleanupBackdrops();

console.log('📦 OffcanvasManager loaded');
