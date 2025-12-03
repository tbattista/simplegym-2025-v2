/**
 * Ghost Gym - Program Card Component
 * Reusable program card with configurable actions and display options
 * Matches the WorkoutCard component styling for UI consistency
 * @version 1.0.0
 */

class ProgramCard {
    constructor(program, config = {}) {
        this.program = program;
        this.config = {
            // Display options
            showStats: true,
            showTags: true,
            showDescription: true,
            showDifficulty: true,
            showDuration: true,
            
            // Action buttons
            actions: [],
            
            // Delete mode
            deleteMode: false,
            onDelete: null,
            
            // Callbacks
            onCardClick: null,
            
            // Workouts reference for calculating stats
            workouts: [],
            
            ...config
        };
        
        this.element = null;
    }
    
    /**
     * Render the program card
     * @returns {HTMLElement} The card element
     */
    render() {
        const col = document.createElement('div');
        col.className = 'col';
        
        const cardClass = this.config.deleteMode ? 'card h-100 delete-mode' : 'card h-100';
        
        col.innerHTML = `
            <div class="${cardClass}" data-program-id="${this.program.id}">
                <div class="card-body">
                    ${this._renderHeader()}
                    ${this._renderMetadata()}
                    ${this._renderDescription()}
                    ${this._renderTags()}
                    ${this._renderActions()}
                </div>
            </div>
        `;
        
        this.element = col;
        this._attachEventListeners();
        
        return col;
    }
    
    /**
     * Render card header (title with difficulty badge)
     */
    _renderHeader() {
        const name = this.program.name || 'Untitled Program';
        
        let difficultyBadge = '';
        if (this.config.showDifficulty && this.program.difficulty_level) {
            const difficultyColors = {
                'beginner': 'success',
                'intermediate': 'warning',
                'advanced': 'danger'
            };
            const color = difficultyColors[this.program.difficulty_level] || 'secondary';
            difficultyBadge = `<span class="badge bg-label-${color} ms-2">${this.program.difficulty_level}</span>`;
        }
        
        return `
            <h5 class="card-title mb-2 d-flex align-items-center">
                ${this._escapeHtml(name)}
                ${difficultyBadge}
            </h5>
        `;
    }
    
    /**
     * Render metadata (workouts, exercises, duration)
     */
    _renderMetadata() {
        const workoutCount = this.program.workouts?.length || 0;
        const totalExercises = this._getTotalExerciseCount();
        
        let html = `
            <div class="mb-2">
                <span class="badge bg-label-primary me-1">
                    <i class="bx bx-dumbbell me-1"></i>${workoutCount} ${workoutCount === 1 ? 'workout' : 'workouts'}
                </span>
                <span class="badge bg-label-info">
                    <i class="bx bx-list-ul me-1"></i>${totalExercises} ${totalExercises === 1 ? 'exercise' : 'exercises'}
                </span>
        `;
        
        // Show duration if available
        if (this.config.showDuration && this.program.duration_weeks) {
            html += `
                <span class="badge bg-label-secondary ms-1">
                    <i class="bx bx-time me-1"></i>${this.program.duration_weeks} ${this.program.duration_weeks === 1 ? 'week' : 'weeks'}
                </span>
            `;
        }
        
        html += `</div>`;
        
        return html;
    }
    
    /**
     * Render description preview
     */
    _renderDescription() {
        if (!this.config.showDescription) return '';
        
        const description = this.program.description;
        
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
        
        const tags = this.program.tags || [];
        
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
     * Render action buttons
     */
    _renderActions() {
        if (this.config.deleteMode && this.config.onDelete) {
            return `
                <button class="btn btn-delete-program w-100 mt-auto" data-action="delete">
                    <i class="bx bx-trash me-1"></i>Delete Program
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
                    this.config.onCardClick(this.program, e);
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
                    const name = this.program.name || 'Untitled Program';
                    this.config.onDelete(this.program.id, name);
                } else {
                    const action = this.config.actions.find(a => a.id === actionId);
                    if (action && action.onClick) {
                        action.onClick(this.program);
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
            if (enabled) {
                card.classList.add('delete-mode');
            } else {
                card.classList.remove('delete-mode');
            }
            
            // Re-render actions
            const cardBody = card.querySelector('.card-body');
            const actionsContainer = cardBody.querySelector('.btn-group, .btn-delete-program, button[data-action]')?.parentElement;
            if (actionsContainer) {
                actionsContainer.innerHTML = this._renderActions();
                this._attachEventListeners();
            }
        }
    }
    
    /**
     * Update program data
     * @param {Object} program
     */
    update(program) {
        this.program = program;
        
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
     * Get total exercise count from all workouts in program
     */
    _getTotalExerciseCount() {
        let count = 0;
        
        if (this.program.workouts && this.config.workouts) {
            this.program.workouts.forEach(programWorkout => {
                const workout = this.config.workouts.find(w => w.id === programWorkout.workout_id);
                if (workout) {
                    // Count exercises in groups
                    if (workout.exercise_groups) {
                        workout.exercise_groups.forEach(group => {
                            count += Object.keys(group.exercises || {}).length;
                        });
                    }
                    // Add bonus exercises
                    count += (workout.bonus_exercises || []).length;
                }
            });
        }
        
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
window.ProgramCard = ProgramCard;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgramCard;
}

console.log('📦 ProgramCard component loaded');