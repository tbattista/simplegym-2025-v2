/**
 * Ghost Gym Menu Navigation System
 * Handles SPA-style navigation between dashboard sections
 */

class MenuNavigation {
    constructor() {
        this.currentSection = 'dashboard';
        this.sections = {
            dashboard: {
                panels: ['programsList', 'programDetailsPanel', 'workoutsList'],
                title: 'Dashboard'
            },
            programs: {
                panels: ['programsList', 'programDetailsPanel'],
                title: 'My Programs',
                focusPanel: 'programsList'
            },
            workouts: {
                panels: ['workoutsList'],
                title: 'Workout Library',
                focusPanel: 'workoutsList'
            },
            exercises: {
                panels: ['exerciseDatabasePanel'],
                title: 'Exercise Database',
                fullWidth: true
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
        
        // Show/hide panels
        this.updatePanels(config);
        
        // Update page title
        document.title = `${config.title} - Ghost Gym`;
        
        // Focus specific panel if needed
        if (config.focusPanel) {
            this.focusPanel(config.focusPanel);
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
    
    updatePanels(config) {
        const mainGrid = document.querySelector('.row.g-6');
        const exercisePanel = document.getElementById('exerciseDatabasePanel');
        
        if (config.fullWidth) {
            // Hide main dashboard grid, show full-width panel
            if (mainGrid) mainGrid.style.display = 'none';
            if (exercisePanel) {
                exercisePanel.style.display = 'block';
                
                // Load exercises if showing exercise database
                if (this.currentSection === 'exercises' && typeof loadExercises === 'function') {
                    // Check if exercises are already loaded
                    if (window.ghostGym && window.ghostGym.exercises.all.length === 0) {
                        loadExercises();
                    }
                }
            }
        } else {
            // Show main dashboard grid
            if (mainGrid) mainGrid.style.display = 'flex';
            if (exercisePanel) exercisePanel.style.display = 'none';
            
            // Show/hide specific panels within grid
            const panelMap = {
                'programsList': '.col-lg-4',
                'programDetailsPanel': '.col-lg-5',
                'workoutsList': '.col-lg-3'
            };
            
            Object.entries(panelMap).forEach(([panelId, selector]) => {
                const panel = document.querySelector(selector);
                if (panel) {
                    panel.style.display = config.panels.includes(panelId) ? 'block' : 'none';
                }
            });
        }
    }
    
    focusPanel(panelId) {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
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