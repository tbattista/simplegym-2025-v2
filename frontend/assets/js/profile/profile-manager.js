/**
 * Profile Manager for Ghost Gym
 * Handles profile information display and editing
 */

class ProfileManager {
    constructor() {
        this.user = null;
        this.originalDisplayName = '';
        this.initialized = false;
    }

    /**
     * Initialize the profile manager
     */
    async init() {
        console.log('🔧 Initializing Profile Manager...');

        // Wait for Firebase to be ready
        if (!window.firebaseReady) {
            console.log('⏳ Waiting for Firebase to be ready...');
            await new Promise(resolve => {
                window.addEventListener('firebaseReady', resolve, { once: true });
            });
        }

        // Wait for auth service
        if (!window.authService) {
            console.error('❌ Auth service not available');
            return;
        }

        // Wait a bit for auth state to settle
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if user is authenticated
        this.user = window.authService.getCurrentUser();
        
        if (!this.user) {
            console.log('⚠️ No user authenticated, redirecting to home...');
            window.location.href = '/';
            return;
        }

        console.log('✅ User authenticated:', this.user.email);

        // Load profile data
        await this.loadProfileData();

        // Set up event listeners
        this.setupEventListeners();

        // Listen for auth state changes
        window.authService.onAuthStateChange((user) => {
            if (!user) {
                // User signed out, redirect to home
                console.log('🚪 User signed out, redirecting to home...');
                window.location.href = '/';
            } else if (!this.initialized) {
                // User just signed in, reload profile
                console.log('🔄 User signed in, loading profile...');
                this.user = user;
                this.loadProfileData();
            }
        });

        this.initialized = true;
        console.log('✅ Profile Manager initialized');
    }

    /**
     * Load and display profile data
     */
    async loadProfileData() {
        try {
            console.log('📊 Loading profile data...');

            // Get user data
            const displayName = this.user.displayName || this.user.email?.split('@')[0] || 'User';
            const email = this.user.email || 'No email';
            const emailVerified = this.user.emailVerified || false;
            const createdAt = this.user.metadata?.creationTime || 'Unknown';
            const providerData = this.user.providerData || [];

            // Store original display name
            this.originalDisplayName = displayName;

            // Update avatar
            const initial = displayName.charAt(0).toUpperCase();
            document.getElementById('profileAvatar').textContent = initial;

            // Update header
            document.getElementById('profileDisplayName').textContent = displayName;
            document.getElementById('profileEmail').textContent = email;

            // Update email verification badge
            if (emailVerified) {
                document.getElementById('emailVerifiedBadge').style.display = 'inline-block';
                document.getElementById('emailNotVerifiedBadge').style.display = 'none';
            } else {
                document.getElementById('emailVerifiedBadge').style.display = 'none';
                document.getElementById('emailNotVerifiedBadge').style.display = 'inline-block';
            }

            // Update form fields
            document.getElementById('displayName').value = displayName;
            document.getElementById('email').value = email;
            document.getElementById('accountCreated').value = this.formatDate(createdAt);

            // Determine sign-in method
            const signInMethod = this.getSignInMethod(providerData);
            document.getElementById('signInMethod').value = signInMethod;

            // Show/hide password change card based on sign-in method
            const isPasswordProvider = providerData.some(p => p.providerId === 'password');
            if (isPasswordProvider) {
                document.getElementById('changePasswordCard').style.display = 'block';
            }

            console.log('✅ Profile data loaded');
        } catch (error) {
            console.error('❌ Error loading profile data:', error);
            this.showError('Failed to load profile data');
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Save profile button
        const saveBtn = document.getElementById('btnSaveProfile');
        const form = document.getElementById('formAccountSettings');
        
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProfile();
            });
        }

        // Cancel button
        const cancelBtn = document.getElementById('btnCancelProfile');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.resetForm();
            });
        }

        // Enable/disable delete button based on checkbox
        const deleteCheckbox = document.getElementById('accountDeletionConfirm');
        const deleteBtn = document.getElementById('btnDeleteAccount');
        
        if (deleteCheckbox && deleteBtn) {
            deleteCheckbox.addEventListener('change', (e) => {
                deleteBtn.disabled = !e.target.checked;
            });
        }
    }

    /**
     * Save profile changes
     */
    async saveProfile() {
        try {
            const saveBtn = document.getElementById('btnSaveProfile');
            const spinner = document.getElementById('saveSpinner');
            const displayNameInput = document.getElementById('displayName');
            const newDisplayName = displayNameInput.value.trim();

            // Validate
            if (!newDisplayName) {
                this.showError('Display name cannot be empty');
                return;
            }

            if (newDisplayName.length > 50) {
                this.showError('Display name must be 50 characters or less');
                return;
            }

            // Check if changed
            if (newDisplayName === this.originalDisplayName) {
                this.showInfo('No changes to save');
                return;
            }

            // Show loading state
            saveBtn.disabled = true;
            spinner.classList.remove('d-none');

            console.log('💾 Saving profile changes...');

            // Update Firebase Auth profile
            const { updateProfile } = window.firebaseAuthFunctions;
            await updateProfile(this.user, {
                displayName: newDisplayName
            });

            // Update local reference
            this.originalDisplayName = newDisplayName;

            // Update UI
            document.getElementById('profileDisplayName').textContent = newDisplayName;
            const initial = newDisplayName.charAt(0).toUpperCase();
            document.getElementById('profileAvatar').textContent = initial;

            // Update navbar
            if (window.updateNavbarAuthUI) {
                window.updateNavbarAuthUI(this.user);
            }

            this.showSuccess('Profile updated successfully');
            console.log('✅ Profile saved');

        } catch (error) {
            console.error('❌ Error saving profile:', error);
            this.showError('Failed to save profile: ' + error.message);
        } finally {
            const saveBtn = document.getElementById('btnSaveProfile');
            const spinner = document.getElementById('saveSpinner');
            saveBtn.disabled = false;
            spinner.classList.add('d-none');
        }
    }

    /**
     * Reset form to original values
     */
    resetForm() {
        document.getElementById('displayName').value = this.originalDisplayName;
        this.showInfo('Changes discarded');
    }

    /**
     * Get sign-in method from provider data
     */
    getSignInMethod(providerData) {
        if (!providerData || providerData.length === 0) {
            return 'Unknown';
        }

        const provider = providerData[0];
        switch (provider.providerId) {
            case 'password':
                return 'Email/Password';
            case 'google.com':
                return 'Google';
            case 'facebook.com':
                return 'Facebook';
            case 'twitter.com':
                return 'Twitter';
            case 'github.com':
                return 'GitHub';
            default:
                return provider.providerId;
        }
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        if (window.showToast) {
            window.showToast(message, 'success');
        } else {
            alert(message);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        if (window.showToast) {
            window.showToast(message, 'error');
        } else {
            alert(message);
        }
    }

    /**
     * Show info message
     */
    showInfo(message) {
        if (window.showToast) {
            window.showToast(message, 'info');
        } else {
            alert(message);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    window.profileManager = new ProfileManager();
    await window.profileManager.init();
});

console.log('📦 Profile Manager loaded');