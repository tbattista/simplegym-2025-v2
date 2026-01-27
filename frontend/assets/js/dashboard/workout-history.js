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
  calendarView: null,
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
 * Render compact statistics summary
 * V2.2.1 - Single row instead of 4 cards
 */
function renderStatistics() {
  const stats = window.ghostGym.workoutHistory.statistics;
  const container = document.getElementById('statisticsCards');

  // Guard against NaN/undefined
  const sessionCount = stats.totalWorkouts || 0;
  const avgDuration = isNaN(stats.avgDuration) ? 0 : stats.avgDuration;
  const lastDate = stats.lastCompleted
    ? formatDate(stats.lastCompleted, { short: true })
    : null;

  // Build compact summary parts
  let summaryParts = [];

  if (lastDate) {
    summaryParts.push(`Last trained: ${lastDate}`);
    if (avgDuration > 0) {
      summaryParts.push(`${avgDuration} min`);
    }
  }

  const thisMonthCount = getThisMonthSessionCount();
  if (thisMonthCount > 0) {
    summaryParts.push(`This month: ${thisMonthCount} sessions`);
  } else if (sessionCount > 0) {
    summaryParts.push(`${sessionCount} total sessions`);
  }

  if (summaryParts.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.innerHTML = `
    <div class="col-12">
      <div class="stats-summary-row">
        ${summaryParts.join(' <span class="stats-dot">•</span> ')}
      </div>
    </div>
  `;
  container.style.display = 'block';
}

/**
 * Get count of sessions this month
 */
function getThisMonthSessionCount() {
  const sessions = window.ghostGym.workoutHistory.sessions;
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  return sessions.filter(s => {
    const d = new Date(s.completed_at);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;
}

/**
 * Initialize the history calendar view
 * Shows only sessions for the selected workout
 */
function initHistoryCalendar() {
  const sessions = window.ghostGym.workoutHistory.sessions;

  // Create calendar instance if it doesn't exist
  if (!window.ghostGym.workoutHistory.calendarView) {
    window.ghostGym.workoutHistory.calendarView = new CalendarView('historyCalendarGrid', {
      monthLabelId: 'historyCurrentMonth',
      prevButtonId: 'historyPrevMonth',
      nextButtonId: 'historyNextMonth',
      onDayClick: handleCalendarDayClick
    });

    // CalendarView uses window.calendarView for onclick handlers
    window.calendarView = window.ghostGym.workoutHistory.calendarView;
  }

  // Set the session data (already filtered by workout)
  window.ghostGym.workoutHistory.calendarView.setSessionData(sessions);
  console.log(`📅 History calendar initialized with ${sessions.length} sessions`);
}

/**
 * Handle calendar day click - scroll to that session or show info
 */
function handleCalendarDayClick(dateKey, daySessions) {
  if (daySessions.length === 0) {
    return; // No sessions on this day
  }

  // If there's one session, scroll to it
  if (daySessions.length === 1) {
    scrollToSession(daySessions[0].id);
    return;
  }

  // Multiple sessions - scroll to the first one
  scrollToSession(daySessions[0].id);
}

/**
 * Format duration with validation (clamp unrealistic values)
 */
function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '—';
  // Clamp to reasonable max (4 hours = 240 min)
  if (minutes > 240) return '—';
  return `${minutes} min`;
}

/**
 * Render Last Session reference card
 */
function renderLastSessionCard() {
  const sessions = window.ghostGym.workoutHistory.sessions;
  const container = document.getElementById('lastSessionContainer');

  if (!container || sessions.length === 0) return;

  const lastSession = sessions[0]; // Already sorted by date (most recent first)
  const dateStr = formatDate(lastSession.completed_at, { short: true });
  const duration = formatDuration(lastSession.duration_minutes);

  container.innerHTML = `
    <div class="last-session-card" onclick="scrollToSession('${lastSession.id}')" role="button" tabindex="0">
      <div class="last-session-badge">Last</div>
      <div class="last-session-content">
        <span class="last-session-title">${dateStr}</span>
        <span class="last-session-meta">${duration}</span>
      </div>
      <i class="bx bx-chevron-right last-session-chevron"></i>
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

  let html = '';

  // Render each time period as separate card group
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

  container.innerHTML = html;
}

/**
 * Render a group of sessions with header outside the card
 */
function renderSessionGroup(title, sessions) {
  return `
    <div class="session-group">
      <div class="time-period-header">${escapeHtml(title)}</div>
      <div class="session-list">
        ${sessions.map((session, index) => createSessionEntry(session)).join('')}
      </div>
    </div>
  `;
}

/**
 * Create a compact session entry (new design)
 * Date is primary (workout name is already in page context)
 */
function createSessionEntry(session) {
  const collapseId = `session-${session.id}`;
  const isExpanded = window.ghostGym.workoutHistory.expandedSessions.has(session.id);
  const dateStr = formatDate(session.completed_at, { short: true });
  const duration = formatDuration(session.duration_minutes);

  // Determine status
  const exercises = session.exercises_performed || [];
  const skippedCount = exercises.filter(e => e.is_skipped).length;
  const completedCount = exercises.filter(e => !e.is_skipped).length;

  let statusClass = 'completed';
  let statusLabel = '✓';
  let statusTitle = 'Completed';

  if (session.status === 'abandoned') {
    statusClass = 'abandoned';
    statusLabel = '✗';
    statusTitle = 'Abandoned';
  } else if (exercises.length > 0 && skippedCount > exercises.length / 2) {
    statusClass = 'partial';
    statusLabel = '~';
    statusTitle = `Partial (${completedCount}/${exercises.length})`;
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
      <div class="session-status" title="${statusTitle}">
        <span class="session-status-icon ${statusClass}">${statusLabel}</span>
      </div>
      <div class="session-info">
        <span class="session-date">${dateStr}</span>
        <span class="session-meta">${duration}${hasNotes ? ' • <i class="bx bx-note"></i>' : ''}</span>
      </div>
      <i class="bx bx-chevron-down session-chevron"></i>
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
 * V2.1 - Logbook-style exercise list
 */
function renderExercisePerformance() {
  const histories = window.ghostGym.workoutHistory.exerciseHistories;
  const container = document.getElementById('exercisePerformanceContainer');

  const historyArray = Object.values(histories);

  if (historyArray.length === 0) {
    container.innerHTML = `
      <div class="exercise-list-empty">
        <p class="text-muted">No exercise data yet</p>
      </div>
    `;
    return;
  }

  // Wrap in exercise list container (no card)
  container.innerHTML = `
    <div class="exercise-list">
      ${historyArray.map(history => createExerciseRow(history)).join('')}
    </div>
  `;
}

/**
 * Create exercise row (logbook style)
 * V2.2.2 - No chevron, clean notebook look
 */
function createExerciseRow(history) {
  const sanitizedId = history.id.replace(/[^a-zA-Z0-9-_]/g, '-');
  const collapseId = `exercise-${sanitizedId}`;
  const isExpanded = window.ghostGym.workoutHistory.expandedExercises.has(history.id);

  // Primary stat: last working set
  const lastWeight = history.last_weight || '—';
  const lastUnit = history.last_weight_unit || 'lbs';
  const lastReps = getLastReps(history);
  const lastDate = formatExerciseDate(history.last_session_date);

  // Trend arrow (muted)
  const trendArrow = getTrendArrow(history.last_weight_direction);

  return `
    <div class="exercise-row" id="exercise-entry-${sanitizedId}"
         data-bs-toggle="collapse"
         data-bs-target="#${collapseId}"
         role="button"
         aria-expanded="${isExpanded}"
         aria-controls="${collapseId}">
      <div class="exercise-row-main">
        <span class="exercise-name">${escapeHtml(history.exercise_name)}</span>
        ${trendArrow}
      </div>
      <div class="exercise-row-meta">
        <span class="exercise-last-set">${lastWeight} ${lastUnit} × ${lastReps}</span>
        <span class="exercise-date">· ${lastDate}</span>
      </div>
    </div>
    <div id="${collapseId}" class="collapse exercise-details-collapse ${isExpanded ? 'show' : ''}">
      <div class="exercise-details-wrapper">
        ${renderExerciseHistory(history)}
      </div>
    </div>
  `;
}

/**
 * Render exercise history (logbook style expansion)
 * V2.2.2 - Deduplicated, opacity fade for older entries
 */
function renderExerciseHistory(history) {
  const recentSessions = (history.recent_sessions || []).slice(0, 5);

  if (recentSessions.length === 0) {
    return '<div class="exercise-history-empty">No session data yet</div>';
  }

  // Deduplicate by date (keep highest weight per date)
  const uniqueSessions = deduplicateSessions(recentSessions, history.last_weight_unit);

  const sessionsHtml = uniqueSessions.map((session, index) => {
    const date = formatExerciseDate(session.date);
    const weight = session.weight || '—';
    const unit = session.weight_unit || history.last_weight_unit || 'lbs';
    const reps = session.reps || session.sets || '—';

    // Fade older entries: first is full, rest are muted
    const fadeClass = index === 0 ? '' : 'history-row-faded';

    return `
      <div class="exercise-history-row ${fadeClass}">
        <span class="history-date">${date}</span>
        <span class="history-dash">—</span>
        <span class="history-set">${weight}${unit} × ${reps}</span>
      </div>
    `;
  }).join('');

  return `<div class="exercise-history-list">${sessionsHtml}</div>`;
}

/**
 * Deduplicate sessions by date, keeping best set per date
 */
function deduplicateSessions(sessions, defaultUnit) {
  const byDate = {};

  sessions.forEach(s => {
    const dateKey = new Date(s.date).toDateString();
    const weight = parseFloat(s.weight) || 0;

    // Keep the entry with highest weight for each date
    if (!byDate[dateKey] || weight > (parseFloat(byDate[dateKey].weight) || 0)) {
      byDate[dateKey] = s;
    }
  });

  // Return sorted by date descending
  return Object.values(byDate).sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  );
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
 * Format date for exercise rows (compact)
 */
function formatExerciseDate(dateString) {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    const now = new Date();
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return '—';
  }
}

/**
 * Get last reps from exercise history
 */
function getLastReps(history) {
  if (history.recent_sessions && history.recent_sessions.length > 0) {
    const lastSession = history.recent_sessions[0];
    return lastSession.reps || lastSession.sets || '—';
  }
  return '—';
}

/**
 * Get muted trend arrow based on direction
 */
function getTrendArrow(direction) {
  if (!direction) return '';
  if (direction === 'up') {
    return '<span class="trend-arrow trend-up" title="Trending up">↑</span>';
  }
  if (direction === 'down') {
    return '<span class="trend-arrow trend-down" title="Trending down">↓</span>';
  }
  return '<span class="trend-arrow trend-stable" title="Stable">→</span>';
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

console.log('📦 Workout History module loaded (v2.2.1 - Pure Logbook)');