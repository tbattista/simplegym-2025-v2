/**
 * Ghost Gym Menu Navigation System
 * Handles SPA-style navigation between dashboard sections
 */

class MenuNavigation {
    constructor() {
        this.currentSection = 'builder';
        this.sections = {
            builder: {
                view: 'builderView',
                title: 'Builder'
            },
            programs: {
                view: 'programsView',
                title: 'My Programs'
            },
            workouts: {
                view: 'workoutsView',
                title: 'Workout Library'
            },
            exercises: {
                view: 'exercisesView',
                title: 'Exercise Database'
            },
            backup: {
                action: 'showBackupModal',
                title: 'Backup & Export'
            },
            settings: {
                action: 'showSettingsModal',
                title: 'Settings'
            }
        };
        
        this.init();
    }
    
    init() {
        // Attach click handlers to menu items
        document.querySelectorAll('.menu-item[data-section]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.navigate(section);
            });
        });
        
        // Handle browser back/forward
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            if (hash && this.sections[hash]) {
                this.navigate(hash, false);
            }
        });
        
        // Load initial section from URL hash
        const initialHash = window.location.hash.slice(1);
        if (initialHash && this.sections[initialHash]) {
            this.navigate(initialHash, false);
        }
    }
    
    navigate(section, updateHash = true) {
        if (!this.sections[section]) {
            console.error(`Unknown section: ${section}`);
            return;
        }
        
        const config = this.sections[section];
        
        // Handle special actions (modals)
        if (config.action) {
            this[config.action]();
            return;
        }
        
        // Update current section
        this.currentSection = section;
        
        // Update URL hash
        if (updateHash) {
            window.location.hash = section;
        }
        
        // Update active menu item
        this.updateActiveMenuItem(section);
        
        // Show view
        if (config.view && typeof showView === 'function') {
            showView(section);
        }
        
        // Update page title
        document.title = `${config.title} - Ghost Gym`;
    }
    
    updateActiveMenuItem(section) {
        // Remove active class from all menu items
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to current section
        const activeItem = document.querySelector(`.menu-item[data-section="${section}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }
    
    showBackupModal() {
        // Trigger existing backup functionality
        const backupBtn = document.getElementById('backupBtn');
        if (backupBtn) {
            backupBtn.click();
        } else {
            console.warn('Backup button not found');
        }
    }
    
    showSettingsModal() {
        // Create and show settings modal
        // TODO: Implement settings modal
        alert('Settings panel coming soon!');
    }
}

// Initialize menu navigation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.menuNavigation = new MenuNavigation();
    });
} else {
    window.menuNavigation = new MenuNavigation();
}