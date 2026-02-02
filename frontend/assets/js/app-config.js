/**
 * Fitness Field Notes - Global Application Configuration
 * Single source of truth for all app settings
 *
 * This file centralizes configuration that was previously duplicated across multiple HTML files.
 * Load this BEFORE any other Fitness Field Notes scripts.
 */
(function() {
    'use strict';

    // ============================================
    // localStorage Migration (Ghost Gym -> FFN)
    // Preserves existing user data during rebrand
    // ============================================
    const migrations = [
        { old: 'ghost_gym_active_workout_session', new: 'ffn_active_workout_session' },
        { old: 'ghostGym_plateConfig', new: 'ffn_plateConfig' },
        { old: 'ghostgym_feedback_draft', new: 'ffn_feedback_draft' },
        { old: 'ghostgym_feedback_submissions', new: 'ffn_feedback_submissions' }
    ];

    migrations.forEach(({ old, new: newKey }) => {
        try {
            const value = localStorage.getItem(old);
            if (value && !localStorage.getItem(newKey)) {
                localStorage.setItem(newKey, value);
                console.log(`🔄 Migrated localStorage: ${old} -> ${newKey}`);
            }
        } catch (e) {
            // Ignore errors (e.g., private browsing mode)
        }
    });

    // Apply Content Security Policy only in production (HTTPS)
    // Railway automatically provides HTTPS, localhost uses HTTP
    if (window.location.protocol === 'https:') {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = 'upgrade-insecure-requests';
        document.head.appendChild(meta);
        console.log('🔒 Content Security Policy applied (HTTPS detected)');
    } else {
        console.log('🔓 Content Security Policy skipped (HTTP/localhost detected)');
    }
    
    // Extend existing window.config (from config.js)
    window.config = window.config || {};
    
    // API Configuration
    window.config.api = {
        // Use current origin for API calls (Railway serves everything from same domain)
        baseUrl: window.location.origin,
        
        /**
         * Get full API URL for a given path
         * @param {string} path - API path (e.g., '/api/v3/workouts')
         * @returns {string} Full URL
         */
        getUrl: function(path) {
            if (!path.startsWith('/')) {
                path = '/' + path;
            }
            
            // Add trailing slash to API paths to prevent 307 redirect auth loss
            // FastAPI redirects /api/v3/foo to /api/v3/foo/ which drops Authorization header on mobile
            // Exception: paths ending with an ID like /api/v3/foo/{id} should NOT have trailing slash
            if (path.startsWith('/api/')) {
                // Separate path from query string
                const [pathPart, queryPart] = path.split('?');

                // Only process if path doesn't already have trailing slash
                if (!pathPart.endsWith('/')) {
                    // Don't add trailing slash if path ends with a dynamic segment (ID)
                    const segments = pathPart.split('/').filter(s => s);
                    const lastSegment = segments[segments.length - 1];

                    // Check if last segment looks like an ID (UUID, Firestore ID, numeric, or alphanumeric ID)
                    // Firestore IDs are exactly 20 alphanumeric chars, UUIDs are 36 chars with dashes
                    // Use 20+ to avoid matching endpoint names like "workout-sessions" (16 chars)
                    const looksLikeId = /^[a-zA-Z0-9_-]{20,}$/.test(lastSegment) || /^\d+$/.test(lastSegment);

                    // If it's a collection endpoint (not an ID), add trailing slash
                    if (!looksLikeId) {
                        path = pathPart + '/' + (queryPart ? '?' + queryPart : '');
                    }
                }
            }
            
            // Construct URL using current origin (preserves protocol)
            const url = this.baseUrl + path;
            
            // Debug logging for troubleshooting
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('🔗 API URL constructed:', url);
                console.log('📍 Current protocol:', window.location.protocol);
                console.log('📍 Current origin:', window.location.origin);
            }
            
            return url;
        }
    };
    
    // Firebase Configuration
    // Centralized Firebase config - used by firebase-loader.js
    window.config.firebase = {
        apiKey: "AIzaSyDpG6XqRY8jkuxtEy-8avAXK510czrLRNs",
        authDomain: "ghost-gym-v3.firebaseapp.com",
        projectId: "ghost-gym-v3",
        storageBucket: "ghost-gym-v3.firebasestorage.app",
        messagingSenderId: "637224617538",
        appId: "1:637224617538:web:ad149e591714a0b9b50fdb"
    };
    
    // Legacy compatibility - some code may still reference these
    window.FFN_API_URL = window.config.api.baseUrl;
    window.getApiUrl = window.config.api.getUrl.bind(window.config.api);

    console.log('✅ Fitness Field Notes app config loaded');
    console.log('🔗 API Base URL:', window.config.api.baseUrl);
})();