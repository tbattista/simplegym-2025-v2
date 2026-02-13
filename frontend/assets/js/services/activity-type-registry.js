/**
 * Activity Type Registry
 * Single source of truth for all activity type metadata.
 * Manages the master list, categories, field configs, and user favorites.
 * @version 1.0.0
 */

(function () {
    'use strict';

    // ============================================
    //  MASTER ACTIVITY TYPE LIST
    // ============================================

    const ACTIVITY_TYPES = [
        // Cardio
        { id: 'running',       name: 'Running',        shortName: 'Run',         icon: 'bx-run',                      category: 'cardio',    fields: { distance: true, pace: true, elevation: true } },
        { id: 'cycling',       name: 'Cycling',         shortName: 'Bike',        icon: 'bx-cycling',                  category: 'cardio',    fields: { distance: true, pace: true, elevation: true, cadence: true } },
        { id: 'rowing',        name: 'Rowing',          shortName: 'Row',         icon: 'bx-water',                    category: 'cardio',    fields: { distance: true, pace: true, strokeRate: true } },
        { id: 'swimming',      name: 'Swimming',        shortName: 'Swim',        icon: 'bx-swim',                     category: 'cardio',    fields: { distance: true, pace: true, laps: true } },
        { id: 'elliptical',    name: 'Elliptical',      shortName: 'Elliptical',  icon: 'bx-pulse',                    category: 'cardio',    fields: { incline: true } },
        { id: 'stair_climber', name: 'Stair Climber',   shortName: 'Stairs',      icon: 'bx-trending-up',              category: 'cardio',    fields: { elevation: true, incline: true } },
        { id: 'walking',       name: 'Walking',         shortName: 'Walk',        icon: 'bx-walk',                     category: 'cardio',    fields: { distance: true, pace: true, elevation: true } },
        { id: 'jump_rope',     name: 'Jump Rope',       shortName: 'Jump Rope',   icon: 'bx-pulse',                    category: 'cardio',    fields: {} },
        { id: 'hiit',          name: 'HIIT',            shortName: 'HIIT',        icon: 'bx-bolt-circle',              category: 'cardio',    fields: {} },

        // Outdoor
        { id: 'hiking',        name: 'Hiking',          shortName: 'Hike',        icon: 'bx-landscape',                category: 'outdoor',   fields: { distance: true, pace: true, elevation: true } },
        { id: 'trail_running', name: 'Trail Running',   shortName: 'Trail Run',   icon: 'bx-run',                      category: 'outdoor',   fields: { distance: true, pace: true, elevation: true } },
        { id: 'surfing',       name: 'Surfing',         shortName: 'Surf',        icon: 'bx-water',                    category: 'outdoor',   fields: {} },
        { id: 'skiing',        name: 'Skiing',          shortName: 'Ski',         icon: 'bx-landscape',                category: 'outdoor',   fields: { elevation: true } },
        { id: 'snowboarding',  name: 'Snowboarding',    shortName: 'Snowboard',   icon: 'bx-landscape',                category: 'outdoor',   fields: { elevation: true } },
        { id: 'kayaking',      name: 'Kayaking',        shortName: 'Kayak',       icon: 'bx-water',                    category: 'outdoor',   fields: { distance: true, pace: true } },
        { id: 'rock_climbing', name: 'Rock Climbing',   shortName: 'Climb',       icon: 'bx-trending-up',              category: 'outdoor',   fields: { elevation: true } },
        { id: 'paddleboard',   name: 'Paddleboarding',  shortName: 'SUP',         icon: 'bx-water',                    category: 'outdoor',   fields: { distance: true, pace: true } },

        // Mind & Body
        { id: 'yoga',          name: 'Yoga',            shortName: 'Yoga',        icon: 'bx-body',                     category: 'mind_body', fields: {} },
        { id: 'pilates',       name: 'Pilates',         shortName: 'Pilates',     icon: 'bx-body',                     category: 'mind_body', fields: {} },
        { id: 'stretching',    name: 'Stretching',      shortName: 'Stretch',     icon: 'bx-body',                     category: 'mind_body', fields: {} },
        { id: 'meditation',    name: 'Meditation',      shortName: 'Meditate',    icon: 'bx-spa',                      category: 'mind_body', fields: {} },

        // Sports
        { id: 'basketball',    name: 'Basketball',      shortName: 'Basketball',  icon: 'bx-basketball',               category: 'sports',    fields: {} },
        { id: 'soccer',        name: 'Soccer',          shortName: 'Soccer',      icon: 'bx-football',                 category: 'sports',    fields: { distance: true } },
        { id: 'tennis',        name: 'Tennis',           shortName: 'Tennis',     icon: 'bx-tennis-ball',              category: 'sports',    fields: {} },
        { id: 'martial_arts',  name: 'Martial Arts',    shortName: 'Martial Arts', icon: 'bx-shield',                  category: 'sports',    fields: {} },
        { id: 'boxing',        name: 'Boxing',          shortName: 'Boxing',      icon: 'bx-shield',                   category: 'sports',    fields: {} },
        { id: 'golf',          name: 'Golf',            shortName: 'Golf',        icon: 'bx-golf-ball',                category: 'sports',    fields: { distance: true } },

        // Other
        { id: 'dance',         name: 'Dance',           shortName: 'Dance',       icon: 'bx-music',                    category: 'other',     fields: {} },
        { id: 'crossfit',      name: 'CrossFit',        shortName: 'CrossFit',    icon: 'bx-dumbbell',                 category: 'other',     fields: {} },
        { id: 'other',         name: 'Other',           shortName: 'Other',       icon: 'bx-dots-horizontal-rounded',  category: 'other',     fields: { distance: true, pace: true, elevation: true } },
    ];

    // ============================================
    //  CATEGORIES
    // ============================================

    const CATEGORIES = [
        { id: 'cardio',    name: 'Cardio',      icon: 'bx-heart' },
        { id: 'outdoor',   name: 'Outdoor',     icon: 'bx-sun' },
        { id: 'mind_body', name: 'Mind & Body', icon: 'bx-spa' },
        { id: 'sports',    name: 'Sports',      icon: 'bx-trophy' },
        { id: 'other',     name: 'Other',       icon: 'bx-category' },
    ];

    // ============================================
    //  DEFAULTS
    // ============================================

    const DEFAULT_FAVORITES = [
        'running', 'cycling', 'rowing', 'swimming',
        'hiking', 'yoga', 'walking', 'basketball'
    ];

    const STORAGE_KEY = 'ffn_favorite_activities';

    // Build lookup map for fast access
    const TYPE_MAP = new Map(ACTIVITY_TYPES.map(t => [t.id, t]));

    // Fallback for unknown activity types
    const UNKNOWN_TYPE = {
        name: 'Unknown',
        shortName: 'Unknown',
        icon: 'bx-dots-horizontal-rounded',
        category: 'other',
        fields: {}
    };

    // ============================================
    //  REGISTRY API
    // ============================================

    const ActivityTypeRegistry = {

        /** Get all activity types */
        getAll() {
            return ACTIVITY_TYPES;
        },

        /** Get a single type by ID. Returns fallback for unknown IDs. */
        getById(id) {
            return TYPE_MAP.get(id) || { ...UNKNOWN_TYPE, id, name: id, shortName: id };
        },

        /** Get all categories */
        getCategories() {
            return CATEGORIES;
        },

        /** Get all types in a given category */
        getByCategory(categoryId) {
            return ACTIVITY_TYPES.filter(t => t.category === categoryId);
        },

        // --- Convenience lookups ---

        getIcon(id) {
            return (TYPE_MAP.get(id) || UNKNOWN_TYPE).icon;
        },

        getName(id) {
            return (TYPE_MAP.get(id) || { name: id }).name;
        },

        getShortName(id) {
            return (TYPE_MAP.get(id) || { shortName: id }).shortName;
        },

        /** Get field visibility config for an activity type */
        getFieldConfig(id) {
            const type = TYPE_MAP.get(id);
            if (!type) return { distance: true, pace: true, elevation: true };
            return {
                distance: false, pace: false, elevation: false,
                cadence: false, strokeRate: false, laps: false, incline: false,
                ...type.fields
            };
        },

        // --- Favorites management ---

        /** Get user's favorite activity type IDs (up to 8) */
        getFavorites() {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return parsed.slice(0, 8);
                    }
                }
            } catch (e) {
                console.warn('⚠️ Failed to read favorites:', e);
            }
            return [...DEFAULT_FAVORITES];
        },

        /** Set the full favorites list */
        setFavorites(ids) {
            try {
                const clamped = ids.slice(0, 8);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(clamped));
                window.dispatchEvent(new CustomEvent('settingChanged', {
                    detail: { key: STORAGE_KEY, value: clamped }
                }));
            } catch (e) {
                console.error('❌ Failed to save favorites:', e);
            }
        },

        /** Add an activity to favorites (max 8) */
        addFavorite(id) {
            const favs = this.getFavorites();
            if (favs.includes(id) || favs.length >= 8) return false;
            favs.push(id);
            this.setFavorites(favs);
            return true;
        },

        /** Remove an activity from favorites */
        removeFavorite(id) {
            const favs = this.getFavorites();
            const idx = favs.indexOf(id);
            if (idx === -1) return false;
            favs.splice(idx, 1);
            this.setFavorites(favs);
            return true;
        },

        /** Check if an activity is a favorite */
        isFavorite(id) {
            return this.getFavorites().includes(id);
        }
    };

    // Export globally
    window.ActivityTypeRegistry = ActivityTypeRegistry;

    // Also export icons/names for backward compat during transition
    window.ACTIVITY_ICONS = {};
    window.ACTIVITY_NAMES = {};
    ACTIVITY_TYPES.forEach(t => {
        window.ACTIVITY_ICONS[t.id] = t.icon;
        window.ACTIVITY_NAMES[t.id] = t.name;
    });

    console.log('📦 Activity Type Registry loaded (' + ACTIVITY_TYPES.length + ' types)');
})();
