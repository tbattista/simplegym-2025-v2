# Unified Offcanvas Refactoring - Implementation Guide

This guide provides step-by-step instructions for Code mode to implement the refactoring plan.

---

## Pre-Implementation Checklist

- [ ] Read the full refactoring plan: `plans/UNIFIED_OFFCANVAS_REFACTORING_PLAN.md`
- [ ] Understand current call sites (21 locations in 4 files)
- [ ] Have the application running locally to test changes

---

## Phase 1: Create OffcanvasManager (Foundation)

### Step 1.1: Create Directory Structure

```bash
# Create the offcanvas module directory
mkdir -p frontend/assets/js/components/offcanvas
```

### Step 1.2: Create OffcanvasManager

**File**: `frontend/assets/js/components/offcanvas/offcanvas-manager.js`

```javascript
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
```

### Step 1.3: Update unified-offcanvas-factory.js to Use OffcanvasManager

Replace the `createOffcanvas` helper method to use the new manager:

```javascript
// In unified-offcanvas-factory.js, update createOffcanvas method:

static createOffcanvas(id, html, setupCallback = null) {
    // Use the centralized manager if available
    if (window.offcanvasManager) {
        return window.offcanvasManager.create(id, html, setupCallback);
    }
    
    // Fallback to existing logic (for backward compatibility during migration)
    // ... keep existing implementation as fallback
}
```

### Step 1.4: Add Script Reference

Add to HTML pages (after Bootstrap, before unified-offcanvas-factory):

```html
<script src="assets/js/components/offcanvas/offcanvas-manager.js"></script>
```

### Step 1.5: Test Phase 1

Test these scenarios:
- [ ] Open/close any offcanvas - should work normally
- [ ] Multiple rapid opens/closes - no orphaned backdrops
- [ ] Check console for errors
- [ ] Test on mobile (bottom offcanvas positioning)

---

## Phase 2: Create Templates Module

### Step 2.1: Create Templates File

**File**: `frontend/assets/js/components/offcanvas/offcanvas-templates.js`

