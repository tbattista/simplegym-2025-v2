/**
 * Ghost Gym - Workout History Module
 * Displays workout session history and exercise performance metrics
 * @version 1.0.0
 */

// Global state
window.ghostGym = window.ghostGym || {};
window.ghostGym.workoutHistory = {
  workoutId: null,
  workoutInfo: null,
  sessions: [],
  exerciseHistories: {},
  expandedSessions: new Set(),
  expandedExercises: new Set(),
  statistics: {
    totalWorkouts: 0,
    avgDuration: 0,
    lastCompleted: null,
    totalVolume: 0
  }
};

/**
 * Initialize workout history page
 */
async function initWorkoutHistory() {
  console.log('📊 Initializing Workout History...');
  
  // Get workout ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const workoutId = urlParams.get('id');
  
  if (!workoutId) {
    showError('No workout ID provided');
    return;
  }
  
  window.ghostGym.workoutHistory.workoutId = workoutId;
  
  // Wait for Firebase
  if (!window.firebaseReady) {
    await new Promise(resolve => {
      window.addEventListener('firebaseReady', resolve, { once: true });
    });
  }
  
  // Load data
  await loadWorkoutHistory(workoutId);
}

/**
 * Load workout history data
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
    
    // Show content
    hideLoading();
    document.getElementById('historyContent').style.display = 'block';
    
    console.log('✅ Workout history loaded successfully');
    
  } catch (error) {
    console.error('❌ Error loading workout history:', error);
    showError(error.message);
  }
}

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

/**
 * Calculate statistics from session data
 */
function calculateStatistics() {
  const sessions = window.ghostGym.workoutHistory.sessions;
  const stats = window.ghostGym.workoutHistory.statistics;
  
  stats.totalWorkouts = sessions.length;
  
  if (sessions.length > 0) {
    // Average duration
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    stats.avgDuration = Math.round(totalDuration / sessions.length);
    
    // Last completed
    stats.lastCompleted = sessions[0]?.completed_at;
    
    // Total volume (sum of all weights × sets)
    stats.totalVolume = sessions.reduce((sum, session) => {
      const sessionVolume = (session.exercises_performed || []).reduce((exSum, ex) => {
        return exSum + ((ex.weight || 0) * (ex.sets_completed || 0));
      }, 0);
      return sum + sessionVolume;
    }, 0);
  }
}

/**
 * Render workout information header
 */
function renderWorkoutInfo() {
  const info = window.ghostGym.workoutHistory.workoutInfo;
  
  if (info) {
    document.getElementById('workoutName').textContent = info.name;
    const descEl = document.getElementById('workoutDescription');
    if (descEl) {
      descEl.textContent = info.description || '';
    }
  }
}

/**
 * Render statistics cards
 */
