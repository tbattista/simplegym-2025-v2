/**
 * Activity Display Config
 * Shared field registry and localStorage accessor for configuring
 * which 3 fields are shown on activity/cardio cards in the workout builder.
 * @version 1.0.0
 */
(function() {
    'use strict';

    const STORAGE_KEY = 'ffn_activity_display_columns';
    const DEFAULT_COLUMNS = ['duration', 'distance', 'pace'];

    /**
     * All available display fields for activity cards.
     * Each field has a label, icon, placeholder (for inline editing),
     * and a format() function that extracts + formats the value from cardio_config.
     */
    const FIELDS = {
        duration: {
            label: 'Duration',
            icon: 'bx-time',
            placeholder: '30 min',
            format(cfg) {
                return cfg.duration_minutes ? `${cfg.duration_minutes} min` : '';
            }
        },
        distance: {
            label: 'Distance',
            icon: 'bx-map',
            placeholder: '3 mi',
            format(cfg) {
                return cfg.distance ? `${cfg.distance} ${cfg.distance_unit || 'mi'}` : '';
            }
        },
        pace: {
            label: 'Pace',
            icon: 'bx-run',
            placeholder: '10:00/mi',
            format(cfg) {
                return cfg.target_pace || '';
            }
        },
        rpe: {
            label: 'RPE',
            icon: 'bx-bar-chart',
            placeholder: '1-10',
            format(cfg) {
                return cfg.target_rpe ? `RPE ${cfg.target_rpe}` : '';
            }
        },
        heart_rate: {
            label: 'Heart Rate',
            icon: 'bx-heart',
            placeholder: '150 bpm',
            format(cfg) {
                return cfg.target_heart_rate ? `${cfg.target_heart_rate} bpm` : '';
            }
        },
        calories: {
            label: 'Calories',
            icon: 'bx-flame',
            placeholder: '500 cal',
            format(cfg) {
                return cfg.target_calories ? `${cfg.target_calories} cal` : '';
            }
        },
        elevation: {
            label: 'Elevation',
            icon: 'bx-trending-up',
            placeholder: '500 ft',
            format(cfg) {
                return cfg.elevation_gain ? `${cfg.elevation_gain} ${cfg.elevation_unit || 'ft'}` : '';
            }
        },
        cadence: {
            label: 'Cadence',
            icon: 'bx-loader-circle',
            placeholder: '85 rpm',
            format(cfg) {
                const val = cfg.activity_details?.cadence;
                return val ? `${val} rpm` : '';
            }
        },
        stroke_rate: {
            label: 'Stroke Rate',
            icon: 'bx-loader-circle',
            placeholder: '28 spm',
            format(cfg) {
                const val = cfg.activity_details?.stroke_rate;
                return val ? `${val} spm` : '';
            }
        },
        laps: {
            label: 'Laps',
            icon: 'bx-repeat',
            placeholder: '20 laps',
            format(cfg) {
                const val = cfg.activity_details?.laps;
                return val ? `${val} laps` : '';
            }
        },
        incline: {
            label: 'Incline',
            icon: 'bx-trending-up',
            placeholder: '5%',
            format(cfg) {
                const val = cfg.activity_details?.incline;
                return val ? `${val}%` : '';
            }
        },
        notes: {
            label: 'Notes',
            icon: 'bx-note',
            placeholder: 'Notes',
            format(cfg) {
                return cfg.notes || '';
            }
        }
    };

    window.ActivityDisplayConfig = {
        FIELDS: FIELDS,
        STORAGE_KEY: STORAGE_KEY,
        DEFAULT: DEFAULT_COLUMNS,

        /** Get ordered list of all field IDs */
        getAllFieldIds() {
            return Object.keys(FIELDS);
        },

        /** Get field definition by ID */
        getFieldDef(id) {
            return FIELDS[id] || null;
        },

        /** Get current 3 selected column IDs from localStorage */
        getColumns() {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length === 3 &&
                        parsed.every(id => FIELDS[id])) {
                        return parsed;
                    }
                }
            } catch (e) {
                // ignore parse errors
            }
            return [...DEFAULT_COLUMNS];
        },

        /** Save 3 selected column IDs to localStorage and dispatch change event */
        setColumns(columns) {
            if (!Array.isArray(columns) || columns.length !== 3) {
                console.warn('ActivityDisplayConfig: setColumns requires exactly 3 field IDs');
                return;
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
            window.dispatchEvent(new CustomEvent('activityDisplayChanged', {
                detail: { columns }
            }));
        }
    };

    console.log('📦 ActivityDisplayConfig loaded (12 fields available)');
})();
