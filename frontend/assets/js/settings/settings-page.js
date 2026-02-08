/**
 * Settings Page Controller
 * Manages toggle state for all app preferences
 */

(function() {
    'use strict';

    // Map of toggle element IDs to setting keys
    const TOGGLES = {
        showActivityChart: 'ffn_show_activity_chart'
    };

    function initSettingsPage() {
        if (!window.settingsManager) {
            console.error('❌ Settings manager not available');
            return;
        }

        // Initialize each toggle from stored values
        Object.entries(TOGGLES).forEach(([elementId, settingKey]) => {
            const el = document.getElementById(elementId);
            if (!el) return;

            // Set initial state
            el.checked = window.settingsManager.get(settingKey, true);

            // Listen for changes — instant save
            el.addEventListener('change', () => {
                window.settingsManager.set(settingKey, el.checked);
            });
        });

        console.log('✅ Settings page initialized');
    }

    document.addEventListener('DOMContentLoaded', initSettingsPage);
})();
