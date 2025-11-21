/**
 * Ghost Gym - Share Modal Component
 * Handles workout sharing (public and private)
 * @version 1.0.0
 */

(function() {
    'use strict';

    class ShareModal {
        constructor() {
            this.modalId = 'shareWorkoutModal';
            this.currentWorkoutId = null;
            this.currentWorkout = null;
            this.activeTab = 'public'; // 'public' or 'private'
            this.init();
        }

        init() {
            this.createModalHTML();
            this.attachEventListeners();
            console.log('✅ Share Modal component initialized');
        }

        createModalHTML() {
            const modalHTML = `
                <div class="modal fade" id="${this.modalId}" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bx bx-share-alt me-2"></i>
                                    Share Workout
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <!-- Tabs -->
                                <ul class="nav nav-tabs mb-3" role="tablist">
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link active" id="public-tab" data-bs-toggle="tab" 
                                                data-bs-target="#public-share" type="button" role="tab">
                                            <i class="bx bx-globe me-1"></i>
                                            Public
                                        </button>
                                    </li>
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link" id="private-tab" data-bs-toggle="tab" 
                                                data-bs-target="#private-share" type="button" role="tab">
                                            <i class="bx bx-lock me-1"></i>
                                            Private Link
                                        </button>
                                    </li>
                                </ul>

                                <!-- Tab Content -->
                                <div class="tab-content">
                                    <!-- Public Share Tab -->
                                    <div class="tab-pane fade show active" id="public-share" role="tabpanel">
                                        <div id="publicShareForm">
                                            <p class="text-muted small mb-3">
                                                Share your workout publicly so others can discover and save it to their library.
                                            </p>
                                            
                                            <!-- Show Creator Name Toggle -->
                                            <div class="form-check form-switch mb-3">
                                                <input class="form-check-input" type="checkbox" id="publicShowName" checked>
                                                <label class="form-check-label" for="publicShowName">
                                                    Show my name
                                                </label>
                                            </div>

                                            <!-- Share Button -->
                                            <button type="button" class="btn btn-primary w-100" id="sharePublicBtn">
                                                <i class="bx bx-globe me-1"></i>
                                                Share Publicly
                                            </button>
                                        </div>

                                        <!-- Success State -->
                                        <div id="publicShareSuccess" style="display: none;">
                                            <div class="alert alert-success mb-3">
                                                <i class="bx bx-check-circle me-2"></i>
                                                Workout shared publicly!
                                            </div>

                                            <!-- Stats -->
                                            <div class="d-flex gap-3 mb-3">
                                                <div class="text-center flex-fill">
                                                    <div class="h4 mb-0" id="publicViewCount">0</div>
                                                    <small class="text-muted">Views</small>
                                                </div>
                                                <div class="text-center flex-fill">
                                                    <div class="h4 mb-0" id="publicSaveCount">0</div>
                                                    <small class="text-muted">Saves</small>
                                                </div>
                                            </div>

                                            <!-- Share URL -->
                                            <div class="input-group mb-2">
                                                <input type="text" class="form-control" id="publicShareUrl" readonly>
                                                <button class="btn btn-outline-secondary" type="button" id="copyPublicUrlBtn">
                                                    <i class="bx bx-copy"></i>
                                                </button>
                                            </div>

                                            <button type="button" class="btn btn-outline-primary w-100" id="shareAnotherPublicBtn">
                                                <i class="bx bx-refresh me-1"></i>
                                                Update Share Settings
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Private Share Tab -->
                                    <div class="tab-pane fade" id="private-share" role="tabpanel">
                                        <div id="privateShareForm">
                                            <p class="text-muted small mb-3">
                                                Create a private link that only people with the link can access.
                                            </p>
                                            
                                            <!-- Show Creator Name Toggle -->
                                            <div class="form-check form-switch mb-3">
                                                <input class="form-check-input" type="checkbox" id="privateShowName" checked>
                                                <label class="form-check-label" for="privateShowName">
                                                    Show my name
                                                </label>
                                            </div>

                                            <!-- Expiration -->
                                            <div class="mb-3">
                                                <label class="form-label">Link Expiration</label>
                                                <select class="form-select" id="privateExpiration">
                                                    <option value="">Never</option>
                                                    <option value="7">7 days</option>
                                                    <option value="30" selected>30 days</option>
                                                    <option value="90">90 days</option>
                                                </select>
                                            </div>

                                            <!-- Share Button -->
                                            <button type="button" class="btn btn-primary w-100" id="sharePrivateBtn">
                                                <i class="bx bx-link me-1"></i>
                                                Create Private Link
                                            </button>
                                        </div>

                                        <!-- Success State -->
                                        <div id="privateShareSuccess" style="display: none;">
                                            <div class="alert alert-success mb-3">
                                                <i class="bx bx-check-circle me-2"></i>
                                                Private link created!
                                            </div>

                                            <!-- Expiration Info -->
                                            <div class="alert alert-info mb-3" id="privateExpirationInfo" style="display: none;">
                                                <i class="bx bx-time me-2"></i>
                                                <span id="privateExpirationText"></span>
                                            </div>

                                            <!-- Stats -->
                                            <div class="text-center mb-3">
                                                <div class="h4 mb-0" id="privateViewCount">0</div>
                                                <small class="text-muted">Views</small>
                                            </div>

                                            <!-- Share URL -->
                                            <div class="input-group mb-2">
                                                <input type="text" class="form-control" id="privateShareUrl" readonly>
                                                <button class="btn btn-outline-secondary" type="button" id="copyPrivateUrlBtn">
                                                    <i class="bx bx-copy"></i>
                                                </button>
                                            </div>

                                            <div class="d-flex gap-2">
                                                <button type="button" class="btn btn-outline-danger flex-fill" id="deletePrivateShareBtn">
                                                    <i class="bx bx-trash me-1"></i>
                                                    Delete Link
                                                </button>
                                                <button type="button" class="btn btn-outline-primary flex-fill" id="createNewPrivateBtn">
                                                    <i class="bx bx-refresh me-1"></i>
                                                    New Link
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal if present
            const existingModal = document.getElementById(this.modalId);
            if (existingModal) {
                existingModal.remove();
            }

            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        attachEventListeners() {
            const modal = document.getElementById(this.modalId);
            if (!modal) return;

            // Tab switching
            const publicTab = document.getElementById('public-tab');
            const privateTab = document.getElementById('private-tab');
            
            if (publicTab) {
                publicTab.addEventListener('shown.bs.tab', () => {
                    this.activeTab = 'public';
                });
            }
            
            if (privateTab) {
                privateTab.addEventListener('shown.bs.tab', () => {
                    this.activeTab = 'private';
                });
            }

            // Public share button
            const sharePublicBtn = document.getElementById('sharePublicBtn');
            if (sharePublicBtn) {
                sharePublicBtn.addEventListener('click', () => this.handlePublicShare());
            }

            // Private share button
            const sharePrivateBtn = document.getElementById('sharePrivateBtn');
            if (sharePrivateBtn) {
                sharePrivateBtn.addEventListener('click', () => this.handlePrivateShare());
            }

            // Copy URL buttons
            const copyPublicUrlBtn = document.getElementById('copyPublicUrlBtn');
            if (copyPublicUrlBtn) {
                copyPublicUrlBtn.addEventListener('click', () => this.copyToClipboard('publicShareUrl', copyPublicUrlBtn));
            }

            const copyPrivateUrlBtn = document.getElementById('copyPrivateUrlBtn');
            if (copyPrivateUrlBtn) {
                copyPrivateUrlBtn.addEventListener('click', () => this.copyToClipboard('privateShareUrl', copyPrivateUrlBtn));
            }

            // Delete private share button
            const deletePrivateShareBtn = document.getElementById('deletePrivateShareBtn');
            if (deletePrivateShareBtn) {
                deletePrivateShareBtn.addEventListener('click', () => this.handleDeletePrivateShare());
            }

            // Reset buttons
            const shareAnotherPublicBtn = document.getElementById('shareAnotherPublicBtn');
            if (shareAnotherPublicBtn) {
                shareAnotherPublicBtn.addEventListener('click', () => this.resetPublicForm());
            }

            const createNewPrivateBtn = document.getElementById('createNewPrivateBtn');
            if (createNewPrivateBtn) {
                createNewPrivateBtn.addEventListener('click', () => this.resetPrivateForm());
            }

            // Reset on modal close
            modal.addEventListener('hidden.bs.modal', () => {
                this.resetModal();
            });
        }

        async open(workoutId) {
            console.log('🔗 Opening share modal for workout:', workoutId);
            
            this.currentWorkoutId = workoutId;
            
            // Get workout data
            try {
                const workouts = window.ghostGym?.workouts || [];
                this.currentWorkout = workouts.find(w => w.id === workoutId);
                
                if (!this.currentWorkout) {
                    throw new Error('Workout not found');
                }

                // Reset modal state
                this.resetModal();

                // Show modal
                const modal = new bootstrap.Modal(document.getElementById(this.modalId));
                modal.show();

            } catch (error) {
                console.error('❌ Error opening share modal:', error);
                alert('Failed to open share modal: ' + error.message);
            }
        }

        async handlePublicShare() {
            const btn = document.getElementById('sharePublicBtn');
            const showName = document.getElementById('publicShowName').checked;

            try {
                // Show loading state
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sharing...';

                // Get auth token
                const token = await this.getAuthToken();

                // Call API
                const response = await fetch('/api/v3/sharing/share-public', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        workout_id: this.currentWorkoutId,
                        show_creator_name: showName
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to share workout');
                }

                const publicWorkout = await response.json();
                console.log('✅ Workout shared publicly:', publicWorkout);

                // Show success state
                this.showPublicSuccess(publicWorkout);

            } catch (error) {
                console.error('❌ Error sharing publicly:', error);
                alert('Failed to share workout: ' + error.message);
                
                // Reset button
                btn.disabled = false;
                btn.innerHTML = '<i class="bx bx-globe me-1"></i>Share Publicly';
            }
        }

        async handlePrivateShare() {
            const btn = document.getElementById('sharePrivateBtn');
            const showName = document.getElementById('privateShowName').checked;
            const expirationDays = document.getElementById('privateExpiration').value;

            try {
                // Show loading state
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';

                // Get auth token
                const token = await this.getAuthToken();

                // Call API
                const body = {
                    workout_id: this.currentWorkoutId,
                    show_creator_name: showName
                };

                if (expirationDays) {
                    body.expires_in_days = parseInt(expirationDays);
                }

                const response = await fetch('/api/v3/sharing/share-private', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to create private link');
                }

                const shareData = await response.json();
                console.log('✅ Private link created:', shareData);

                // Show success state
                this.showPrivateSuccess(shareData);

            } catch (error) {
                console.error('❌ Error creating private link:', error);
                alert('Failed to create private link: ' + error.message);
                
                // Reset button
                btn.disabled = false;
                btn.innerHTML = '<i class="bx bx-link me-1"></i>Create Private Link';
            }
        }

        async handleDeletePrivateShare() {
            if (!confirm('Are you sure you want to delete this private link? It will no longer be accessible.')) {
                return;
            }

            const btn = document.getElementById('deletePrivateShareBtn');
            const token = this.currentPrivateToken;

            if (!token) {
                alert('No private link to delete');
                return;
            }

            try {
                // Show loading state
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';

                // Get auth token
                const authToken = await this.getAuthToken();

                // Call API
                const response = await fetch(`/api/v3/sharing/share/${token}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to delete link');
                }

                console.log('✅ Private link deleted');

                // Reset form
                this.resetPrivateForm();

                // Show success message
                if (window.showAlert) {
                    window.showAlert('Private link deleted successfully', 'success');
                }

            } catch (error) {
                console.error('❌ Error deleting private link:', error);
                alert('Failed to delete link: ' + error.message);
                
                // Reset button
                btn.disabled = false;
                btn.innerHTML = '<i class="bx bx-trash me-1"></i>Delete Link';
            }
        }

        showPublicSuccess(publicWorkout) {
            // Hide form, show success
            document.getElementById('publicShareForm').style.display = 'none';
            document.getElementById('publicShareSuccess').style.display = 'block';

            // Update stats
            document.getElementById('publicViewCount').textContent = publicWorkout.stats?.view_count || 0;
            document.getElementById('publicSaveCount').textContent = publicWorkout.stats?.save_count || 0;

            // Set share URL - opens in workout builder for viewing/editing
            const shareUrl = `${window.location.origin}/workout-builder.html?share_id=${publicWorkout.id}`;
            document.getElementById('publicShareUrl').value = shareUrl;

            console.log('✅ Public share success displayed');
        }

        showPrivateSuccess(shareData) {
            // Hide form, show success
            document.getElementById('privateShareForm').style.display = 'none';
            document.getElementById('privateShareSuccess').style.display = 'block';

            // Store token for deletion
            this.currentPrivateToken = shareData.token;

            // Update stats (view count)
            document.getElementById('privateViewCount').textContent = 0;

            // Set share URL
            document.getElementById('privateShareUrl').value = shareData.share_url;

            // Show expiration info if applicable
            if (shareData.expires_at) {
                const expirationInfo = document.getElementById('privateExpirationInfo');
                const expirationText = document.getElementById('privateExpirationText');
                const expiresDate = new Date(shareData.expires_at);
                expirationText.textContent = `Expires on ${expiresDate.toLocaleDateString()}`;
                expirationInfo.style.display = 'block';
            }

            console.log('✅ Private share success displayed');
        }

        resetPublicForm() {
            document.getElementById('publicShareForm').style.display = 'block';
            document.getElementById('publicShareSuccess').style.display = 'none';
            document.getElementById('publicShowName').checked = true;
        }

        resetPrivateForm() {
            document.getElementById('privateShareForm').style.display = 'block';
            document.getElementById('privateShareSuccess').style.display = 'none';
            document.getElementById('privateShowName').checked = true;
            document.getElementById('privateExpiration').value = '30';
            document.getElementById('privateExpirationInfo').style.display = 'none';
            this.currentPrivateToken = null;
        }

        resetModal() {
            this.resetPublicForm();
            this.resetPrivateForm();
            this.activeTab = 'public';
            
            // Switch to public tab
            const publicTab = document.getElementById('public-tab');
            if (publicTab) {
                const tab = new bootstrap.Tab(publicTab);
                tab.show();
            }
        }

        async copyToClipboard(inputId, button) {
            const input = document.getElementById(inputId);
            if (!input) return;

            try {
                await navigator.clipboard.writeText(input.value);
                
                // Show success feedback
                const originalHTML = button.innerHTML;
                button.innerHTML = '<i class="bx bx-check"></i>';
                button.classList.add('btn-success');
                button.classList.remove('btn-outline-secondary');

                setTimeout(() => {
                    button.innerHTML = originalHTML;
                    button.classList.remove('btn-success');
                    button.classList.add('btn-outline-secondary');
                }, 2000);

                console.log('✅ URL copied to clipboard');

            } catch (error) {
                console.error('❌ Failed to copy:', error);
                
                // Fallback: select text
                input.select();
                input.setSelectionRange(0, 99999);
                
                try {
                    document.execCommand('copy');
                    alert('URL copied to clipboard!');
                } catch (err) {
                    alert('Failed to copy URL. Please copy manually.');
                }
            }
        }

        async getAuthToken() {
            // Wait for auth service to be ready
            if (!window.authService) {
                throw new Error('Authentication service not available');
            }

            // Wait for Firebase to be ready
            if (!window.firebaseReady) {
                await new Promise(resolve => {
                    window.addEventListener('firebaseReady', resolve, { once: true });
                });
            }

            // Check if user is authenticated
            if (!window.authService.isUserAuthenticated()) {
                throw new Error('You must be logged in to share workouts');
            }

            // Get ID token from auth service
            return await window.authService.getIdToken();
        }
    }

    // Create global instance
    window.shareModal = new ShareModal();

    // Global function to open share modal
    window.openShareModal = function(workoutId) {
        window.shareModal.open(workoutId);
    };

    console.log('📦 Share Modal component loaded');

})();