/**
 * Fitness Field Notes - Data Manager Program Operations
 * Program CRUD operations (Firestore + localStorage dual-mode)
 * Extracted from data-manager.js
 * @version 1.0.0
 */

const DataManagerProgramOps = {

    async getPrograms(options = {}) {
        const { page = 1, pageSize = 20, search = null } = options;

        console.log('🔍 DEBUG: getPrograms called with:', {
            hasUser: !!this.currentUser,
            isOnline: this.isOnline,
            options
        });

        try {
            if (this.getFirebaseUser() && this.isOnline) {
                console.log('📡 Fetching programs from Firestore...');
                const programs = await this.getFirestorePrograms({ page, pageSize, search });
                console.log('✅ Got programs from Firestore:', programs.length, programs);
                return programs;
            } else {
                console.log('💾 Fetching programs from localStorage...');
                const programs = this.getLocalStoragePrograms({ page, pageSize, search });
                console.log('✅ Got programs from localStorage:', programs.length, programs);
                return programs;
            }
        } catch (error) {
            console.error('❌ Error getting programs:', error);
            // Fallback to localStorage
            const programs = this.getLocalStoragePrograms({ page, pageSize, search });
            console.log('🔍 DEBUG: Fallback to localStorage programs:', programs.length);
            return programs;
        }
    },

    async getFirestorePrograms(options = {}) {
        const { page = 1, pageSize = 20, search = null } = options;

        const params = new URLSearchParams({
            page: page.toString(),
            page_size: pageSize.toString()
        });

        if (search) {
            params.append('search', search);
        }

        // Use centralized API config
        // Note: No trailing slash needed - FastAPI has redirect_slashes=False
        const url = window.config.api.getUrl(`/api/v3/firebase/programs?${params}`);

        // Use deduplicated fetch
        return this.deduplicatedFetch(url, async () => {
            console.log('🔍 DEBUG: Fetching programs from:', url);

            const response = await this.authenticatedFetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch programs from Firestore');
            }

            const data = await response.json();
            return data.programs || [];
        });
    },

    getLocalStoragePrograms(options = {}) {
        const { page = 1, pageSize = 20, search = null } = options;

        try {
            const stored = localStorage.getItem('gym_programs');
            let programs = stored ? JSON.parse(stored) : [];

            // Apply search filter
            if (search) {
                const searchLower = search.toLowerCase();
                programs = programs.filter(program =>
                    program.name.toLowerCase().includes(searchLower) ||
                    program.description.toLowerCase().includes(searchLower) ||
                    (program.tags && program.tags.some(tag => tag.toLowerCase().includes(searchLower)))
                );
            }

            // Apply pagination
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;

            return programs.slice(startIndex, endIndex);
        } catch (error) {
            console.error('❌ Error getting local programs:', error);
            return [];
        }
    },

    async createProgram(programData) {
        try {
            if (this.getFirebaseUser() && this.isOnline) {
                return await this.createFirestoreProgram(programData);
            } else {
                return this.createLocalStorageProgram(programData);
            }
        } catch (error) {
            console.error('❌ Error creating program:', error);
            // Fallback to localStorage
            return this.createLocalStorageProgram(programData);
        }
    },

    async createFirestoreProgram(programData) {
        try {
            const url = window.config.api.getUrl('/api/v3/firebase/programs');
            console.log('🔍 DEBUG: Creating program at:', url);

            const response = await this.authenticatedFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(programData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Firestore program creation failed:', errorData);
                throw new Error(errorData.detail || 'Failed to create program in Firestore');
            }

            const program = await response.json();
            console.log('✅ Program created in Firestore:', program.name);
            return program;
        } catch (error) {
            console.error('❌ Error creating Firestore program:', error);
            throw error;
        }
    },

    createLocalStorageProgram(programData) {
        try {
            // Get all existing programs from localStorage
            const stored = localStorage.getItem('gym_programs');
            const programs = stored ? JSON.parse(stored) : [];

            // Create new program with ID
            const newProgram = {
                id: `program-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                ...programData,
                created_date: new Date().toISOString(),
                modified_date: new Date().toISOString(),
                workouts: []
            };

            programs.unshift(newProgram);
            localStorage.setItem('gym_programs', JSON.stringify(programs));

            console.log('✅ Program created in localStorage:', newProgram.name);
            return newProgram;
        } catch (error) {
            console.error('❌ Error creating local program:', error);
            throw error;
        }
    },

    async updateProgram(programId, programData) {
        try {
            if (this.getFirebaseUser() && this.isOnline) {
                return await this.updateFirestoreProgram(programId, programData);
            } else {
                return this.updateLocalStorageProgram(programId, programData);
            }
        } catch (error) {
            console.error('❌ Error updating program:', error);
            // Fallback to localStorage
            return this.updateLocalStorageProgram(programId, programData);
        }
    },

    async updateFirestoreProgram(programId, programData) {
        try {
            const url = window.config.api.getUrl(`/api/v3/firebase/programs/${programId}`);
            console.log('🔍 DEBUG: Updating program at:', url);

            const response = await this.authenticatedFetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(programData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Firestore program update failed:', errorData);
                throw new Error(errorData.detail || 'Failed to update program in Firestore');
            }

            const program = await response.json();
            console.log('✅ Program updated in Firestore:', program.name);
            return program;
        } catch (error) {
            console.error('❌ Error updating Firestore program:', error);
            throw error;
        }
    },

    updateLocalStorageProgram(programId, programData) {
        try {
            // Get all existing programs from localStorage
            const stored = localStorage.getItem('gym_programs');
            const programs = stored ? JSON.parse(stored) : [];

            // Find and update the program
            const index = programs.findIndex(p => p.id === programId);
            if (index === -1) {
                throw new Error('Program not found');
            }

            // Update program while preserving ID and created_date
            const updatedProgram = {
                ...programs[index],
                ...programData,
                id: programId,
                created_date: programs[index].created_date,
                modified_date: new Date().toISOString()
            };

            programs[index] = updatedProgram;
            localStorage.setItem('gym_programs', JSON.stringify(programs));

            console.log('✅ Program updated in localStorage:', updatedProgram.name);
            return updatedProgram;
        } catch (error) {
            console.error('❌ Error updating local program:', error);
            throw error;
        }
    },

    async deleteProgram(programId) {
        try {
            if (this.getFirebaseUser() && this.isOnline) {
                return await this.deleteFirestoreProgram(programId);
            } else {
                return this.deleteLocalStorageProgram(programId);
            }
        } catch (error) {
            console.error('❌ Error deleting program:', error);
            // Fallback to localStorage
            return this.deleteLocalStorageProgram(programId);
        }
    },

    async deleteFirestoreProgram(programId) {
        try {
            const url = window.config.api.getUrl(`/api/v3/firebase/programs/${programId}`);
            console.log('🔍 DEBUG: Deleting program at:', url);

            const response = await this.authenticatedFetch(url, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Firestore program deletion failed:', errorData);
                throw new Error(errorData.detail || 'Failed to delete program from Firestore');
            }

            console.log('✅ Program deleted from Firestore');
            return true;
        } catch (error) {
            console.error('❌ Error deleting Firestore program:', error);
            throw error;
        }
    },

    deleteLocalStorageProgram(programId) {
        try {
            // Get all existing programs from localStorage
            const stored = localStorage.getItem('gym_programs');
            const programs = stored ? JSON.parse(stored) : [];

            // Find and remove the program
            const index = programs.findIndex(p => p.id === programId);
            if (index === -1) {
                throw new Error('Program not found');
            }

            programs.splice(index, 1);
            localStorage.setItem('gym_programs', JSON.stringify(programs));

            console.log('✅ Program deleted from localStorage');
            return true;
        } catch (error) {
            console.error('❌ Error deleting local program:', error);
            throw error;
        }
    }
};

// Export for mixin application
window.DataManagerProgramOps = DataManagerProgramOps;

console.log('📦 DataManagerProgramOps loaded');
