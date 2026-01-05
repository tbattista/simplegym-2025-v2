/**
 * Ghost Gym - Workout Utilities
 * Shared utility functions for workout mode
 * @version 1.0.0
 * @date 2025-01-05
 */

const WorkoutUtils = {
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Strip HTML tags from string
     * @param {string} html - HTML string to strip
     * @returns {string} Plain text
     */
    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    },
    
    /**
     * Parse rest time string to seconds
     * @param {string} restStr - Rest time string (e.g., "60s", "90s")
     * @returns {number} Rest time in seconds (defaults to 60)
     */
    parseRestTime(restStr) {
        const match = restStr.match(/(\d+)/);
        return match ? parseInt(match[1]) : 60;
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutUtils;
}

// Make available globally for existing code
window.WorkoutUtils = WorkoutUtils;

console.log('📦 Workout Utils loaded');
