/**
 * Menu Injection Service
 * Dynamically injects menu and modals into pages
 * Ensures consistent UI components across all pages
 */

class MenuInjectionService {
    constructor() {
        this.init();
    }
    
    /**
     * Initialize the service - must run BEFORE DOMContentLoaded to inject menu before menu.js initializes
     */
    init() {
        // Inject immediately if DOM is already interactive or complete
        if (document.readyState === 'interactive' || document.readyState === 'complete') {
            this.injectComponents();
        } else {
            // Otherwise inject as soon as DOM is interactive (before DOMContentLoaded)
            document.addEventListener('readystatechange', () => {
                if (document.readyState === 'interactive') {
                    this.injectComponents();
                }
            });
        }
    }
    
    /**
     * Inject all components (menu and modals)
     */
    injectComponents() {
        try {
            this.injectMenu();
            this.injectModals();
            console.log('✅ Menu and modals injected successfully');
            
            // Re-initialize menu functionality after injection
            this.reinitializeMenu();
        } catch (error) {
            console.error('❌ Error injecting components:', error);
        }
    }
    
    /**
     * Re-initialize menu functionality after injection
     * Dispatches event for main.js to handle Menu class initialization
     */
    reinitializeMenu() {
        // Dispatch event to notify that menu content is ready
        window.dispatchEvent(new CustomEvent('menuContentInjected'));
        console.log('✅ Menu content injected, initialization event dispatched');
        
        // Re-attach menu toggle listeners
        // Small delay to ensure Menu class has initialized
        setTimeout(() => {
            const menuToggler = document.querySelectorAll('.layout-menu-toggle');
            menuToggler.forEach(item => {
                // Remove old listeners by cloning
                const newItem = item.cloneNode(true);
                item.parentNode.replaceChild(newItem, item);
                
                // Add fresh listener
                newItem.addEventListener('click', event => {
                    event.preventDefault();
                    if (window.Helpers && window.Helpers.toggleCollapsed) {
                        window.Helpers.toggleCollapsed();
                    } else {
                        console.warn('⚠️ Helpers.toggleCollapsed not available');
                    }
                });
            });
            
            console.log('✅ Menu toggle listeners re-attached');
        }, 150); // Slightly longer delay to ensure Menu is fully initialized
    }

    }
    
    /**
     * Inject the menu into the layout-menu container
     */
    injectMenu() {
        const menuContainer = document.getElementById('layout-menu');
        
        if (!menuContainer) {
            console.warn('⚠️ Menu container (#layout-menu) not found');
            return;
        }
        
        if (!window.getMenuHTML) {
            console.error('❌ getMenuHTML function not available. Make sure menu-template.js is loaded first.');
            return;
        }
        
        // Determine active page from URL
        const activePage = this.getActivePageFromURL();
        
        // Inject menu HTML
        menuContainer.innerHTML = window.getMenuHTML(activePage);
        
        console.log(`✅ Menu injected with active page: ${activePage}`);
    }
    
    /**
     * Inject modals at the end of the body
     */
    injectModals() {
        if (!window.getAuthModalsHTML) {
            console.error('❌ getAuthModalsHTML function not available. Make sure auth-modals-template.js is loaded first.');
            return;
        }
        
        // Check if modals are already injected
        if (document.getElementById('authModal')) {
            console.log('ℹ️ Modals already injected, skipping');
            return;
        }
        
        // Inject modals at end of body
        document.body.insertAdjacentHTML('beforeend', window.getAuthModalsHTML());
        
        console.log('✅ Authentication modals injected');
    }
    
    /**
     * Determine the active page from the current URL
     * @returns {string} The active page identifier
     */
    getActivePageFromURL() {
        const path = window.location.pathname;
        
        // Extract filename from path
        const filename = path.split('/').pop() || 'builder.html';
        
        // Map filenames to page identifiers
        if (filename.includes('builder')) return 'builder';
        if (filename.includes('programs')) return 'programs';
        if (filename.includes('workouts')) return 'workouts';
        if (filename.includes('exercise-database')) return 'exercises';
        
        // Default to builder
        return 'builder';
    }
}

// Initialize immediately when script loads
new MenuInjectionService();