```javascript
/**
 * Ghost Gym - Offcanvas Templates
 * Reusable HTML templates for offcanvas components
 * @version 1.0.0
 */

const OffcanvasTemplates = {
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Base offcanvas structure
     */
    base(config) {
        const {
            id,
            title,
            icon,
            body,
            footer = null,
            showClose = true,
            height = null,
            backdrop = true,
            keyboard = true,
            scroll = false
        } = config;

        const heightStyle = height ? `style="height: ${height};"` : '';
        const backdropAttr = backdrop === 'static' ? 'data-bs-backdrop="static"' : '';
        const keyboardAttr = !keyboard ? 'data-bs-keyboard="false"' : '';

        return `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" 
                 tabindex="-1" 
                 id="${id}" 
                 aria-labelledby="${id}Label"
                 data-bs-scroll="${scroll}"
                 ${backdropAttr}
                 ${keyboardAttr}
                 ${heightStyle}>
                ${this.header({ id, title, icon, showClose })}
                <div class="offcanvas-body">
                    ${body}
                </div>
                ${footer ? this.footer(footer) : ''}
            </div>
        `;
    },

    /**
     * Offcanvas header
     */
    header(config) {
        const { id, title, icon, showClose = true } = config;
        return `
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="${id}Label">
                    ${icon ? `<i class="bx ${icon} me-2"></i>` : ''}${this.escapeHtml(title)}
                </h5>
                ${showClose ? '<button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>' : ''}
            </div>
        `;
    },

    /**
     * Offcanvas footer with buttons
     */
    footer(config) {
        const { buttons = [], className = '' } = config;
        return `
            <div class="offcanvas-footer border-top p-3 ${className}">
                <div class="d-flex gap-2">
                    ${buttons.map(btn => this.button(btn)).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Button template
     */
    button(config) {
        const {
            id = '',
            text,
            icon = null,
            variant = 'primary',
            outline = false,
            dismiss = false,
            disabled = false,
            className = 'flex-fill'
        } = config;

        const btnClass = outline ? `btn-outline-${variant}` : `btn-${variant}`;
        const dismissAttr = dismiss ? 'data-bs-dismiss="offcanvas"' : '';
        const disabledAttr = disabled ? 'disabled' : '';
        const idAttr = id ? `id="${id}"` : '';

        return `
            <button type="button" class="btn ${btnClass} ${className}" ${idAttr} ${dismissAttr} ${disabledAttr}>
                ${icon ? `<i class="bx ${icon} me-1"></i>` : ''}${text}
            </button>
        `;
    },

    /**
     * Menu item template
     */
    menuItem(item, index) {
        const variantClass = item.variant === 'danger' ? 'danger' : '';
        return `
            <div class="more-menu-item ${variantClass}" data-menu-action="${index}">
                <i class="bx ${item.icon}"></i>
                <div class="more-menu-item-content">
                    <div class="more-menu-item-title">${this.escapeHtml(item.title)}</div>
                    <small class="more-menu-item-description">${this.escapeHtml(item.description || '')}</small>
                </div>
            </div>
        `;
    },

    /**
     * Exercise card template
     */
    exerciseCard(exercise, config = {}) {
        const {
            buttonText = 'Add',
            buttonIcon = 'bx-plus',
            showDetails = true
        } = config;

        const tier = exercise.exerciseTier || '1';
        const difficulty = exercise.difficulty || 'Intermediate';
        const muscle = exercise.targetMuscleGroup || '';
        const equipment = exercise.primaryEquipment || 'None';

        const tierBadge = (parseInt(tier) === 3)
            ? '<span class="badge bg-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; opacity: 0.7;"><i class="bx bx-dots-horizontal-rounded" style="font-size: 0.75rem;"></i></span>'
            : '<span class="badge" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.25);"><i class="bx bxs-star" style="font-size: 0.75rem;"></i> Standard</span>';

        const difficultyColors = { 'B': 'success', 'I': 'warning', 'A': 'danger' };
        const diffAbbr = difficulty.charAt(0).toUpperCase();
        const diffColor = difficultyColors[diffAbbr] || 'secondary';
        const difficultyBadge = `<span class="badge badge-outline-${diffColor}" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; background: transparent;">${difficulty}</span>`;

        return `
            <div class="card mb-2">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="flex-grow-1">
                            <div class="fw-semibold mb-2">${this.escapeHtml(exercise.name)}</div>
                            ${showDetails ? `
                                <div class="d-flex gap-2 flex-wrap align-items-center">
                                    ${tierBadge}
                                    ${difficultyBadge}
                                    ${muscle ? `<span class="text-muted small">${this.escapeHtml(muscle)}</span>` : ''}
                                    ${equipment && equipment !== 'None' ? `<span class="text-muted small">• ${this.escapeHtml(equipment)}</span>` : ''}
                                </div>
                            ` : ''}
                        </div>
                        <div class="flex-shrink-0 ms-3">
                            <button class="btn btn-sm btn-primary" data-exercise-id="${this.escapeHtml(exercise.id || exercise.name)}">
                                <i class="bx ${buttonIcon} me-1"></i>${buttonText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Pagination template
     */
    pagination(data) {
        const { currentPage, totalPages, startIdx, endIdx, total } = data;

        if (totalPages <= 1) return '';

        const maxButtons = 9;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        let pagesHtml = '';
        for (let i = startPage; i <= endPage; i++) {
            pagesHtml += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="javascript:void(0);" data-page="${i}">${i}</a>
                </li>
            `;
        }

        return `
            <div class="text-center">
                <small class="text-muted d-block mb-2">Showing ${startIdx}-${endIdx} of ${total}</small>
                <nav aria-label="Pagination">
                    <ul class="pagination pagination-sm mb-0 justify-content-center">
                        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                            <a class="page-link" href="javascript:void(0);" data-page="${currentPage - 1}">
                                <i class="bx bx-chevron-left"></i>
                            </a>
                        </li>
                        ${pagesHtml}
                        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                            <a class="page-link" href="javascript:void(0);" data-page="${currentPage + 1}">
                                <i class="bx bx-chevron-right"></i>
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
        `;
    },

    /**
     * Filter option with checkmark
     */
    filterOption(config) {
        const { filter, value, label, isSelected = false } = config;
        const checkmark = isSelected
            ? '<i class="bx bx-check text-primary fw-bold" style="font-size: 1.25rem;"></i>'
            : '<span style="width: 20px; display: inline-block;"></span>';

        return `
            <div class="filter-option p-3 border-bottom" data-filter="${filter}" data-value="${this.escapeHtml(value)}">
                <div class="d-flex align-items-center">
                    <span class="checkmark me-3">${checkmark}</span>
                    <span class="flex-grow-1">${this.escapeHtml(label)}</span>
                </div>
            </div>
        `;
    },

    /**
     * Loading state
     */
    loadingState(message = 'Loading...') {
        return `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted mt-3">${this.escapeHtml(message)}</p>
            </div>
        `;
    },

    /**
     * Empty state
     */
    emptyState(config = {}) {
        const {
            icon = 'bx-search-alt',
            title = 'No results found',
            message = ''
        } = config;

        return `
            <div class="text-center py-5">
                <i class="bx ${icon} display-1 text-muted"></i>
                <p class="text-muted mt-3">${this.escapeHtml(title)}</p>
                ${message ? `<small class="text-muted d-block">${this.escapeHtml(message)}</small>` : ''}
            </div>
        `;
    },

    /**
     * Info alert
     */
    infoAlert(config) {
        const { icon = 'bx-info-circle', title, message, variant = 'info' } = config;
        return `
            <div class="alert alert-${variant} d-flex align-items-start mb-4">
                <i class="bx ${icon} me-2 mt-1"></i>
                <div>
                    <strong>${this.escapeHtml(title)}</strong>
                    <p class="mb-0 small">${this.escapeHtml(message)}</p>
                </div>
            </div>
        `;
    },

    /**
     * Stat card (for completion summary, etc.)
     */
    statCard(config) {
        const { value, label, variant = 'primary' } = config;
        return `
            <div class="card bg-label-${variant}">
                <div class="card-body text-center py-3">
                    <div class="h4 mb-0">${this.escapeHtml(String(value))}</div>
                    <small class="text-muted">${this.escapeHtml(label)}</small>
                </div>
            </div>
        `;
    }
};

