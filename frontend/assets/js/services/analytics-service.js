/**
 * Analytics Service - Lightweight wrapper around Matomo event tracking
 * Provides trackEvent() for key user actions across the app.
 */

(function() {
    'use strict';

    const AnalyticsService = {
        /**
         * Track a custom event in Matomo
         * @param {string} category - Event category (e.g., 'share', 'export', 'landing')
         * @param {string} action - Event action (e.g., 'public', 'image', 'cta-click')
         * @param {string} [name] - Optional event name/label
         * @param {number} [value] - Optional numeric value
         */
        trackEvent(category, action, name, value) {
            try {
                const _paq = window._paq || [];
                const args = ['trackEvent', category, action];
                if (name !== undefined) args.push(name);
                if (value !== undefined) args.push(value);
                _paq.push(args);
            } catch (e) {
                // Silently fail - analytics should never break the app
            }
        },

        // Convenience methods for common events
        trackShare(type, workoutName) {
            this.trackEvent('share', type, workoutName);
        },

        trackExport(format, workoutName) {
            this.trackEvent('export', format, workoutName);
        },

        trackCopyUrl(type) {
            this.trackEvent('share', 'copy-url', type);
        },

        /**
         * Track scroll depth on a page using IntersectionObserver
         * @param {Object} sections - Map of section IDs to event names
         */
        trackScrollDepth(sections) {
            if (!('IntersectionObserver' in window)) return;

            const tracked = new Set();
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !tracked.has(entry.target.id)) {
                        tracked.add(entry.target.id);
                        const eventName = sections[entry.target.id] || entry.target.id;
                        this.trackEvent('scroll', 'section-visible', eventName);
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.3 });

            Object.keys(sections).forEach(id => {
                const el = document.getElementById(id) || document.querySelector(id);
                if (el) {
                    if (!el.id) el.id = id.replace('.', '_');
                    observer.observe(el);
                }
            });
        }
    };

    window.analyticsService = AnalyticsService;
})();