function renderStatistics() {
  const stats = window.ghostGym.workoutHistory.statistics;
  const container = document.getElementById('statisticsCards');
  
  const lastCompletedText = stats.lastCompleted ? 
    formatDate(stats.lastCompleted) : 'Never';
  
  container.innerHTML = `
    <div class="col-6 col-md-3">
      <div class="card">
        <div class="card-body text-center">
          <i class="bx bx-dumbbell bx-lg text-primary mb-2"></i>
          <h3 class="mb-1">${stats.totalWorkouts}</h3>
          <small class="text-muted">Total Workouts</small>
        </div>
      </div>
    </div>
    
    <div class="col-6 col-md-3">
      <div class="card">
        <div class="card-body text-center">
          <i class="bx bx-time bx-lg text-success mb-2"></i>
          <h3 class="mb-1">${stats.avgDuration}</h3>
          <small class="text-muted">Avg Duration (min)</small>
        </div>
      </div>
    </div>
    
    <div class="col-6 col-md-3">
      <div class="card">
        <div class="card-body text-center">
          <i class="bx bx-calendar bx-lg text-info mb-2"></i>
          <h3 class="mb-1 small">${lastCompletedText}</h3>
          <small class="text-muted">Last Completed</small>
        </div>
      </div>
    </div>
    
    <div class="col-6 col-md-3">
      <div class="card">
        <div class="card-body text-center">
          <i class="bx bx-trending-up bx-lg text-warning mb-2"></i>
          <h3 class="mb-1">${Math.round(stats.totalVolume)}</h3>
          <small class="text-muted">Total Volume (lbs)</small>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render session history cards
 */
function renderSessionHistory() {
  const sessions = window.ghostGym.workoutHistory.sessions;
  const container = document.getElementById('sessionHistoryContainer');
  
  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4">
        <i class="bx bx-calendar-x display-4 text-muted"></i>
        <p class="mt-3 text-muted">No workout sessions yet</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = sessions.map((session, index) => 
    createSessionCard(session, index)
  ).join('');
}

/**
 * Create a single session card
 */
function createSessionCard(session, index) {
  const sessions = window.ghostGym.workoutHistory.sessions;
  const collapseId = `session-${session.id}`;
  const isExpanded = window.ghostGym.workoutHistory.expandedSessions.has(session.id);
  
  return `
    <div class="card mb-3 history-card">
      <div class="card-header history-header" 
           data-bs-toggle="collapse" 
           data-bs-target="#${collapseId}"
           style="cursor: pointer;">
        <div class="d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-3">
            <div class="history-icon">
              <span class="avatar-initial rounded bg-label-primary">
                <i class="bx bx-dumbbell"></i>
              </span>
            </div>
            <div>
              <h6 class="mb-0">Session #${sessions.length - index}</h6>
              <small class="text-muted">
                ${formatDate(session.completed_at)} • ${session.duration_minutes || 0} min
              </small>
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="badge bg-success">Completed</span>
            <i class="bx bx-chevron-down"></i>
          </div>
        </div>
      </div>
      
      <div id="${collapseId}" class="collapse ${isExpanded ? 'show' : ''}">
        <div class="card-body">
          ${renderSessionDetails(session)}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render session details (Phase 3: Enhanced with Change column)
 */
function renderSessionDetails(session) {
    const exercises = session.exercises_performed || [];
    
    return `
        <div class="session-details">
            ${session.notes ? `
                <div class="alert alert-info mb-3">
                    <i class="bx bx-note me-2"></i>${escapeHtml(session.notes)}
                </div>
            ` : ''}
            
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Exercise</th>
                            <th>Weight</th>
                            <th>Sets × Reps</th>
                            <th>Change</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${exercises.map(ex => renderExerciseRow(ex)).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * Render a single exercise row with progression indicators (Phase 3)
 * @private
 */
function renderExerciseRow(ex) {
    // Determine status badge
    let statusBadge = '';
    let rowClass = '';
    
    if (ex.is_skipped) {
        statusBadge = '<span class="badge bg-warning">Skipped</span>';
        rowClass = 'text-muted';
    } else if (ex.is_bonus) {
        statusBadge = '<span class="badge bg-success">Bonus</span>';
    } else if (ex.is_modified) {
        statusBadge = '<span class="badge bg-info">Modified</span>';
    } else {
        statusBadge = '<span class="badge bg-secondary">Default</span>';
    }
    
    // PHASE 3: Determine weight change indicator
    let changeIndicator = '—';
    let changeIcon = '';
    
    if (ex.is_skipped) {
        changeIndicator = '—';
    } else if (ex.weight_change !== undefined && ex.weight_change !== null) {
        const unitDisplay = ex.weight_unit && ex.weight_unit !== 'other' ? ` ${ex.weight_unit}` : '';
        if (ex.weight_change > 0) {
            changeIcon = '↑';
            changeIndicator = `<span class="text-success fw-bold" title="Weight increased from previous session">
                ${changeIcon} +${ex.weight_change.toFixed(1)}${unitDisplay}
            </span>`;
        } else if (ex.weight_change < 0) {
            changeIcon = '↓';
            changeIndicator = `<span class="text-danger fw-bold" title="Weight decreased from previous session">
                ${changeIcon} ${ex.weight_change.toFixed(1)}${unitDisplay}
            </span>`;
        } else if (ex.previous_weight) {
            changeIcon = '→';
            changeIndicator = `<span class="text-muted" title="Same weight as previous session">
                ${changeIcon} 0
            </span>`;
        }
    } else if (!ex.previous_weight && !ex.is_skipped) {
        changeIcon = '★';
        changeIndicator = `<span class="text-primary" title="First time performing this exercise">
            ${changeIcon} New
        </span>`;
    }
    
    return `
        <tr class="${rowClass}">
            <td>
                ${ex.is_skipped ? '<i class="bx bx-x-circle text-warning me-1"></i>' : ''}
                ${escapeHtml(ex.exercise_name)}
            </td>
            <td>
                ${ex.is_skipped ? '—' : `${ex.weight || '—'} ${ex.weight_unit || ''}`}
            </td>
            <td>
                ${ex.is_skipped ? '—' : `${ex.target_sets} × ${ex.target_reps}`}
            </td>
            <td>${changeIndicator}</td>
            <td>${statusBadge}</td>
        </tr>
        ${ex.is_skipped && ex.skip_reason ? `
            <tr class="${rowClass}">
                <td colspan="5" class="small ps-4">
                    <i class="bx bx-info-circle text-warning me-1"></i>
                    <em>${escapeHtml(ex.skip_reason)}</em>
                </td>
            </tr>
        ` : ''}
    `;
}

/**
 * Render exercise performance section
 */
function renderExercisePerformance() {
  const histories = window.ghostGym.workoutHistory.exerciseHistories;
  const container = document.getElementById('exercisePerformanceContainer');
  
  const historyArray = Object.values(histories);
  
  if (historyArray.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4">
        <i class="bx bx-line-chart display-4 text-muted"></i>
        <p class="mt-3 text-muted">No exercise performance data yet</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = historyArray.map(history => 
    createExercisePerformanceCard(history)
  ).join('');
}

/**
 * Create exercise performance card
 */
function createExercisePerformanceCard(history) {
  // Sanitize ID to make it a valid CSS selector (remove spaces and special chars)
  const sanitizedId = history.id.replace(/[^a-zA-Z0-9-_]/g, '-');
  const collapseId = `exercise-${sanitizedId}`;
  const isExpanded = window.ghostGym.workoutHistory.expandedExercises.has(history.id);
  
  return `
    <div class="card mb-3 history-card">
      <div class="card-header history-header" 
           data-bs-toggle="collapse" 
           data-bs-target="#${collapseId}"
           style="cursor: pointer;">
        <div class="d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-3">
            <div class="history-icon">
              <span class="avatar-initial rounded bg-label-success">
                <i class="bx bx-trending-up"></i>
              </span>
            </div>
            <div>
              <h6 class="mb-0">${escapeHtml(history.exercise_name)}</h6>
              <small class="text-muted">
                Last: ${history.last_weight || 0} ${history.last_weight_unit || 'lbs'} • 
                PR: ${history.best_weight || 0} ${history.last_weight_unit || 'lbs'}
              </small>
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="badge bg-label-info">${history.total_sessions || 0} sessions</span>
            <i class="bx bx-chevron-down"></i>
          </div>
        </div>
      </div>
      
      <div id="${collapseId}" class="collapse ${isExpanded ? 'show' : ''}">
        <div class="card-body">
          ${renderExercisePerformanceDetails(history)}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render exercise performance details
 */
function renderExercisePerformanceDetails(history) {
  const recentSessions = history.recent_sessions || [];
  
  return `
    <div class="exercise-performance-details">
      <!-- Performance Metrics -->
      <div class="row g-3 mb-3">
        <div class="col-6">
          <div class="text-center p-2 bg-label-primary rounded">
            <div class="fw-bold">${history.last_weight || 0} ${history.last_weight_unit || 'lbs'}</div>
            <small class="text-muted">Last Weight</small>
          </div>
        </div>
        <div class="col-6">
          <div class="text-center p-2 bg-label-success rounded">
            <div class="fw-bold">${history.best_weight || 0} ${history.last_weight_unit || 'lbs'}</div>
            <small class="text-muted">Personal Record</small>
          </div>
        </div>
      </div>
      
      <!-- Recent Sessions -->
      ${recentSessions.length > 0 ? `
        <h6 class="mb-2">Recent Sessions</h6>
        <div class="table-responsive">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Weight</th>
                <th>Sets</th>
              </tr>
            </thead>
            <tbody>
              ${recentSessions.slice(0, 5).map(session => `
                <tr>
                  <td>${formatDate(session.date)}</td>
                  <td>${session.weight || '-'} ${session.weight_unit || 'lbs'}</td>
                  <td>${session.sets || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="text-muted small">No recent session data</p>'}
    </div>
  `;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch (e) {
    return 'Invalid date';
  }
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

/**
 * Show loading state
 */
function showLoading() {
  document.getElementById('historyLoadingState').style.display = 'block';
  document.getElementById('historyErrorState').style.display = 'none';
  document.getElementById('historyEmptyState').style.display = 'none';
  document.getElementById('historyContent').style.display = 'none';
}

/**
 * Hide loading state
 */
function hideLoading() {
  document.getElementById('historyLoadingState').style.display = 'none';
}

/**
 * Show error state
 */
function showError(message) {
  hideLoading();
  document.getElementById('historyErrorState').style.display = 'block';
  document.getElementById('historyErrorMessage').textContent = message;
  document.getElementById('historyContent').style.display = 'none';
  document.getElementById('historyEmptyState').style.display = 'none';
}

/**
 * Show empty state
 */
function showEmptyState() {
  document.getElementById('historyEmptyState').style.display = 'block';
  document.getElementById('historyContent').style.display = 'none';
}

// Export functions
window.initWorkoutHistory = initWorkoutHistory;
window.loadWorkoutHistory = loadWorkoutHistory;

console.log('📦 Workout History module loaded (v1.0.0)');