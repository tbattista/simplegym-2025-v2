/**
 * Settings Manager Service
 * Centralized localStorage wrapper for all app preferences
 *
 * Usage:
 *   window.settingsManager.get('ffn_show_activity_chart', true);
 *   window.settingsManager.set('ffn_show_activity_chart', false);
 *
 * Events:
 *   'settingChanged' - Fired with { key, value } when any setting changes
 */

(function() {
    'use strict';

    const DEFAULTS = {
        ffn_show_activity_chart: true
    };

    class SettingsManager {
        /**
         * Get a setting value from localStorage
         * @param {string} key - Setting key
         * @param {*} defaultValue - Default if not stored (falls back to DEFAULTS)
         * @returns {*} The setting value
         */
        get(key, defaultValue) {
            try {
                const stored = localStorage.getItem(key);
                if (stored === null) {
                    return defaultValue !== undefined ? defaultValue : DEFAULTS[key];
                }
                // Parse booleans and numbers
                if (stored === 'true') return true;
                if (stored === 'false') return false;
                const num = Number(stored);
                if (!isNaN(num) && stored.trim() !== '') return num;
                return stored;
            } catch (e) {
                console.warn('⚠️ Failed to read setting:', key, e);
                return defaultValue !== undefined ? defaultValue : DEFAULTS[key];
            }
        }

        /**
         * Set a setting value and dispatch change event
         * @param {string} key - Setting key
         * @param {*} value - Value to store
         */
        set(key, value) {
            try {
                localStorage.setItem(key, String(value));
                window.dispatchEvent(new CustomEvent('settingChanged', {
                    detail: { key, value }
                }));
            } catch (e) {
                console.error('❌ Failed to save setting:', key, e);
            }
        }

        /**
         * Get all settings with their current values
         * @returns {Object} All settings
         */
        getAll() {
            const result = {};
            Object.keys(DEFAULTS).forEach(key => {
                result[key] = this.get(key);
            });
            return result;
        }
    }

    window.settingsManager = new SettingsManager();
})();
