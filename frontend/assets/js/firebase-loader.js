/**
 * Firebase SDK Loader - Centralized Firebase initialization
 * Loads Firebase once and makes it available globally
 * 
 * This replaces the duplicate Firebase initialization code that was in every HTML file.
 * Requires: app-config.js to be loaded first
 */
(async function() {
    'use strict';
    
    // Only load if not already loaded
    if (window.firebaseReady) {
        console.log('⚠️ Firebase already loaded, skipping initialization');
        return;
    }
    
    // Check if config is available
    if (!window.config?.firebase) {
        console.error('❌ Firebase config not found. Make sure app-config.js is loaded first.');
        return;
    }
    
    try {
        console.log('🔥 Loading Firebase SDK...');
        
        // Dynamic import Firebase SDK from CDN
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js');
        const { 
            getAuth,
            signInWithEmailAndPassword,
            createUserWithEmailAndPassword,
            signInWithPopup,
            GoogleAuthProvider,
            signInAnonymously,
            signOut,
            onAuthStateChanged,
            sendEmailVerification,
            sendPasswordResetEmail,
            updateProfile
        } = await import('https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js');
        const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js');
        
        // Initialize Firebase with centralized config
        const app = initializeApp(window.config.firebase);
        const auth = getAuth(app);
        const db = getFirestore(app);
        
        // Make Firebase services available globally
        window.firebaseApp = app;
        window.firebaseAuth = auth;
        window.firebaseDb = db;
        
        // Make Firebase Auth functions available globally
        window.firebaseAuthFunctions = {
            signInWithEmailAndPassword,
            createUserWithEmailAndPassword,
            signInWithPopup,
            GoogleAuthProvider,
            signInAnonymously,
            signOut,
            onAuthStateChanged,
            sendEmailVerification,
            sendPasswordResetEmail,
            updateProfile
        };
        
        // Signal that Firebase is ready
        window.firebaseReady = true;
        window.dispatchEvent(new Event('firebaseReady'));
        
        console.log('✅ Firebase initialized globally');
        console.log('🔥 Firebase App:', app.name);
        console.log('🔥 Firebase Project:', window.config.firebase.projectId);
        
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        console.error('Stack:', error.stack);
    }
})();