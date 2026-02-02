/**
 * Ghost Gym - Workout History Calendar
 * Calendar view initialization and date filtering
 * @version 1.0.0
 */

/* ============================================
   CALENDAR INITIALIZATION
   ============================================ */

/**
 * Initialize the history calendar view
 * Shows only sessions for the selected workout
 */
function initHistoryCalendar() {
  const sessions = window.ffn.workoutHistory.sessions;

  // Create calendar instance if it doesn't exist
  if (!window.ffn.workoutHistory.calendarView) {
    window.ffn.workoutHistory.calendarView = new CalendarView('historyCalendarGrid', {
      monthLabelId: 'historyCurrentMonth',
      prevButtonId: 'historyPrevMonth',
      nextButtonId: 'historyNextMonth',
      onDayClick: handleCalendarDayClick
    });

    // CalendarView uses window.calendarView for onclick handlers
    window.calendarView = window.ffn.workoutHistory.calendarView;
  }

  // Set the session data (already filtered by workout)
  window.ffn.workoutHistory.calendarView.setSessionData(sessions);
  console.log(`📅 History calendar initialized with ${sessions.length} sessions`);
}

/* ============================================
   CALENDAR DAY CLICK HANDLING
   ============================================ */

/**
 * Handle calendar day click - filter sessions to show only that day
 * In All Mode: filters sessions
 * In Single Workout Mode: scrolls to session
 */
function handleCalendarDayClick(dateKey, daySessions) {
  const isAllMode = window.ffn.workoutHistory.isAllMode;

  // In All Mode, filter to show only that day's sessions
  if (isAllMode) {
    setDateFilter(dateKey);
    return;
  }

  // In Single Workout mode, scroll to session (original behavior)
  if (daySessions.length === 0) {
    return;
  }
  scrollToSession(daySessions[0].id);
}

/* ============================================
   DATE FILTER MANAGEMENT
   ============================================ */

/**
 * Set date filter and re-render sessions
 * @param {string} dateKey - Date in 'YYYY-MM-DD' format
 */
function setDateFilter(dateKey) {
  const state = window.ffn.workoutHistory;
  state.dateFilter = dateKey;
  state.currentPage = 1; // Reset pagination

  // Update date filter indicator
  updateDateFilterIndicator(dateKey);

  // Re-render sessions
  if (typeof renderSessionHistory === 'function') {
    renderSessionHistory();
  }
}

/**
 * Clear date filter and show all sessions
 */
function clearDateFilter() {
  const state = window.ffn.workoutHistory;
  state.dateFilter = null;
  state.currentPage = 1;

  // Hide indicator
  const indicator = document.getElementById('dateFilterIndicator');
  if (indicator) {
    indicator.style.display = 'none';
  }

  // Re-render sessions
  if (typeof renderSessionHistory === 'function') {
    renderSessionHistory();
  }
}

/**
 * Update the date filter indicator UI
 * @param {string} dateKey - Date in 'YYYY-MM-DD' format
 */
function updateDateFilterIndicator(dateKey) {
  const indicator = document.getElementById('dateFilterIndicator');
  const label = document.getElementById('dateFilterLabel');

  if (!indicator || !label) return;

  // Format date nicely
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const formattedDate = date.toLocaleDateString('en-US', options);

  label.textContent = formattedDate;
  indicator.style.display = 'flex';
}

/* ============================================
   EXPORTS
   ============================================ */

// Export to window for backwards compatibility
window.initHistoryCalendar = initHistoryCalendar;
window.handleCalendarDayClick = handleCalendarDayClick;
window.setDateFilter = setDateFilter;
window.clearDateFilter = clearDateFilter;
window.updateDateFilterIndicator = updateDateFilterIndicator;

console.log('📦 Workout History Calendar module loaded (v1.0.0)');
