/**
 * Firebase Auth UI Service for Ghost Gym V3 Phase 2
 * Handles authentication UI interactions and form management
 */

class AuthUI {
    constructor() {
        this.authModal = null;
        this.currentMode = 'signin'; // 'signin' or 'signup'
        this.isProcessing = false;
        
        this.init();
    }
    
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupUI());
        } else {
            this.setupUI();
        }
    }
    
    setupUI() {
        try {
            this.authModal = document.getElementById('authModal');
            if (!this.authModal) {
                console.warn('⚠️ Auth modal not found in DOM');
                return;
            }
            
            this.setupEventListeners();
            this.setupAuthStateListener();
            
            console.log('✅ Auth UI initialized');
            
        } catch (error) {
            console.error('❌ Auth UI initialization failed:', error);
        }
    }
    
    setupEventListeners() {
        // Header sign-in button
        const headerSignInBtn = document.getElementById('headerSignInBtn');
        if (headerSignInBtn) {
            headerSignInBtn.addEventListener('click', () => this.showAuthModal('signin'));
        }
        
        // Sign-in form
        const signinForm = document.getElementById('signinForm');
        if (signinForm) {
            signinForm.addEventListener('submit', (e) => this.handleSignIn(e));
        }
        
        // Sign-up form
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignUp(e));
        }
        
        // Google sign-in buttons
        const googleSigninBtn = document.getElementById('googleSigninBtn');
        const googleSignupBtn = document.getElementById('googleSignupBtn');
        
        if (googleSigninBtn) {
            googleSigninBtn.addEventListener('click', () => this.handleGoogleSignIn());
        }
        
        if (googleSignupBtn) {
            googleSignupBtn.addEventListener('click', () => this.handleGoogleSignIn());
        }
        
        // Forgot password
        const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
        if (forgotPasswordBtn) {
            forgotPasswordBtn.addEventListener('click', () => this.handleForgotPassword());
        }
        
        // Continue anonymous
        const continueAnonymousBtn = document.getElementById('continueAnonymousBtn');
        if (continueAnonymousBtn) {
            continueAnonymousBtn.addEventListener('click', () => this.handleAnonymousSignIn());
        }
        
        // Sign out
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => this.handleSignOut());
        }
        
        // Tab switching
        const signinTab = document.getElementById('signin-tab');
        const signupTab = document.getElementById('signup-tab');
        
        if (signinTab) {
            signinTab.addEventListener('click', () => this.switchMode('signin'));
        }
        
        if (signupTab) {
            signupTab.addEventListener('click', () => this.switchMode('signup'));
        }
    }
    
    setupAuthStateListener() {
        // Listen for auth state changes
        window.addEventListener('authStateChanged', (event) => {
            const { user, isAuthenticated } = event.detail;
            this.updateAuthUI(user, isAuthenticated);
        });
    }
    
    updateAuthUI(user, isAuthenticated) {
        // Update header UI
        const signInElements = document.querySelectorAll('.auth-sign-in');
        const signOutElements = document.querySelectorAll('.auth-sign-out');
        
        signInElements.forEach(el => {
            el.classList.toggle('d-none', isAuthenticated);
        });
        
        signOutElements.forEach(el => {
            el.classList.toggle('d-none', !isAuthenticated);
        });
        
        if (isAuthenticated && user) {
            // Update user display
            const userDisplayName = document.getElementById('userDisplayName');
            const userEmailDisplay = document.getElementById('userEmailDisplay');
            
            if (userDisplayName) {
                userDisplayName.textContent = user.displayName || user.email || 'User';
            }
            
            if (userEmailDisplay) {
                userEmailDisplay.textContent = user.email || 'No email';
            }
        }
    }
    
    showAuthModal(mode = 'signin') {
        if (!this.authModal) return;
        
        this.currentMode = mode;
        this.clearErrors();
        this.resetForms();
        
        // Switch to correct tab
        const signinTab = document.getElementById('signin-tab');
        const signupTab = document.getElementById('signup-tab');
        
        if (mode === 'signin' && signinTab) {
            signinTab.click();
        } else if (mode === 'signup' && signupTab) {
            signupTab.click();
        }
        
        // Show modal
        const modal = new bootstrap.Modal(this.authModal);
        modal.show();
    }
    
    hideAuthModal() {
        if (this.authModal) {
            const modal = bootstrap.Modal.getInstance(this.authModal);
            if (modal) {
                modal.hide();
            }
        }
    }
    
    switchMode(mode) {
        this.currentMode = mode;
        this.clearErrors();
        
        const authModalTitle = document.getElementById('authModalTitle');
        if (authModalTitle) {
            authModalTitle.textContent = mode === 'signin' ? 'Sign In' : 'Sign Up';
        }
    }
    
    async handleSignIn(event) {
        event.preventDefault();
        
        if (this.isProcessing) return;
        
        const email = document.getElementById('signinEmail').value.trim();
        const password = document.getElementById('signinPassword').value;
        
        if (!this.validateEmail(email) || !password) {
            this.showError('Please enter valid email and password.');
            return;
        }
        
        try {
            this.setProcessing(true);
            this.showLoading('Signing in...');
            
            if (!window.authService) {
                throw new Error('Auth service not available');
            }
            
            await window.authService.signInWithEmail(email, password);
            
            this.showSuccess('Signed in successfully!');
            setTimeout(() => this.hideAuthModal(), 1500);
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.setProcessing(false);
        }
    }
    
    async handleSignUp(event) {
        event.preventDefault();
        
        if (this.isProcessing) return;
        
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupPasswordConfirm').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;
        
        if (!this.validateSignUpForm(name, email, password, confirmPassword, agreeTerms)) {
            return;
        }
        
        try {
            this.setProcessing(true);
            this.showLoading('Creating account...');
            
            if (!window.authService) {
                throw new Error('Auth service not available');
            }
            
            await window.authService.signUpWithEmail(email, password, name);
            
            this.showSuccess('Account created successfully!');
            setTimeout(() => this.hideAuthModal(), 1500);
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.setProcessing(false);
        }
    }
    
    async handleGoogleSignIn() {
        if (this.isProcessing) return;
        
        try {
            this.setProcessing(true);
            this.showLoading('Signing in with Google...');
            
            if (!window.authService) {
                throw new Error('Auth service not available');
            }
            
            await window.authService.signInWithGoogle();
            
            this.showSuccess('Signed in with Google!');
            setTimeout(() => this.hideAuthModal(), 1500);
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.setProcessing(false);
        }
    }
    
    async handleAnonymousSignIn() {
        if (this.isProcessing) return;
        
        try {
            this.setProcessing(true);
            
            if (!window.authService) {
                throw new Error('Auth service not available');
            }
            
            await window.authService.signInAnonymously();
            this.hideAuthModal();
            
        } catch (error) {
            console.error('Anonymous sign-in failed:', error);
            this.hideAuthModal(); // Continue anyway
        } finally {
            this.setProcessing(false);
        }
    }
    
    async handleSignOut() {
        try {
            if (!window.authService) {
                throw new Error('Auth service not available');
            }
            
            await window.authService.signOut();
            
        } catch (error) {
            console.error('Sign-out failed:', error);
        }
    }
    
    async handleForgotPassword() {
        const email = document.getElementById('signinEmail').value.trim();
        
        if (!this.validateEmail(email)) {
            this.showError('Please enter a valid email address first.');
            return;
        }
        
        try {
            if (!window.authService) {
                throw new Error('Auth service not available');
            }
            
            await window.authService.sendPasswordResetEmail(email);
            this.showSuccess('Password reset email sent!');
            
        } catch (error) {
            this.showError(error.message);
        }
    }
    
    // UI Helper Methods
    
    setProcessing(processing) {
        this.isProcessing = processing;
        
        const loadingDiv = document.getElementById('authLoading');
        const tabContent = document.getElementById('authTabContent');
        
        if (loadingDiv && tabContent) {
            if (processing) {
                loadingDiv.classList.remove('d-none');
                tabContent.classList.add('d-none');
            } else {
                loadingDiv.classList.add('d-none');
                tabContent.classList.remove('d-none');
            }
        }
    }
    
    showLoading(message) {
        const loadingDiv = document.getElementById('authLoading');
        if (loadingDiv) {
            const messageEl = loadingDiv.querySelector('p');
            if (messageEl) {
                messageEl.textContent = message;
            }
        }
    }
    
    showError(message) {
        this.clearMessages();
        
        const errorDiv = document.getElementById('authError');
        const errorMessage = document.getElementById('authErrorMessage');
        
        if (errorDiv && errorMessage) {
            errorMessage.textContent = message;
            errorDiv.classList.remove('d-none');
        }
    }
    
    showSuccess(message) {
        this.clearMessages();
        
        const successDiv = document.getElementById('authSuccess');
        const successMessage = document.getElementById('authSuccessMessage');
        
        if (successDiv && successMessage) {
            successMessage.textContent = message;
            successDiv.classList.remove('d-none');
        }
    }
    
    clearMessages() {
        const errorDiv = document.getElementById('authError');
        const successDiv = document.getElementById('authSuccess');
        
        if (errorDiv) errorDiv.classList.add('d-none');
        if (successDiv) successDiv.classList.add('d-none');
    }
    
    clearErrors() {
        this.clearMessages();
    }
    
    resetForms() {
        const signinForm = document.getElementById('signinForm');
        const signupForm = document.getElementById('signupForm');
        
        if (signinForm) {
            signinForm.reset();
            signinForm.classList.remove('was-validated');
        }
        
        if (signupForm) {
            signupForm.reset();
            signupForm.classList.remove('was-validated');
        }
    }
    
    // Validation Methods
    
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    validateSignUpForm(name, email, password, confirmPassword, agreeTerms) {
        if (!name) {
            this.showError('Please enter your name.');
            return false;
        }
        
        if (!this.validateEmail(email)) {
            this.showError('Please enter a valid email address.');
            return false;
        }
        
        if (password.length < 6) {
            this.showError('Password must be at least 6 characters.');
            return false;
        }
        
        if (password !== confirmPassword) {
            this.showError('Passwords do not match.');
            return false;
        }
        
        if (!agreeTerms) {
            this.showError('Please agree to the terms of service.');
            return false;
        }
        
        return true;
    }
}

// Create global instance
window.authUI = new AuthUI();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthUI;
}