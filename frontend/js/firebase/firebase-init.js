/**
 * Firebase Initialization Service for Ghost Gym V3 Phase 2
 * Handles Firebase SDK initialization and global setup
 */

// Firebase initialization is handled inline in dashboard.html
// This file provides additional initialization utilities

class FirebaseInit {
    constructor() {
        this.initialized = false;
        this.initPromise = null;
        this.retryCount = 0;
        this.maxRetries = 10;
        
        this.waitForFirebase();
    }
    
    async waitForFirebase() {
        // Wait for Firebase to be initialized in the HTML
        while (!window.firebaseReady && this.retryCount < this.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 100));
            this.retryCount++;
        }
        
        if (window.firebaseReady) {
            this.initialized = true;
            console.log('✅ Firebase initialization service ready');
            
            // Dispatch custom event for other services
            window.dispatchEvent(new CustomEvent('firebaseInitReady', {
                detail: {
                    app: window.firebaseApp,
                    auth: window.firebaseAuth,
                    db: window.firebaseDb,
                    functions: window.firebaseAuthFunctions
                }
            }));
        } else {
            console.error('❌ Firebase initialization timeout');
        }
    }
    
    isReady() {
        return this.initialized && window.firebaseReady;
    }
    
    getApp() {
        return window.firebaseApp;
    }
    
    getAuth() {
        return window.firebaseAuth;
    }
    
    getDb() {
        return window.firebaseDb;
    }
    
    getFunctions() {
        return window.firebaseAuthFunctions;
    }
    
    // Utility method to check if Firebase services are available
    checkServices() {
        const services = {
            app: !!window.firebaseApp,
            auth: !!window.firebaseAuth,
            db: !!window.firebaseDb,
            functions: !!window.firebaseAuthFunctions,
            ready: !!window.firebaseReady
        };
        
        console.log('🔍 Firebase services status:', services);
        return services;
    }
}

// Create global instance
window.firebaseInit = new FirebaseInit();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseInit;
}