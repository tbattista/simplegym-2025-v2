/**
 * Password Manager for Ghost Gym
 * Handles password change functionality
 */

class PasswordManager {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize the password manager
     */
    init() {
        console.log('🔐 Initializing Password Manager...');

        // Set up event listeners
        this.setupEventListeners();

        this.initialized = true;
        console.log('✅ Password Manager initialized');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Password change form
        const form = document.getElementById('formChangePassword');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.changePassword();
            });
        }

        // Password visibility toggles
        this.setupPasswordToggles();
    }

    /**
     * Set up password visibility toggles
     */
    setupPasswordToggles() {
        const toggles = [
            { button: 'toggleCurrentPassword', input: 'currentPassword' },
            { button: 'toggleNewPassword', input: 'newPassword' },
            { button: 'toggleConfirmPassword', input: 'confirmPassword' }
        ];

        toggles.forEach(({ button, input }) => {
            const toggleBtn = document.getElementById(button);
            const inputField = document.getElementById(input);

            if (toggleBtn && inputField) {
                toggleBtn.addEventListener('click', () => {
                    const icon = toggleBtn.querySelector('i');
                    if (inputField.type === 'password') {
                        inputField.type = 'text';
                        icon.classList.remove('bx-hide');
                        icon.classList.add('bx-show');
                    } else {
                        inputField.type = 'password';
                        icon.classList.remove('bx-show');
                        icon.classList.add('bx-hide');
                    }
                });
            }
        });
    }

    /**
     * Change password
     */
    async changePassword() {
        try {
            const currentPasswordInput = document.getElementById('currentPassword');
            const newPasswordInput = document.getElementById('newPassword');
            const confirmPasswordInput = document.getElementById('confirmPassword');
            const changeBtn = document.getElementById('btnChangePassword');
            const spinner = document.getElementById('passwordSpinner');

            const currentPassword = currentPasswordInput.value.trim();
            const newPassword = newPasswordInput.value.trim();
            const confirmPassword = confirmPasswordInput.value.trim();

            // Validate inputs
            if (!currentPassword) {
                this.showError('Please enter your current password');
                currentPasswordInput.focus();
                return;
            }

            if (!newPassword) {
                this.showError('Please enter a new password');
                newPasswordInput.focus();
                return;
            }

            if (newPassword.length < 6) {
                this.showError('New password must be at least 6 characters');
                newPasswordInput.focus();
                return;
            }

            if (newPassword !== confirmPassword) {
                this.showError('New passwords do not match');
                confirmPasswordInput.focus();
                return;
            }

            if (currentPassword === newPassword) {
                this.showError('New password must be different from current password');
                newPasswordInput.focus();
                return;
            }

            // Show loading state
            changeBtn.disabled = true;
            spinner.classList.remove('d-none');

            console.log('🔐 Changing password...');

            // Get current user
            const user = window.authService.getCurrentUser();
            if (!user) {
                throw new Error('No user authenticated');
            }

            // Re-authenticate user first (Firebase requirement)
            const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = window.firebaseAuthFunctions;
            
            const credential = EmailAuthProvider.credential(
                user.email,
                currentPassword
            );

            await reauthenticateWithCredential(user, credential);
            console.log('✅ Re-authentication successful');

            // Update password
            await updatePassword(user, newPassword);
            console.log('✅ Password updated');

            // Clear form
            currentPasswordInput.value = '';
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';

            this.showSuccess('Password changed successfully');

        } catch (error) {
            console.error('❌ Error changing password:', error);
            
            // Handle specific Firebase errors
            let errorMessage = 'Failed to change password';
            
            if (error.code === 'auth/wrong-password') {
                errorMessage = 'Current password is incorrect';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'New password is too weak';
            } else if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'Please sign out and sign in again before changing your password';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many attempts. Please try again later';
            } else if (error.message) {
                errorMessage = error.message;
            }

            this.showError(errorMessage);
        } finally {
            const changeBtn = document.getElementById('btnChangePassword');
            const spinner = document.getElementById('passwordSpinner');
            changeBtn.disabled = false;
            spinner.classList.add('d-none');
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
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.passwordManager = new PasswordManager();
    window.passwordManager.init();
});

console.log('📦 Password Manager loaded');