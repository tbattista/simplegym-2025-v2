/**
 * Ghost Gym - Offcanvas Helper Functions
 * Core utilities for creating and managing Bootstrap 5 offcanvas components
 * 
 * @module offcanvas-helpers
 * @version 3.0.0
 * @date 2025-12-20
 */

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML string
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Create and show Bootstrap 5 offcanvas
 * Handles lifecycle, backdrop cleanup, and Bootstrap initialization
 * @param {string} id - Unique offcanvas ID
 * @param {string} html - Offcanvas HTML content
 * @param {Function} setupCallback - Optional callback(offcanvas, offcanvasElement)
 * @returns {Object} { offcanvas, offcanvasElement }
 */
export function createOffcanvas(id, html, setupCallback = null) {
    // Use the centralized manager if available
    if (window.offcanvasManager) {
        return window.offcanvasManager.create(id, html, setupCallback);
    }
    
    // Fallback to existing logic (for backward compatibility during migration)
    const existing = document.getElementById(id);
    if (existing) {
        // Properly dispose Bootstrap instance before removing
        const existingInstance = window.bootstrap.Offcanvas.getInstance(existing);
        if (existingInstance) {
            existingInstance.dispose();
        }
        existing.remove();
    }
    
    // Clean up orphaned backdrops only if no other offcanvases are showing
    const activeOffcanvases = document.querySelectorAll('.offcanvas.show, .offcanvas.showing');
    if (activeOffcanvases.length === 0) {
        const orphanedBackdrops = document.querySelectorAll('.offcanvas-backdrop');
        orphanedBackdrops.forEach(backdrop => {
            backdrop.remove();
        });
    }

    document.body.insertAdjacentHTML('beforeend', html);

    const offcanvasElement = document.getElementById(id);
    
    // Ensure element exists before Bootstrap initialization
    if (!offcanvasElement) {
        console.error('❌ Failed to create offcanvas element:', id);
        return null;
    }
    
    // CRITICAL FIX: Force scroll to false before Bootstrap initialization
    // This must be set on the element BEFORE creating the Bootstrap instance
    offcanvasElement.setAttribute('data-bs-scroll', 'false');
    
    // CRITICAL: Force a layout reflow before Bootstrap initialization
    // This ensures the element is fully rendered in the DOM
    void offcanvasElement.offsetHeight;
    
    // Wrap Bootstrap initialization in try-catch for graceful error handling
    let offcanvas;
    try {
        offcanvas = new window.bootstrap.Offcanvas(offcanvasElement, {
            scroll: false  // Explicitly disable scroll in options
        });
    } catch (error) {
        console.error('❌ Bootstrap Offcanvas initialization failed:', error);
        return null;
    }

    if (setupCallback) {
        setupCallback(offcanvas, offcanvasElement);
    }

    offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
        // Remove the offcanvas element
        offcanvasElement.remove();
        
        // Clean up lingering backdrops only if no other offcanvases remain
        setTimeout(() => {
            const remaining = document.querySelectorAll('.offcanvas.show, .offcanvas.showing');
            if (remaining.length === 0) {
                const backdrops = document.querySelectorAll('.offcanvas-backdrop');
                backdrops.forEach(backdrop => {
                    backdrop.remove();
                });
            }
        }, 50);
    });

    // CRITICAL FIX: Use double requestAnimationFrame + setTimeout for maximum stability
    // This prevents Bootstrap's scroll error: "Cannot read properties of null (reading 'scroll')"
    // AND eliminates the "jutter" effect (open → close → open)
    //
    // Why this approach?
    // - First RAF: Browser schedules next paint frame
    // - Second RAF: Ensures element is fully rendered and layout is complete
    // - setTimeout: Additional safety buffer for Bootstrap's internal setup
    // - This gives Bootstrap a completely stable DOM to work with
    //
    // The error occurs when Bootstrap tries to access scroll properties during transition
    // before the element is fully initialized in the DOM. This multi-step approach ensures
    // the element is completely settled before show() is called.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            setTimeout(() => {
                // Triple-check that everything is still valid before showing
                if (offcanvas && offcanvasElement && offcanvasElement.isConnected) {
                    try {
                        // Verify the Bootstrap instance is still valid
                        const currentInstance = window.bootstrap.Offcanvas.getInstance(offcanvasElement);
                        if (currentInstance === offcanvas) {
                            offcanvas.show();
                        } else {
                            console.warn('⚠️ Offcanvas instance mismatch, skipping show()');
                        }
                    } catch (showError) {
                        console.error('❌ Error showing offcanvas:', showError);
                    }
                }
            }, 10); // Increased delay from 0 to 10ms for more stability
        });
    });

    return { offcanvas, offcanvasElement };
}

/**
 * Force cleanup of all offcanvas backdrops
 * Utility method for debugging or emergency cleanup
 * Can be called from console: window.cleanupOffcanvasBackdrops()
 * @returns {number} Number of backdrops cleaned up
 */
export function forceCleanupBackdrops() {
    const backdrops = document.querySelectorAll('.offcanvas-backdrop');
    backdrops.forEach(backdrop => {
        backdrop.remove();
    });
    console.log(`🧹 Cleaned up ${backdrops.length} orphaned backdrop(s)`);
    return backdrops.length;
}

console.log('📦 Offcanvas helpers loaded');
