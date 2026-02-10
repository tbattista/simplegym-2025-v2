/**
 * Activity Block Chart Component
 * Renders a compact visual-only heatmap of workout activity
 *
 * Usage:
 *   const chart = new ActivityBlockChart('containerId', { daysToShow: 45 });
 *   chart.setSessionData(sessions);
 */

(function() {
    'use strict';

    class ActivityBlockChart {
        /**
         * @param {string} containerId - DOM element ID to render into
         * @param {Object} [options]
         * @param {number} [options.daysToShow=45] - Number of days to display
         */
        constructor(containerId, options = {}) {
            this.container = document.getElementById(containerId);
            this.daysToShow = options.daysToShow || 45;
            this.sessions = [];
            this.activityMap = new Map();
        }

        setSessionData(sessions) {
            this.sessions = sessions || [];
            this.buildActivityMap();
            this.render();
        }

        buildActivityMap() {
            this.activityMap.clear();
            this.sessions.forEach(session => {
                if (!session.completed_at) return;
                const date = new Date(session.completed_at);
                const key = this.formatDateKey(date);
                if (!this.activityMap.has(key)) {
                    this.activityMap.set(key, []);
                }
                this.activityMap.get(key).push(session);
            });
        }

        getDays() {
            const days = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            for (let i = this.daysToShow - 1; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateKey = this.formatDateKey(date);
                days.push({
                    date,
                    dateKey,
                    sessions: this.activityMap.get(dateKey) || []
                });
            }
            return days;
        }

        render() {
            if (!this.container) return;
            const days = this.getDays();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const blocks = days.map(day => {
                const hasWorkout = day.sessions.length > 0;
                const isToday = day.date.getTime() === today.getTime();
                const classes = ['activity-block'];
                if (hasWorkout) classes.push('has-workout');
                if (isToday) classes.push('today');
                return `<div class="${classes.join(' ')}"></div>`;
            }).join('');

            this.container.innerHTML = `<div class="activity-block-grid">${blocks}</div>`;
        }

        formatDateKey(date) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
    }

    window.ActivityBlockChart = ActivityBlockChart;
})();