// Export to window
window.OffcanvasTemplates = OffcanvasTemplates;

console.log('📦 OffcanvasTemplates loaded');
```

### Step 2.2: Add Script Reference

```html
<script src="assets/js/components/offcanvas/offcanvas-templates.js"></script>
```

---

## Phase 3: Create Renderers

### Step 3.1: Create Renderers File

**File**: `frontend/assets/js/components/offcanvas/offcanvas-renderers.js`

```javascript
/**
 * Ghost Gym - Offcanvas Renderers
 * Reusable rendering components for offcanvas
 * @version 1.0.0
 */

/**
 * Exercise List Renderer
 * Handles rendering and interaction for exercise lists
 */
class OffcanvasExerciseRenderer {
    constructor(containerElement, config = {}) {
        this.container = containerElement;
        this.config = {
            buttonText: 'Add',
            buttonIcon: 'bx-plus',
            showDetails: true,
            ...config
        };
        this.onClickCallback = null;
    }

    /**
     * Render a list of exercises
     */
    render(exercises) {
        if (!this.container) return;

        if (exercises.length === 0) {
            this.showEmpty();
            return;
        }

        this.container.innerHTML = exercises.map(ex => 
            OffcanvasTemplates.exerciseCard(ex, this.config)
        ).join('');
        this.container.style.display = 'block';
    }

    /**
     * Show loading state
     */
    showLoading(message = 'Loading exercises...') {
        if (!this.container) return;
        this.container.innerHTML = OffcanvasTemplates.loadingState(message);
        this.container.style.display = 'block';
    }

    /**
     * Show empty state
     */
    showEmpty(config = {}) {
        if (!this.container) return;
        const defaultConfig = {
            icon: 'bx-search-alt',
            title: 'No exercises found',
            message: 'Try adjusting your filters'
        };
        this.container.innerHTML = OffcanvasTemplates.emptyState({ ...defaultConfig, ...config });
        this.container.style.display = 'block';
    }

    /**
     * Hide the container
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * Set click handler for exercise buttons
     */
    onClick(callback) {
        this.onClickCallback = callback;
        
        if (!this.container) return;
        
        this.container.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-exercise-id]');
            if (button && this.onClickCallback) {
                const exerciseId = button.dataset.exerciseId;
                this.onClickCallback(exerciseId, button);
            }
        });
    }

    /**
     * Set button loading state
     */
    setButtonLoading(button, isLoading) {
        if (!button) return;
        
        button.disabled = isLoading;
        if (isLoading) {
            button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        } else {
            button.innerHTML = `<i class="bx ${this.config.buttonIcon} me-1"></i>${this.config.buttonText}`;
        }
    }
}

/**
 * Pagination Renderer
 * Handles rendering and interaction for pagination
 */
class OffcanvasPaginationRenderer {
    constructor(containerElement, onPageChange) {
        this.container = containerElement;
        this.onPageChange = onPageChange;
        this.currentData = null;
    }

    /**
     * Render pagination
     */
    render(paginationData) {
        if (!this.container) return;
        
        this.currentData = paginationData;

        if (paginationData.totalPages <= 1) {
            this.hide();
            return;
        }

        this.container.innerHTML = OffcanvasTemplates.pagination(paginationData);
        this.container.style.display = 'block';
        this.attachHandlers();
    }

