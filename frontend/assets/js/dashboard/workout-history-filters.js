/**
 * Ghost Gym - Workout History Filters
 * Session filtering, sorting, and pagination
 * @version 1.0.0
 */

/* ============================================
   FILTER BAR
   ============================================ */

/**
 * Render session toolbar
 * Unified toolbar (full controls in All Mode, simple in single workout mode)
 */
function renderSessionFilterBar() {
  const state = window.ghostGym.workoutHistory;
  const isAllMode = state.isAllMode;
  const activeWorkout = state.workoutTypeFilter;
  const activeSort = state.sessionSort;
  const activePageSize = state.pageSize;
  const uniqueWorkouts = state.uniqueWorkouts || [];
  const deleteMode = state.deleteMode;

  // Sort label mapping
  const sortLabels = {
    'date-desc': 'Newest',
    'date-asc': 'Oldest'
  };

  // Build workout dropdown options (All Mode only)
  const workoutOptions = uniqueWorkouts.map(w =>
    `<option value="${escapeHtml(w.name)}" ${activeWorkout === w.name ? 'selected' : ''}>
      ${escapeHtml(w.name)} (${w.count})
    </option>`
  ).join('');

  // Delete mode toggle button (both modes)
  const deleteBtn = `
    <button class="btn btn-sm ${deleteMode ? 'btn-danger' : 'btn-outline-danger'} session-toolbar-btn"
            type="button"
            onclick="toggleSessionDeleteMode()"
            title="${deleteMode ? 'Exit delete mode' : 'Delete multiple sessions'}">
      <i class="bx ${deleteMode ? 'bx-x' : 'bx-trash'}"></i>
      <span class="ms-1">${deleteMode ? 'Cancel' : 'Delete'}</span>
    </button>`;

  // All Mode: full toolbar
  if (isAllMode) {
    return `
      <div class="session-toolbar mb-3">
        <!-- Workout Type Dropdown (Line 1 on mobile) -->
        <select class="form-select form-select-sm session-toolbar-select"
                id="workoutTypeFilter"
                onchange="setWorkoutTypeFilter(this.value)"
                ${deleteMode ? 'disabled' : ''}>
          <option value="all" ${activeWorkout === 'all' ? 'selected' : ''}>All Workouts</option>
          ${workoutOptions}
        </select>

        <!-- Page Size Selector (Line 2, left on mobile) -->
        <select class="form-select form-select-sm session-toolbar-select session-pagesize"
                onchange="setPageSize(this.value)"
                ${deleteMode ? 'disabled' : ''}>
          <option value="10" ${activePageSize == 10 ? 'selected' : ''}>10 / page</option>
          <option value="20" ${activePageSize == 20 ? 'selected' : ''}>20 / page</option>
          <option value="50" ${activePageSize == 50 ? 'selected' : ''}>50 / page</option>
          <option value="all" ${activePageSize === 'all' ? 'selected' : ''}>Show all</option>
        </select>

        <!-- Sort Cycle Button -->
        <button class="btn btn-sm btn-outline-secondary session-toolbar-btn"
                onclick="cycleSessionSort()"
                ${deleteMode ? 'disabled' : ''}>
          <i class="bx bx-sort-alt-2"></i>
          <span class="ms-1">${sortLabels[activeSort]}</span>
        </button>

        <!-- Delete Button -->
        ${deleteBtn}
      </div>
    `;
  }

  // Single workout mode: just delete button
  return `
    <div class="session-toolbar mb-3">
      ${deleteBtn}
    </div>
  `;
}

/* ============================================
   FILTERING
   ============================================ */

/**
 * Apply session filters (workout type and date)
 */
function applySessionFilters(sessions) {
  const state = window.ghostGym.workoutHistory;
  const workoutFilter = state.workoutTypeFilter;
  const dateFilter = state.dateFilter;

  let filtered = sessions;

  // Filter by workout type
  if (workoutFilter !== 'all') {
    filtered = filtered.filter(session => {
      const workoutName = session.workout_name || 'Unknown Workout';
      return workoutName === workoutFilter;
    });
  }

  // Filter by date
  if (dateFilter) {
    filtered = filtered.filter(session => {
      const dateStr = session.completed_at || session.started_at;
      if (!dateStr) return false;
      const date = new Date(dateStr);
      const sessionDateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return sessionDateKey === dateFilter;
    });
  }

  return filtered;
}

/* ============================================
   SORTING
   ============================================ */

/**
 * Sort sessions by current sort mode
 */
