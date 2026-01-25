/**
 * Ghost Gym - Workout Card Component
 * Reusable workout card with configurable actions and display options
 * @version 1.0.0
 */

class WorkoutCard {
    constructor(workout, config = {}) {
        this.workout = workout;
        this.config = {
            // Display options
            showCreator: false,
            showStats: false,
            showTags: true,
            showDescription: false,
            showExercisePreview: false,

            // Action buttons (only primary CTA shown as button)
            actions: [],

            // Dropdown menu actions (Edit, Delete, View Details go here)
            dropdownActions: ['edit', 'delete'], // Default dropdown actions

            // Delete mode
            deleteMode: false,
            onDelete: null,

            // Custom metadata
            customMetadata: null,

            // Callbacks
            onCardClick: null,
            onViewDetails: null, // Optional view details callback for dropdown

            ...config
        };

        this.element = null;
    }
    
    /**
     * Render the workout card
     * @returns {HTMLElement} The card element
     */
    render() {
        const cardClass = this.config.deleteMode ? 'card workout-list-card delete-mode' : 'card workout-list-card';
        
        const card = document.createElement('div');
        card.className = cardClass;
        card.setAttribute('data-workout-id', this.workout.id);
        
        card.innerHTML = `
            <div class="card-body position-relative">
                ${this._renderDropdownMenu()}
                ${this._renderFavoriteButton()}
                ${this._renderHeader()}
                ${this._renderMetadata()}
                ${this._renderDescription()}
                ${this._renderExercisePreview()}
                ${this._renderStats()}
                ${this._renderTags()}
                <div class="card-footer-content mt-auto">
                    ${this._renderActions()}
                </div>
            </div>
        `;
        
        this.element = card;
        this._attachEventListeners();
        
        return card;
    }
    
    /**
     * Render dropdown menu (3 dots) with configurable actions
     */
    _renderDropdownMenu() {
        if (this.config.deleteMode) return '';

        const dropdownActions = this.config.dropdownActions || ['edit', 'delete'];
        let menuItems = '';

        // Build menu items based on configuration
        if (dropdownActions.includes('view') && this.config.onViewDetails) {
            menuItems += `
                    <li>
                        <a class="dropdown-item" href="javascript:void(0);" data-action="view-details">
                            <i class="bx bx-show me-2"></i>View Details
                        </a>
                    </li>`;
        }

        if (dropdownActions.includes('history')) {
            const historyAction = this.config.actions.find(a => a.id === 'history');
            if (historyAction) {
                menuItems += `
                    <li>
                        <a class="dropdown-item" href="javascript:void(0);" data-action="history">
                            <i class="bx bx-history me-2"></i>History
                        </a>
                    </li>`;
            }
        }

        if (dropdownActions.includes('edit')) {
            menuItems += `
                    <li>
                        <a class="dropdown-item" href="javascript:void(0);" data-action="edit">
                            <i class="bx bx-edit me-2"></i>Edit
                        </a>
                    </li>`;
        }

        if (dropdownActions.includes('duplicate')) {
            menuItems += `
                    <li>
                        <a class="dropdown-item" href="javascript:void(0);" data-action="duplicate">
                            <i class="bx bx-copy me-2"></i>Duplicate
                        </a>
                    </li>`;
        }

        if (dropdownActions.includes('share')) {
            menuItems += `
                    <li>
                        <a class="dropdown-item" href="javascript:void(0);" data-action="share">
                            <i class="bx bx-share-alt me-2"></i>Share
                        </a>
                    </li>`;
        }

        if (dropdownActions.includes('delete')) {
            // Add divider before delete if there are other items
            if (menuItems) {
                menuItems += `<li><hr class="dropdown-divider"></li>`;
            }
            menuItems += `
                    <li>
                        <a class="dropdown-item text-danger" href="javascript:void(0);" data-action="delete">
                            <i class="bx bx-trash me-2"></i>Delete
                        </a>
                    </li>`;
        }

        return `
            <div class="dropdown position-absolute" style="top: 8px; right: 8px; z-index: 1050;">
                <button class="btn btn-icon btn-card-menu" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="bx bx-dots-vertical-rounded"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">${menuItems}
                </ul>
            </div>
        `;
    }