    /**
     * Hide pagination
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * Attach click handlers to page links
     */
    attachHandlers() {
        if (!this.container) return;

        this.container.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(link.dataset.page);
                if (this.currentData && page >= 1 && page <= this.currentData.totalPages) {
                    if (this.onPageChange) {
                        this.onPageChange(page);
                    }
                }
            });
        });
    }
}

/**
 * Filter Option Renderer
 * Handles rendering and interaction for filter options
 */
class OffcanvasFilterRenderer {
    constructor(containerElement, onFilterChange) {
        this.container = containerElement;
        this.onFilterChange = onFilterChange;
        this.state = {};
    }

    /**
     * Render filter options
     */
    render(filterConfig) {
        // Implementation for filter rendering
        // Will be filled in during Phase 4
    }

    /**
     * Update checkmark display
     */
    updateCheckmark(element, isSelected) {
        const checkmark = element.querySelector('.checkmark');
        if (checkmark) {
            checkmark.innerHTML = isSelected
                ? '<i class="bx bx-check text-primary fw-bold" style="font-size: 1.25rem;"></i>'
                : '<span style="width: 20px; display: inline-block;"></span>';
        }
    }
}

// Export to window
window.OffcanvasExerciseRenderer = OffcanvasExerciseRenderer;
window.OffcanvasPaginationRenderer = OffcanvasPaginationRenderer;
window.OffcanvasFilterRenderer = OffcanvasFilterRenderer;

console.log('📦 OffcanvasRenderers loaded');
```

---

## Phase 4: Refactor to Use ExerciseSearchCore

This is the most impactful phase - it removes ~680 lines of duplicate code.

### Step 4.1: Refactor createBonusExercise

The key change is to replace the inline state management and filtering logic with ExerciseSearchCore.

**Current**: 830+ lines with embedded state, filtering, sorting, pagination
**Target**: ~150 lines using ExerciseSearchCore and renderers

See the full refactoring plan for detailed code examples.

### Step 4.2: Refactor createExerciseSearchOffcanvas

This method already uses ExerciseSearchCore but should use the new renderers.

### Step 4.3: Test Thoroughly

- [ ] Bonus exercise offcanvas opens correctly
- [ ] Search filters work
- [ ] Pagination works
- [ ] Exercise selection works
- [ ] Mobile layout correct

---

## Phase 5: Split Into Domain Files

### Target File Structure

```
frontend/assets/js/components/offcanvas/
├── offcanvas-manager.js          # Phase 1 ✓
├── offcanvas-templates.js        # Phase 2 ✓
├── offcanvas-renderers.js        # Phase 3 ✓
├── offcanvas-menu.js             # Menu-style offcanvas
├── offcanvas-exercise.js         # Exercise search/filter/add
├── offcanvas-workout.js          # Workout-related
├── offcanvas-forms.js            # Form-based
└── index.js                      # Main facade
```

### Step 5.1: Create offcanvas-menu.js

Move `createMenuOffcanvas` and `createWorkoutSelectionPrompt`

### Step 5.2: Create offcanvas-exercise.js

Move `createBonusExercise`, `createExerciseSearchOffcanvas`, `createExerciseFilterOffcanvas`

### Step 5.3: Create offcanvas-workout.js

Move `createWeightEdit`, `createCompleteWorkout`, `createCompletionSummary`, `createResumeSession`

### Step 5.4: Create offcanvas-forms.js

Move `createExerciseGroupEditor`, `createSkipExercise`, `createFilterOffcanvas`

### Step 5.5: Create index.js (Facade)

```javascript
/**
 * Ghost Gym - Unified Offcanvas Factory
 * Main facade for backward compatibility
 * @version 3.0.0
 */

// Import all modules (for future ES module migration)
// For now, they're all on window

class UnifiedOffcanvasFactory {
    // Delegate to domain-specific modules
    static createMenuOffcanvas = (...args) => window.OffcanvasMenu.create(...args);
    static createWorkoutSelectionPrompt = () => window.OffcanvasMenu.createWorkoutSelection();
    
    static createBonusExercise = (...args) => window.OffcanvasExercise.createBonus(...args);
    static createExerciseSearchOffcanvas = (...args) => window.OffcanvasExercise.createSearch(...args);
    static createExerciseFilterOffcanvas = (...args) => window.OffcanvasExercise.createFilter(...args);
    
    static createWeightEdit = (...args) => window.OffcanvasWorkout.createWeightEdit(...args);
    static createCompleteWorkout = (...args) => window.OffcanvasWorkout.createComplete(...args);
    static createCompletionSummary = (...args) => window.OffcanvasWorkout.createSummary(...args);
    static createResumeSession = (...args) => window.OffcanvasWorkout.createResume(...args);
    
