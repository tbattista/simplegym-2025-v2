/**
 * Fitness Field Notes - Data Manager Workout Operations
 * Workout CRUD operations (Firestore + localStorage dual-mode)
 * Extracted from data-manager.js
 * @version 1.0.0
 */

const DataManagerWorkoutOps = {

    async getWorkouts(options = {}) {
        const { page = 1, pageSize = 50, search = null, tags = null } = options;

        const fbUser = this.getFirebaseUser();
        console.log('🔍 DEBUG: getWorkouts called with:', {
            hasCurrentUser: !!this.currentUser,
            hasFirebaseUser: !!fbUser,
            firebaseUserEmail: fbUser?.email || 'null',
            isOnline: this.isOnline,
            options
        });

        try {
            if (fbUser && this.isOnline) {
                console.log('🔍 DEBUG: Will fetch from Firestore');
                if (window.mobileDebugLog) window.mobileDebugLog('API: Fetching from Firestore...');
                const workouts = await this.getFirestoreWorkouts({ page, pageSize, search, tags });
                console.log('🔍 DEBUG: Got workouts from Firestore:', workouts.length);
                if (window.mobileDebugLog) window.mobileDebugLog('API: Got ' + workouts.length + ' from Firestore');
                return workouts;
            } else {
                console.log('🔍 DEBUG: Will fetch from localStorage (fbUser:', !!fbUser, 'isOnline:', this.isOnline, ')');
                if (window.mobileDebugLog) window.mobileDebugLog('API: Using localStorage (no user or offline)');
                const workouts = this.getLocalStorageWorkouts({ page, pageSize, search, tags });
                console.log('🔍 DEBUG: Got workouts from localStorage:', workouts.length);
                if (window.mobileDebugLog) window.mobileDebugLog('API: Got ' + workouts.length + ' from localStorage');
                return workouts;
            }
        } catch (error) {
            console.error('❌ ERROR in getWorkouts:', error.message);
            console.error('❌ Error stack:', error.stack);
            if (window.mobileDebugLog) window.mobileDebugLog('❌ API ERROR: ' + error.message);
            // Fallback to localStorage
            const workouts = this.getLocalStorageWorkouts({ page, pageSize, search, tags });
            console.log('🔍 DEBUG: FALLBACK to localStorage workouts:', workouts.length);
            if (window.mobileDebugLog) window.mobileDebugLog('❌ FALLBACK: Got ' + workouts.length + ' from localStorage');
            return workouts;
        }
    },

    async getFirestoreWorkouts(options = {}) {
        const { page = 1, pageSize = 50, search = null, tags = null } = options;

        const params = new URLSearchParams({
            page: page.toString(),
            page_size: pageSize.toString()
        });

        if (search) {
            params.append('search', search);
        }

        if (tags && tags.length > 0) {
            tags.forEach(tag => params.append('tags', tag));
        }

        // Use centralized API config
        // Note: No trailing slash needed - FastAPI has redirect_slashes=False
        const url = window.config.api.getUrl(`/api/v3/firebase/workouts?${params}`);

        // Use deduplicated fetch
        return this.deduplicatedFetch(url, async () => {
            console.log('🔍 DEBUG: Fetching workouts from:', url);
            console.log('🔍 DEBUG: Current protocol:', window.location.protocol);
            console.log('🔍 DEBUG: Current origin:', window.location.origin);

            try {
                // Log UID at API call time (critical for mobile debugging)
                const fbUser = this.getFirebaseUser();
                const uid = fbUser?.uid || 'NULL';
                const email = fbUser?.email || 'NULL';
                console.log('🔍 DEBUG: API call user - UID:', uid, 'Email:', email);
                if (window.mobileDebugLog) window.mobileDebugLog('📱 API USER: ' + email + ' UID:' + uid.substring(0, 8));

                const token = await this.getAuthToken();
                const tokenPreview = token ? token.substring(0, 20) + '...' : 'NO TOKEN';
                console.log('🔍 DEBUG: Token preview:', tokenPreview);
                if (window.mobileDebugLog) window.mobileDebugLog('Token: ' + tokenPreview);

                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                console.log('🔍 DEBUG: Response status:', response.status);
                if (window.mobileDebugLog) window.mobileDebugLog('Response status: ' + response.status);

                if (!response.ok) {
                    const errorText = await response.text().catch(() => 'No error details');
                    console.error('❌ API Error Response:', {
                        status: response.status,
                        statusText: response.statusText,
                        url: url,
                        errorText: errorText
                    });
                    if (window.mobileDebugLog) window.mobileDebugLog('❌ API Error: ' + response.status + ' ' + errorText.substring(0, 50));
                    throw new Error(`Failed to fetch workouts: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                console.log('✅ Successfully fetched workouts:', data.workouts?.length || 0);
                console.log('🔍 DEBUG: Full response:', JSON.stringify(data).substring(0, 200));
                if (window.mobileDebugLog) window.mobileDebugLog('API returned: ' + (data.workouts?.length || 0) + ' workouts');
                return data.workouts || [];

            } catch (error) {
                console.error('❌ Fetch Error Details:', {
                    message: error.message,
                    name: error.name,
                    url: url,
                    protocol: window.location.protocol,
                    origin: window.location.origin,
                    isSSLError: error.message.includes('SSL') || error.message.includes('ERR_SSL')
                });

                // Provide helpful error message for SSL issues
                if (error.message.includes('SSL') || error.message.includes('ERR_SSL')) {
                    console.error('💡 SSL Error detected - this usually means:');
                    console.error('   1. Trying to use HTTPS on localhost (should use HTTP)');
                    console.error('   2. Mixed content (HTTP page trying HTTPS resource)');
                    console.error('   3. Invalid SSL certificate');
                }

                throw error;
            }
        });
    },

    getLocalStorageWorkouts(options = {}) {
        const { page = 1, pageSize = 50, search = null, tags = null } = options;

        try {
            const stored = localStorage.getItem('gym_workouts');
            let workouts = stored ? JSON.parse(stored) : [];

            // Apply search filter
            if (search) {
                const searchLower = search.toLowerCase();
                workouts = workouts.filter(workout =>
                    workout.name.toLowerCase().includes(searchLower) ||
                    workout.description.toLowerCase().includes(searchLower) ||
                    (workout.tags && workout.tags.some(tag => tag.toLowerCase().includes(searchLower)))
                );
            }

            // Apply tag filter
            if (tags && tags.length > 0) {
                workouts = workouts.filter(workout =>
                    workout.tags && tags.some(tag => workout.tags.includes(tag))
                );
            }

            // Apply pagination
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;

            return workouts.slice(startIndex, endIndex);
        } catch (error) {
            console.error('❌ Error getting local workouts:', error);
            return [];
        }
    },

    async createWorkout(workoutData) {
        try {
            if (this.getFirebaseUser() && this.isOnline) {
                return await this.createFirestoreWorkout(workoutData);
            } else {
                return this.createLocalStorageWorkout(workoutData);
            }
        } catch (error) {
            console.error('❌ Error creating workout:', error);
            // Only fall back to localStorage for anonymous users
            if (this.getFirebaseUser()) {
                throw error;
            }
            return this.createLocalStorageWorkout(workoutData);
        }
    },

    async createFirestoreWorkout(workoutData) {
        try {
            const url = window.config.api.getUrl('/api/v3/firebase/workouts');
            console.log('🔍 DEBUG: Creating workout at:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify(workoutData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Firestore workout creation failed:', errorData);
                throw new Error(errorData.detail || 'Failed to create workout in Firestore');
            }

            const workout = await response.json();
            console.log('✅ Workout created in Firestore:', workout.name);
            return workout;
        } catch (error) {
            console.error('❌ Error creating Firestore workout:', error);
            throw error;
        }
    },

    createLocalStorageWorkout(workoutData) {
        try {
            // Get all existing workouts from localStorage
            const stored = localStorage.getItem('gym_workouts');
            const workouts = stored ? JSON.parse(stored) : [];

            // Create new workout with ID
            const newWorkout = {
                id: `workout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                ...workoutData,
                created_date: new Date().toISOString(),
                modified_date: new Date().toISOString(),
                is_template: true
            };

            workouts.unshift(newWorkout);
            localStorage.setItem('gym_workouts', JSON.stringify(workouts));

            console.log('✅ Workout created in localStorage:', newWorkout.name);
            return newWorkout;
        } catch (error) {
            console.error('❌ Error creating local workout:', error);
            throw error;
        }
    },

    async updateWorkout(workoutId, workoutData) {
        try {
            if (this.getFirebaseUser() && this.isOnline) {
                return await this.updateFirestoreWorkout(workoutId, workoutData);
            } else {
                return this.updateLocalStorageWorkout(workoutId, workoutData);
            }
        } catch (error) {
            console.error('❌ Error updating workout:', error);
            // Only fall back to localStorage for anonymous users
            if (!this.getFirebaseUser()) {
                return this.updateLocalStorageWorkout(workoutId, workoutData);
            }
            throw error;
        }
    },

    async updateFirestoreWorkout(workoutId, workoutData) {
        try {
            const url = window.config.api.getUrl(`/api/v3/firebase/workouts/${workoutId}`);
            console.log('🔍 DEBUG: Updating workout at:', url);

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify(workoutData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Firestore workout update failed:', errorData);

                // Enhanced logging for 422 validation errors
                if (response.status === 422) {
                    console.error('🔍 422 VALIDATION ERROR DETAILS:');
                    console.error('   Status:', response.status, response.statusText);
                    console.error('   Error Data:', JSON.stringify(errorData, null, 2));

                    // Log detailed validation errors if available
                    if (errorData.detail && Array.isArray(errorData.detail)) {
                        console.error('   Validation Errors:');
                        errorData.detail.forEach((err, index) => {
                            console.error(`   ${index + 1}. Field: ${err.loc?.join('.') || 'unknown'}`);
                            console.error(`      Type: ${err.type}`);
                            console.error(`      Message: ${err.msg}`);
                        });
                    }
                }

                throw new Error(errorData.detail || 'Failed to update workout in Firestore');
            }

            const workout = await response.json();
            console.log('✅ Workout updated in Firestore:', workout.name);
            return workout;
        } catch (error) {
            console.error('❌ Error updating Firestore workout:', error);
            throw error;
        }
    },

    /**
     * Toggle workout favorite status
     * @param {string} workoutId - The workout ID
     * @param {boolean} isFavorite - New favorite state
     * @returns {Promise<Object>} Updated workout
     */
    async toggleWorkoutFavorite(workoutId, isFavorite) {
        console.log(`⭐ Toggling favorite for ${workoutId}: ${isFavorite}`);

        const update = {
            is_favorite: isFavorite,
            favorited_at: isFavorite ? new Date().toISOString() : null
        };

        return this.updateWorkout(workoutId, update);
    },

    updateLocalStorageWorkout(workoutId, workoutData) {
        try {
            // Get all existing workouts from localStorage
            const stored = localStorage.getItem('gym_workouts');
            const workouts = stored ? JSON.parse(stored) : [];

            // Find and update the workout
            const index = workouts.findIndex(w => w.id === workoutId);
            if (index === -1) {
                throw new Error('Workout not found');
            }

            // Update workout while preserving ID and created_date
            const updatedWorkout = {
                ...workouts[index],
                ...workoutData,
                id: workoutId,
                created_date: workouts[index].created_date,
                modified_date: new Date().toISOString()
            };

            workouts[index] = updatedWorkout;
            localStorage.setItem('gym_workouts', JSON.stringify(workouts));

            console.log('✅ Workout updated in localStorage:', updatedWorkout.name);
            return updatedWorkout;
        } catch (error) {
            console.error('❌ Error updating local workout:', error);
            throw error;
        }
    },

    async deleteWorkout(workoutId) {
        try {
            if (this.getFirebaseUser() && this.isOnline) {
                return await this.deleteFirestoreWorkout(workoutId);
            } else {
                return this.deleteLocalStorageWorkout(workoutId);
            }
        } catch (error) {
            console.error('❌ Error deleting workout:', error);
            // Fallback to localStorage
            return this.deleteLocalStorageWorkout(workoutId);
        }
    },

    async deleteFirestoreWorkout(workoutId) {
        try {
            const url = window.config.api.getUrl(`/api/v3/firebase/workouts/${workoutId}`);
            console.log('🔍 DEBUG: Deleting workout at:', url);

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Firestore workout deletion failed:', errorData);
                throw new Error(errorData.detail || 'Failed to delete workout from Firestore');
            }

            console.log('✅ Workout deleted from Firestore');
            return true;
        } catch (error) {
            console.error('❌ Error deleting Firestore workout:', error);
            throw error;
        }
    },

    deleteLocalStorageWorkout(workoutId) {
        try {
            // Soft-delete: mark as archived in localStorage
            const stored = localStorage.getItem('gym_workouts');
            const workouts = stored ? JSON.parse(stored) : [];

            const workout = workouts.find(w => w.id === workoutId);
            if (!workout) {
                throw new Error('Workout not found');
            }

            workout.is_archived = true;
            workout.archived_at = new Date().toISOString();
            workout.modified_date = new Date().toISOString();
            localStorage.setItem('gym_workouts', JSON.stringify(workouts));

            console.log('✅ Workout archived in localStorage');
            return true;
        } catch (error) {
            console.error('❌ Error archiving local workout:', error);
            throw error;
        }
    },

    /**
     * Restore an archived workout
     */
    async restoreWorkout(workoutId) {
        try {
            if (this.getFirebaseUser() && this.isOnline) {
                return await this.restoreFirestoreWorkout(workoutId);
            } else {
                return this.restoreLocalStorageWorkout(workoutId);
            }
        } catch (error) {
            console.error('❌ Error restoring workout:', error);
            return this.restoreLocalStorageWorkout(workoutId);
        }
    },

    async restoreFirestoreWorkout(workoutId) {
        try {
            const url = window.config.api.getUrl(`/api/v3/firebase/workouts/${workoutId}/restore`);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to restore workout');
            }

            console.log('✅ Workout restored from Firestore');
            return true;
        } catch (error) {
            console.error('❌ Error restoring Firestore workout:', error);
            throw error;
        }
    },

    restoreLocalStorageWorkout(workoutId) {
        try {
            const stored = localStorage.getItem('gym_workouts');
            const workouts = stored ? JSON.parse(stored) : [];

            const workout = workouts.find(w => w.id === workoutId);
            if (!workout) {
                throw new Error('Workout not found');
            }

            workout.is_archived = false;
            workout.archived_at = null;
            workout.modified_date = new Date().toISOString();
            localStorage.setItem('gym_workouts', JSON.stringify(workouts));

            console.log('✅ Workout restored in localStorage');
            return true;
        } catch (error) {
            console.error('❌ Error restoring local workout:', error);
            throw error;
        }
    },

    /**
     * Permanently delete a workout (no recovery)
     */
    async permanentDeleteWorkout(workoutId) {
        try {
            if (this.getFirebaseUser() && this.isOnline) {
                return await this.permanentDeleteFirestoreWorkout(workoutId);
            } else {
                return this.permanentDeleteLocalStorageWorkout(workoutId);
            }
        } catch (error) {
            console.error('❌ Error permanently deleting workout:', error);
            return this.permanentDeleteLocalStorageWorkout(workoutId);
        }
    },

    async permanentDeleteFirestoreWorkout(workoutId) {
        try {
            const url = window.config.api.getUrl(`/api/v3/firebase/workouts/${workoutId}/permanent`);
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to permanently delete workout');
            }

            console.log('✅ Workout permanently deleted from Firestore');
            return true;
        } catch (error) {
            console.error('❌ Error permanently deleting Firestore workout:', error);
            throw error;
        }
    },

    permanentDeleteLocalStorageWorkout(workoutId) {
        try {
            const stored = localStorage.getItem('gym_workouts');
            const workouts = stored ? JSON.parse(stored) : [];

            const index = workouts.findIndex(w => w.id === workoutId);
            if (index === -1) {
                throw new Error('Workout not found');
            }

            workouts.splice(index, 1);
            localStorage.setItem('gym_workouts', JSON.stringify(workouts));

            console.log('✅ Workout permanently deleted from localStorage');
            return true;
        } catch (error) {
            console.error('❌ Error permanently deleting local workout:', error);
            throw error;
        }
    }
};

// Export for mixin application
window.DataManagerWorkoutOps = DataManagerWorkoutOps;

console.log('📦 DataManagerWorkoutOps loaded');
