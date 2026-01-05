/**
 * Ghost Gym - Workout UI State Manager
 * Centralized management of loading, error, and UI states for workout mode
 * @version 1.0.0
 * @date 2025-01-05
 */

class WorkoutUIStateManager {
    /**
     * @param {Object} containerIds - DOM element IDs for state containers
     * @param {string} containerIds.loading - Loading state container ID
     * @param {string} containerIds.error - Error state container ID
     * @param {string} containerIds.loadingMessage - Loading message element ID
     * @param {string} containerIds.errorMessage - Error message element ID
     * @param {string} containerIds.content - Main content container ID
     * @param {string} containerIds.footer - Footer container ID
     * @param {string} containerIds.header - Header container ID (optional)
     */
    constructor(containerIds) {
        this.containerIds = containerIds;
        console.log('🎨 Workout UI State Manager initialized');
    }
    
    // ==================== Loading States ====================
    
    /**
     * Show loading state with optional message
     * @param {string} message - Loading message to display
     */
    showLoading(message = 'Loading...') {
        const loading = document.getElementById(this.containerIds.loading);
        const error = document.getElementById(this.containerIds.error);
        const content = document.getElementById(this.containerIds.content);
        const footer = document.getElementById(this.containerIds.footer);
        const header = document.getElementById(this.containerIds.header);
        
        if (loading) loading.style.display = 'block';
        if (error) error.style.display = 'none';
        if (content) content.style.display = 'none';
        if (footer) footer.style.display = 'none';
        if (header) header.style.display = 'none';
        
        this.updateLoadingMessage(message);
    }
    
    /**
     * Hide loading state and show content
     */
    hideLoading() {
        const loading = document.getElementById(this.containerIds.loading);
        const content = document.getElementById(this.containerIds.content);
        const footer = document.getElementById(this.containerIds.footer);
        const header = document.getElementById(this.containerIds.header);
        
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';
        if (footer) footer.style.display = 'block';
        if (header) header.style.display = 'block';
    }
    
    /**
     * Update loading message
     * @param {string} message - New loading message
     */
    updateLoadingMessage(message) {
        const loadingMessage = document.getElementById(this.containerIds.loadingMessage);
        if (loadingMessage) {
            loadingMessage.textContent = message;
        }
    }
    
    // ==================== Error States ====================
    
    /**
     * Show error state with message
     * @param {string} message - Error message to display
     * @param {Object} options - Additional options
     * @param {boolean} options.escape - Whether to escape HTML (default: true)
     */
    showError(message, options = {}) {
        const { escape = true } = options;
        
        console.error('❌ Showing error:', message);
        
        const loading = document.getElementById(this.containerIds.loading);
        const error = document.getElementById(this.containerIds.error);
        const errorMessage = document.getElementById(this.containerIds.errorMessage);
        const content = document.getElementById(this.containerIds.content);
        const footer = document.getElementById(this.containerIds.footer);
        const header = document.getElementById(this.containerIds.header);
        
        // Hide all other states
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'none';
        if (footer) footer.style.display = 'none';
        if (header) header.style.display = 'none';
        
        // Show error with detailed message and troubleshooting tips
        if (error) {
            error.style.display = 'block';
            if (errorMessage && message) {
                const displayMessage = escape && window.WorkoutUtils 
                    ? window.WorkoutUtils.escapeHtml(message) 
                    : message;
                
                errorMessage.innerHTML = `
                    <strong>${displayMessage}</strong>
                    <br><br>
                    <small class="text-muted">
                        <strong>Troubleshooting tips:</strong><br>
                        1. Refresh the page (Ctrl+R or Cmd+R)<br>
                        2. Clear browser cache and try again<br>
                        3. Check browser console for details (F12)<br>
                        4. Try a different browser<br>
                        <br>
                        <em>If this persists, the app may still be initializing. Wait a moment and refresh.</em>
                    </small>
                `;
            }
        }
    }
    
    /**
     * Hide error state
     */
    hideError() {
        const error = document.getElementById(this.containerIds.error);
        if (error) error.style.display = 'none';
    }
    
    // ==================== Session UI ====================
    
    /**
     * Update session UI based on active state
     * @param {boolean} isActive - Whether session is active
     * @param {Object} session - Current session data (optional)
     */
    updateSessionState(isActive, session = null) {
        const sessionIndicator = document.getElementById('sessionActiveIndicator');
        const sessionInfo = document.getElementById('sessionInfo');
        const footer = document.getElementById(this.containerIds.footer);
        
        // Always show footer when workout is loaded
        if (footer) footer.style.display = 'block';
        
        if (isActive) {
            if (sessionIndicator) sessionIndicator.style.display = 'block';
            if (sessionInfo) sessionInfo.style.display = 'block';
            
            // Update floating timer/end combo to show active state
            if (window.bottomActionBar) {
                console.log('🔄 Updating timer/end combo to active mode');
                window.bottomActionBar.updateWorkoutModeState(true);
            }
        } else {
            if (sessionIndicator) sessionIndicator.style.display = 'none';
            if (sessionInfo) sessionInfo.style.display = 'none';
            
            // Update timer/end combo to show inactive state (Start button)
            if (window.bottomActionBar) {
                console.log('🔄 Updating timer/end combo to inactive mode');
                window.bottomActionBar.updateWorkoutModeState(false);
            }
        }
    }
    
    // ==================== Save Indicators ====================
    
    /**
     * Show save indicator on element
     * @param {HTMLElement} element - Card element to show indicator on
     * @param {string} state - Indicator state: 'saving' | 'success' | 'error'
     */
    showSaveIndicator(element, state) {
        if (!element) return;
        
        const saveIndicator = element.querySelector('.save-indicator');
        const saveSuccess = element.querySelector('.save-success');
        
        if (!saveIndicator || !saveSuccess) return;
        
        saveIndicator.style.display = 'none';
        saveSuccess.style.display = 'none';
        
        switch (state) {
            case 'saving':
                saveIndicator.style.display = 'inline-block';
                break;
            case 'success':
                saveSuccess.style.display = 'inline-block';
                setTimeout(() => {
                    saveSuccess.style.display = 'none';
                }, 2000);
                break;
        }
    }
    
    // ==================== Start Button Tooltip ====================
    
    /**
     * Update start button tooltip based on auth state
     * @param {boolean} isAuthenticated - Whether user is authenticated
     */
    updateStartButtonTooltip(isAuthenticated) {
        const startBtn = document.getElementById('startWorkoutBtn');
        if (!startBtn) return;
        
        // Destroy existing tooltip
        const existingTooltip = window.bootstrap?.Tooltip?.getInstance(startBtn);
        if (existingTooltip) {
            existingTooltip.dispose();
        }
        
        if (isAuthenticated) {
            startBtn.setAttribute('data-bs-original-title', 'Start tracking your workout with weight logging');
            startBtn.classList.remove('btn-outline-primary');
            startBtn.classList.add('btn-primary');
        } else {
            startBtn.setAttribute('data-bs-original-title', '🔒 Log in to track weights and save progress');
            startBtn.classList.remove('btn-primary');
            startBtn.classList.add('btn-outline-primary');
        }
        
        // Initialize Bootstrap tooltip
        if (window.bootstrap && window.bootstrap.Tooltip) {
            new window.bootstrap.Tooltip(startBtn);
        }
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutUIStateManager;
}

console.log('📦 Workout UI State Manager loaded');
