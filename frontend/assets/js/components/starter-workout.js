/**
 * Default starter workout for new users
 * Read-only template; user can "Add to My Workouts" to get editable copy
 */
window.STARTER_WORKOUT = {
    id: '__starter_full_body__',
    name: 'Full Body Starter',
    description: 'A simple full-body routine to get you started. Add to your workouts to customize.',
    isStarterTemplate: true,  // Flag to identify this is the starter template
    is_template: true,
    tags: ['full-body', 'beginner'],
    exercise_groups: [
        {
            group_id: 'starter-1',
            exercises: { a: 'Goblet Squat' },
            sets: '3',
            reps: '10',
            rest: '60s'
        },
        {
            group_id: 'starter-2',
            exercises: { a: 'Push-ups' },
            sets: '3',
            reps: '10',
            rest: '60s'
        },
        {
            group_id: 'starter-3',
            exercises: { a: 'Dumbbell Row' },
            sets: '3',
            reps: '10 each arm',
            rest: '60s'
        },
        {
            group_id: 'starter-4',
            exercises: { a: 'Plank' },
            sets: '3',
            reps: '30s hold',
            rest: '30s'
        }
    ],
    bonus_exercises: [],
    template_notes: [],
    created_date: '2026-01-01T00:00:00Z',
    modified_date: '2026-01-01T00:00:00Z'
};

/**
 * Creates a copy of starter workout owned by user
 * @returns {Promise<Object>} The saved workout
 */
async function addStarterToMyWorkouts() {
    const copy = { ...window.STARTER_WORKOUT };
    delete copy.id;
    delete copy.isStarterTemplate;
    copy.name = 'Full Body Starter';  // User can rename

    const saved = await window.dataManager.saveWorkout(copy);
    window.showToast?.('Starter workout added to your library!', 'success');
    return saved;
}

/**
 * Start the starter workout directly (without saving to library)
 */
function startStarterWorkout() {
    // Navigate to workout mode with starter flag
    window.location.href = `workout-mode.html?starter=true`;
}

/**
 * Preview the starter workout
 */
function previewStarterWorkout() {
    // Show the starter workout in the detail offcanvas
    if (window.workoutDetailOffcanvas) {
        window.workoutDetailOffcanvas.show(window.STARTER_WORKOUT);
    } else if (window.viewWorkoutDetails) {
        // Fallback: use the existing viewWorkoutDetails function
        window.viewWorkoutDetails(window.STARTER_WORKOUT.id);
    }
}

// Make functions globally available
window.addStarterToMyWorkouts = addStarterToMyWorkouts;
window.startStarterWorkout = startStarterWorkout;
window.previewStarterWorkout = previewStarterWorkout;
