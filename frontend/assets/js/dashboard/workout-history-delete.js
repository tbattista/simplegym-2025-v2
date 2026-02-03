/**
 * Ghost Gym - Workout History Delete Mode
 * Batch delete functionality for sessions
 * @version 1.0.0
 */

/* ============================================
   DELETE MODE TOGGLE
   ============================================ */

/**
 * Toggle session delete mode
 */
function toggleSessionDeleteMode() {
  const state = window.ffn.workoutHistory;
  state.deleteMode = !state.deleteMode;

  // Clear selection when toggling
  state.selectedSessionIds.clear();

  console.log(`🗑️ Session delete mode ${state.deleteMode ? 'activated' : 'deactivated'}`);

  // Show/hide selection action bar
  if (state.deleteMode) {
    showSessionSelectionActionBar();
  } else {
    hideSessionSelectionActionBar();
  }

  // Body class for global styling
  document.body.classList.toggle('session-delete-mode-active', state.deleteMode);

  // Re-render sessions
  if (typeof renderSessionHistory === 'function') {
    renderSessionHistory();
  }
}

/**
 * Enter delete mode with a session pre-selected
 * Called from the 3-dot menu on session cards
 * @param {string} sessionId - Session ID to pre-select
 */
function enterDeleteModeWithSelection(sessionId) {
  const state = window.ffn.workoutHistory;

  // Enter delete mode
  state.deleteMode = true;
  state.selectedSessionIds.clear();
  state.selectedSessionIds.add(sessionId);

  console.log(`🗑️ Delete mode activated with session pre-selected: ${sessionId}`);

  // Show action bar with 1 selected
  showSessionSelectionActionBar();
  document.body.classList.add('session-delete-mode-active');

  // Re-render sessions
  if (typeof renderSessionHistory === 'function') {
    renderSessionHistory();
  }
}

/**
 * Exit session delete mode
 */
function exitSessionDeleteMode() {
  const state = window.ffn.workoutHistory;
  state.deleteMode = false;
  state.selectedSessionIds.clear();

  hideSessionSelectionActionBar();
  document.body.classList.remove('session-delete-mode-active');

  // Re-render sessions
  if (typeof renderSessionHistory === 'function') {
    renderSessionHistory();
  }
}

/* ============================================
   SELECTION MANAGEMENT
   ============================================ */

/**
 * Toggle selection of a session
 */
function toggleSessionSelection(sessionId) {
  const state = window.ffn.workoutHistory;
  const selected = state.selectedSessionIds;

  if (selected.has(sessionId)) {
    selected.delete(sessionId);
  } else {
    selected.add(sessionId);
  }

  // Update checkbox visual state
  const checkbox = document.getElementById(`select-session-${sessionId}`);
  if (checkbox) {
    checkbox.checked = selected.has(sessionId);
  }

  // Update entry visual state
  const entry = document.getElementById(`session-entry-${sessionId}`);
  if (entry) {
    entry.classList.toggle('selected', selected.has(sessionId));
  }

  updateSessionSelectionCount();
}

/**
 * Update selection count in action bar
 */
function updateSessionSelectionCount() {
  const count = window.ffn.workoutHistory.selectedSessionIds.size;
  const countEl = document.querySelector('#sessionSelectionActionBar .selection-count');
  const deleteBtn = document.querySelector('#sessionSelectionActionBar .btn-batch-delete');

  if (countEl) countEl.textContent = `${count} selected`;
  if (deleteBtn) deleteBtn.disabled = count === 0;
}

/* ============================================
   SELECTION ACTION BAR
   ============================================ */

/**
 * Show the session selection action bar (Gmail-style floating bar)
 */
function showSessionSelectionActionBar() {
  let bar = document.getElementById('sessionSelectionActionBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'sessionSelectionActionBar';
    bar.className = 'selection-action-bar';
    bar.innerHTML = `
      <div class="selection-info">
        <button class="btn-close-selection" onclick="exitSessionDeleteMode()" type="button">
          <i class="bx bx-x"></i>
        </button>
        <span class="selection-count">0 selected</span>
      </div>
      <button class="btn-batch-delete" onclick="confirmBatchDeleteSessions()" type="button" disabled>
        <i class="bx bx-trash"></i>
        Delete
      </button>
    `;
    document.body.appendChild(bar);
  }
  bar.style.display = 'flex';
  updateSessionSelectionCount();
}

