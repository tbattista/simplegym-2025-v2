/**
 * Settings Page Controller
 * Manages toggle and select state for all app preferences
 */

(function() {
    'use strict';

    // Toggle element IDs → setting keys
    const TOGGLES = {
        showActivityChart: 'ffn_show_activity_chart'
    };

    // Select element IDs → setting keys + defaults
    const SELECTS = {
        activityChartDays: { key: 'ffn_activity_chart_days', defaultValue: 45 }
    };

    function initSettingsPage() {
        if (!window.settingsManager) {
            console.error('❌ Settings manager not available');
            return;
        }

        // Initialize toggles
        Object.entries(TOGGLES).forEach(([elementId, settingKey]) => {
            const el = document.getElementById(elementId);
            if (!el) return;
            el.checked = window.settingsManager.get(settingKey, true);
            el.addEventListener('change', () => {
                window.settingsManager.set(settingKey, el.checked);
                updateDaysRowVisibility();
            });
        });

        // Initialize selects
        Object.entries(SELECTS).forEach(([elementId, { key, defaultValue }]) => {
            const el = document.getElementById(elementId);
            if (!el) return;
            el.value = String(window.settingsManager.get(key, defaultValue));
            el.addEventListener('change', () => {
                window.settingsManager.set(key, Number(el.value));
            });
        });

        updateDaysRowVisibility();
        console.log('✅ Settings page initialized');
    }

    function updateDaysRowVisibility() {
        const chartEnabled = window.settingsManager.get('ffn_show_activity_chart', true);
        const daysRow = document.getElementById('activityChartDaysRow');
        if (daysRow) {
            daysRow.style.display = chartEnabled ? '' : 'none';
        }
    }

    document.addEventListener('DOMContentLoaded', initSettingsPage);
})();
