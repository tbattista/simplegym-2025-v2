/**
 * Ghost Gym - Workout Detail Modal Component
 * Shows detailed workout information and allows saving to library
 * @version 1.0.0
 */

(function() {
    'use strict';

    class WorkoutDetailModal {
        constructor() {
            this.modalId = 'workoutDetailModal';
            this.currentWorkout = null;
            this.isPublic = true; // true for public workout, false for private share
            this.init();
        }

        init() {
            this.createModalHTML();
            this.attachEventListeners();
            console.log('✅ Workout Detail Modal component initialized');
        }

        createModalHTML() {
            const modalHTML = `
                <div class="modal fade" id="${this.modalId}" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-lg modal-dialog-scrollable">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="workoutDetailTitle">
                                    <i class="bx bx-dumbbell me-2"></i>
                                    Workout Details
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body" id="workoutDetailBody">
                                <!-- Loading state -->
                                <div id="detailLoadingState" class="text-center py-5">
                                    <div class="spinner-border text-primary mb-3" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p class="text-muted">Loading workout details...</p>
                                </div>

                                <!-- Content (hidden initially) -->
                                <div id="detailContent" style="display: none;">
                                    <!-- Workout Info -->
                                    <div class="mb-4">
                                        <h4 id="detailWorkoutName" class="mb-2"></h4>
                                        <p class="text-muted mb-2">
                                            <i class="bx bx-user me-1"></i>
                                            <span id="detailCreatorName"></span>
                                        </p>
                                        <p id="detailDescription" class="text-muted"></p>
                                    </div>

                                    <!-- Tags -->
                                    <div id="detailTagsContainer" class="mb-4" style="display: none;">
                                        <h6 class="mb-2">Tags</h6>
                                        <div id="detailTags"></div>
                                    </div>

                                    <!-- Stats -->
                                    <div class="row mb-4">
                                        <div class="col-4 text-center">
                                            <div class="h5 mb-0" id="detailViewCount">0</div>
                                            <small class="text-muted">Views</small>
                                        </div>
                                        <div class="col-4 text-center" id="detailSaveCountContainer">
                                            <div class="h5 mb-0" id="detailSaveCount">0</div>
                                            <small class="text-muted">Saves</small>
                                        </div>
                                        <div class="col-4 text-center">
                                            <div class="h5 mb-0" id="detailExerciseCount">0</div>
                                            <small class="text-muted">Exercises</small>
                                        </div>
                                    </div>

                                    <!-- Exercise Groups -->
                                    <div class="mb-4">
                                        <h6 class="mb-3">Exercise Groups</h6>
                                        <div id="detailExerciseGroups"></div>
                                    </div>

                                    <!-- Bonus Exercises -->
                                    <div id="detailBonusContainer" class="mb-4" style="display: none;">
                                        <h6 class="mb-3">Bonus Exercises</h6>
                                        <div id="detailBonusExercises"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-primary" id="saveWorkoutBtn">
                                    <i class="bx bx-bookmark me-1"></i>
                                    Save to My Library
                                </button>
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
            const saveBtn = document.getElementById('saveWorkoutBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => this.handleSaveWorkout());
            }
        }

        async open(workoutId, isPublic = true) {
            console.log('📋 Opening workout detail modal:', workoutId, isPublic ? '(public)' : '(private)');

            this.isPublic = isPublic;
            this.showLoadingState();

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById(this.modalId));
            modal.show();

            try {
                // Fetch workout details
                const workout = await this.fetchWorkoutDetails(workoutId, isPublic);
                this.currentWorkout = workout;

                // Render workout details
                this.renderWorkoutDetails(workout);

            } catch (error) {
                console.error('❌ Error loading workout details:', error);
                this.showError(error.message);
            }
        }

        async fetchWorkoutDetails(workoutId, isPublic) {
            const endpoint = isPublic 
                ? `/api/v3/sharing/public-workouts/${workoutId}`
                : `/api/v3/sharing/share/${workoutId}`;

            const response = await fetch(endpoint);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to load workout');
            }

            return await response.json();
        }

        renderWorkoutDetails(workout) {
            const workoutData = workout.workout_data || {};

            // Update title
            document.getElementById('workoutDetailTitle').innerHTML = `
                <i class="bx bx-dumbbell me-2"></i>
                ${this.escapeHtml(workoutData.name || 'Untitled Workout')}
            `;

            // Update workout info
            document.getElementById('detailWorkoutName').textContent = workoutData.name || 'Untitled Workout';
            document.getElementById('detailCreatorName').textContent = workout.creator_name || 'Anonymous';
            
            const descEl = document.getElementById('detailDescription');
            if (workoutData.description) {
                descEl.textContent = workoutData.description;
                descEl.style.display = 'block';
            } else {
                descEl.style.display = 'none';
            }

            // Render tags
            const tags = workoutData.tags || [];
            if (tags.length > 0) {
                document.getElementById('detailTagsContainer').style.display = 'block';
                document.getElementById('detailTags').innerHTML = tags.map(tag => 
                    `<span class="badge bg-label-primary me-1">${this.escapeHtml(tag)}</span>`
                ).join('');
            } else {
                document.getElementById('detailTagsContainer').style.display = 'none';
            }

            // Update stats
            if (this.isPublic) {
                document.getElementById('detailViewCount').textContent = workout.stats?.view_count || 0;
                document.getElementById('detailSaveCount').textContent = workout.stats?.save_count || 0;
                document.getElementById('detailSaveCountContainer').style.display = 'block';
            } else {
                document.getElementById('detailViewCount').textContent = workout.view_count || 0;
                document.getElementById('detailSaveCountContainer').style.display = 'none';
            }

            const exerciseCount = (workoutData.exercise_groups || []).length + (workoutData.bonus_exercises || []).length;
            document.getElementById('detailExerciseCount').textContent = exerciseCount;

            // Render exercise groups
            this.renderExerciseGroups(workoutData.exercise_groups || []);

            // Render bonus exercises
            const bonusExercises = workoutData.bonus_exercises || [];
            if (bonusExercises.length > 0) {
                document.getElementById('detailBonusContainer').style.display = 'block';
                this.renderBonusExercises(bonusExercises);
            } else {
                document.getElementById('detailBonusContainer').style.display = 'none';
            }

            // Show content
            this.showContent();
        }

        renderExerciseGroups(groups) {
            const container = document.getElementById('detailExerciseGroups');
            container.innerHTML = '';

            groups.forEach((group, index) => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'card mb-3';
                
                const exercises = group.exercises || {};
                const exerciseNames = Object.values(exercises).filter(name => name);

                groupDiv.innerHTML = `
                    <div class="card-body">
                        <h6 class="mb-2">Group ${index + 1}</h6>
                        <div class="mb-2">
                            ${exerciseNames.map(name => `
                                <div class="text-muted">• ${this.escapeHtml(name)}</div>
                            `).join('')}
                        </div>
                        <div class="d-flex gap-3 text-muted small">
                            <span><strong>Sets:</strong> ${this.escapeHtml(group.sets || '3')}</span>
                            <span><strong>Reps:</strong> ${this.escapeHtml(group.reps || '8-12')}</span>
                            <span><strong>Rest:</strong> ${this.escapeHtml(group.rest || '60s')}</span>
                        </div>
                        ${group.default_weight ? `
                            <div class="text-muted small mt-2">
                                <strong>Weight:</strong> ${this.escapeHtml(group.default_weight)} ${this.escapeHtml(group.default_weight_unit || 'lbs')}
                            </div>
                        ` : ''}
                    </div>
                `;

                container.appendChild(groupDiv);
            });
        }

        renderBonusExercises(bonusExercises) {
            const container = document.getElementById('detailBonusExercises');
            container.innerHTML = '';

            bonusExercises.forEach(exercise => {
                const exerciseDiv = document.createElement('div');
                exerciseDiv.className = 'card mb-2';

                exerciseDiv.innerHTML = `
                    <div class="card-body py-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <span>${this.escapeHtml(exercise.name)}</span>
                            <div class="d-flex gap-3 text-muted small">
                                <span>${this.escapeHtml(exercise.sets || '2')} sets</span>
                                <span>${this.escapeHtml(exercise.reps || '15')} reps</span>
                                <span>${this.escapeHtml(exercise.rest || '30s')} rest</span>
                            </div>
                        </div>
                    </div>
                `;

                container.appendChild(exerciseDiv);
            });
        }

        async handleSaveWorkout() {
            if (!this.currentWorkout) {
                alert('No workout to save');
                return;
            }

            const btn = document.getElementById('saveWorkoutBtn');
            const originalHTML = btn.innerHTML;

            try {
                // Show loading state
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

                // Get auth token
                const token = await this.getAuthToken();

                // Determine endpoint
                const endpoint = this.isPublic
                    ? `/api/v3/sharing/public-workouts/${this.currentWorkout.id}/save`
                    : `/api/v3/sharing/share/${this.currentWorkout.token}/save`;

                // Call API
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to save workout');
                }

                const savedWorkout = await response.json();
                console.log('✅ Workout saved to library:', savedWorkout);

                // Show success message
                if (window.showAlert) {
                    window.showAlert('Workout saved to your library!', 'success');
                } else {
                    alert('Workout saved to your library!');
                }

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById(this.modalId));
                if (modal) {
                    modal.hide();
                }

                // Redirect to workout database after a moment
                setTimeout(() => {
                    window.location.href = 'workout-database.html';
                }, 1500);

            } catch (error) {
                console.error('❌ Error saving workout:', error);
                alert('Failed to save workout: ' + error.message);

                // Reset button
                btn.disabled = false;
                btn.innerHTML = originalHTML;
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
                throw new Error('You must be logged in to save workouts');
            }

            // Get ID token from auth service
            return await window.authService.getIdToken();
        }

        showLoadingState() {
            document.getElementById('detailLoadingState').style.display = 'block';
            document.getElementById('detailContent').style.display = 'none';
        }

        showContent() {
            document.getElementById('detailLoadingState').style.display = 'none';
            document.getElementById('detailContent').style.display = 'block';
        }

        showError(message) {
            const body = document.getElementById('workoutDetailBody');
            body.innerHTML = `
                <div class="text-center py-5">
                    <i class="bx bx-error-circle display-1 text-danger"></i>
                    <h5 class="mt-3">Error Loading Workout</h5>
                    <p class="text-muted">${this.escapeHtml(message)}</p>
                </div>
            `;
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    // Create global instance
    window.workoutDetailModal = new WorkoutDetailModal();

    console.log('📦 Workout Detail Modal component loaded');

})();