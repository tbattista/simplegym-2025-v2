/**
 * Ghost Gym - Workout Components
 * Reusable workout component definitions for the component registry
 * @version 1.0.0
 */

(function() {
    'use strict';
    
    // Ensure component registry exists
    if (!window.componentRegistry) {
        console.error('❌ Component Registry not available. Load component-registry.js first.');
        return;
    }
    
    const registry = window.componentRegistry;
    
    /**
     * Workout Grid Component
     * Full-page workout list view with search and actions
     * Used in: workouts.html
     */
    registry.register('workoutGrid', {
        dependencies: ['renderWorkoutsView', 'dataManager'],
        dataRequirements: ['workouts', 'programs'],
        
        renderFunction: (container, options) => {
            const gridId = options.gridId || 'workoutsViewGrid';
            const emptyStateId = options.emptyStateId || 'workoutsViewEmptyState';
            
            // Create grid structure if not already present
            if (!document.getElementById(gridId)) {
                container.innerHTML = `
                    <div class="row g-3" id="${gridId}">
                        <!-- Workouts will be rendered here -->
                    </div>
                    <div id="${emptyStateId}" class="text-center py-5" style="display: none;">
                        <i class="bx bx-dumbbell display-1 text-muted"></i>
                        <h5 class="mt-3">No Workouts Yet</h5>
                        <p class="text-muted">Create your first workout to get started</p>
                    </div>
                `;
            }
            
            // Render workouts using the views module
            if (window.renderWorkoutsView) {
                console.log('🎨 Rendering workouts view...');
                window.renderWorkoutsView();
            } else {
                console.error('❌ renderWorkoutsView function not available');
                container.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bx bx-error-circle me-2"></i>
                        Error: Workout rendering function not available
                    </div>
                `;
            }
        },
        
        eventHandlers: [
            { elementId: 'workoutsViewSearch', event: 'input', functionName: 'filterWorkoutsView' },
            { elementId: 'workoutsViewNewBtn', event: 'click', functionName: 'showWorkoutModal' }
        ],
        
        defaultConfig: {
            gridId: 'workoutsViewGrid',
            emptyStateId: 'workoutsViewEmptyState',
            showSearch: true,
            showNewButton: true
        }
    });
    
    /**
     * Workout Cards Component
     * Compact workout cards for builder view with drag-and-drop
     * Used in: builder.html
     */
    registry.register('workoutCards', {
        dependencies: ['renderWorkouts', 'dataManager'],
        dataRequirements: ['workouts'],
        
        renderFunction: (container, options) => {
            const gridId = options.gridId || 'workoutsGrid';
            const emptyStateId = options.emptyStateId || 'workoutsEmptyState';
            
            // Create grid structure if not already present
            if (!document.getElementById(gridId)) {
                container.innerHTML = `
                    <div id="${gridId}" class="row g-3">
                        <!-- Workout cards will be rendered here -->
                    </div>
                    <div id="${emptyStateId}" class="text-center py-5" style="display: none;">
                        <i class="bx bx-dumbbell display-1 text-muted"></i>
                        <h5 class="mt-3">No Workouts Yet</h5>
                        <p class="text-muted">Create your first workout to get started</p>
                    </div>
                `;
            }
            
            // Render workouts using the workouts module
            if (window.renderWorkouts) {
                console.log('🎨 Rendering workout cards...');
                window.renderWorkouts();
            } else {
                console.error('❌ renderWorkouts function not available');
            }
        },
        
        eventHandlers: [
            { elementId: 'workoutSearch', event: 'input', functionName: 'filterWorkouts' },
            { elementId: 'newWorkoutBtn', event: 'click', functionName: 'showWorkoutModal' },
            { elementId: 'addNewWorkoutBtn', event: 'click', functionName: 'showWorkoutModal' },
            { elementId: 'createFirstWorkoutBtn', event: 'click', functionName: 'showWorkoutModal' }
        ],
        
        defaultConfig: {
            gridId: 'workoutsGrid',
            emptyStateId: 'workoutsEmptyState',
            draggable: true,
            compact: false
        }
    });
    
    /**
     * Workout Modal Component
     * Modal for creating and editing workouts
     * Used in: All pages with workout management
     */
    registry.register('workoutModal', {
        dependencies: ['saveWorkout', 'addExerciseGroup', 'addBonusExercise'],
        dataRequirements: [],
        
        initFunction: async (options) => {
            // Ensure modal exists in DOM
            const modal = document.getElementById('workoutModal');
            if (!modal) {
                console.warn('⚠️ Workout modal not found in DOM');
                return;
            }
            
            // Initialize exercise autocomplete when modal is shown
            modal.addEventListener('shown.bs.modal', function() {
                console.log('🔧 Workout modal shown, initializing autocompletes...');
                
                // Ensure at least one exercise group exists
                const exerciseGroups = document.getElementById('exerciseGroups');
                if (exerciseGroups && exerciseGroups.children.length === 0) {
                    if (window.addExerciseGroup) {
                        window.addExerciseGroup();
                    }
                }
                
                // Initialize autocompletes after a short delay
                setTimeout(() => {
                    if (window.initializeExerciseAutocompletes) {
                        window.initializeExerciseAutocompletes();
                    }
                }, 100);
            });
            
            // Clear form when modal is hidden
            modal.addEventListener('hidden.bs.modal', function() {
                if (window.clearWorkoutForm) {
                    window.clearWorkoutForm();
                }
            });
            
            console.log('✅ Workout modal initialized');
        },
        
        eventHandlers: [
            { elementId: 'saveWorkoutBtn', event: 'click', functionName: 'saveWorkout' },
            { elementId: 'addExerciseGroupBtn', event: 'click', functionName: 'addExerciseGroup' },
            { elementId: 'addBonusExerciseBtn', event: 'click', functionName: 'addBonusExercise' },
            { elementId: 'saveCustomExerciseBtn', event: 'click', functionName: 'saveCustomExercise' }
        ],
        
        defaultConfig: {
            modalId: 'workoutModal'
        }
    });
    
    /**
     * Workout List Component (Compact)
     * Simple list view of workouts for sidebars or widgets
     * Future use: Dashboard widgets, quick access panels
     */
    registry.register('workoutList', {
        dependencies: ['dataManager'],
        dataRequirements: ['workouts'],
        
        renderFunction: (container, options) => {
            const maxItems = options.maxItems || 10;
            const workouts = window.ghostGym?.workouts || [];
            const displayWorkouts = workouts.slice(0, maxItems);
            
            if (displayWorkouts.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-3 text-muted">
                        <i class="bx bx-dumbbell"></i>
                        <p class="mb-0 small">No workouts available</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <div class="list-group">
                    ${displayWorkouts.map(workout => `
                        <a href="#" class="list-group-item list-group-item-action" 
                           onclick="editWorkout('${workout.id}'); return false;">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-0">${escapeHtml(workout.name)}</h6>
                                    <small class="text-muted">
                                        ${workout.exercise_groups?.length || 0} groups
                                    </small>
                                </div>
                                <i class="bx bx-chevron-right"></i>
                            </div>
                        </a>
                    `).join('')}
                </div>
            `;
        },
        
        defaultConfig: {
            maxItems: 10,
            showActions: false
        }
    });
    
    console.log('📦 Workout components registered:', [
        'workoutGrid',
        'workoutCards', 
        'workoutModal',
        'workoutList'
    ]);
    
})();