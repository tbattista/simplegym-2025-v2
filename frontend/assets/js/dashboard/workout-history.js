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
 * Render Last Session reference card
 */
function renderLastSessionCard() {
  const sessions = window.ghostGym.workoutHistory.sessions;
  const container = document.getElementById('lastSessionContainer');

  if (!container || sessions.length === 0) return;

  const lastSession = sessions[0]; // Already sorted by date (most recent first)
  const workoutName = window.ghostGym.workoutHistory.workoutInfo?.name || 'Workout';
  const dateStr = formatDate(lastSession.completed_at, { short: true });
  const duration = lastSession.duration_minutes || 0;

  container.innerHTML = `
    <div class="last-session-card">
      <div class="last-session-badge">LAST SESSION</div>
      <div class="last-session-content">
        <h5 class="last-session-title">${escapeHtml(workoutName)}</h5>
        <span class="last-session-meta">${dateStr} • ${duration} min</span>
      </div>
      <button class="btn btn-sm btn-outline-primary last-session-action"
              onclick="scrollToSession('${lastSession.id}')">
        View Details →
      </button>
    </div>
  `;
  container.style.display = 'block';
}

/**
 * Scroll to and expand a specific session
 */
function scrollToSession(sessionId) {
  const sessionEl = document.getElementById(`session-entry-${sessionId}`);
  if (sessionEl) {
    sessionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Expand the session details
    const collapseEl = document.getElementById(`session-${sessionId}`);
    if (collapseEl && !collapseEl.classList.contains('show')) {
      const bsCollapse = new bootstrap.Collapse(collapseEl, { toggle: true });
    }
    // Highlight briefly
    sessionEl.classList.add('session-highlight');
    setTimeout(() => sessionEl.classList.remove('session-highlight'), 1500);
  }
}

/**
 * Render session history with time-based grouping
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

  // Render Last Session card
  renderLastSessionCard();

  // Group sessions by time period
  const groups = groupSessionsByTimePeriod(sessions);

  let html = '<div class="session-list">';

  // Render each time period
  if (groups.thisWeek.length > 0) {
    html += renderSessionGroup('This Week', groups.thisWeek);
  }

  if (groups.lastWeek.length > 0) {
    html += renderSessionGroup('Last Week', groups.lastWeek);
  }

  if (groups.earlierThisMonth.length > 0) {
    html += renderSessionGroup('Earlier This Month', groups.earlierThisMonth);
  }

  // Render monthly groups (sorted by date, most recent first)
  const monthKeys = Object.keys(groups.byMonth).sort((a, b) => {
    const dateA = new Date(groups.byMonth[a][0].completed_at);
    const dateB = new Date(groups.byMonth[b][0].completed_at);
    return dateB - dateA;
  });

  monthKeys.forEach(monthKey => {
    html += renderSessionGroup(monthKey, groups.byMonth[monthKey]);
  });

  html += '</div>';
  container.innerHTML = html;
}

/**
 * Render a group of sessions with a header
 */
function renderSessionGroup(title, sessions) {
  return `
    <div class="session-group">
      <div class="time-period-header">${escapeHtml(title)}</div>
      ${sessions.map((session, index) => createSessionEntry(session)).join('')}
    </div>
  `;
}

/**
 * Create a compact session entry (new design)
 */
function createSessionEntry(session) {
  const collapseId = `session-${session.id}`;
  const isExpanded = window.ghostGym.workoutHistory.expandedSessions.has(session.id);
  const workoutName = window.ghostGym.workoutHistory.workoutInfo?.name || 'Workout';
  const dateStr = formatDate(session.completed_at, { short: true });
  const duration = session.duration_minutes || 0;

  // Determine status
  let statusClass = 'completed';
  const exercises = session.exercises_performed || [];
  const skippedCount = exercises.filter(e => e.is_skipped).length;
  if (session.status === 'abandoned') {
    statusClass = 'abandoned';
  } else if (skippedCount > exercises.length / 2) {
    statusClass = 'partial';
  }

  // Check for notes
  const hasNotes = session.notes || (session.session_notes && session.session_notes.length > 0);

  return `
    <div class="session-entry" id="session-entry-${session.id}"
         data-bs-toggle="collapse"
         data-bs-target="#${collapseId}"
         role="button"
         aria-expanded="${isExpanded}"
         aria-controls="${collapseId}">
      <div class="session-status-dot ${statusClass}"></div>
      <div class="session-info">
        <span class="session-workout-name">${escapeHtml(workoutName)}</span>
        <span class="session-meta">${dateStr} • ${duration} min</span>
      </div>
      <div class="session-indicators">
        ${hasNotes ? '<span class="session-notes-indicator" title="Has notes"><i class="bx bx-note"></i></span>' : ''}
        <i class="bx bx-chevron-down session-chevron"></i>
      </div>
    </div>
    <div id="${collapseId}" class="collapse session-details-collapse ${isExpanded ? 'show' : ''}">
      <div class="session-details-wrapper">
        ${renderSessionDetails(session)}
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
        statusBadge = '<span class="badge bg-success">Added</span>';
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
 * Format date for display (conversational style)
 */
function formatDate(dateString, options = {}) {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    const now = new Date();
    const isCurrentYear = date.getFullYear() === now.getFullYear();

    // Short format: "Jan 25" or "Jan 25, 2024" for older dates
    if (options.short) {
      if (isCurrentYear) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }

    // Full format for details
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
 * Group sessions by time period
 * Returns: { thisWeek: [], lastWeek: [], earlierThisMonth: [], byMonth: { 'December 2025': [], ... } }
 */
function groupSessionsByTimePeriod(sessions) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Calculate week boundaries
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const startOfThisWeek = new Date(today);
  startOfThisWeek.setDate(today.getDate() - dayOfWeek);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const groups = {
    thisWeek: [],
    lastWeek: [],
    earlierThisMonth: [],
    byMonth: {}
  };

  sessions.forEach(session => {
    const sessionDate = new Date(session.completed_at || session.started_at);
    const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());

    if (sessionDay >= startOfThisWeek) {
      groups.thisWeek.push(session);
    } else if (sessionDay >= startOfLastWeek) {
      groups.lastWeek.push(session);
    } else if (sessionDay >= startOfThisMonth) {
      groups.earlierThisMonth.push(session);
    } else {
      // Group by month
      const monthKey = sessionDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups.byMonth[monthKey]) {
        groups.byMonth[monthKey] = [];
      }
      groups.byMonth[monthKey].push(session);
    }
  });

  return groups;
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
window.scrollToSession = scrollToSession;

console.log('📦 Workout History module loaded (v2.0.0 - UX Improvements)');