/**
 * Activity Block Chart Component
 * Renders a compact 30-day heatmap of workout activity
 *
 * Usage:
 *   const chart = new ActivityBlockChart('containerId');
 *   chart.setSessionData(sessions);
 */

(function() {
    'use strict';

    class ActivityBlockChart {
        /**
         * @param {string} containerId - DOM element ID to render into
         * @param {Object} [options]
         * @param {number} [options.daysToShow=30] - Number of days to display
         * @param {Function} [options.onDayClick] - Callback: (dateKey, sessions) => {}
         */
        constructor(containerId, options = {}) {
            this.container = document.getElementById(containerId);
            this.daysToShow = options.daysToShow || 30;
            this.onDayClick = options.onDayClick || null;
            this.sessions = [];
            this.activityMap = new Map(); // dateKey -> sessions[]
        }

        /**
         * Set session data and render the chart
         * @param {Array} sessions - Array of workout session objects with completed_at
         */
        setSessionData(sessions) {
            this.sessions = sessions || [];
            this.buildActivityMap();
            this.render();
        }

        /**
         * Build a map of dateKey -> sessions for quick lookup
         */
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

        /**
         * Generate the array of day objects for the last N days
         * @returns {Array} Array of { date, dateKey, sessions }
         */
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

        /**
         * Render the block chart into the container
         */
        render() {
            if (!this.container) return;

            const days = this.getDays();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const blocks = days.map(day => {
                const hasWorkout = day.sessions.length > 0;
                const isToday = day.date.getTime() === today.getTime();
                const dayNum = day.date.getDate();
                const count = day.sessions.length;
                const dateLabel = day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const tooltip = hasWorkout
                    ? `${dateLabel} — ${count} workout${count > 1 ? 's' : ''}`
                    : `${dateLabel} — Rest day`;

                const classes = ['activity-block'];
                if (hasWorkout) classes.push('has-workout');
                if (isToday) classes.push('today');

                return `<div class="${classes.join(' ')}" data-date="${day.dateKey}" title="${tooltip}"></div>`;
            }).join('');

            const cols = Math.ceil(this.daysToShow / 5);
            this.container.innerHTML = `<div class="activity-block-grid" style="grid-template-columns:repeat(${cols},1fr)">${blocks}</div>`;

            // Attach click handlers
            if (this.onDayClick) {
                this.container.querySelectorAll('.activity-block').forEach(el => {
                    el.addEventListener('click', () => {
                        const dateKey = el.dataset.date;
                        const daySessions = this.activityMap.get(dateKey) || [];
                        this.onDayClick(dateKey, daySessions);
                    });
                });
            }
        }

        /**
         * Format a Date to YYYY-MM-DD string
         */
        formatDateKey(date) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
    }

    window.ActivityBlockChart = ActivityBlockChart;
})();
