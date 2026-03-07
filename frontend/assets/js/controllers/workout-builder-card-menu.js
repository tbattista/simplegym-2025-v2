/**
 * Workout Builder Card Menu Controller
 * Handles 3-dot menu interactions for exercise group cards
 * @version 1.0.0
 */

class WorkoutBuilderCardMenu {
    constructor() {
        this.activeMenu = null;
        this.activeCard = null;
        this.clickOutsideHandler = null;
        this.init();
        console.log('✅ WorkoutBuilderCardMenu initialized');
    }

    /**
     * Initialize click-outside listener
     */
    init() {
        // Add global click handler to close menus when clicking outside
        this.clickOutsideHandler = (event) => {
            if (!event.target.closest('.builder-card-menu') &&
                !event.target.closest('.btn-menu-compact')) {
                this.closeAllMenus();
            }
        };
        document.addEventListener('click', this.clickOutsideHandler);
    }

    /**
     * Toggle menu visibility
     * @param {HTMLElement} button - The 3-dot button that was clicked
     * @param {string} groupId - The exercise group ID
     * @param {number} index - Current card index
     */
    toggleMenu(button, groupId, index) {
        const menu = button.parentElement.querySelector('.builder-card-menu');
        if (!menu) return;

        const isOpen = menu.classList.contains('show');

        // Close all other menus first
        this.closeAllMenus();

        // Toggle this menu
        if (!isOpen) {
            menu.classList.add('show');
            button.classList.add('active');
            this.activeMenu = menu;

            // Elevate the entire card's z-index to appear above other cards
            const card = button.closest('.exercise-group-card');
            if (card) {
                card.style.zIndex = '1060';
                card.style.position = 'relative';
                this.activeCard = card;
            }

            // Populate dynamic "Move to Block" items if sections mode is active
            if (window.SectionManager?.isSectionsMode()) {
                window.SectionManager.populateCardSectionMenu(groupId, menu);
            }
        }
    }

