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
     * Initialize the service
     */
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.injectComponents());
        } else {
            this.injectComponents();
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
        } catch (error) {
            console.error('❌ Error injecting components:', error);
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