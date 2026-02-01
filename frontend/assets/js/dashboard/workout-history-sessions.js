/**
 * Ghost Gym - Workout History Sessions
 * Session rendering and grouping
 * @version 1.1.0
 */

/* ============================================
   SESSION HISTORY RENDERING
   ============================================ */

/**
 * Render session history with time-based grouping
 * Uses filter/pagination functions from workout-history-filters.js
 */
function renderSessionHistory() {
  const sessions = window.ghostGym.workoutHistory.sessions;
  const container = document.getElementById('sessionHistoryContainer');
  const isAllMode = window.ghostGym.workoutHistory.isAllMode;

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4">
        <i class="bx bx-calendar-x display-4 text-muted"></i>
        <p class="mt-3 text-muted">No workout sessions yet</p>
      </div>
    `;
    return;
  }

  let html = '';

  // Render toolbar (full in All Mode, simple in single workout mode)
  html += renderSessionFilterBar();

  // Apply filters and sort (only in All Mode)
  let filteredSessions = sessions;
  if (isAllMode) {
    filteredSessions = applySessionFilters(sessions);
    filteredSessions = sortSessions(filteredSessions);
  }

  // Check if filters resulted in empty list
  if (filteredSessions.length === 0) {
    html += `
      <div class="text-center py-4">
        <i class="bx bx-filter-alt display-4 text-muted"></i>
        <p class="mt-3 text-muted">No sessions match your filters</p>
        <button class="btn btn-sm btn-outline-secondary mt-2" onclick="resetSessionFilters()">
          Clear Filters
        </button>
      </div>
    `;
    container.innerHTML = html;
    return;
  }

  // Apply pagination (All Mode only)
  const state = window.ghostGym.workoutHistory;
  let paginatedSessions = filteredSessions;
  let totalPages = 1;
  const pageSize = state.pageSize;
  const currentPage = state.currentPage;

  if (isAllMode && pageSize !== 'all') {
    const size = parseInt(pageSize);
    totalPages = Math.ceil(filteredSessions.length / size);
    // Clamp current page to valid range
    if (currentPage > totalPages) {
      state.currentPage = totalPages;
    }
    const startIndex = (state.currentPage - 1) * size;
    paginatedSessions = filteredSessions.slice(startIndex, startIndex + size);
  }

  // Group sessions by time period (use paginated sessions)
  const groups = groupSessionsByTimePeriod(paginatedSessions);

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

  // Add pagination controls at the bottom (All Mode only)
  if (isAllMode && pageSize !== 'all' && totalPages > 1) {
    html += renderPaginationControls(state.currentPage, totalPages, filteredSessions.length);
  }

  container.innerHTML = html;
}

/* ============================================
   SESSION GROUPING
   ============================================ */

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

/* ============================================
   SESSION ENTRY RENDERING
   ============================================ */

/**
 * Create a compact session entry
 * In All Mode: shows workout name as primary
 * In Single Workout Mode: date is primary
 * Supports delete mode with checkbox selection
 */
function createSessionEntry(session) {
  const collapseId = `session-${session.id}`;
  const state = window.ghostGym.workoutHistory;
  const isExpanded = state.expandedSessions.has(session.id);
  const isAllMode = state.isAllMode;
  const deleteMode = state.deleteMode;
  const isSelected = state.selectedSessionIds.has(session.id);
  const dateStr = formatDate(session.completed_at, { short: true });
  const duration = formatDuration(session.duration_minutes);

  // Check for notes
  const hasNotes = session.notes || (session.session_notes && session.session_notes.length > 0);

  // In All Mode, show workout name as primary
  const workoutNameHtml = isAllMode
    ? `<span class="session-workout-name">${escapeHtml(session.workout_name || 'Workout')}</span>`
    : '';

  // Escape workout name for use in onclick attribute
  const escapedWorkoutName = (session.workout_name || 'Workout').replace(/'/g, "\\'").replace(/"/g, '&quot;');

  // Delete mode: show checkbox instead of collapse trigger
  if (deleteMode) {
    return `
      <div class="session-entry delete-mode ${isSelected ? 'selected' : ''}"
           id="session-entry-${session.id}"
           onclick="toggleSessionSelection('${session.id}')"
           role="checkbox"
           aria-checked="${isSelected}">
        <div class="session-select-checkbox">
          <input type="checkbox"
                 class="form-check-input session-checkbox"
                 id="select-session-${session.id}"
                 ${isSelected ? 'checked' : ''}
                 onclick="event.stopPropagation(); toggleSessionSelection('${session.id}');">
        </div>
        <div class="session-info flex-grow-1">
          ${workoutNameHtml}
          <span class="session-date">${dateStr}</span>
          <span class="session-meta">${duration}${hasNotes ? ' • <i class="bx bx-note"></i>' : ''}</span>
        </div>
      </div>
    `;
  }

  // Normal mode: expandable session entry
  return `
    <div class="session-entry" id="session-entry-${session.id}"
         data-bs-toggle="collapse"
         data-bs-target="#${collapseId}"
         role="button"
         aria-expanded="${isExpanded}"
         aria-controls="${collapseId}">
      <div class="session-info">
        ${workoutNameHtml}
        <span class="session-date">${dateStr}</span>
        <span class="session-meta">${duration}${hasNotes ? ' • <i class="bx bx-note"></i>' : ''}</span>
      </div>
      <div class="dropdown session-menu" onclick="event.stopPropagation();">
        <button class="btn btn-sm btn-icon session-menu-btn"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                title="Session options">
          <i class="bx bx-dots-vertical-rounded"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li>
            <a class="dropdown-item text-danger" href="javascript:void(0);"
               onclick="deleteSession('${session.id}', '${escapedWorkoutName}');">
              <i class="bx bx-trash me-2"></i>Delete
            </a>
          </li>
        </ul>
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
 * Render session details (exercise table with change indicators)
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
            ${exercises.map(ex => renderExerciseTableRow(ex)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Render a single exercise row in session details table
 * Shows strikethrough for modified values
 */
function renderExerciseTableRow(ex) {
  // Determine status badge
  let statusBadge = '';
  let rowClass = '';

  if (ex.is_skipped) {
    statusBadge = '<span class="badge bg-warning">Skipped</span>';
    rowClass = 'text-muted';
  } else if (ex.is_bonus) {
    statusBadge = '<span class="badge bg-success">Added</span>';
  } else if (ex.is_modified) {
    statusBadge = '<span class="badge bg-primary">Modified</span>';
  } else {
    statusBadge = '<span class="badge bg-label-secondary">Default</span>';
  }

  // Determine weight change indicator
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

  // Build weight display with strikethrough for modified values
  let weightDisplay = '—';
  if (!ex.is_skipped) {
    const weightChanged = ex.is_modified && ex.original_weight !== undefined &&
                          ex.original_weight !== null && String(ex.original_weight) !== String(ex.weight);
    if (weightChanged) {
      weightDisplay = `<span class="exercise-original-value">${ex.original_weight}</span>${ex.weight || '—'} ${ex.weight_unit || ''}`;
    } else {
      weightDisplay = `${ex.weight || '—'} ${ex.weight_unit || ''}`;
    }
  }

  // Build sets/reps display with strikethrough for modified values
  let setsRepsDisplay = '—';
  if (!ex.is_skipped) {
    const setsChanged = ex.is_modified && ex.original_sets !== undefined &&
                        ex.original_sets !== null && String(ex.original_sets) !== String(ex.target_sets);
    const repsChanged = ex.is_modified && ex.original_reps !== undefined &&
                        ex.original_reps !== null && String(ex.original_reps) !== String(ex.target_reps);

    let setsStr = '';
    if (setsChanged) {
      setsStr = `<span class="exercise-original-value">${ex.original_sets}</span>${ex.target_sets}`;
    } else {
      setsStr = ex.target_sets || '—';
    }

    let repsStr = '';
    if (repsChanged) {
      repsStr = `<span class="exercise-original-value">${ex.original_reps}</span>${ex.target_reps}`;
    } else {
      repsStr = ex.target_reps || '—';
    }

    setsRepsDisplay = `${setsStr} × ${repsStr}`;
  }

  return `
    <tr class="${rowClass}">
      <td>
        ${ex.is_skipped ? '<i class="bx bx-x-circle text-warning me-1"></i>' : ''}
        ${escapeHtml(ex.exercise_name)}
      </td>
      <td>${weightDisplay}</td>
      <td>${setsRepsDisplay}</td>
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

/* ============================================
   EXPORTS
   ============================================ */

// Export to window for backwards compatibility
window.renderSessionHistory = renderSessionHistory;
window.groupSessionsByTimePeriod = groupSessionsByTimePeriod;
window.renderSessionGroup = renderSessionGroup;
window.createSessionEntry = createSessionEntry;
window.renderSessionDetails = renderSessionDetails;
window.renderExerciseTableRow = renderExerciseTableRow;
window.scrollToSession = scrollToSession;

console.log('📦 Workout History Sessions module loaded (v1.1.0)');
