/**
 * Ghost Gym - Workout Detail Offcanvas Component
 * Unified offcanvas for displaying workout details
 * @version 1.0.0
 */

class WorkoutDetailOffcanvas {
    constructor(config = {}) {
        this.config = {
            // Display options
            showCreator: false,
            showStats: false,
            showDates: true,
            
            // Footer actions
            actions: [],
            
            ...config
        };
        
        this.currentWorkout = null;
        this.offcanvasId = 'workoutDetailOffcanvas';
        this.offcanvasElement = null;
        this.bsOffcanvas = null;
        
        this.initialize();
    }
    
    /**
     * Initialize the offcanvas
     */
    initialize() {
        this.createOffcanvasHTML();
        this.attachEventListeners();
        console.log('✅ WorkoutDetailOffcanvas component initialized');
    }
    
    /**
     * Create offcanvas HTML
     */
    createOffcanvasHTML() {
        // Remove existing offcanvas if present
        const existing = document.getElementById(this.offcanvasId);
        if (existing) {
            existing.remove();
        }
        
        const offcanvasHTML = `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base offcanvas-desktop-side" tabindex="-1" id="${this.offcanvasId}" aria-labelledby="${this.offcanvasId}Label" data-bs-scroll="false">
                <div class="offcanvas-header border-bottom">
                    <h5 class="offcanvas-title" id="${this.offcanvasId}Label">
                        <i class="bx bx-dumbbell me-2"></i>
                        <span id="workoutDetailName">Workout Details</span>
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div class="offcanvas-body" id="workoutDetailBody">
                    <!-- Loading state -->
                    <div id="detailLoadingState" class="text-center py-5">
                        <div class="spinner-border text-primary mb-3" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="text-muted">Loading workout details...</p>
                    </div>
                    
                    <!-- Content (hidden initially) -->
                    <div id="detailContent" style="display: none;">
                        <!-- Content will be rendered here -->
                    </div>
                </div>
                <div class="offcanvas-footer border-top p-3" id="workoutDetailFooter">
                    <!-- Action buttons will be rendered here -->
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', offcanvasHTML);
        this.offcanvasElement = document.getElementById(this.offcanvasId);
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Event listeners for action buttons will be attached when rendering
    }
    
    /**
     * Show offcanvas with workout details
     * @param {Object} workout
     */
    async show(workout) {
        console.log('📋 Opening workout detail offcanvas:', workout.id);
        
        this.currentWorkout = workout;
        this.showLoadingState();
        
        // Initialize and show offcanvas
        if (!this.bsOffcanvas) {
            this.bsOffcanvas = new bootstrap.Offcanvas(this.offcanvasElement, { scroll: false });
        }
        this.bsOffcanvas.show();
        
        // Render workout details
        this.renderWorkoutDetails(workout);
    }
    
    /**
     * Hide offcanvas
     */
    hide() {
        if (this.bsOffcanvas) {
            this.bsOffcanvas.hide();
        }
    }
    
    /**
     * Render workout details
     * @param {Object} workout
     */
    renderWorkoutDetails(workout) {
        const workoutData = workout.workout_data || workout;
        
        // Update title
        document.getElementById('workoutDetailName').textContent = workoutData.name || 'Untitled Workout';
        
        // Render content
        const contentHTML = this._generateContentHTML(workout, workoutData);
        document.getElementById('detailContent').innerHTML = contentHTML;
        
        // Render footer actions
        this._renderFooterActions(workout);
        
        // Show content
        this.showContent();
    }
    
    /**
     * Generate content HTML
     */
    _generateContentHTML(workout, workoutData) {
        let html = '';
        
        // Metadata section
        html += '<div class="workout-detail-meta mb-4">';
        
        // Creator (for public workouts)
        if (this.config.showCreator && workout.creator_name) {
            html += `
                <p class="text-muted mb-2">
                    <i class="bx bx-user me-1"></i>
                    ${this._escapeHtml(workout.creator_name)}
                </p>
            `;
        }
        
        // Description
        if (workoutData.description) {
            html += `<p class="text-muted">${this._escapeHtml(workoutData.description)}</p>`;
        }
        
        // Dates (for user's workouts)
        if (this.config.showDates) {
            html += `
                <div class="d-flex gap-3 mb-2 flex-wrap">
                    <span class="text-muted small"><i class="bx bx-calendar me-1"></i> Created: ${this._formatDate(workoutData.created_date || workout.created_date)}</span>
                    <span class="text-muted small"><i class="bx bx-time me-1"></i> Modified: ${this._formatDate(workoutData.modified_date || workout.modified_date)}</span>
                </div>
            `;
        }
        
        // Stats (for public workouts)
        if (this.config.showStats && workout.stats) {
            html += `
                <div class="d-flex gap-3 mb-2">
                    <span class="text-muted small"><i class="bx bx-show me-1"></i> ${workout.stats.view_count || 0} views</span>
                    <span class="text-muted small"><i class="bx bx-bookmark me-1"></i> ${workout.stats.save_count || 0} saves</span>
                </div>
            `;
        }
        
        // Tags
        const tags = workoutData.tags || workout.tags || [];
        if (tags.length > 0) {
            html += `
                <div class="mt-2">
                    ${tags.map(tag => `<span class="badge bg-label-secondary me-1">${this._escapeHtml(tag)}</span>`).join('')}
                </div>
            `;
        }
        
        html += '</div>';
        
        // Exercise Groups
        const exerciseGroups = workoutData.exercise_groups || [];
        if (exerciseGroups.length > 0) {
            html += '<h6 class="mb-3">Exercise Groups</h6>';
            
            exerciseGroups.forEach((group, index) => {
                // Build exercise list
                const exercises = [];
                if (group.exercises) {
                    if (group.exercises.a) exercises.push({ label: '', name: group.exercises.a });
                    if (group.exercises.b) exercises.push({ label: 'Alt: ', name: group.exercises.b });
                    if (group.exercises.c) exercises.push({ label: 'Alt2: ', name: group.exercises.c });
                }
                
                // Build exercises HTML - each on new line
                let exercisesHtml = '';
                if (exercises.length > 0) {
                    exercisesHtml = exercises.map(ex =>
                        `<div class="exercise-line">${ex.label ? `<span class="text-muted">${ex.label}</span>` : ''}${this._escapeHtml(ex.name)}</div>`
                    ).join('');
                } else {
                    exercisesHtml = '<div class="exercise-line text-muted">No exercises</div>';
                }
                
                // Build meta text (plain text with bullet separators)
                const parts = [`${group.sets || '3'} sets`, `${group.reps || '8-12'} reps`, `${group.rest || '60s'} rest`];
                if (group.default_weight) {
                    parts.push(`${group.default_weight} ${group.default_weight_unit || 'lbs'}`);
                }
                const metaText = parts.join(' • ');
                
                html += `
                    <div class="card mb-2">
                        <div class="card-body py-2 px-3">
                            <div class="exercise-list mb-1">
                                ${exercisesHtml}
                            </div>
                            <div class="exercise-meta-text text-muted small">${metaText}</div>
                            ${group.notes ? `<div class="mt-1 small text-muted">${this._escapeHtml(group.notes)}</div>` : ''}
                        </div>
                    </div>
                `;
            });
        }
        
        // Bonus Exercises
        const bonusExercises = workoutData.bonus_exercises || [];
        if (bonusExercises.length > 0) {
            html += '<h6 class="mb-3 mt-4">Additional Exercises</h6>';
            
            bonusExercises.forEach((bonus) => {
                // Build meta text (plain text with bullet separators)
                const metaText = `${bonus.sets || '2'} sets • ${bonus.reps || '15'} reps • ${bonus.rest || '30s'} rest`;
                
                html += `
                    <div class="card mb-2">
                        <div class="card-body py-2 px-3">
                            <div class="exercise-line">${this._escapeHtml(bonus.name)}</div>
                            <div class="exercise-meta-text text-muted small">${metaText}</div>
                            ${bonus.notes ? `<div class="mt-1 small text-muted">${this._escapeHtml(bonus.notes)}</div>` : ''}
                        </div>
                    </div>
                `;
            });
        }
        
        return html;
    }
    
    /**
     * Render footer actions
     * Supports two-row layout: secondary actions on top, primary action full-width below
     */
    _renderFooterActions(workout) {
        const footer = document.getElementById('workoutDetailFooter');
        if (!footer) return;

        if (this.config.actions.length === 0) {
            footer.style.display = 'none';
            return;
        }

        footer.style.display = 'block';

        // Separate primary and secondary actions
        const primaryActions = this.config.actions.filter(a => a.primary);
        const secondaryActions = this.config.actions.filter(a => !a.primary);

        let actionsHTML = '';

        // If we have both primary and secondary, use two-row layout
        if (primaryActions.length > 0 && secondaryActions.length > 0) {
            actionsHTML = `
                <div class="d-flex gap-2 mb-2 detail-offcanvas-buttons">
                    ${secondaryActions.map(action => `
                        <button type="button"
                                class="btn btn-${action.variant} flex-fill"
                                data-action="${action.id}">
                            ${action.icon ? `<i class="bx ${action.icon} me-1"></i>` : ''}
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
                <div class="d-flex gap-2">
                    ${primaryActions.map(action => `
                        <button type="button"
                                class="btn btn-${action.variant} flex-fill"
                                data-action="${action.id}">
                            ${action.icon ? `<i class="bx ${action.icon} me-1"></i>` : ''}
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            `;
        } else {
            // Single row layout (backward compatible)
            actionsHTML = `
                <div class="d-flex gap-2">
                    ${this.config.actions.map(action => `
                        <button type="button"
                                class="btn btn-${action.variant} flex-fill"
                                data-action="${action.id}">
                            ${action.icon ? `<i class="bx ${action.icon} me-1"></i>` : ''}
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            `;
        }

        footer.innerHTML = actionsHTML;

        // Attach action listeners
        footer.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', () => {
                const actionId = button.dataset.action;
                const action = this.config.actions.find(a => a.id === actionId);

                if (action && action.onClick) {
                    action.onClick(workout);
                }
            });
        });
    }
    
    /**
     * Update workout data
     * @param {Object} workout
     */
    update(workout) {
        this.currentWorkout = workout;
        this.renderWorkoutDetails(workout);
    }
    
    /**
     * Show loading state
     */
    showLoadingState() {
        document.getElementById('detailLoadingState').style.display = 'block';
        document.getElementById('detailContent').style.display = 'none';
    }
    
    /**
     * Show content
     */
    showContent() {
        document.getElementById('detailLoadingState').style.display = 'none';
        document.getElementById('detailContent').style.display = 'block';
    }
    
    /**
     * Destroy the offcanvas
     */
    destroy() {
        if (this.bsOffcanvas) {
            this.bsOffcanvas.dispose();
            this.bsOffcanvas = null;
        }
        
        if (this.offcanvasElement) {
            this.offcanvasElement.remove();
            this.offcanvasElement = null;
        }
    }
    
    /**
     * Format date
     */
    _formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        } catch (e) {
            return 'N/A';
        }
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
window.WorkoutDetailOffcanvas = WorkoutDetailOffcanvas;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutDetailOffcanvas;
}

console.log('📦 WorkoutDetailOffcanvas component loaded');