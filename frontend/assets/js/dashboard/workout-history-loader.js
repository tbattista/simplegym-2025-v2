/**
 * Ghost Gym - Workout History Loader
 * Data fetching and initialization
 * @version 1.0.0
 */

/* ============================================
   INITIALIZATION
   ============================================ */

/**
 * Initialize workout history page
 * Supports three URL patterns:
 * - workout-history.html (no params) → All Sessions mode
 * - workout-history.html?id=WORKOUT_ID → Single Workout mode
 * - workout-history.html?session=SESSION_ID → All Sessions mode, scroll to session
 */
async function initWorkoutHistory() {
  console.log('📊 Initializing Workout History...');

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const workoutId = urlParams.get('id');
  const sessionId = urlParams.get('session');

  // Wait for Firebase
  if (!window.firebaseReady) {
    await new Promise(resolve => {
      window.addEventListener('firebaseReady', resolve, { once: true });
    });
  }

  if (workoutId) {
    // Single Workout mode (existing behavior)
    window.ghostGym.workoutHistory.workoutId = workoutId;
    window.ghostGym.workoutHistory.isAllMode = false;
    await loadWorkoutHistory(workoutId);
  } else {
    // All Sessions mode (new)
    window.ghostGym.workoutHistory.isAllMode = true;
    await loadAllSessions(sessionId); // Pass sessionId to scroll to if provided
  }
}

/* ============================================
   DATA LOADING - SINGLE WORKOUT MODE
   ============================================ */

/**
 * Load workout history data for a single workout
 */
async function loadWorkoutHistory(workoutId) {
  try {
    showLoading();

    // Fetch sessions and exercise history in parallel
    const [sessionsData, exerciseData] = await Promise.all([
      fetchWorkoutSessions(workoutId),
      fetchExerciseHistory(workoutId)
    ]);

    // Update state
    window.ghostGym.workoutHistory.sessions = sessionsData.sessions || [];
    window.ghostGym.workoutHistory.workoutInfo = sessionsData.workout_info;
    window.ghostGym.workoutHistory.exerciseHistories = exerciseData.exercises || {};

    // Check if we have any data
    if (window.ghostGym.workoutHistory.sessions.length === 0) {
      hideLoading();
      showEmptyState();
      return;
    }

    // Calculate statistics
    calculateStatistics();

    // Render UI
    renderWorkoutInfo();
    renderStatistics();
    renderSessionHistory();
    renderExercisePerformance();
    initHistoryCalendar();

    // Show content
    hideLoading();
    document.getElementById('historyContent').style.display = 'block';

    console.log('✅ Workout history loaded successfully');

  } catch (error) {
    console.error('❌ Error loading workout history:', error);
    showError(error.message);
  }
}

/* ============================================
   DATA LOADING - ALL SESSIONS MODE
   ============================================ */

/**
 * Load all sessions (All Sessions mode)
 * @param {string|null} scrollToSessionId - Optional session ID to scroll to after loading
 */
async function loadAllSessions(scrollToSessionId = null) {
  try {
    showLoading();

    // Check if user is authenticated
    if (!window.dataManager || !window.dataManager.isUserAuthenticated()) {
      throw new Error('Please sign in to view your workout history');
    }

    const token = await window.dataManager.getAuthToken();
    const response = await fetch('/api/v3/workout-sessions?page_size=100&sort=desc', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workout sessions');
    }

    const data = await response.json();
    window.ghostGym.workoutHistory.sessions = data.sessions || [];

    // No exercise history in all mode (API requires workout_id)
    window.ghostGym.workoutHistory.exerciseHistories = {};

    // Check if we have any data
    if (window.ghostGym.workoutHistory.sessions.length === 0) {
      hideLoading();
      showEmptyState();
      return;
    }

    // Calculate statistics
    calculateStatistics();

    // Render UI for All Mode
    renderAllModeUI();
    initHistoryCalendar();

    // Show content
    hideLoading();
    document.getElementById('historyContent').style.display = 'block';

    // If sessionId provided, scroll to it after a short delay
    if (scrollToSessionId) {
      setTimeout(() => scrollToSession(scrollToSessionId), 500);
    }

    console.log(`✅ All sessions loaded: ${window.ghostGym.workoutHistory.sessions.length} sessions`);

  } catch (error) {
    console.error('❌ Error loading all sessions:', error);
    showError(error.message);
  }
}

/**
 * Render UI for All Sessions mode
 */
function renderAllModeUI() {
  // Hide insights tab (requires workout_id for exercise history API)
  const insightsTab = document.getElementById('insights-tab');
  if (insightsTab && insightsTab.parentElement) {
    insightsTab.parentElement.classList.add('d-none');
  }

  // Extract unique workout names for filter dropdown
  extractUniqueWorkouts();

  renderWorkoutInfo();
  renderStatistics();
  renderSessionHistory();
}

/* ============================================
   API CALLS
   ============================================ */

/**
 * Fetch workout sessions from API
 */
async function fetchWorkoutSessions(workoutId) {
  try {
    // Check if user is authenticated
    if (!window.dataManager || !window.dataManager.isUserAuthenticated()) {
      throw new Error('User not authenticated');
    }

    const token = await window.dataManager.getAuthToken();
    const response = await fetch(
      `/api/v3/workout-sessions/?workout_id=${workoutId}&page_size=50`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch workout sessions');
    }

    const data = await response.json();

    // Get workout info separately if not included
    let workout_info = null;
    if (window.dataManager && window.dataManager.getWorkouts) {
      const workouts = await window.dataManager.getWorkouts();
      workout_info = workouts.find(w => w.id === workoutId);
    }

    return {
      sessions: data.sessions || [],
      workout_info: workout_info
    };
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }
}

/**
 * Fetch exercise history from API
 */
async function fetchExerciseHistory(workoutId) {
  try {
    // Check if user is authenticated
    if (!window.dataManager || !window.dataManager.isUserAuthenticated()) {
      throw new Error('User not authenticated');
    }

    const token = await window.dataManager.getAuthToken();
    const response = await fetch(
      `/api/v3/workout-sessions/history/workout/${workoutId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch exercise history');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching exercise history:', error);
    throw error;
  }
}

/* ============================================
   HELPER FUNCTIONS
   ============================================ */

/**
 * Extract unique workout names from sessions
 */
function extractUniqueWorkouts() {
  const sessions = window.ghostGym.workoutHistory.sessions;
  const workoutMap = new Map();

  sessions.forEach(session => {
    const name = session.workout_name || 'Unknown Workout';
    if (!workoutMap.has(name)) {
      workoutMap.set(name, {
        name: name,
        count: 1
      });
    } else {
      workoutMap.get(name).count++;
    }
  });

  // Sort by count (most frequent first)
  window.ghostGym.workoutHistory.uniqueWorkouts = Array.from(workoutMap.values())
    .sort((a, b) => b.count - a.count);
}

/* ============================================
   EXPORTS
   ============================================ */

// Export to window for backwards compatibility
window.initWorkoutHistory = initWorkoutHistory;
window.loadWorkoutHistory = loadWorkoutHistory;
window.loadAllSessions = loadAllSessions;
window.renderAllModeUI = renderAllModeUI;
window.fetchWorkoutSessions = fetchWorkoutSessions;
window.fetchExerciseHistory = fetchExerciseHistory;
window.extractUniqueWorkouts = extractUniqueWorkouts;

console.log('📦 Workout History Loader module loaded (v1.0.0)');
