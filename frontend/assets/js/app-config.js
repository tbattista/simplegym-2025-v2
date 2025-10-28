/**
 * Ghost Gym V2 - Global Application Configuration
 * Single source of truth for all app settings
 * 
 * This file centralizes configuration that was previously duplicated across multiple HTML files.
 * Load this BEFORE any other Ghost Gym scripts.
 */
(function() {
    'use strict';
    
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
            return this.baseUrl + path;
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
    window.GHOST_GYM_API_URL = window.config.api.baseUrl;
    window.getApiUrl = window.config.api.getUrl.bind(window.config.api);
    
    console.log('✅ Ghost Gym app config loaded');
    console.log('🔗 API Base URL:', window.config.api.baseUrl);
})();