    /**
     * Render favorite heart toggle button
     * Positioned to the left of the dropdown menu
     */
    _renderFavoriteButton() {
        // Don't show for starter template or in delete mode
        if (this.workout.isStarterTemplate || this.config.deleteMode) return '';

        const workoutData = this.workout.workout_data || this.workout;
        const isFavorite = workoutData.is_favorite || false;
        const iconClass = isFavorite ? 'bxs-heart' : 'bx-heart';
        const colorClass = isFavorite ? 'text-danger' : '';

        return `
            <button class="btn btn-icon btn-card-menu favorite-toggle ${colorClass}"
                    data-workout-id="${this.workout.id}"
                    data-is-favorite="${isFavorite}"
                    title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
                    style="position: absolute; top: 8px; right: 44px; z-index: 1050;">
                <i class="bx ${iconClass}"></i>
            </button>
        `;
    }

    /**
     * Render card header (title)
     */
    _renderHeader() {
        const workoutData = this.workout.workout_data || this.workout;
        const name = workoutData.name || this.workout.name || 'Untitled Workout';
        
        return `
            <h5 class="card-title mb-2" style="padding-right: 30px;">${this._escapeHtml(name)}</h5>
        `;
    }
    
    /**
     * Render metadata - clean single line with exercise count and estimated duration
     */
    _renderMetadata() {
        const workoutData = this.workout.workout_data || this.workout;
        const totalExercises = this._getTotalExerciseCount(workoutData);
        const estimatedMinutes = this._getEstimatedDuration(workoutData);

        let html = `
            <div class="workout-meta mb-2">
                ${totalExercises} ${totalExercises === 1 ? 'exercise' : 'exercises'} • ~${estimatedMinutes} min
            </div>
        `;

        // Show creator for public workouts
        if (this.config.showCreator && this.workout.creator_name) {
            html += `
                <p class="text-muted small mb-2">
                    <i class="bx bx-user me-1"></i>
                    ${this._escapeHtml(this.workout.creator_name)}
                </p>
            `;
        }

        // Allow custom metadata injection
        if (this.config.customMetadata) {
            html += this.config.customMetadata(this.workout);
        }

        return html;
    }

    /**
     * Get estimated workout duration in minutes
     * @returns {number} Estimated duration (~5 min per exercise)
     */
    _getEstimatedDuration(workoutData) {
        const totalExercises = this._getTotalExerciseCount(workoutData);
        return totalExercises * 5; // ~5 min per exercise baseline
    }
    
    /**
     * Render description preview
     */
    _renderDescription() {
        if (!this.config.showDescription) return '';
        
        const workoutData = this.workout.workout_data || this.workout;
        const description = workoutData.description || this.workout.description;
        
        if (!description) return '';
        
        const preview = description.length > 100 
            ? description.substring(0, 100) + '...' 
            : description;
        
        return `
            <p class="card-text text-muted small mb-2" style="min-height: 2.2em; line-height: 1.3;">
                ${this._escapeHtml(preview)}
            </p>
        `;
    }
    
    /**
     * Render tags
     */
    _renderTags() {
        if (!this.config.showTags) return '';
        
        const workoutData = this.workout.workout_data || this.workout;
        const tags = workoutData.tags || this.workout.tags || [];
        
        if (tags.length === 0) return '';
        
        return `
            <div class="mb-2">
                ${tags.slice(0, 3).map(tag => 
                    `<span class="badge bg-label-secondary me-1 small">${this._escapeHtml(tag)}</span>`
                ).join('')}
                ${tags.length > 3 ? `<span class="badge bg-label-secondary small">+${tags.length - 3}</span>` : ''}
            </div>
        `;
    }
    
