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
            
            // Action buttons
            actions: [],
            
            // Delete mode
            deleteMode: false,
            onDelete: null,
            
            // Custom metadata
            customMetadata: null,
            
            // Callbacks
            onCardClick: null,
            
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
            <div class="card-body">
                ${this._renderHeader()}
                ${this._renderMetadata()}
                ${this._renderDescription()}
                ${this._renderExercisePreview()}
                ${this._renderTags()}
                ${this._renderStats()}
                <div class="card-actions mt-auto">
                    ${this._renderActions()}
                </div>
            </div>
        `;
        
        this.element = card;
        this._attachEventListeners();
        
        return card;
    }
    
    /**
     * Render card header (title)
     */
    _renderHeader() {
        const workoutData = this.workout.workout_data || this.workout;
        const name = workoutData.name || this.workout.name || 'Untitled Workout';
        
        return `
            <h5 class="card-title mb-2">${this._escapeHtml(name)}</h5>
        `;
    }
    
    /**
     * Render metadata (groups, exercises, creator)
     */
    _renderMetadata() {
        const workoutData = this.workout.workout_data || this.workout;
        const groupCount = (workoutData.exercise_groups || []).length;
        const totalExercises = this._getTotalExerciseCount(workoutData);
        
        let html = `
            <div class="mb-2">
                <span class="badge bg-label-primary me-1">${groupCount} ${groupCount === 1 ? 'group' : 'groups'}</span>
                <span class="badge bg-label-info">${totalExercises} ${totalExercises === 1 ? 'exercise' : 'exercises'}</span>
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
     * Render exercise preview (first few exercises)
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
        
        // Show first 3 exercises
        const displayExercises = exercises.slice(0, 3);
        const remaining = exercises.length - displayExercises.length;
        
        return `
            <div class="exercise-preview mb-2">
                <small class="text-muted d-block mb-1">Exercises:</small>
                ${displayExercises.map(ex =>
                    `<small class="d-block text-truncate">• ${this._escapeHtml(ex)}</small>`
                ).join('')}
                ${remaining > 0 ? `<small class="text-muted">+${remaining} more</small>` : ''}
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
     * Render action buttons
     */
    _renderActions() {
        if (this.config.deleteMode && this.config.onDelete) {
            return `
                <button class="btn btn-delete-workout w-100 mt-auto" data-action="delete">
                    <i class="bx bx-trash me-1"></i>Delete Workout
                </button>
            `;
        }
        
        if (this.config.actions.length === 0) return '';
        
        // Single action - full width button
        if (this.config.actions.length === 1) {
            const action = this.config.actions[0];
            return `
                <button class="btn btn-${action.variant} w-100 mt-auto" data-action="${action.id}">
                    ${action.icon ? `<i class="bx ${action.icon} me-1"></i>` : ''}${action.label}
                </button>
            `;
        }
        
        // Multiple actions - button group
        return `
            <div class="btn-group btn-group-sm w-100 mt-auto" role="group">
                ${this.config.actions.map(action => `
                    <button class="btn btn-${action.variant}" data-action="${action.id}">
                        ${action.icon ? `<i class="bx ${action.icon} me-1"></i>` : ''}${action.label}
                    </button>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Attach event listeners
     */
    _attachEventListeners() {
        if (!this.element) return;
        
        const card = this.element.querySelector('.card');
        
        // Card click handler
        if (this.config.onCardClick) {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking a button
                if (!e.target.closest('button')) {
                    this.config.onCardClick(this.workout, e);
                }
            });
        }
        
        // Action button handlers
        const buttons = this.element.querySelectorAll('[data-action]');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const actionId = button.dataset.action;
                
                if (actionId === 'delete' && this.config.onDelete) {
                    const workoutData = this.workout.workout_data || this.workout;
                    const name = workoutData.name || this.workout.name || 'Untitled Workout';
                    this.config.onDelete(this.workout.id, name);
                } else {
                    const action = this.config.actions.find(a => a.id === actionId);
                    if (action && action.onClick) {
                        action.onClick(this.workout);
                    }
                }
            });
        });
    }
    
    /**
     * Set delete mode
     * @param {boolean} enabled
     */
    setDeleteMode(enabled) {
        this.config.deleteMode = enabled;
        
        if (this.element) {
            const card = this.element.querySelector('.card');
            const cardBody = card.querySelector('.card-body');
            const actionsWrapper = cardBody.querySelector('.card-actions');
            
            if (enabled) {
                card.classList.add('delete-mode');
            } else {
                card.classList.remove('delete-mode');
            }
            
            // Replace actions content only
            if (actionsWrapper) {
                actionsWrapper.innerHTML = this._renderActions();
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