    /**
     * Close all open menus
     */
    closeAllMenus() {
        document.querySelectorAll('.builder-card-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
        document.querySelectorAll('.btn-menu-compact.active').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Reset card z-index
        if (this.activeCard) {
            this.activeCard.style.zIndex = '';
            this.activeCard.style.position = '';
            this.activeCard = null;
        }
        
        this.activeMenu = null;
    }

    /**
     * Handle move up action
     * @param {string} groupId - The exercise group ID
     * @param {number} index - Current card index
     */
    handleMoveUp(groupId, index) {
        if (index <= 0) return;
        this.moveCard(index, index - 1);
        this.closeAllMenus();
    }

    /**
     * Handle move down action
     * @param {string} groupId - The exercise group ID
     * @param {number} index - Current card index
     */
    handleMoveDown(groupId, index) {
        const container = document.getElementById('exerciseGroups');
        if (!container) return;

        const cards = container.querySelectorAll('.exercise-group-card');
        if (index >= cards.length - 1) return;

        this.moveCard(index, index + 1);
        this.closeAllMenus();
    }

    /**
     * Move a card from one position to another
     * @param {number} fromIndex - Source index
     * @param {number} toIndex - Target index
     */
    moveCard(fromIndex, toIndex) {
        const container = document.getElementById('exerciseGroups');
        if (!container) return;

        const cards = Array.from(container.querySelectorAll('.exercise-group-card'));
        if (fromIndex < 0 || fromIndex >= cards.length) return;
        if (toIndex < 0 || toIndex >= cards.length) return;

        const movingCard = cards[fromIndex];
        const targetCard = cards[toIndex];

        if (toIndex < fromIndex) {
            // Moving up - insert before target
            container.insertBefore(movingCard, targetCard);
        } else {
            // Moving down - insert after target
            container.insertBefore(movingCard, targetCard.nextSibling);
        }

        // Update all menu boundaries and data indices
        this.updateAllMenuBoundaries();

        // Mark editor as dirty (triggers autosave)
        if (window.markEditorDirty) {
            window.markEditorDirty();
        }

        console.log(`✅ Moved card from index ${fromIndex} to ${toIndex}`);
    }

    /**
     * Handle delete action
     * @param {string} groupId - The exercise group ID
     */
    handleDelete(groupId) {
        this.closeAllMenus();

        // Use existing delete function if available
        if (window.deleteExerciseGroupCard) {
            window.deleteExerciseGroupCard(groupId);
            // Update boundaries after delete
            setTimeout(() => this.updateAllMenuBoundaries(), 100);
        } else {
            // Fallback: direct delete
            const card = document.querySelector(`[data-group-id="${groupId}"]`);
            if (card) {
                const exerciseName = window.exerciseGroupsData?.[groupId]?.exercises?.a || 'this exercise';

                ffnModalManager.confirm('Delete Exercise', `Are you sure you want to delete "${exerciseName}"?\n\nThis action cannot be undone.`, () => {
                    const parentSection = card.closest('.workout-section');
                    card.remove();
                    if (window.exerciseGroupsData) {
                        delete window.exerciseGroupsData[groupId];
                    }
                    // Clean up parent section and re-chain
                    if (parentSection && window.SectionManager) {
                        window.SectionManager._cleanupSection(parentSection);
                        const exc = parentSection.querySelector('.section-exercises');
                        if (exc && parentSection.dataset.sectionType !== 'standard') {
                            window.SectionManager._applyBlockChainClasses(exc);
                        }
                    }
                    if (window.markEditorDirty) {
                        window.markEditorDirty();
                    }
                    this.updateAllMenuBoundaries();
                    console.log('✅ Exercise group deleted:', groupId);
                }, { confirmText: 'Delete', confirmClass: 'btn-danger', size: 'sm' });
            }
        }
    }

    /**
     * Update menu boundary states for all cards
     * Called after move/add/delete operations
     */
    updateAllMenuBoundaries() {
        const container = document.getElementById('exerciseGroups');
        if (!container) return;

        const cards = container.querySelectorAll('.exercise-group-card');
        const totalCards = cards.length;

        cards.forEach((card, index) => {
            // Update data-index attribute
            card.setAttribute('data-index', index);

            // Find menu items
            const moveUpBtn = card.querySelector('.builder-menu-item:nth-child(1)');
            const moveDownBtn = card.querySelector('.builder-menu-item:nth-child(2)');

            // Update Move Up button
            if (moveUpBtn) {
                if (index === 0) {
                    moveUpBtn.classList.add('disabled');
                    moveUpBtn.setAttribute('disabled', '');
                } else {
                    moveUpBtn.classList.remove('disabled');
                    moveUpBtn.removeAttribute('disabled');
                }
                // Update onclick handler with new index
                const groupId = card.getAttribute('data-group-id');
                moveUpBtn.onclick = () => window.builderCardMenu?.handleMoveUp(groupId, index);
            }

            // Update Move Down button
            if (moveDownBtn) {
                if (index >= totalCards - 1) {
                    moveDownBtn.classList.add('disabled');
                    moveDownBtn.setAttribute('disabled', '');
                } else {
                    moveDownBtn.classList.remove('disabled');
                    moveDownBtn.removeAttribute('disabled');
                }
                // Update onclick handler with new index
                const groupId = card.getAttribute('data-group-id');
                moveDownBtn.onclick = () => window.builderCardMenu?.handleMoveDown(groupId, index);
            }

            // Update 3-dot button onclick with new index
            const menuBtn = card.querySelector('.btn-menu-compact');
            if (menuBtn) {
                const groupId = card.getAttribute('data-group-id');
                menuBtn.onclick = (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    window.builderCardMenu?.toggleMenu(menuBtn, groupId, index);
                };
            }
        });

        console.log(`📋 Updated menu boundaries for ${totalCards} cards`);
    }

    /**
     * Cleanup when controller is destroyed
     */
    destroy() {
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
        }
        this.closeAllMenus();
        console.log('🧹 WorkoutBuilderCardMenu destroyed');
    }
}

// Initialize global instance
window.builderCardMenu = new WorkoutBuilderCardMenu();

console.log('📦 Workout Builder Card Menu controller loaded');
