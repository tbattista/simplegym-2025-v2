/**
 * Firebase Auth Service for Ghost Gym V3 Phase 2
 * Handles authentication operations and user management
 */

class AuthService {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.authStateListeners = [];
        this.initialized = false;
        
        // Wait for Firebase to be ready
        this.waitForFirebase();
    }
    
    async waitForFirebase() {
        // Wait for Firebase initialization
        if (window.firebaseReady) {
            this.initialize();
        } else {
            window.addEventListener('firebaseReady', () => this.initialize());
        }
    }
    
    initialize() {
        try {
            if (!window.firebaseAuth || !window.firebaseAuthFunctions) {
                throw new Error('Firebase Auth not available');
            }
            
            // Set up auth state listener
            const { onAuthStateChanged } = window.firebaseAuthFunctions;
            
            onAuthStateChanged(window.firebaseAuth, (user) => {
                this.handleAuthStateChange(user);
            });
            
            this.initialized = true;
            console.log('✅ Firebase Auth Service initialized');
            
        } catch (error) {
            console.error('⚠️ Firebase Auth initialization failed:', error.message);
            this.initialized = false;
        }
    }
    
    handleAuthStateChange(user) {
        const wasAuthenticated = this.isAuthenticated;
        this.currentUser = user;
        this.isAuthenticated = !!user;
        
        console.log(`🔄 Auth state changed: ${this.isAuthenticated ? 'authenticated' : 'anonymous'}`);
        
        // Notify all listeners
        this.authStateListeners.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('❌ Error in auth state listener:', error);
            }
        });
        
        // Dispatch global event
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { user, isAuthenticated: this.isAuthenticated }
        }));
    }
    
    // Public API Methods
    
    onAuthStateChange(callback) {
        if (typeof callback === 'function') {
            this.authStateListeners.push(callback);
            
            // If already initialized, call immediately with current state
            if (this.initialized) {
                callback(this.currentUser);
            }
        }
    }
    
    async signInWithEmail(email, password) {
        if (!this.initialized || !window.firebaseAuthFunctions) {
            throw new Error('Auth service not initialized');
        }
        
        try {
            const { signInWithEmailAndPassword } = window.firebaseAuthFunctions;
            const userCredential = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
            
            console.log('✅ Email sign-in successful');
            return userCredential.user;
            
        } catch (error) {
            console.error('❌ Email sign-in failed:', error);
            throw this.formatAuthError(error);
        }
    }
    
    async signUpWithEmail(email, password, displayName = null) {
        if (!this.initialized || !window.firebaseAuthFunctions) {
            throw new Error('Auth service not initialized');
        }
        
        try {
            const { createUserWithEmailAndPassword, updateProfile } = window.firebaseAuthFunctions;
            const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
            
            // Update display name if provided
            if (displayName) {
                await updateProfile(userCredential.user, { displayName });
            }
            
            console.log('✅ Email sign-up successful');
            return userCredential.user;
            
        } catch (error) {
            console.error('❌ Email sign-up failed:', error);
            throw this.formatAuthError(error);
        }
    }
    
    async signInWithGoogle() {
        if (!this.initialized || !window.firebaseAuthFunctions) {
            throw new Error('Auth service not initialized');
        }
        
        try {
            const { signInWithPopup, GoogleAuthProvider } = window.firebaseAuthFunctions;
            const provider = new GoogleAuthProvider();
            
            const userCredential = await signInWithPopup(window.firebaseAuth, provider);
            
            console.log('✅ Google sign-in successful');
            return userCredential.user;
            
        } catch (error) {
            console.error('❌ Google sign-in failed:', error);
            throw this.formatAuthError(error);
        }
    }
    
    async signInAnonymously() {
        if (!this.initialized || !window.firebaseAuthFunctions) {
            throw new Error('Auth service not initialized');
        }
        
        try {
            const { signInAnonymously } = window.firebaseAuthFunctions;
            const userCredential = await signInAnonymously(window.firebaseAuth);
            
            console.log('✅ Anonymous sign-in successful');
            return userCredential.user;
            
        } catch (error) {
            console.error('❌ Anonymous sign-in failed:', error);
            throw this.formatAuthError(error);
        }
    }
    
    async signOut() {
        if (!this.initialized || !window.firebaseAuthFunctions) {
            throw new Error('Auth service not initialized');
        }
        
        try {
            const { signOut } = window.firebaseAuthFunctions;
            await signOut(window.firebaseAuth);
            
            console.log('✅ Sign-out successful');
            
        } catch (error) {
            console.error('❌ Sign-out failed:', error);
            throw this.formatAuthError(error);
        }
    }
    
    async sendPasswordResetEmail(email) {
        if (!this.initialized || !window.firebaseAuthFunctions) {
            throw new Error('Auth service not initialized');
        }
        
        try {
            const { sendPasswordResetEmail } = window.firebaseAuthFunctions;
            await sendPasswordResetEmail(window.firebaseAuth, email);
            
            console.log('✅ Password reset email sent');
            
        } catch (error) {
            console.error('❌ Password reset failed:', error);
            throw this.formatAuthError(error);
        }
    }
    
    async sendEmailVerification() {
        if (!this.currentUser) {
            throw new Error('No user signed in');
        }
        
        try {
            const { sendEmailVerification } = window.firebaseAuthFunctions;
            await sendEmailVerification(this.currentUser);
            
            console.log('✅ Email verification sent');
            
        } catch (error) {
            console.error('❌ Email verification failed:', error);
            throw this.formatAuthError(error);
        }
    }
    
    async getIdToken(forceRefresh = false) {
        if (!this.currentUser) {
            throw new Error('No user signed in');
        }
        
        try {
            return await this.currentUser.getIdToken(forceRefresh);
        } catch (error) {
            console.error('❌ Error getting ID token:', error);
            throw error;
        }
    }
    
    // Utility Methods
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    isUserAuthenticated() {
        return this.isAuthenticated;
    }
    
    isInitialized() {
        return this.initialized;
    }
    
    formatAuthError(error) {
        const errorMessages = {
            'auth/user-not-found': 'No account found with this email address.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/email-already-in-use': 'An account with this email already exists.',
            'auth/weak-password': 'Password should be at least 6 characters.',
            'auth/invalid-email': 'Invalid email address.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/popup-closed-by-user': 'Sign-in popup was closed.',
            'auth/cancelled-popup-request': 'Sign-in was cancelled.',
            'auth/popup-blocked': 'Sign-in popup was blocked by the browser.'
        };
        
        const message = errorMessages[error.code] || error.message || 'An authentication error occurred.';
        
        return new Error(message);
    }
}

// Create global instance
window.authService = new AuthService();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthService;
}