function sortSessions(sessions) {
  const sortMode = window.ghostGym.workoutHistory.sessionSort;
  const sorted = [...sessions];

  switch (sortMode) {
    case 'date-desc':
      sorted.sort((a, b) => new Date(b.completed_at || b.started_at) - new Date(a.completed_at || a.started_at));
      break;
    case 'date-asc':
      sorted.sort((a, b) => new Date(a.completed_at || a.started_at) - new Date(b.completed_at || b.started_at));
      break;
    case 'duration-desc':
      sorted.sort((a, b) => (b.duration_minutes || 0) - (a.duration_minutes || 0));
      break;
    case 'duration-asc':
      sorted.sort((a, b) => (a.duration_minutes || 0) - (b.duration_minutes || 0));
      break;
  }

  return sorted;
}

/**
 * Set workout type filter and re-render
 */
function setWorkoutTypeFilter(workoutName) {
  window.ghostGym.workoutHistory.workoutTypeFilter = workoutName;
  window.ghostGym.workoutHistory.currentPage = 1; // Reset page
  renderSessionHistory();
}

/**
 * Cycle through session sort options
 */
function cycleSessionSort() {
  const sortOrder = ['date-desc', 'date-asc'];
  const currentSort = window.ghostGym.workoutHistory.sessionSort;
  const currentIndex = sortOrder.indexOf(currentSort);
  const nextIndex = (currentIndex + 1) % sortOrder.length;

  window.ghostGym.workoutHistory.sessionSort = sortOrder[nextIndex];
  window.ghostGym.workoutHistory.currentPage = 1; // Reset page
  renderSessionHistory();
}

/**
 * Reset all session filters to defaults
 */
function resetSessionFilters() {
  window.ghostGym.workoutHistory.sessionFilter = 'all';
  window.ghostGym.workoutHistory.workoutTypeFilter = 'all';
  window.ghostGym.workoutHistory.sessionSort = 'date-desc';
  window.ghostGym.workoutHistory.currentPage = 1;
  window.ghostGym.workoutHistory.pageSize = 20;
  window.ghostGym.workoutHistory.dateFilter = null;

  // Hide date filter indicator
  const indicator = document.getElementById('dateFilterIndicator');
  if (indicator) {
    indicator.style.display = 'none';
  }

  renderSessionHistory();
}

/* ============================================
   PAGINATION
   ============================================ */

/**
 * Set page size and re-render
 */
function setPageSize(size) {
  window.ghostGym.workoutHistory.pageSize = size;
  window.ghostGym.workoutHistory.currentPage = 1; // Reset to page 1
  renderSessionHistory();
}

/**
 * Navigate to a specific page
 */
function goToPage(page) {
  const state = window.ghostGym.workoutHistory;

  if (state.pageSize === 'all') return;

  const pageSize = parseInt(state.pageSize);
  const filteredSessions = applySessionFilters(state.sessions);
  const sortedSessions = sortSessions(filteredSessions);
  const totalPages = Math.ceil(sortedSessions.length / pageSize);

  if (page < 1 || page > totalPages) return;

  state.currentPage = page;
  renderSessionHistory();

  // Scroll to top of session list
  document.getElementById('sessionHistoryContainer')?.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Render pagination controls
 */
function renderPaginationControls(currentPage, totalPages, totalItems) {
  const state = window.ghostGym.workoutHistory;
  const pageSize = parseInt(state.pageSize);
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  // Build page numbers (show max 5 pages with ellipsis)
  let pageNumbers = '';
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    pageNumbers += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
    if (startPage > 2) pageNumbers += `<span class="pagination-ellipsis">...</span>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}"
                            onclick="goToPage(${i})">${i}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pageNumbers += `<span class="pagination-ellipsis">...</span>`;
    pageNumbers += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }

  return `
    <div class="session-pagination">
      <div class="pagination-info">
        Showing ${start}-${end} of ${totalItems}
      </div>
      <div class="pagination-controls">
        <button class="pagination-btn pagination-prev"
                onclick="goToPage(${currentPage - 1})"
                ${currentPage === 1 ? 'disabled' : ''}>
          <i class="bx bx-chevron-left"></i>
        </button>
        ${pageNumbers}
        <button class="pagination-btn pagination-next"
                onclick="goToPage(${currentPage + 1})"
                ${currentPage === totalPages ? 'disabled' : ''}>
          <i class="bx bx-chevron-right"></i>
        </button>
      </div>
    </div>
  `;
}

/* ============================================
   EXPORTS
   ============================================ */

// Export to window for backwards compatibility
window.renderSessionFilterBar = renderSessionFilterBar;
window.applySessionFilters = applySessionFilters;
window.sortSessions = sortSessions;
window.setWorkoutTypeFilter = setWorkoutTypeFilter;
window.cycleSessionSort = cycleSessionSort;
window.resetSessionFilters = resetSessionFilters;
window.setPageSize = setPageSize;
window.goToPage = goToPage;
window.renderPaginationControls = renderPaginationControls;

console.log('📦 Workout History Filters module loaded (v1.0.0)');
