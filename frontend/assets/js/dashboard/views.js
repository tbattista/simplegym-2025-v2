/**
 * Ghost Gym Dashboard - View Rendering System
 * Handles rendering for Programs and Workouts views (now standalone pages)
 * @version 2.0.0
 */

/**
 * Render Programs View (dedicated full-page list)
 */
function renderProgramsView() {
    const programsList = document.getElementById('programsViewList');
    if (!programsList || !window.ghostGym) return;
    
    const searchInput = document.getElementById('programsViewSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    // Enhanced filtering with tags
    const filteredPrograms = window.ghostGym.programs.filter(program =>
        program.name.toLowerCase().includes(searchTerm) ||
        (program.description || '').toLowerCase().includes(searchTerm) ||
        (program.tags || []).some(tag => tag.toLowerCase().includes(searchTerm))
    );
    
    // Empty state with call-to-action
    if (filteredPrograms.length === 0) {
        const emptyMessage = searchTerm
            ? `<h5>No Programs Match "${escapeHtml(searchTerm)}"</h5>
               <p class="text-muted">Try adjusting your search or create a new program</p>`
            : `<h5>No Programs Yet</h5>
               <p class="text-muted">Create your first program to get started</p>
               <button class="btn btn-primary mt-3" onclick="showProgramModal()">
                   <i class="bx bx-plus me-1"></i>Create Your First Program
               </button>`;
        
        programsList.innerHTML = `
            <div class="list-group-item text-center py-5">
                <i class="bx bx-folder-open display-1 text-muted mb-3"></i>
                ${emptyMessage}
            </div>
        `;
        return;
    }
    
    // Enhanced program cards with statistics and actions
    programsList.innerHTML = filteredPrograms.map(program => {
        const workoutCount = program.workouts?.length || 0;
        const totalExercises = program.workouts?.reduce((sum, pw) => {
            const workout = window.ghostGym.workouts.find(w => w.id === pw.workout_id);
            return sum + (workout?.exercise_groups?.length || 0);
        }, 0) || 0;
        
        return `
        <div class="list-group-item program-view-item">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center mb-2">
                        <h5 class="mb-0 me-2">${escapeHtml(program.name)}</h5>
                        ${program.difficulty_level ? `
                            <span class="badge bg-label-${
                                program.difficulty_level === 'beginner' ? 'success' :
                                program.difficulty_level === 'advanced' ? 'danger' : 'warning'
                            }">
                                ${program.difficulty_level}
                            </span>
                        ` : ''}
                    </div>
                    <p class="text-muted mb-3">${escapeHtml(program.description || 'No description provided')}</p>
                    
                    <div class="d-flex flex-wrap gap-3 mb-2">
                        <span class="badge bg-label-primary" style="font-size: 0.8rem;">
                            <i class="bx bx-dumbbell me-1"></i>
                            ${workoutCount} workout${workoutCount !== 1 ? 's' : ''}
                        </span>
                        <span class="badge bg-label-info" style="font-size: 0.8rem;">
                            <i class="bx bx-list-ul me-1"></i>
                            ${totalExercises} exercise${totalExercises !== 1 ? 's' : ''}
                        </span>
                        ${program.duration_weeks ? `
                            <span class="badge bg-label-secondary" style="font-size: 0.8rem;">
                                <i class="bx bx-time me-1"></i>
                                ${program.duration_weeks} week${program.duration_weeks !== 1 ? 's' : ''}
                            </span>
                        ` : ''}
                        ${program.created_date ? `
                            <span class="badge bg-label-dark" style="font-size: 0.8rem;">
                                <i class="bx bx-calendar me-1"></i>
                                Created ${new Date(program.created_date).toLocaleDateString()}
                            </span>
                        ` : ''}
                    </div>
                    
                    ${program.tags && program.tags.length > 0 ? `
                        <div class="workout-tags">
                            ${program.tags.map(tag => `<span class="workout-tag">${escapeHtml(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="btn-group-vertical btn-group-sm ms-3">
                    <button class="btn btn-outline-primary" onclick="selectProgramAndGoToBuilder('${program.id}')" title="Open in Builder">
                        <i class="bx bx-layer me-1"></i>Open in Builder
                    </button>
                    <button class="btn btn-outline-secondary" onclick="editProgram('${program.id}')" title="Edit Program">
                        <i class="bx bx-edit me-1"></i>Edit
                    </button>
                    <button class="btn btn-outline-info" onclick="duplicateProgram('${program.id}')" title="Duplicate Program">
                        <i class="bx bx-copy me-1"></i>Duplicate
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteProgram('${program.id}')" title="Delete Program">
                        <i class="bx bx-trash me-1"></i>Delete
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
}

/**
 * Render Workouts View (dedicated full-page grid)
 */
function renderWorkoutsView() {
    const workoutsGrid = document.getElementById('workoutsViewGrid');
    const emptyState = document.getElementById('workoutsViewEmptyState');
    if (!workoutsGrid || !window.ghostGym) return;
    
    const searchInput = document.getElementById('workoutsViewSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    // Enhanced filtering
    const filteredWorkouts = window.ghostGym.workouts.filter(workout =>
        workout.name.toLowerCase().includes(searchTerm) ||
        (workout.description || '').toLowerCase().includes(searchTerm) ||
        (workout.tags || []).some(tag => tag.toLowerCase().includes(searchTerm))
    );
    
    // Enhanced empty state
    if (filteredWorkouts.length === 0) {
        workoutsGrid.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'block';
            const emptyMessage = searchTerm
                ? `<h5>No Workouts Match "${escapeHtml(searchTerm)}"</h5>
                   <p class="text-muted">Try adjusting your search or create a new workout</p>`
                : `<h5>No Workouts Yet</h5>
                   <p class="text-muted">Create your first workout template to get started</p>
                   <button class="btn btn-primary mt-3" onclick="showWorkoutModal()">
                       <i class="bx bx-plus me-1"></i>Create Your First Workout
                   </button>`;
            emptyState.innerHTML = `
                <i class="bx bx-dumbbell display-1 text-muted"></i>
                ${emptyMessage}
            `;
        }
        return;
    }
    
    workoutsGrid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';
    
    // Enhanced workout cards with statistics
    workoutsGrid.innerHTML = filteredWorkouts.map(workout => {
        const totalExercises = (workout.exercise_groups || []).reduce((sum, group) => {
            return sum + Object.keys(group.exercises || {}).length;
        }, 0);
        
        const exercisePreview = (workout.exercise_groups || []).slice(0, 3).map(group => {
            const exercises = Object.values(group.exercises || {});
            return exercises[0] || '';
        }).filter(e => e).join(', ');
        
        return `
        <div class="col-md-4 col-lg-3">
            <div class="workout-card h-100" data-workout-id="${workout.id}">
                <div class="workout-card-header">
                    <h6 class="workout-card-title" title="${escapeHtml(workout.name)}">${escapeHtml(workout.name)}</h6>
                    <div class="workout-card-menu dropdown">
                        <button class="btn btn-sm btn-ghost-secondary p-0" type="button" data-bs-toggle="dropdown">
                            <i class="bx bx-dots-vertical-rounded"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="javascript:void(0);" onclick="editWorkout('${workout.id}')">
                                <i class="bx bx-edit me-2"></i>Edit
                            </a></li>
                            <li><a class="dropdown-item" href="javascript:void(0);" onclick="duplicateWorkout('${workout.id}')">
                                <i class="bx bx-copy me-2"></i>Duplicate
                            </a></li>
                            <li><a class="dropdown-item" href="javascript:void(0);" onclick="addWorkoutToProgramPrompt('${workout.id}')">
                                <i class="bx bx-folder-plus me-2"></i>Add to Program
                            </a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="javascript:void(0);" onclick="deleteWorkout('${workout.id}')">
                                <i class="bx bx-trash me-2"></i>Delete
                            </a></li>
                        </ul>
                    </div>
                </div>
                
                ${workout.description ? `
                    <p class="workout-card-description" title="${escapeHtml(workout.description)}">${escapeHtml(workout.description)}</p>
                ` : ''}
                
                <div class="workout-card-stats mb-2">
                    <span class="workout-card-stat">
                        <i class="bx bx-list-ul"></i>
                        ${workout.exercise_groups?.length || 0} group${(workout.exercise_groups?.length || 0) !== 1 ? 's' : ''}
                    </span>
                    <span class="workout-card-stat">
                        <i class="bx bx-dumbbell"></i>
                        ${totalExercises} exercise${totalExercises !== 1 ? 's' : ''}
                    </span>
                </div>
                
                ${workout.bonus_exercises && workout.bonus_exercises.length > 0 ? `
                    <div class="workout-card-stats mb-2">
                        <span class="workout-card-stat">
                            <i class="bx bx-plus-circle"></i>
                            ${workout.bonus_exercises.length} bonus
                        </span>
                    </div>
                ` : ''}
                
                ${exercisePreview ? `
                    <div class="workout-card-preview mb-2" style="font-size: 0.7rem; color: #64748b; font-style: italic;">
                        <i class="bx bx-info-circle me-1"></i>${escapeHtml(exercisePreview)}${totalExercises > 3 ? '...' : ''}
                    </div>
                ` : ''}
                
                ${workout.tags && workout.tags.length > 0 ? `
                    <div class="workout-card-tags">
                        ${workout.tags.map(tag => `<span class="workout-card-tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `}).join('');
}

/**
 * Filter programs in Programs View
 */
function filterProgramsView() {
    renderProgramsView();
}

/**
 * Filter workouts in Workouts View
 */
function filterWorkoutsView() {
    renderWorkoutsView();
}

/**
 * Select program and navigate to Builder view
 * @param {string} programId - ID of program to select
 */
function selectProgramAndGoToBuilder(programId) {
    // Store program ID in sessionStorage for builder to pick up
    sessionStorage.setItem('selectedProgramId', programId);
    // Navigate to builder
    window.location.href = 'builder.html';
}

// Make functions globally accessible for standalone pages
window.renderProgramsView = renderProgramsView;
window.renderWorkoutsView = renderWorkoutsView;
window.filterProgramsView = filterProgramsView;
window.filterWorkoutsView = filterWorkoutsView;
window.selectProgramAndGoToBuilder = selectProgramAndGoToBuilder;

console.log('📦 Views module loaded');