/**
 * Hide the session selection action bar
 */
function hideSessionSelectionActionBar() {
  const bar = document.getElementById('sessionSelectionActionBar');
  if (bar) {
    bar.style.display = 'none';
  }
}

/* ============================================
   BATCH DELETE
   ============================================ */

/**
 * Confirm batch delete of selected sessions
 */
async function confirmBatchDeleteSessions() {
  const selected = window.ffn.workoutHistory.selectedSessionIds;
  const count = selected.size;
  if (count === 0) return;

  // Get session dates for confirmation
  const sessionDates = [...selected].map(id => {
    const session = window.ffn.workoutHistory.sessions.find(s => s.id === id);
    if (session) {
      const date = formatDate(session.completed_at, { short: true });
      const name = session.workout_name || 'Workout';
      return `${name} - ${date}`;
    }
    return 'Unknown session';
  }).slice(0, 3); // Show max 3

  let message = `Are you sure you want to delete ${count} session${count > 1 ? 's' : ''}?\n\n`;
  message += sessionDates.join('\n');
  if (count > 3) {
    message += `\n...and ${count - 3} more`;
  }
  message += '\n\nThis action cannot be undone.';

  const confirmed = confirm(message);

  if (confirmed) {
    await batchDeleteSessions([...selected]);
  }
}

/**
 * Batch delete sessions
 */
async function batchDeleteSessions(sessionIds) {
  console.log('🗑️ Batch deleting sessions:', sessionIds);

  // Show loading state
  const deleteBtn = document.querySelector('#sessionSelectionActionBar .btn-batch-delete');
  if (deleteBtn) {
    deleteBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Deleting...';
    deleteBtn.disabled = true;
  }

  try {
    // Check authentication
    if (!window.dataManager || !window.dataManager.isUserAuthenticated()) {
      throw new Error('Authentication required');
    }

    const token = await window.dataManager.getAuthToken();
    let deletedCount = 0;

    // Delete each session
    for (const id of sessionIds) {
      try {
        const response = await fetch(`/api/v3/workout-sessions/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          deletedCount++;
        } else {
          console.error(`Failed to delete session ${id}`);
        }
      } catch (error) {
        console.error(`Error deleting session ${id}:`, error);
      }
    }

    // Update local state
    window.ffn.workoutHistory.sessions = window.ffn.workoutHistory.sessions.filter(
      s => !sessionIds.includes(s.id)
    );

    // Update statistics
    if (typeof calculateStatistics === 'function') {
      calculateStatistics();
    }

    // Show success message
    if (window.showToast) {
      window.showToast(`Deleted ${deletedCount} session${deletedCount > 1 ? 's' : ''}`, 'success');
    }

    // Exit delete mode and refresh
    exitSessionDeleteMode();

    if (typeof renderStatistics === 'function') {
      renderStatistics();
    }

    // Update calendar if visible
    if (window.ffn.workoutHistory.calendarView) {
      window.ffn.workoutHistory.calendarView.setSessionData(
        window.ffn.workoutHistory.sessions
      );
    }

    console.log(`✅ Deleted ${deletedCount} sessions`);

  } catch (error) {
    console.error('Batch delete failed:', error);
    if (window.showToast) {
      window.showToast('Failed to delete some sessions', 'error');
    } else {
      alert('Failed to delete some sessions. Please try again.');
    }
  } finally {
    // Reset button state
    if (deleteBtn) {
      deleteBtn.innerHTML = '<i class="bx bx-trash"></i> Delete';
      deleteBtn.disabled = false;
    }
  }
}

/* ============================================
   EXPORTS
   ============================================ */

// Export to window for backwards compatibility
window.toggleSessionDeleteMode = toggleSessionDeleteMode;
window.enterDeleteModeWithSelection = enterDeleteModeWithSelection;
window.exitSessionDeleteMode = exitSessionDeleteMode;
window.toggleSessionSelection = toggleSessionSelection;
window.updateSessionSelectionCount = updateSessionSelectionCount;
window.showSessionSelectionActionBar = showSessionSelectionActionBar;
window.hideSessionSelectionActionBar = hideSessionSelectionActionBar;
window.confirmBatchDeleteSessions = confirmBatchDeleteSessions;
window.batchDeleteSessions = batchDeleteSessions;

console.log('📦 Workout History Delete module loaded (v1.0.0)');
