/**
 * Ghost Gym - Menu Offcanvas Components
 * Creates menu-style offcanvas for Share/More menus and workout selection prompts
 * 
 * @module offcanvas-menu
 * @version 3.0.0
 * @date 2025-12-20
 */

import { createOffcanvas, escapeHtml } from './offcanvas-helpers.js';

/**
 * Create menu-style offcanvas with clickable items
 * @param {Object} config - Menu configuration
 * @param {string} config.id - Unique offcanvas ID
 * @param {string} config.title - Header title
 * @param {string} config.icon - Boxicon class for title
 * @param {Array} config.menuItems - Array of menu item objects
 * @returns {Object} Offcanvas instance
 */
export function createMenuOffcanvas(config) {
    const { id, title, icon, menuItems = [] } = config;
    
    const menuHtml = menuItems.map((item, index) => `
        <div class="more-menu-item ${item.variant === 'danger' ? 'danger' : ''}"
             data-menu-action="${index}">
            <i class="bx ${item.icon}"></i>
            <div class="more-menu-item-content">
                <div class="more-menu-item-title">${escapeHtml(item.title)}</div>
                <small class="more-menu-item-description">${escapeHtml(item.description || '')}</small>
            </div>
        </div>
    `).join('');
    
    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1"
             id="${id}" aria-labelledby="${id}Label" data-bs-scroll="false">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="${id}Label">
                    <i class="bx ${icon} me-2"></i>${escapeHtml(title)}
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body menu-items">
                ${menuHtml}
            </div>
        </div>
    `;
    
    return createOffcanvas(id, offcanvasHtml, (offcanvas, offcanvasElement) => {
        // Attach click handlers to menu items
        menuItems.forEach((item, index) => {
            const element = offcanvasElement.querySelector(`[data-menu-action="${index}"]`);
            if (element && item.onClick) {
                element.addEventListener('click', async () => {
                    try {
                        await item.onClick();
                        offcanvas.hide();
                    } catch (error) {
                        console.error('Menu item action failed:', error);
                    }
                });
            }
        });
    });
}

/**
 * Create workout selection prompt offcanvas
 * Shown when no workout is selected in workout mode
 * @returns {Object} Offcanvas instance
 */
export function createWorkoutSelectionPrompt() {
    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1"
             id="workoutSelectionOffcanvas" aria-labelledby="workoutSelectionOffcanvasLabel"
             data-bs-backdrop="static" data-bs-keyboard="false" data-bs-scroll="false">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="workoutSelectionOffcanvasLabel">
                    <i class="bx bx-dumbbell me-2"></i>No Workout Selected
                </h5>
            </div>
            <div class="offcanvas-body">
                <div class="text-center mb-4">
                    <i class="bx bx-dumbbell" style="font-size: 3rem; color: var(--bs-primary);"></i>
                    <h5 class="mt-3">Let's get started!</h5>
                    <p class="text-muted">Choose how you'd like to proceed</p>
                </div>
                <div class="d-grid gap-3">
                    <button type="button" class="btn btn-lg btn-primary" id="createNewWorkoutOption">
                        <i class="bx bx-plus-circle me-2"></i>
                        <div class="text-start">
                            <div class="fw-bold">Create New Workout</div>
                            <small class="d-block opacity-75">Start with a blank template</small>
                        </div>
                    </button>
                    <button type="button" class="btn btn-lg btn-outline-primary" id="myWorkoutsOption">
                        <i class="bx bx-list-ul me-2"></i>
                        <div class="text-start">
                            <div class="fw-bold">My Workouts</div>
                            <small class="d-block opacity-75">Choose from your saved templates</small>
                        </div>
                    </button>
                    <button type="button" class="btn btn-lg btn-outline-secondary" id="publicWorkoutsOption">
                        <i class="bx bx-globe me-2"></i>
                        <div class="text-start">
                            <div class="fw-bold">Public Workouts</div>
                            <small class="d-block opacity-75">Browse community templates</small>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return createOffcanvas('workoutSelectionOffcanvas', offcanvasHtml, (offcanvas) => {
        const navigateTo = (url) => {
            offcanvas.hide();
            setTimeout(() => {
                window.location.href = url;
            }, 250);
        };
        
        document.getElementById('createNewWorkoutOption')?.addEventListener('click', () => {
            offcanvas.hide();
            if (window.createNewWorkoutInEditor) {
                window.createNewWorkoutInEditor();
            }
        });
        
        document.getElementById('myWorkoutsOption')?.addEventListener('click', () => {
            navigateTo('workout-database.html');
        });
        
        document.getElementById('publicWorkoutsOption')?.addEventListener('click', () => {
            navigateTo('public-workouts.html');
        });
    });
}

console.log('📦 Offcanvas menu components loaded');
