/**
 * Exercise History Demo - Controller
 * Shows side-by-side comparison of last 3-5 workout sessions
 * @version 1.0.0
 */

// Global state
window.exerciseHistory = {
  workoutId: null,
  workoutName: null,
  sessions: [],
  exercises: [],
  isLoading: false
};

/**
 * Initialize exercise history page
 */
async function initExerciseHistory() {
  console.log('📊 Initializing Exercise History Page...');
  
  try {
    // Get workout ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const workoutId = urlParams.get('workoutId');
    
    if (workoutId) {
      window.exerciseHistory.workoutId = workoutId;
      console.log(`Loading history for workout: ${workoutId}`);
    } else {
      console.log('No workoutId provided, using demo data');
    }
    
    // Load data
    await loadExerciseHistory();
    
    // Render page
    renderExerciseHistory();
    
    console.log('✅ Exercise History page initialized');
    
  } catch (error) {
    console.error('❌ Error initializing exercise history:', error);
    showError('Failed to load exercise history');
  }
}

/**
 * Load exercise history data
 */
async function loadExerciseHistory() {
  showLoading();
  
  try {
    // Try to load real data if authenticated
    if (window.dataManager?.isUserAuthenticated() && window.exerciseHistory.workoutId) {
      await loadRealHistory();
    } else {
      loadMockHistory();
    }
    
    // Process data into exercise comparison format
    processExerciseData();
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error loading history:', error);
    loadMockHistory();
    processExerciseData();
    hideLoading();
  }
}

/**
 * Load real history from Firebase
 */