    static createExerciseGroupEditor = (...args) => window.OffcanvasForms.createGroupEditor(...args);
    static createSkipExercise = (...args) => window.OffcanvasForms.createSkipExercise(...args);
    static createFilterOffcanvas = (...args) => window.OffcanvasForms.createFilter(...args);
    
    // Helper methods
    static escapeHtml = (text) => OffcanvasTemplates.escapeHtml(text);
    static forceCleanupBackdrops = () => offcanvasManager.cleanupBackdrops();
    static renderAlternateSlot = (...args) => OffcanvasTemplates.alternateSlot(...args);
}

window.UnifiedOffcanvasFactory = UnifiedOffcanvasFactory;
window.cleanupOffcanvasBackdrops = UnifiedOffcanvasFactory.forceCleanupBackdrops;

console.log('📦 UnifiedOffcanvasFactory v3.0.0 loaded');
```

---

## Phase 6: Remove Deprecated Code

### Step 6.1: Remove Deprecated Methods

- Remove `createAddExerciseForm` (deprecated wrapper)
- Remove `_createAddExerciseForm_ORIGINAL` (dead code)
- Remove `validateAddButton` if unused

### Step 6.2: Verify All Call Sites Updated

Check all 21 call sites use correct methods.

---

## Phase 7: Standardize Error Handling

### Step 7.1: Create Helper Utilities

Add to offcanvas-manager.js or separate utilities file:

```javascript
/**
 * Show error toast
 */
function showOffcanvasError(message) {
    if (window.showToast) {
        window.showToast({
            message,
            type: 'danger',
            title: 'Error',
            icon: 'bx-error',
            delay: 5000
        });
    } else {
        console.error('Offcanvas Error:', message);
    }
}

/**
 * Show success toast
 */
function showOffcanvasSuccess(message) {
    if (window.showToast) {
        window.showToast({
            message,
            type: 'success',
            title: 'Success',
            icon: 'bx-check-circle',
            delay: 3000
        });
    }
}

/**
 * Set button loading state
 */
function setButtonLoading(button, isLoading, originalHtml = null) {
    if (!button) return;
    
    if (!originalHtml) {
        originalHtml = button.innerHTML;
        button.dataset.originalHtml = originalHtml;
    }
    
    button.disabled = isLoading;
    button.innerHTML = isLoading
        ? '<span class="spinner-border spinner-border-sm me-2"></span>Loading...'
        : (button.dataset.originalHtml || originalHtml);
}
```

---

## Testing Checklist

After each phase, test these scenarios:

### Core Functionality
- [ ] All 21 call sites work correctly
- [ ] Offcanvas opens with animation
- [ ] Offcanvas closes with animation
- [ ] Backdrop appears and disappears
- [ ] No orphaned backdrops after rapid open/close

### Exercise Features
- [ ] Bonus exercise search works
- [ ] Exercise filters work
- [ ] Pagination works
- [ ] Exercise selection callbacks fire

### Workout Features
- [ ] Weight edit works
- [ ] Complete workout flow works
- [ ] Resume session works
- [ ] Completion summary displays

### Mobile
- [ ] Bottom offcanvas positions correctly
- [ ] Touch interactions work
- [ ] No viewport issues

### Edge Cases
- [ ] Multiple rapid opens/closes
- [ ] Network errors handled gracefully
- [ ] Missing data handled gracefully

---

## Script Load Order

Ensure scripts load in this order:

```html
<!-- Bootstrap (required) -->
<script src="vendor/bootstrap/bootstrap.bundle.min.js"></script>

<!-- Offcanvas modules -->
<script src="assets/js/components/offcanvas/offcanvas-manager.js"></script>
<script src="assets/js/components/offcanvas/offcanvas-templates.js"></script>
<script src="assets/js/components/offcanvas/offcanvas-renderers.js"></script>
<script src="assets/js/components/offcanvas/offcanvas-menu.js"></script>
<script src="assets/js/components/offcanvas/offcanvas-exercise.js"></script>
<script src="assets/js/components/offcanvas/offcanvas-workout.js"></script>
<script src="assets/js/components/offcanvas/offcanvas-forms.js"></script>
<script src="assets/js/components/offcanvas/index.js"></script>

<!-- OR keep unified file during migration -->
<script src="assets/js/components/unified-offcanvas-factory.js"></script>
```

---

*Implementation Guide Version: 1.0*
*Created: 2025-12-20*