    /**
     * Render exercise preview - compact hint showing top 2 exercises (no bullets)
     */
    _renderExercisePreview() {
        if (!this.config.showExercisePreview) return '';

        const workoutData = this.workout.workout_data || this.workout;
        const exercises = [];

        // Collect exercises from groups
        if (workoutData.exercise_groups) {
            workoutData.exercise_groups.forEach(group => {
                if (group.exercises) {
                    Object.values(group.exercises).forEach(name => {
                        if (name) exercises.push(name);
                    });
                }
            });
        }

        // Add bonus exercises
        if (workoutData.bonus_exercises) {
            workoutData.bonus_exercises.forEach(bonus => {
                if (bonus.name) exercises.push(bonus.name);
            });
        }

        if (exercises.length === 0) return '';

        // Show first 2 exercises only (hint, not full list)
        const maxPreview = 2;
        const displayExercises = exercises.slice(0, maxPreview);
        const remaining = exercises.length - displayExercises.length;

        return `
            <div class="exercise-preview mb-2">
                <div class="exercise-preview-list">
                    ${displayExercises.map(ex =>
                        `<div class="exercise-preview-item text-truncate">${this._escapeHtml(ex)}</div>`
                    ).join('')}
                </div>
                ${remaining > 0 ? `<small class="exercise-preview-more text-muted">+${remaining} more</small>` : ''}
            </div>
        `;
    }
    
    /**
     * Render stats (views, saves)
     */
    _renderStats() {
        if (!this.config.showStats) return '';
        
        const stats = this.workout.stats || {};
        const viewCount = stats.view_count || 0;
        const saveCount = stats.save_count || 0;
        
        return `
            <div class="d-flex gap-3 mb-2">
                <small class="text-muted">
                    <i class="bx bx-show me-1"></i>
                    ${viewCount}
                </small>
                <small class="text-muted">
                    <i class="bx bx-bookmark me-1"></i>
                    ${saveCount}
                </small>
            </div>
        `;
    }
    
    /**
     * Render action buttons - simplified to show only primary CTA
     * Secondary actions (edit, view, history) moved to dropdown menu
     * Supports smart button states: never_started, in_progress, completed
     */
    _renderActions() {
        if (this.config.deleteMode && this.config.onDelete) {
            return `
                <button class="btn btn-danger btn-card-action w-100" data-action="delete">
                    <i class="bx bx-trash me-1"></i>Delete Workout
                </button>
            `;
        }

        if (this.config.actions.length === 0) return '';

        // Filter to get only primary actions (not edit, view, history which go to dropdown)
        const dropdownActionIds = this.config.dropdownActions || ['edit', 'delete'];
        const primaryActions = this.config.actions.filter(action =>
            !dropdownActionIds.includes(action.id) && action.id !== 'edit'
        );

        if (primaryActions.length === 0) return '';

        // Get session state if callback provided
        let sessionState = 'never_started';
        if (this.config.getSessionState) {
            sessionState = this.config.getSessionState(this.workout.id) || 'never_started';
        }

        // Single primary CTA - with smart state labels
        if (primaryActions.length === 1) {
            const action = primaryActions[0];
            const buttonConfig = this._getButtonConfigForState(action, sessionState);

            return `
                <button class="btn btn-${buttonConfig.variant} btn-card-action w-100" data-action="${action.id}">
                    <i class="bx ${buttonConfig.icon} me-1"></i>${buttonConfig.label}
                </button>
            `;
        }

        // Multiple primary actions - show as button group (rare case)
        return `
            <div class="btn-group w-100" role="group">
                ${primaryActions.map(action => `
                    <button class="btn btn-${action.variant} btn-card-action" data-action="${action.id}">
                        ${action.icon ? `<i class="bx ${action.icon} me-1"></i>` : ''}${action.label}
                    </button>
                `).join('')}
            </div>
        `;
    }

    /**
     * Get button configuration based on session state
     * @param {Object} action - The base action config
     * @param {string} sessionState - 'never_started', 'in_progress', or 'completed'
     * @returns {Object} Button config with label, icon, variant
     */
    _getButtonConfigForState(action, sessionState) {
        // Only apply state logic to 'start' action
        if (action.id !== 'start') {
            return {
                label: action.label,
                icon: action.icon || 'bx-play',
                variant: action.variant || 'primary'
            };
        }

        switch (sessionState) {
            case 'in_progress':
                return {
                    label: 'Resume Workout',
                    icon: 'bx-play-circle',
                    variant: 'warning'
                };
            case 'completed':
                return {
                    label: 'Completed',
                    icon: 'bx-check-circle',
                    variant: 'success'
                };
            case 'never_started':
            default:
                return {
                    label: 'Start Workout',
                    icon: 'bx-play',
                    variant: 'primary'
                };
        }
    }
    
