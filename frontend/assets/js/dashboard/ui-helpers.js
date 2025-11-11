/**
 * Ghost Gym Dashboard - UI Helper Functions
 * Utility functions for alerts, loading states, and common UI operations
 * @version 2.0.0 - Refactored to use common-utils.js
 *
 * NOTE: Core utility functions (showAlert, showLoading, escapeHtml, debounce, getApiUrl)
 * have been moved to common-utils.js for reuse across the application.
 * This file now only contains UI-specific helper functions.
 */

// Core utilities are now loaded from common-utils.js
// Functions available globally: showAlert, showLoading, escapeHtml, debounce, getApiUrl

/**
 * Show empty state panel in builder view
 */
function showEmptyStatePanel() {
    const emptyStatePanel = document.getElementById('emptyStatePanel');
    const detailsPanel = document.getElementById('programDetailsPanel');
    
    if (emptyStatePanel) emptyStatePanel.style.display = 'block';
    if (detailsPanel) detailsPanel.style.display = 'none';
}

/**
 * Hide empty state panel in builder view
 */
function hideEmptyStatePanel() {
    const emptyStatePanel = document.getElementById('emptyStatePanel');
    if (emptyStatePanel) emptyStatePanel.style.display = 'none';
}

/**
 * Update stats display in footer
 */
function updateStats() {
    const statsDisplay = document.getElementById('statsDisplay');
    if (!statsDisplay || !window.ghostGym) return;
    
    const programCount = window.ghostGym.programs.length;
    const workoutCount = window.ghostGym.workouts.length;
    
    statsDisplay.innerHTML = `
        <span class="stats-item">
            <i class="bx bx-folder"></i>
            ${programCount} programs
        </span>
        <span class="stats-item">
            <i class="bx bx-dumbbell"></i>
            ${workoutCount} workouts
        </span>
    `;
}

/**
 * Show program modal
 */
function showProgramModal() {
    const modal = new bootstrap.Modal(document.getElementById('programModal'));
    modal.show();
}

/**
 * Show workout modal
 */
function showWorkoutModal() {
    const modal = new bootstrap.Modal(document.getElementById('workoutModal'));
    modal.show();
}

/**
 * Show authentication modal
 */
function showAuthModal() {
    if (window.authUI && window.authUI.showAuthModal) {
        window.authUI.showAuthModal();
    } else {
        const modal = new bootstrap.Modal(document.getElementById('authModal'));
        modal.show();
    }
}

/**
 * Show generate document modal
 */
function showGenerateModal() {
    const modal = new bootstrap.Modal(document.getElementById('generateModal'));
    modal.show();
}

/**
 * Show backup/export options (placeholder)
 */
function showBackupOptions() {
    showAlert('Backup & Export functionality coming soon!', 'info');
}

/**
 * Show settings panel (placeholder)
 */
function showSettings() {
    showAlert('Settings panel coming soon!', 'info');
}

/**
 * Focus on programs panel
 */
function focusProgramsPanel() {
    document.getElementById('programSearch')?.focus();
}

/**
 * Focus on workouts panel
 */
function focusWorkoutsPanel() {
    document.getElementById('workoutSearch')?.focus();
}

// UI-specific functions remain here
// (showEmptyStatePanel, hideEmptyStatePanel, updateStats, etc.)

// Make UI-specific functions globally available
window.showEmptyStatePanel = showEmptyStatePanel;
window.hideEmptyStatePanel = hideEmptyStatePanel;
window.updateStats = updateStats;
window.showProgramModal = showProgramModal;
window.showWorkoutModal = showWorkoutModal;
window.showAuthModal = showAuthModal;
window.showGenerateModal = showGenerateModal;
window.showBackupOptions = showBackupOptions;
window.showSettings = showSettings;
window.focusProgramsPanel = focusProgramsPanel;
window.focusWorkoutsPanel = focusWorkoutsPanel;
console.log('📦 UI Helpers module loaded (v2.0 - using common-utils)');