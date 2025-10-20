/**
 * Ghost Gym Dashboard - UI Helper Functions
 * Utility functions for alerts, loading states, and common UI operations
 * @version 1.0.0
 */

/**
 * Show alert message with auto-dismiss
 * @param {string} message - Alert message to display
 * @param {string} type - Alert type: 'success', 'danger', 'warning', 'info'
 * @param {number} duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
 */
function showAlert(message, type = 'info', duration = 5000) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;
    
    const alertId = 'alert-' + Date.now();
    const iconMap = {
        success: 'check-circle',
        danger: 'error',
        warning: 'error-circle',
        info: 'info-circle'
    };
    
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert" id="${alertId}">
            <i class="bx bx-${iconMap[type] || 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHtml);
    
    // Auto-dismiss after duration
    if (duration > 0) {
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, duration);
    }
}

/**
 * Show/hide global loading state
 * @param {boolean} show - Whether to show or hide loading state
 */
function showLoading(show) {
    if (window.ghostGym) {
        window.ghostGym.isLoading = show;
    }
    
    // Update UI to show loading state
    const loadingElements = document.querySelectorAll('.loading-overlay');
    loadingElements.forEach(el => {
        el.style.display = show ? 'flex' : 'none';
    });
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML-safe text
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * Debounce function to limit rapid function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

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

/**
 * Get API URL with proper base path
 * Ensures HTTPS in production
 * @param {string} path - API endpoint path
 * @returns {string} Full API URL
 */
function getApiUrl(path) {
    // Ensure path starts with /
    if (!path.startsWith('/')) {
        path = '/' + path;
    }
    
    // Always use HTTPS
    const hostname = window.location.hostname;
    const protocol = 'https:';
    const port = window.location.port;
    let baseUrl = `${protocol}//${hostname}`;
    
    // Only add port if it exists and is not standard (443 for HTTPS, 80 for HTTP)
    if (port && port !== '' && port !== '443' && port !== '80') {
        baseUrl += `:${port}`;
    }
    
    return `${baseUrl}${path}`;
}

// Make functions globally available
window.showAlert = showAlert;
window.showLoading = showLoading;
window.escapeHtml = escapeHtml;
window.debounce = debounce;
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
window.getApiUrl = getApiUrl;

console.log('📦 UI Helpers module loaded');