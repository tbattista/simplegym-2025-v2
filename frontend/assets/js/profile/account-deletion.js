/**
 * Account Deletion Manager for Ghost Gym
 * Handles account deletion with proper confirmation and re-authentication
 */

class AccountDeletionManager {
    constructor() {
        this.deleteModal = null;
        this.initialized = false;
    }

    /**
     * Initialize the account deletion manager
     */
    init() {
        console.log('🗑️ Initializing Account Deletion Manager...');

        // Set up event listeners
        this.setupEventListeners();

        // Initialize modal
        const modalElement = document.getElementById('deleteConfirmModal');
        if (modalElement) {
            this.deleteModal = new bootstrap.Modal(modalElement);
        }

        this.initialized = true;
        console.log('✅ Account Deletion Manager initialized');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Delete account button (initial)
        const deleteForm = document.getElementById('formAccountDeletion');
        if (deleteForm) {
            deleteForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.showDeleteConfirmation();
            });
        }

        // Confirm delete button (in modal)
        const confirmBtn = document.getElementById('btnConfirmDelete');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.deleteAccount();
            });
        }

        // Clear password field when modal is hidden
        const modalElement = document.getElementById('deleteConfirmModal');
        if (modalElement) {
            modalElement.addEventListener('hidden.bs.modal', () => {
                document.getElementById('deletePassword').value = '';
            });
        }
    }

    /**
     * Show delete confirmation modal
     */
    showDeleteConfirmation() {
        if (!this.deleteModal) {
            this.showError('Modal not initialized');
            return;
        }

        // Check if user is using password authentication
        const user = window.authService.getCurrentUser();
        if (!user) {
            this.showError('No user authenticated');
            return;
        }

        // Check if user has password provider
        const hasPasswordProvider = user.providerData.some(p => p.providerId === 'password');
        
        // Show/hide password field based on provider
        const reauthContainer = document.getElementById('reauthContainer');
        if (reauthContainer) {
            if (hasPasswordProvider) {
                reauthContainer.style.display = 'block';
            } else {
                reauthContainer.style.display = 'none';
            }
        }

        this.deleteModal.show();
    }

    /**
     * Delete user account
     */
    async deleteAccount() {
        try {
            const confirmBtn = document.getElementById('btnConfirmDelete');
            const spinner = document.getElementById('confirmDeleteSpinner');
            const passwordInput = document.getElementById('deletePassword');

            // Show loading state
            confirmBtn.disabled = true;
            spinner.classList.remove('d-none');

            console.log('🗑️ Deleting account...');

            // Get current user
            const user = window.authService.getCurrentUser();
            if (!user) {
                throw new Error('No user authenticated');
            }

            // Re-authenticate user
            await this.reauthenticateUser(user, passwordInput.value);
            console.log('✅ Re-authentication successful');

            // Delete Firestore data first
            await this.deleteFirestoreData(user.uid);
            console.log('✅ Firestore data deleted');

            // Delete Firebase Auth account
            await user.delete();
            console.log('✅ Firebase Auth account deleted');

            // Hide modal
            if (this.deleteModal) {
                this.deleteModal.hide();
            }

            // Show success message
            this.showSuccess('Account deleted successfully. Redirecting...');

            // Redirect to home page after a short delay
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);

        } catch (error) {
            console.error('❌ Error deleting account:', error);
            
            // Handle specific Firebase errors
            let errorMessage = 'Failed to delete account';
            
            if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password';
            } else if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'Please sign out and sign in again before deleting your account';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many attempts. Please try again later';
            } else if (error.message) {
                errorMessage = error.message;
            }

            this.showError(errorMessage);
        } finally {
            const confirmBtn = document.getElementById('btnConfirmDelete');
            const spinner = document.getElementById('confirmDeleteSpinner');
            if (confirmBtn) confirmBtn.disabled = false;
            if (spinner) spinner.classList.add('d-none');
        }
    }

    /**
     * Re-authenticate user before deletion
     */
    async reauthenticateUser(user, password) {
        const providerData = user.providerData || [];
        const hasPasswordProvider = providerData.some(p => p.providerId === 'password');

        if (hasPasswordProvider) {
            // Email/password authentication
            if (!password) {
                throw new Error('Password is required');
            }

            const { EmailAuthProvider, reauthenticateWithCredential } = window.firebaseAuthFunctions;
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);
        } else {
            // Google or other provider - need to re-authenticate with popup
            const hasGoogleProvider = providerData.some(p => p.providerId === 'google.com');
            
            if (hasGoogleProvider) {
                const { GoogleAuthProvider, reauthenticateWithPopup } = window.firebaseAuthFunctions;
                const provider = new GoogleAuthProvider();
                await reauthenticateWithPopup(user, provider);
            } else {
                throw new Error('Unsupported authentication provider');
            }
        }
    }

    /**
     * Delete all user data from Firestore
     */
    async deleteFirestoreData(userId) {
        try {
            // Get ID token for authentication
            const user = window.authService.getCurrentUser();
            const idToken = await user.getIdToken();

            // Call backend API to delete user data
            const response = await fetch('/api/user/delete', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to delete user data');
            }

            const result = await response.json();
            console.log('✅ Backend deletion response:', result);
        } catch (error) {
            console.error('❌ Error deleting Firestore data:', error);
            // Continue with account deletion even if Firestore deletion fails
            // The orphaned data will be cleaned up by backend maintenance tasks
            console.warn('⚠️ Continuing with account deletion despite Firestore error');
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
    window.accountDeletionManager = new AccountDeletionManager();
    window.accountDeletionManager.init();
});

console.log('📦 Account Deletion Manager loaded');