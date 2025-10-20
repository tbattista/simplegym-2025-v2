/**
 * Ghost Gym Menu Navigation System
 * Handles SPA-style navigation between dashboard sections
 * @version 2.0 - Enhanced with view/modal type distinction
 */

class MenuNavigation {
    constructor() {
        this.currentSection = 'builder';
        this.previousSection = null;
        this.sections = {
            builder: {
                view: 'builderView',
                title: 'Builder',
                type: 'view',
                icon: 'bx-layer'
            },
            programs: {
                view: 'programsView',
                title: 'My Programs',
                type: 'view',
                icon: 'bx-folder'
            },
            workouts: {
                view: 'workoutsView',
                title: 'Workout Library',
                type: 'view',
                icon: 'bx-dumbbell'
            },
            exercises: {
                view: 'exercisesView',
                title: 'Exercise Database',
                type: 'view',
                icon: 'bx-book-content'
            },
            backup: {
                action: 'showBackupModal',
                title: 'Backup & Export',
                type: 'modal',
                icon: 'bx-cloud-upload'
            },
            settings: {
                action: 'showSettingsModal',
                title: 'Settings',
                type: 'modal',
                icon: 'bx-cog'
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
        
        // Handle modal actions differently from views
        if (config.type === 'modal') {
            // Execute modal action without changing current view
            if (config.action && typeof this[config.action] === 'function') {
                this[config.action]();
            } else {
                console.warn(`Modal action not found: ${config.action}`);
            }
            // Don't update hash or current section for modals
            return;
        }
        
        // Handle view navigation
        if (config.type === 'view') {
            // Store previous section for potential back navigation
            this.previousSection = this.currentSection;
            
            // Update current section
            this.currentSection = section;
            
            // Update URL hash only for views
            if (updateHash) {
                window.location.hash = section;
            }
            
            // Update active menu item
            this.updateActiveMenuItem(section);
            
            // Show view directly (transitions handled by showView)
            if (config.view && typeof showView === 'function') {
                showView(section);
            } else {
                console.error(`❌ showView function not available for section: ${section}`);
            }
            
            // Update page title
            document.title = `${config.title} - Ghost Gym`;
            
            // Log navigation for debugging
            console.log(`📍 Navigated to: ${section} (${config.title})`);
        }
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
        // Show backup & export modal
        const backupModal = document.getElementById('backupModal');
        if (backupModal) {
            const modal = new bootstrap.Modal(backupModal);
            modal.show();
            console.log('📦 Opened Backup & Export modal');
        } else {
            // Fallback: trigger existing backup functionality if modal doesn't exist
            const backupBtn = document.getElementById('backupBtn');
            if (backupBtn) {
                backupBtn.click();
            } else {
                console.warn('⚠️ Backup modal not found - will be implemented in Phase 4');
                if (typeof showAlert === 'function') {
                    showAlert('Backup & Export functionality coming soon!', 'info');
                }
            }
        }
    }
    
    showSettingsModal() {
        // Show settings modal
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            const modal = new bootstrap.Modal(settingsModal);
            modal.show();
            console.log('⚙️ Opened Settings modal');
        } else {
            console.warn('⚠️ Settings modal not found - will be implemented in Phase 5');
            if (typeof showAlert === 'function') {
                showAlert('Settings panel coming soon!', 'info');
            }
        }
    }
    
    // Utility Methods
    
    getCurrentSection() {
        return this.currentSection;
    }
    
    getPreviousSection() {
        return this.previousSection;
    }
    
    getSectionConfig(section) {
        return this.sections[section] || null;
    }
    
    isViewSection(section) {
        const config = this.sections[section];
        return config && config.type === 'view';
    }
    
    isModalSection(section) {
        const config = this.sections[section];
        return config && config.type === 'modal';
    }
    
    goBack() {
        if (this.previousSection && this.isViewSection(this.previousSection)) {
            this.navigate(this.previousSection);
        }
    }
    
    getAllViews() {
        return Object.keys(this.sections).filter(key => this.isViewSection(key));
    }
    
    getAllModals() {
        return Object.keys(this.sections).filter(key => this.isModalSection(key));
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