async function loadRealHistory() {
  try {
    const token = await window.dataManager.getAuthToken();
    const workoutId = window.exerciseHistory.workoutId;
    
    // Fetch sessions for this workout
    const response = await fetch(
      `/api/v3/workout-sessions/?workout_id=${workoutId}&page_size=5&sort=desc`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    if (response.ok) {
      const data = await response.json();
      window.exerciseHistory.sessions = data.sessions || [];
      window.exerciseHistory.workoutName = data.sessions[0]?.workout_name || 'Workout';
      console.log(`✅ Loaded ${window.exerciseHistory.sessions.length} real sessions`);
    } else {
      throw new Error('Failed to fetch sessions');
    }
  } catch (error) {
    console.warn('⚠️ Could not load real history:', error);
    throw error;
  }
}

/**
 * Load mock history for demo
 */
function loadMockHistory() {
  console.log('📦 Loading mock exercise history');
  
  window.exerciseHistory.workoutName = 'Push Day A';
  window.exerciseHistory.sessions = [
    {
      id: 'session-1',
      date: new Date().toISOString(),
      duration: 52,
      exercises: [
        { name: 'Bench Press', weight: 185, sets: 4, reps: 8, isSkipped: false, isBonus: false },
        { name: 'Incline DB Press', weight: 65, sets: 3, reps: 10, isSkipped: false, isBonus: false },
        { name: 'Cable Flyes', weight: 30, sets: 3, reps: 12, isSkipped: false, isBonus: false },
        { name: 'Face Pulls', weight: 25, sets: 3, reps: 15, isSkipped: false, isBonus: true },
        { name: 'Tricep Dips', weight: 0, sets: 0, reps: 0, isSkipped: true, isBonus: false },
        { name: 'Overhead Press', weight: 95, sets: 4, reps: 8, isSkipped: false, isBonus: false },
        { name: 'Lateral Raises', weight: 20, sets: 3, reps: 12, isSkipped: false, isBonus: false }
      ]
    },
    {
      id: 'session-2',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 48,
      exercises: [
        { name: 'Bench Press', weight: 180, sets: 4, reps: 8, isSkipped: false, isBonus: false },
        { name: 'Incline DB Press', weight: 65, sets: 3, reps: 10, isSkipped: false, isBonus: false },
        { name: 'Cable Flyes', weight: 30, sets: 3, reps: 12, isSkipped: false, isBonus: false },
        { name: 'Tricep Dips', weight: 25, sets: 3, reps: 12, isSkipped: false, isBonus: false },
        { name: 'Overhead Press', weight: 90, sets: 4, reps: 8, isSkipped: false, isBonus: false },
        { name: 'Lateral Raises', weight: 20, sets: 3, reps: 12, isSkipped: false, isBonus: false }
      ]
    },
    {
      id: 'session-3',
      date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 50,
      exercises: [
        { name: 'Bench Press', weight: 175, sets: 4, reps: 8, isSkipped: false, isBonus: false },
        { name: 'Incline DB Press', weight: 60, sets: 3, reps: 10, isSkipped: false, isBonus: false },
        { name: 'Cable Flyes', weight: 25, sets: 3, reps: 12, isSkipped: false, isBonus: false },
        { name: 'Tricep Dips', weight: 20, sets: 3, reps: 12, isSkipped: false, isBonus: false },
        { name: 'Overhead Press', weight: 85, sets: 4, reps: 8, isSkipped: false, isBonus: false },
        { name: 'Lateral Raises', weight: 17.5, sets: 3, reps: 12, isSkipped: false, isBonus: false }
      ]
    },
    {
      id: 'session-4',
      date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 45,
      exercises: [
        { name: 'Bench Press', weight: 175, sets: 4, reps: 8, isSkipped: false, isBonus: false },
        { name: 'Incline DB Press', weight: 60, sets: 3, reps: 10, isSkipped: false, isBonus: false },
        { name: 'Cable Flyes', weight: 25, sets: 3, reps: 12, isSkipped: false, isBonus: false },
        { name: 'Tricep Dips', weight: 20, sets: 3, reps: 12, isSkipped: false, isBonus: false },
        { name: 'Overhead Press', weight: 85, sets: 4, reps: 8, isSkipped: false, isBonus: false },
        { name: 'Lateral Raises', weight: 15, sets: 3, reps: 12, isSkipped: false, isBonus: false }
      ]
    },
    {
      id: 'session-5',
      date: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 47,
      exercises: [
        { name: 'Bench Press', weight: 170, sets: 4, reps: 8, isSkipped: false, isBonus: false },
        { name: 'Incline DB Press', weight: 55, sets: 3, reps: 10, isSkipped: false, isBonus: false },
        { name: 'Cable Flyes', weight: 25, sets: 3, reps: 12, isSkipped: false, isBonus: false },
        { name: 'Tricep Dips', weight: 20, sets: 3, reps: 12, isSkipped: false, isBonus: false },
        { name: 'Overhead Press', weight: 80, sets: 4, reps: 8, isSkipped: false, isBonus: false },
        { name: 'Lateral Raises', weight: 15, sets: 3, reps: 12, isSkipped: false, isBonus: false }
      ]
    }
  ];
}

/**
 * Process sessions into exercise matrix
 * Builds a matrix of exercises across sessions with bonus exercise tracking
 */
function processExerciseData() {
  const sessions = window.exerciseHistory.sessions;
  if (sessions.length === 0) return;
  
  // Track all exercises and their properties
  const exerciseMap = new Map();
  
  // Process each session (newest first in the array)
  sessions.forEach((session, sessionIndex) => {
    session.exercises.forEach(exercise => {
      const key = exercise.name;
      
      if (!exerciseMap.has(key)) {
        exerciseMap.set(key, {
          name: exercise.name,
          isBonus: exercise.isBonus || false,
          firstSeenSession: sessionIndex,
          sessionData: new Array(sessions.length).fill(null)
        });
      }
      
      // Store the exercise data for this session
      exerciseMap.get(key).sessionData[sessionIndex] = {
        weight: exercise.weight,
        sets: exercise.sets,
        reps: exercise.reps,
        isSkipped: exercise.isSkipped || false
      };
    });
  });
  
  // Convert to array and sort
  const exercises = Array.from(exerciseMap.values());
  
  // Sort: template exercises first (not bonus), then bonus exercises
  // Within each group, maintain order of first appearance
  exercises.sort((a, b) => {
    if (a.isBonus !== b.isBonus) {
      return a.isBonus ? 1 : -1; // Non-bonus first
    }
    return a.firstSeenSession - b.firstSeenSession;
  });
  
  window.exerciseHistory.exercises = exercises;
}

/**
 * Render exercise history page
 */
function renderExerciseHistory() {
  const container = document.getElementById('historyContent');
  if (!container) return;
  
  const exercises = window.exerciseHistory.exercises;
  const sessions = window.exerciseHistory.sessions;
  const workoutName = window.exerciseHistory.workoutName || 'Workout';
  
  // Update the header text
  const headerEl = document.getElementById('workoutNameHeader');
  if (headerEl) {
    headerEl.textContent = `${workoutName} - Progress History`;
  }
  
  if (exercises.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="card-body">
          <div class="empty-state">
            <i class="bx bx-dumbbell empty-state-icon"></i>
            <h5 class="empty-state-title">No Exercise History</h5>
            <p class="empty-state-text">Complete this workout to see progress tracking</p>
          </div>
        </div>
      </div>
    `;
    return;
  }
  
  // Determine session count based on viewport
  const sessionCount = window.innerWidth < 576 ? 3 : 5;
  const displaySessions = sessions.slice(0, sessionCount);
  
  // Calculate progress summary
  const progressStats = calculateProgressStats(exercises);
  
  container.innerHTML = `
    <div class="card">
      ${renderProgressSummary(progressStats)}
      
      <div class="table-responsive exercise-history-table-wrapper">
        <table class="table table-hover table-sm exercise-history-table">
          ${renderTableHeader(displaySessions)}
          <tbody class="table-border-bottom-0">
            ${exercises.map(ex => renderTableRow(ex, displaySessions)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Calculate progress statistics
 */
function calculateProgressStats(exercises) {
  let increased = 0;
  let same = 0;
  let decreased = 0;
  
  exercises.forEach(exercise => {
    const sessionData = exercise.sessionData;
    if (sessionData.length < 2) return;
    
    const latest = sessionData[0];
    const previous = sessionData[1];
    
    if (!latest || !previous || latest.isSkipped || previous.isSkipped) return;
    
    if (latest.weight > previous.weight) {
      increased++;
    } else if (latest.weight < previous.weight) {
      decreased++;
    } else {
      same++;
    }
  });
  
  return { increased, same, decreased };
}

/**
 * Render progress summary badges
 */
function renderProgressSummary(stats) {
  return `
    <div class="card-body pb-2 pt-3">
      <div class="row g-2 mb-2">
        <div class="col-4 text-center">
          <div class="progress-stat-badge improved">
            <i class="bx bx-trending-up"></i>
            <span>${stats.increased}</span>
          </div>
          <small class="text-muted d-block mt-1" style="font-size: 0.6875rem;">Improved</small>
        </div>
        <div class="col-4 text-center">
          <div class="progress-stat-badge same">
            <i class="bx bx-minus"></i>
            <span>${stats.same}</span>
          </div>
          <small class="text-muted d-block mt-1" style="font-size: 0.6875rem;">Same</small>
        </div>
        <div class="col-4 text-center">
          <div class="progress-stat-badge decreased">
            <i class="bx bx-trending-down"></i>
            <span>${stats.decreased}</span>
          </div>
          <small class="text-muted d-block mt-1" style="font-size: 0.6875rem;">Decreased</small>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render table header with session dates
 */
function renderTableHeader(sessions) {
  return `
    <thead class="table-light">
      <tr>
        <th class="sticky-col exercise-col">Exercise</th>
        ${sessions.map(session => `
          <th class="session-col">
            ${formatDate(session.date, 'short')}<br>
            <small class="text-muted">${formatRelativeDate(session.date)}</small>
          </th>
        `).join('')}
      </tr>
    </thead>
  `;
}

/**
 * Render a single table row for an exercise
 */
function renderTableRow(exercise, sessions) {
  const rowClass = exercise.isBonus ? ' bonus-exercise-row' : '';
  
  return `
    <tr${rowClass}>
      <td class="sticky-col exercise-col">
        <div class="fw-medium">${escapeHtml(exercise.name)}</div>
        ${exercise.isBonus ? '<div class="bonus-indicator">+ Added</div>' : ''}
      </td>
      ${sessions.map((session, index) => renderTableCell(exercise, index, sessions)).join('')}
    </tr>
  `;
}

/**
 * Render a single table cell for a session
 */
function renderTableCell(exercise, sessionIndex, sessions) {
  const sessionData = exercise.sessionData[sessionIndex];
  
  // Exercise not present in this session
  if (!sessionData) {
    return `
      <td class="session-col text-center not-present">
        <span class="text-muted">—</span>
      </td>
    `;
  }
  
  // Exercise was skipped
  if (sessionData.isSkipped) {
    return `
      <td class="session-col text-center skipped">
        <span>Skipped</span>
      </td>
    `;
  }
  
  // Determine progress state
  let progressClass = 'baseline';
  let indicator = '';
  let deltaHtml = '';
  
  // Compare with next session (previous in time)
  if (sessionIndex < sessions.length - 1) {
    const previousData = exercise.sessionData[sessionIndex + 1];
    
    if (previousData && !previousData.isSkipped) {
      const delta = sessionData.weight - previousData.weight;
      
      if (delta > 0) {
        progressClass = 'increased';
        indicator = '<i class="bx bx-up-arrow-alt text-success"></i>';
        deltaHtml = `<div class="delta text-success">+${delta} lbs</div>`;
      } else if (delta < 0) {
        progressClass = 'decreased';
        indicator = '<i class="bx bx-down-arrow-alt text-danger"></i>';
        deltaHtml = `<div class="delta text-danger">${delta} lbs</div>`;
      } else {
        progressClass = 'same';
      }
    }
  }
  
  return `
    <td class="session-col text-center ${progressClass}">
      <div class="weight-display">${sessionData.weight} ${indicator}</div>
      <small class="text-muted">${sessionData.sets}×${sessionData.reps}</small>
      ${deltaHtml}
    </td>
  `;
}

/**
 * Format date
 */
function formatDate(dateString, format = 'full') {
  const date = new Date(dateString);
  
  if (format === 'short') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

/**
 * Format relative date
 */
function formatRelativeDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

/**
 * Show loading state
 */
function showLoading() {
  window.exerciseHistory.isLoading = true;
  const loadingEl = document.getElementById('historyLoading');
  if (loadingEl) loadingEl.style.display = 'block';
  
  const contentEl = document.getElementById('historyContent');
  if (contentEl) contentEl.style.display = 'none';
}

/**
 * Hide loading state
 */
function hideLoading() {
  window.exerciseHistory.isLoading = false;
  const loadingEl = document.getElementById('historyLoading');
  if (loadingEl) loadingEl.style.display = 'none';
  
  const contentEl = document.getElementById('historyContent');
  if (contentEl) contentEl.style.display = 'block';
}

/**
 * Show error message
 */
function showError(message) {
  console.error('Exercise History Error:', message);
  // Could show toast notification
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initExerciseHistory);

// Export for global use
window.initExerciseHistory = initExerciseHistory;
window.exerciseHistory.reload = loadExerciseHistory;

console.log('📦 Exercise History Demo controller loaded (v1.0.0)');
