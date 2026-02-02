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

    // Get auth token - getAuthToken() will throw if not authenticated
    // Note: Don't check isUserAuthenticated() separately due to mobile race condition
    if (!window.dataManager) {
      throw new Error('Data manager not available');
    }

    // Debug: Log user at API call time
    const fbUser = window.dataManager.getFirebaseUser();
    const uid = fbUser?.uid || 'NULL';
    const email = fbUser?.email || 'NULL';
    console.log('🔍 [HISTORY] API call user - UID:', uid, 'Email:', email);
    if (window.mobileDebugLog) window.mobileDebugLog('📱 HISTORY USER: ' + email + ' UID:' + uid.substring(0, 8));

    const token = await window.dataManager.getAuthToken();
    if (window.mobileDebugLog) window.mobileDebugLog('Token: ' + (token ? token.substring(0, 20) + '...' : 'NO TOKEN'));

    const response = await fetch('/api/v3/workout-sessions/?page_size=100&sort=desc', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('🔍 [HISTORY] Response status:', response.status);
    if (window.mobileDebugLog) window.mobileDebugLog('Response: ' + response.status);

    if (!response.ok) {
      throw new Error('Failed to fetch workout sessions');
    }

    const data = await response.json();
    console.log('🔍 [HISTORY] Got sessions:', data.sessions?.length || 0);
    if (window.mobileDebugLog) window.mobileDebugLog('Sessions: ' + (data.sessions?.length || 0));

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
    // Get auth token - getAuthToken() will throw if not authenticated
    // Note: Don't check isUserAuthenticated() separately due to mobile race condition
    if (!window.dataManager) {
      throw new Error('Data manager not available');
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
    // Get auth token - getAuthToken() will throw if not authenticated
    // Note: Don't check isUserAuthenticated() separately due to mobile race condition
    if (!window.dataManager) {
      throw new Error('Data manager not available');
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