    /**
     * Attach event listeners
     */
    _attachEventListeners() {
        if (!this.element) return;

        // Card click handler (tap card to view details)
        if (this.config.onCardClick) {
            this.element.addEventListener('click', (e) => {
                // Don't trigger if clicking a button, dropdown, or link
                if (!e.target.closest('button') && !e.target.closest('.dropdown') && !e.target.closest('a')) {
                    this.config.onCardClick(this.workout, e);
                }
            });
        }

        // Action button and dropdown handlers
        const actionElements = this.element.querySelectorAll('[data-action]');
        actionElements.forEach(element => {
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                const actionId = element.dataset.action;

                if (actionId === 'delete' && this.config.onDelete) {
                    const workoutData = this.workout.workout_data || this.workout;
                    const name = workoutData.name || this.workout.name || 'Untitled Workout';
                    this.config.onDelete(this.workout.id, name);
                } else if (actionId === 'view-details' && this.config.onViewDetails) {
                    // View Details from dropdown menu
                    this.config.onViewDetails(this.workout);
                } else if (actionId === 'edit') {
                    // Edit action from dropdown - look in full actions array
                    const editAction = this.config.actions.find(a => a.id === 'edit');
                    if (editAction && editAction.onClick) {
                        editAction.onClick(this.workout);
                    }
                } else if (actionId === 'history') {
                    // History action from dropdown
                    const historyAction = this.config.actions.find(a => a.id === 'history');
                    if (historyAction && historyAction.onClick) {
                        historyAction.onClick(this.workout);
                    }
                } else if (actionId === 'duplicate') {
                    // Duplicate action from dropdown
                    const duplicateAction = this.config.actions.find(a => a.id === 'duplicate');
                    if (duplicateAction && duplicateAction.onClick) {
                        duplicateAction.onClick(this.workout);
                    }
                } else if (actionId === 'share') {
                    // Share action from dropdown
                    const shareAction = this.config.actions.find(a => a.id === 'share');
                    if (shareAction && shareAction.onClick) {
                        shareAction.onClick(this.workout);
                    }
                } else {
                    // Other actions (like 'start')
                    const action = this.config.actions.find(a => a.id === actionId);
                    if (action && action.onClick) {
                        action.onClick(this.workout);
                    }
                }
            });
        });

        // Favorite toggle handler
        const favoriteToggle = this.element.querySelector('.favorite-toggle');
        if (favoriteToggle) {
            favoriteToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const workoutId = favoriteToggle.dataset.workoutId;
                const currentState = favoriteToggle.dataset.isFavorite === 'true';
                // Call global handler
                if (window.toggleWorkoutFavorite) {
                    window.toggleWorkoutFavorite(e, workoutId, currentState);
                }
            });
        }
    }
    
    /**
     * Set delete mode
     * @param {boolean} enabled
     */
    setDeleteMode(enabled) {
        this.config.deleteMode = enabled;
        
        if (this.element) {
            const cardBody = this.element.querySelector('.card-body');
            const footerContent = cardBody?.querySelector('.card-footer-content');
            
            if (enabled) {
                this.element.classList.add('delete-mode');
            } else {
                this.element.classList.remove('delete-mode');
            }
            
            // Replace footer content with updated actions
            if (footerContent) {
                footerContent.innerHTML = this._renderActions();
                this._attachEventListeners();
            }
        }
    }
    
    /**
     * Update workout data
     * @param {Object} workout
     */
    update(workout) {
        this.workout = workout;
        
        if (this.element) {
            const newElement = this.render();
            this.element.replaceWith(newElement);
        }
    }
    
    /**
     * Destroy the card
     */
    destroy() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
    
    /**
     * Get total exercise count
     */
    _getTotalExerciseCount(workoutData) {
        let count = 0;
        
        // Count exercises in groups
        if (workoutData.exercise_groups) {
            workoutData.exercise_groups.forEach(group => {
                count += Object.keys(group.exercises || {}).length;
            });
        }
        
        // Add bonus exercises
        count += (workoutData.bonus_exercises || []).length;
        
        return count;
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for global use
window.WorkoutCard = WorkoutCard;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutCard;
}

console.log('📦 WorkoutCard component loaded');