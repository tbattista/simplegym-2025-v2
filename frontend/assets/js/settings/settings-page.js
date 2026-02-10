/**
 * Settings Page Controller
 * Manages toggle and button group state for all app preferences
 */

(function() {
    'use strict';

    // Toggle element IDs → setting keys
    const TOGGLES = {
        showActivityChart: 'ffn_show_activity_chart'
    };

    // Button group element IDs → setting keys + defaults
    const BUTTON_GROUPS = {
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

        // Initialize button groups
        Object.entries(BUTTON_GROUPS).forEach(([elementId, { key, defaultValue }]) => {
            const group = document.getElementById(elementId);
            if (!group) return;
            const currentValue = String(window.settingsManager.get(key, defaultValue));
            const buttons = group.querySelectorAll('[data-value]');

            // Set initial active state
            buttons.forEach(btn => {
                if (btn.dataset.value === currentValue) {
                    btn.classList.remove('btn-outline-primary');
                    btn.classList.add('btn-primary');
                }
                btn.addEventListener('click', () => {
                    buttons.forEach(b => {
                        b.classList.remove('btn-primary');
                        b.classList.add('btn-outline-primary');
                    });
                    btn.classList.remove('btn-outline-primary');
                    btn.classList.add('btn-primary');
                    window.settingsManager.set(key, Number(btn.dataset.value));
                });
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
