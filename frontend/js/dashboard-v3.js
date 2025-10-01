// Ghost Gym V3 Dashboard JavaScript - Phase 2 Enhanced

class GymDashboardV3 {
    constructor() {
        this.apiBase = '';  // Same origin
        this.currentProgram = null;
        this.programs = [];
        this.workouts = [];
        this.isEditing = false;
        this.editingId = null;
        this.dataManager = null;
        this.syncManager = null;
        this.isAuthenticated = false;
        this.currentUser = null;
        
        // Initialize the dashboard
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupSortable();
        
        // Wait for data manager to be ready
        await this.waitForDataManager();
        
        await this.loadInitialData();
        this.updateUI();
        this.showAlert('Dashboard loaded successfully!', 'success');
    }
    
    async waitForDataManager() {
        // Wait for data manager to be available
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (!window.dataManager && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.dataManager) {
            this.dataManager = window.dataManager;
            this.syncManager = window.syncManager;
            
            // Listen for auth state changes
            window.addEventListener('authStateChanged', (event) => {
                this.handleAuthStateChange(event.detail);
            });
            
            console.log('✅ Dashboard connected to data manager');
        } else {
            console.warn('⚠️ Data manager not available - using fallback mode');
        }
    }
    
    handleAuthStateChange(authData) {
        const { user, isAuthenticated } = authData;
        this.isAuthenticated = isAuthenticated;
        this.currentUser = user;
        
        console.log(`🔄 Dashboard auth state changed: ${isAuthenticated ? 'authenticated' : 'anonymous'}`);
        
        // Reload data when auth state changes
        this.loadInitialData();
        
        // Update UI to show sync status
        this.updateAuthUI();
    }
    
    updateAuthUI() {
        // Add sync status indicator if authenticated
        if (this.isAuthenticated && window.migrationUI) {
            window.migrationUI.addSyncStatusIndicator();
        }
    }

    setupEventListeners() {
        // Program management
        document.getElementById('newProgramBtn').addEventListener('click', () => this.showProgramModal());
        document.getElementById('createFirstProgramBtn').addEventListener('click', () => this.showProgramModal());
        document.getElementById('saveProgramBtn').addEventListener('click', () => this.saveProgram());
        document.getElementById('editProgramBtn').addEventListener('click', () => this.editCurrentProgram());
        document.getElementById('previewProgramBtn').addEventListener('click', () => this.previewProgram());
        document.getElementById('generateProgramBtn').addEventListener('click', () => this.showGenerateModal());

        // Workout management
        document.getElementById('newWorkoutBtn').addEventListener('click', () => this.showWorkoutModal());
        document.getElementById('createFirstWorkoutBtn').addEventListener('click', () => this.showWorkoutModal());
        document.getElementById('saveWorkoutBtn').addEventListener('click', () => this.saveWorkout());
        document.getElementById('addExerciseGroupBtn').addEventListener('click', () => this.addExerciseGroup());
        document.getElementById('addBonusExerciseBtn').addEventListener('click', () => this.addBonusExercise());

        // Search functionality
        document.getElementById('programSearch').addEventListener('input', (e) => this.searchPrograms(e.target.value));
        document.getElementById('workoutSearch').addEventListener('input', (e) => this.searchWorkouts(e.target.value));

        // Generation and preview
        document.getElementById('confirmGenerateBtn').addEventListener('click', () => this.generateDocument());
        document.getElementById('generateFromPreviewBtn').addEventListener('click', () => this.showGenerateModal());

        // Data management
        document.getElementById('backupBtn').addEventListener('click', () => this.backupData());
        document.getElementById('importBtn').addEventListener('click', () => this.importData());

        // Modal events
        document.getElementById('programModal').addEventListener('hidden.bs.modal', () => this.resetProgramForm());
        document.getElementById('workoutModal').addEventListener('hidden.bs.modal', () => this.resetWorkoutForm());

        // Set default date
        document.getElementById('startDate').value = new Date().toISOString().split('T')[0];
    }

    setupSortable() {
        // Make program workouts sortable
        const programWorkoutsElement = document.getElementById('programWorkouts');
        if (programWorkoutsElement) {
            new Sortable(programWorkoutsElement, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onEnd: (evt) => this.reorderProgramWorkouts(evt)
            });
        }
    }

    async loadInitialData() {
        try {
            // Load programs and workouts
            await Promise.all([
                this.loadPrograms(),
                this.loadWorkouts(),
                this.loadStats()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showAlert('Error loading data. Some features may not work properly.', 'warning');
        }
    }

    async loadPrograms() {
        try {
            if (this.dataManager) {
                // Use data manager for unified storage
                this.programs = await this.dataManager.getPrograms();
            } else {
                // Fallback to direct API call
                const endpoint = this.isAuthenticated ? '/api/v3/user/programs' : '/api/v3/programs';
                const headers = {};
                
                if (this.isAuthenticated && this.currentUser) {
                    const token = await this.currentUser.getIdToken();
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                const response = await fetch(`${this.apiBase}${endpoint}`, { headers });
                const data = await response.json();
                this.programs = data.programs || [];
            }
            
            this.renderPrograms();
        } catch (error) {
            console.error('Error loading programs:', error);
            this.programs = [];
        }
    }

    async loadWorkouts() {
        try {
            if (this.dataManager) {
                // Use data manager for unified storage
                this.workouts = await this.dataManager.getWorkouts();
            } else {
                // Fallback to direct API call
                const endpoint = this.isAuthenticated ? '/api/v3/user/workouts' : '/api/v3/workouts';
                const headers = {};
                
                if (this.isAuthenticated && this.currentUser) {
                    const token = await this.currentUser.getIdToken();
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                const response = await fetch(`${this.apiBase}${endpoint}`, { headers });
                const data = await response.json();
                this.workouts = data.workouts || [];
            }
            
            this.renderWorkouts();
        } catch (error) {
            console.error('Error loading workouts:', error);
            this.workouts = [];
        }
    }

    async loadStats() {
        try {
            if (this.dataManager) {
                // Use data manager for unified stats
                const stats = await this.getUnifiedStats();
                document.getElementById('statsDisplay').textContent =
                    `${stats.total_programs} programs • ${stats.total_workouts} workouts`;
            } else {
                // Fallback to direct API call
                const endpoint = this.isAuthenticated ? '/api/v3/user/stats' : '/api/v3/stats';
                const headers = {};
                
                if (this.isAuthenticated && this.currentUser) {
                    const token = await this.currentUser.getIdToken();
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                const response = await fetch(`${this.apiBase}${endpoint}`, { headers });
                const data = await response.json();
                document.getElementById('statsDisplay').textContent =
                    `${data.total_programs} programs • ${data.total_workouts} workouts`;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            document.getElementById('statsDisplay').textContent = 'Stats unavailable';
        }
    }
    
    async getUnifiedStats() {
        try {
            const endpoint = this.isAuthenticated ? '/api/v3/user/stats' : '/api/v3/stats';
            const headers = {};
            
            if (this.isAuthenticated && this.currentUser) {
                const token = await this.currentUser.getIdToken();
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${this.apiBase}${endpoint}`, { headers });
            return await response.json();
        } catch (error) {
            console.error('Error getting unified stats:', error);
            return { total_programs: 0, total_workouts: 0 };
        }
    }

    updateUI() {
        const hasPrograms = this.programs.length > 0;
        const hasWorkouts = this.workouts.length > 0;

        // Show/hide welcome panel
        const welcomePanel = document.getElementById('welcomePanel');
        const programDetailsPanel = document.getElementById('programDetailsPanel');

        if (!hasPrograms && !hasWorkouts) {
            welcomePanel.classList.remove('d-none');
            programDetailsPanel.classList.add('d-none');
        } else if (!this.currentProgram) {
            welcomePanel.classList.remove('d-none');
            programDetailsPanel.classList.add('d-none');
        } else {
            welcomePanel.classList.add('d-none');
            programDetailsPanel.classList.remove('d-none');
        }
    }

    renderPrograms() {
        const container = document.getElementById('programsList');
        
        if (this.programs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-folder2"></i>
                    <h6>No Programs Yet</h6>
                    <p>Create your first program to get started</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.programs.map(program => `
            <div class="program-item ${this.currentProgram?.id === program.id ? 'active' : ''}" 
                 data-program-id="${program.id}">
                <div class="program-name">${this.escapeHtml(program.name)}</div>
                <div class="program-meta">
                    <span>${program.workouts?.length || 0} workouts</span>
                    <span>${program.difficulty_level || 'intermediate'}</span>
                </div>
                <div class="program-actions">
                    <button class="btn btn-sm btn-outline-secondary" onclick="dashboard.duplicateProgram('${program.id}')" title="Duplicate">
                        <i class="bi bi-files"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="dashboard.deleteProgram('${program.id}')" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add click listeners
        container.querySelectorAll('.program-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.program-actions')) {
                    this.selectProgram(item.dataset.programId);
                }
            });
        });
    }

    renderWorkouts() {
        const container = document.getElementById('workoutsList');
        
        if (this.workouts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-collection"></i>
                    <h6>No Workouts Yet</h6>
                    <p>Create workout templates to build programs</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.workouts.map(workout => `
            <div class="workout-item" data-workout-id="${workout.id}" draggable="true">
                <div class="workout-name">${this.escapeHtml(workout.name)}</div>
                <div class="workout-meta">
                    <span>${workout.exercise_groups?.length || 0} groups</span>
                    <span>${workout.bonus_exercises?.length || 0} bonus</span>
                </div>
                ${workout.tags && workout.tags.length > 0 ? `
                    <div class="workout-tags">
                        ${workout.tags.map(tag => `<span class="workout-tag">${this.escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="workout-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="dashboard.editWorkout('${workout.id}')" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="dashboard.duplicateWorkout('${workout.id}')" title="Duplicate">
                        <i class="bi bi-files"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="dashboard.deleteWorkout('${workout.id}')" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add drag and drop listeners
        this.setupWorkoutDragDrop();
    }

    setupWorkoutDragDrop() {
        const workoutItems = document.querySelectorAll('.workout-item');
        const programWorkouts = document.getElementById('programWorkouts');

        workoutItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.dataset.workoutId);
                e.dataTransfer.effectAllowed = 'copy';
            });
        });

        if (programWorkouts) {
            programWorkouts.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                programWorkouts.classList.add('sortable-drag-over');
            });

            programWorkouts.addEventListener('dragleave', (e) => {
                if (!programWorkouts.contains(e.relatedTarget)) {
                    programWorkouts.classList.remove('sortable-drag-over');
                }
            });

            programWorkouts.addEventListener('drop', (e) => {
                e.preventDefault();
                programWorkouts.classList.remove('sortable-drag-over');
                const workoutId = e.dataTransfer.getData('text/plain');
                if (workoutId && this.currentProgram) {
                    this.addWorkoutToProgram(workoutId);
                }
            });
        }
    }

    async selectProgram(programId) {
        try {
            const response = await fetch(`${this.apiBase}/api/v3/programs/${programId}/details`);
            const data = await response.json();
            
            this.currentProgram = data.program;
            this.currentProgramWorkouts = data.workout_details;
            
            this.renderPrograms(); // Update active state
            this.renderProgramDetails();
            this.updateUI();
        } catch (error) {
            console.error('Error loading program details:', error);
            this.showAlert('Error loading program details', 'danger');
        }
    }

    renderProgramDetails() {
        if (!this.currentProgram) return;

        // Update program info
        document.getElementById('programDetailsTitle').innerHTML = `
            <i class="bi bi-folder2-open me-2"></i>
            ${this.escapeHtml(this.currentProgram.name)}
        `;

        document.getElementById('programInfo').innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <h6 class="text-primary-v3">${this.escapeHtml(this.currentProgram.name)}</h6>
                    <p class="text-muted-v3 mb-2">${this.escapeHtml(this.currentProgram.description || 'No description')}</p>
                    <div class="d-flex gap-3 text-sm">
                        <span><i class="bi bi-calendar3 me-1"></i>${this.currentProgram.duration_weeks || 'N/A'} weeks</span>
                        <span><i class="bi bi-speedometer2 me-1"></i>${this.currentProgram.difficulty_level || 'intermediate'}</span>
                        <span><i class="bi bi-collection me-1"></i>${this.currentProgram.workouts?.length || 0} workouts</span>
                    </div>
                </div>
                <div class="col-md-4 text-md-end">
                    <small class="text-muted-v3">
                        Created: ${new Date(this.currentProgram.created_date).toLocaleDateString()}
                    </small>
                </div>
            </div>
        `;

        // Render program workouts
        this.renderProgramWorkouts();
    }

    renderProgramWorkouts() {
        const container = document.getElementById('programWorkouts');
        
        if (!this.currentProgram?.workouts || this.currentProgram.workouts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-plus-circle"></i>
                    <h6>No Workouts in Program</h6>
                    <p>Drag workouts from the library or create new ones</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.currentProgram.workouts.map((programWorkout, index) => {
            const workout = this.currentProgramWorkouts?.find(w => w.id === programWorkout.workout_id);
            if (!workout) return '';

            return `
                <div class="program-workout-item" data-workout-id="${programWorkout.workout_id}">
                    <div class="workout-order">${index + 1}</div>
                    <div class="workout-name">
                        ${this.escapeHtml(programWorkout.custom_name || workout.name)}
                    </div>
                    <div class="workout-details">
                        ${workout.exercise_groups?.length || 0} exercise groups • 
                        ${workout.bonus_exercises?.length || 0} bonus exercises
                        ${programWorkout.custom_date ? ` • ${programWorkout.custom_date}` : ''}
                    </div>
                    <div class="workout-actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="dashboard.editProgramWorkout('${programWorkout.workout_id}')" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="dashboard.removeWorkoutFromProgram('${programWorkout.workout_id}')" title="Remove">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Program Management Methods
    showProgramModal(program = null) {
        this.isEditing = !!program;
        this.editingId = program?.id || null;

        const modal = new bootstrap.Modal(document.getElementById('programModal'));
        const title = document.getElementById('programModalTitle');
        const saveBtn = document.getElementById('saveProgramBtn');

        title.textContent = this.isEditing ? 'Edit Program' : 'Create Program';
        saveBtn.textContent = this.isEditing ? 'Update Program' : 'Create Program';

        if (program) {
            document.getElementById('programName').value = program.name;
            document.getElementById('programDescription').value = program.description || '';
            document.getElementById('programDuration').value = program.duration_weeks || '';
            document.getElementById('programDifficulty').value = program.difficulty_level || 'intermediate';
            document.getElementById('programTags').value = program.tags?.join(', ') || '';
        }

        modal.show();
    }

    async saveProgram() {
        const form = document.getElementById('programForm');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        const programData = {
            name: document.getElementById('programName').value.trim(),
            description: document.getElementById('programDescription').value.trim(),
            duration_weeks: parseInt(document.getElementById('programDuration').value) || null,
            difficulty_level: document.getElementById('programDifficulty').value,
            tags: document.getElementById('programTags').value.split(',').map(t => t.trim()).filter(t => t)
        };

        try {
            let program;
            
            if (this.dataManager) {
                // Use data manager for unified storage (Firebase or localStorage)
                if (this.isEditing) {
                    // For editing, we need to call the API directly since data manager doesn't have update method
                    const url = `${this.apiBase}/api/v3/programs/${this.editingId}`;
                    const response = await fetch(url, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(programData)
                    });
                    
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.detail || 'Failed to update program');
                    }
                    
                    program = await response.json();
                } else {
                    // Use data manager for creating new programs
                    program = await this.dataManager.createProgram(programData);
                }
            } else {
                // Fallback to direct API call
                const url = this.isEditing
                    ? `${this.apiBase}/api/v3/programs/${this.editingId}`
                    : `${this.apiBase}/api/v3/programs`;
                
                const method = this.isEditing ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(programData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to save program');
                }
                
                program = await response.json();
            }

            // Update local state
            if (this.isEditing) {
                const index = this.programs.findIndex(p => p.id === this.editingId);
                if (index !== -1) {
                    this.programs[index] = program;
                }
                if (this.currentProgram?.id === this.editingId) {
                    this.currentProgram = program;
                }
            } else {
                this.programs.unshift(program);
            }

            this.renderPrograms();
            if (this.currentProgram?.id === program.id) {
                this.renderProgramDetails();
            }
            
            bootstrap.Modal.getInstance(document.getElementById('programModal')).hide();
            this.showAlert(`Program ${this.isEditing ? 'updated' : 'created'} successfully!`, 'success');
            this.loadStats();
            
        } catch (error) {
            console.error('Error saving program:', error);
            this.showAlert(`Error ${this.isEditing ? 'updating' : 'creating'} program: ${error.message}`, 'danger');
        }
    }

    editCurrentProgram() {
        if (this.currentProgram) {
            this.showProgramModal(this.currentProgram);
        }
    }

    async deleteProgram(programId) {
        if (!confirm('Are you sure you want to delete this program? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/api/v3/programs/${programId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.programs = this.programs.filter(p => p.id !== programId);
                
                if (this.currentProgram?.id === programId) {
                    this.currentProgram = null;
                    this.currentProgramWorkouts = null;
                }

                this.renderPrograms();
                this.updateUI();
                this.showAlert('Program deleted successfully!', 'success');
                this.loadStats();
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to delete program');
            }
        } catch (error) {
            console.error('Error deleting program:', error);
            this.showAlert(`Error deleting program: ${error.message}`, 'danger');
        }
    }

    // Workout Management Methods
    showWorkoutModal(workout = null) {
        this.isEditing = !!workout;
        this.editingId = workout?.id || null;

        const modal = new bootstrap.Modal(document.getElementById('workoutModal'));
        const title = document.getElementById('workoutModalTitle');
        const saveBtn = document.getElementById('saveWorkoutBtn');

        title.textContent = this.isEditing ? 'Edit Workout' : 'Create Workout';
        saveBtn.textContent = this.isEditing ? 'Update Workout' : 'Create Workout';

        if (workout) {
            document.getElementById('workoutName').value = workout.name;
            document.getElementById('workoutDescription').value = workout.description || '';
            document.getElementById('workoutTags').value = workout.tags?.join(', ') || '';
            
            // Populate exercise groups and bonus exercises
            this.populateWorkoutForm(workout);
        } else {
            // Add default exercise group
            this.clearWorkoutForm();
            this.addExerciseGroup();
        }

        modal.show();
    }

    populateWorkoutForm(workout) {
        // Clear existing groups
        document.getElementById('exerciseGroups').innerHTML = '';
        document.getElementById('bonusExercises').innerHTML = '';

        // Add exercise groups
        workout.exercise_groups?.forEach(group => {
            this.addExerciseGroup(group);
        });

        // Add bonus exercises
        workout.bonus_exercises?.forEach(bonus => {
            this.addBonusExercise(bonus);
        });
    }

    clearWorkoutForm() {
        document.getElementById('exerciseGroups').innerHTML = '';
        document.getElementById('bonusExercises').innerHTML = '';
    }

    addExerciseGroup(groupData = null) {
        const container = document.getElementById('exerciseGroups');
        const groupIndex = container.children.length;
        
        const groupHtml = `
            <div class="exercise-group" data-group-index="${groupIndex}">
                <div class="exercise-group-header">
                    <h6 class="exercise-group-title">Exercise Group ${groupIndex + 1}</h6>
                    <button type="button" class="btn btn-sm btn-outline-danger remove-group-btn" onclick="this.closest('.exercise-group').remove()">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                
                <div class="exercise-inputs">
                    ${['a', 'b', 'c'].map(letter => `
                        <div class="exercise-input-row">
                            <div class="exercise-letter">${letter.toUpperCase()}</div>
                            <input type="text" class="form-control" placeholder="Exercise name" 
                                   value="${groupData?.exercises?.[letter] || ''}" data-exercise="${letter}">
                        </div>
                    `).join('')}
                </div>
                
                <div class="row mt-3">
                    <div class="col-md-4">
                        <label class="form-label">Sets</label>
                        <input type="text" class="form-control" placeholder="3" 
                               value="${groupData?.sets || '3'}" data-field="sets">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Reps</label>
                        <input type="text" class="form-control" placeholder="8-12" 
                               value="${groupData?.reps || '8-12'}" data-field="reps">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Rest</label>
                        <input type="text" class="form-control" placeholder="60s" 
                               value="${groupData?.rest || '60s'}" data-field="rest">
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', groupHtml);
    }

    addBonusExercise(bonusData = null) {
        const container = document.getElementById('bonusExercises');
        const bonusIndex = container.children.length;
        
        const bonusHtml = `
            <div class="bonus-exercise" data-bonus-index="${bonusIndex}">
                <div class="bonus-exercise-header">
                    <h6 class="bonus-exercise-title">Bonus Exercise ${bonusIndex + 1}</h6>
                    <button type="button" class="btn btn-sm btn-outline-danger remove-bonus-btn" onclick="this.closest('.bonus-exercise').remove()">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label">Exercise Name</label>
                        <input type="text" class="form-control" placeholder="Bonus exercise" 
                               value="${bonusData?.name || ''}" data-field="name">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label">Sets</label>
                        <input type="text" class="form-control" placeholder="2" 
                               value="${bonusData?.sets || '2'}" data-field="sets">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label">Reps</label>
                        <input type="text" class="form-control" placeholder="15" 
                               value="${bonusData?.reps || '15'}" data-field="reps">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label">Rest</label>
                        <input type="text" class="form-control" placeholder="30s" 
                               value="${bonusData?.rest || '30s'}" data-field="rest">
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', bonusHtml);
    }

    async saveWorkout() {
        const form = document.getElementById('workoutForm');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        // Collect exercise groups
        const exerciseGroups = [];
        document.querySelectorAll('.exercise-group').forEach(group => {
            const exercises = {};
            group.querySelectorAll('[data-exercise]').forEach(input => {
                const letter = input.dataset.exercise;
                const value = input.value.trim();
                if (value) {
                    exercises[letter] = value;
                }
            });

            if (Object.keys(exercises).length > 0) {
                const sets = group.querySelector('[data-field="sets"]').value.trim() || '3';
                const reps = group.querySelector('[data-field="reps"]').value.trim() || '8-12';
                const rest = group.querySelector('[data-field="rest"]').value.trim() || '60s';

                exerciseGroups.push({
                    exercises,
                    sets,
                    reps,
                    rest
                });
            }
        });

        // Collect bonus exercises
        const bonusExercises = [];
        document.querySelectorAll('.bonus-exercise').forEach(bonus => {
            const name = bonus.querySelector('[data-field="name"]').value.trim();
            if (name) {
                const sets = bonus.querySelector('[data-field="sets"]').value.trim() || '2';
                const reps = bonus.querySelector('[data-field="reps"]').value.trim() || '15';
                const rest = bonus.querySelector('[data-field="rest"]').value.trim() || '30s';

                bonusExercises.push({
                    name,
                    sets,
                    reps,
                    rest
                });
            }
        });

        const workoutData = {
            name: document.getElementById('workoutName').value.trim(),
            description: document.getElementById('workoutDescription').value.trim(),
            exercise_groups: exerciseGroups,
            bonus_exercises: bonusExercises,
            tags: document.getElementById('workoutTags').value.split(',').map(t => t.trim()).filter(t => t)
        };

        try {
            let workout;
            
            if (this.dataManager) {
                // Use data manager for unified storage (Firebase or localStorage)
                if (this.isEditing) {
                    // For editing, we need to call the API directly since data manager doesn't have update method
                    const url = `${this.apiBase}/api/v3/workouts/${this.editingId}`;
                    const response = await fetch(url, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(workoutData)
                    });
                    
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.detail || 'Failed to update workout');
                    }
                    
                    workout = await response.json();
                } else {
                    // Use data manager for creating new workouts
                    workout = await this.dataManager.createWorkout(workoutData);
                }
            } else {
                // Fallback to direct API call
                const url = this.isEditing
                    ? `${this.apiBase}/api/v3/workouts/${this.editingId}`
                    : `${this.apiBase}/api/v3/workouts`;
                
                const method = this.isEditing ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(workoutData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to save workout');
                }
                
                workout = await response.json();
            }

            // Update local state
            if (this.isEditing) {
                const index = this.workouts.findIndex(w => w.id === this.editingId);
                if (index !== -1) {
                    this.workouts[index] = workout;
                }
            } else {
                this.workouts.unshift(workout);
            }

            this.renderWorkouts();
            bootstrap.Modal.getInstance(document.getElementById('workoutModal')).hide();
            this.showAlert(`Workout ${this.isEditing ? 'updated' : 'created'} successfully!`, 'success');
            this.loadStats();
            
        } catch (error) {
            console.error('Error saving workout:', error);
            this.showAlert(`Error ${this.isEditing ? 'updating' : 'creating'} workout: ${error.message}`, 'danger');
        }
    }

    async editWorkout(workoutId) {
        const workout = this.workouts.find(w => w.id === workoutId);
        if (workout) {
            this.showWorkoutModal(workout);
        }
    }

    async deleteWorkout(workoutId) {
        if (!confirm('Are you sure you want to delete this workout? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/api/v3/workouts/${workoutId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.workouts = this.workouts.filter(w => w.id !== workoutId);
                this.renderWorkouts();
                this.showAlert('Workout deleted successfully!', 'success');
                this.loadStats();
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to delete workout');
            }
        } catch (error) {
            console.error('Error deleting workout:', error);
            this.showAlert(`Error deleting workout: ${error.message}`, 'danger');
        }
    }

    async duplicateWorkout(workoutId) {
        const workout = this.workouts.find(w => w.id === workoutId);
        if (!workout) return;

        const newName = prompt('Enter name for duplicated workout:', `${workout.name} (Copy)`);
        if (!newName) return;

        try {
            const response = await fetch(`${this.apiBase}/api/v3/workouts/${workoutId}/duplicate?new_name=${encodeURIComponent(newName)}`, {
                method: 'POST'
            });

            if (response.ok) {
                const duplicatedWorkout = await response.json();
                this.workouts.unshift(duplicatedWorkout);
                this.renderWorkouts();
                this.showAlert('Workout duplicated successfully!', 'success');
                this.loadStats();
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to duplicate workout');
            }
        } catch (error) {
            console.error('Error duplicating workout:', error);
            this.showAlert(`Error duplicating workout: ${error.message}`, 'danger');
        }
    }

    // Program-Workout Management
    async addWorkoutToProgram(workoutId) {
        if (!this.currentProgram) return;

        try {
            const response = await fetch(`${this.apiBase}/api/v3/programs/${this.currentProgram.id}/workouts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workout_id: workoutId })
            });

            if (response.ok) {
                const updatedProgram = await response.json();
                this.currentProgram = updatedProgram;
                
                // Update the program in the list
                const index = this.programs.findIndex(p => p.id === updatedProgram.id);
                if (index !== -1) {
                    this.programs[index] = updatedProgram;
                }

                // Reload program details to get workout info
                await this.selectProgram(this.currentProgram.id);
                this.showAlert('Workout added to program!', 'success');
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to add workout to program');
            }
        } catch (error) {
            console.error('Error adding workout to program:', error);
            this.showAlert(`Error adding workout: ${error.message}`, 'danger');
        }
    }

    async removeWorkoutFromProgram(workoutId) {
        if (!this.currentProgram) return;

        try {
            const response = await fetch(`${this.apiBase}/api/v3/programs/${this.currentProgram.id}/workouts/${workoutId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Reload program details
                await this.selectProgram(this.currentProgram.id);
                this.showAlert('Workout removed from program!', 'success');
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to remove workout from program');
            }
        } catch (error) {
            console.error('Error removing workout from program:', error);
            this.showAlert(`Error removing workout: ${error.message}`, 'danger');
        }
    }

    async reorderProgramWorkouts(evt) {
        if (!this.currentProgram) return;

        const workoutOrder = Array.from(evt.to.children).map(item => item.dataset.workoutId);

        try {
            const response = await fetch(`${this.apiBase}/api/v3/programs/${this.currentProgram.id}/workouts/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workoutOrder)
            });

            if (response.ok) {
                const updatedProgram = await response.json();
                this.currentProgram = updatedProgram;
                
                // Update the program in the list
                const index = this.programs.findIndex(p => p.id === updatedProgram.id);
                if (index !== -1) {
                    this.programs[index] = updatedProgram;
                }

                this.renderProgramWorkouts();
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to reorder workouts');
            }
        } catch (error) {
            console.error('Error reordering workouts:', error);
            this.showAlert(`Error reordering workouts: ${error.message}`, 'danger');
            // Reload to reset order
            await this.selectProgram(this.currentProgram.id);
        }
    }

    // Preview and Generation
    async previewProgram() {
        if (!this.currentProgram) return;

        const modal = new bootstrap.Modal(document.getElementById('previewModal'));
        const loading = document.getElementById('previewLoading');
        const frame = document.getElementById('previewFrame');

        modal.show();
        loading.classList.remove('d-none');
        frame.classList.add('d-none');

        try {
            const response = await fetch(`${this.apiBase}/api/v3/programs/${this.currentProgram.id}/preview-html`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    program_id: this.currentProgram.id,
                    include_cover_page: true,
                    include_table_of_contents: true,
                    include_progress_tracking: true,
                    start_date: new Date().toISOString().split('T')[0]
                })
            });

            if (response.ok) {
                const htmlContent = await response.text();
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                
                frame.src = url;
                frame.onload = () => {
                    loading.classList.add('d-none');
                    frame.classList.remove('d-none');
                    setTimeout(() => URL.revokeObjectURL(url), 30000);
                };
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to generate preview');
            }
        } catch (error) {
            console.error('Error generating preview:', error);
            this.showAlert(`Error generating preview: ${error.message}`, 'danger');
            modal.hide();
        }
    }

    showGenerateModal() {
        if (!this.currentProgram) return;
        
        const modal = new bootstrap.Modal(document.getElementById('generateModal'));
        modal.show();
    }

    async generateDocument() {
        if (!this.currentProgram) return;

        const format = document.querySelector('input[name="format"]:checked').value;
        const startDate = document.getElementById('startDate').value;
        const includeCover = document.getElementById('includeCover').checked;
        const includeToc = document.getElementById('includeToc').checked;
        const includeProgress = document.getElementById('includeProgress').checked;

        const requestData = {
            program_id: this.currentProgram.id,
            include_cover_page: includeCover,
            include_table_of_contents: includeToc,
            include_progress_tracking: includeProgress,
            start_date: startDate
        };

        try {
            const endpoint = format === 'pdf' ? 'generate-pdf' : 'generate-html';
            const response = await fetch(`${this.apiBase}/api/v3/programs/${this.currentProgram.id}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (response.ok) {
                // Handle file download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `program_${this.currentProgram.name.replace(/\s+/g, '_')}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                bootstrap.Modal.getInstance(document.getElementById('generateModal')).hide();
                this.showAlert(`${format.toUpperCase()} document generated and downloaded successfully!`, 'success');
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to generate document');
            }
        } catch (error) {
            console.error('Error generating document:', error);
            this.showAlert(`Error generating document: ${error.message}`, 'danger');
        }
    }

    // Search functionality
    searchPrograms(query) {
        const items = document.querySelectorAll('.program-item');
        items.forEach(item => {
            const name = item.querySelector('.program-name').textContent.toLowerCase();
            const visible = name.includes(query.toLowerCase());
            item.style.display = visible ? 'block' : 'none';
        });
    }

    searchWorkouts(query) {
        const items = document.querySelectorAll('.workout-item');
        items.forEach(item => {
            const name = item.querySelector('.workout-name').textContent.toLowerCase();
            const visible = name.includes(query.toLowerCase());
            item.style.display = visible ? 'block' : 'none';
        });
    }

    // Data management
    async backupData() {
        try {
            const response = await fetch(`${this.apiBase}/api/v3/data/backup`, {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                this.showAlert(`Backup created successfully: ${result.backup_file}`, 'success');
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to create backup');
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            this.showAlert(`Error creating backup: ${error.message}`, 'danger');
        }
    }

    importData() {
        // This would typically open a file picker
        this.showAlert('Import functionality coming soon!', 'info');
    }

    // Form management
    resetProgramForm() {
        document.getElementById('programForm').reset();
        document.getElementById('programForm').classList.remove('was-validated');
        this.isEditing = false;
        this.editingId = null;
    }

    resetWorkoutForm() {
        document.getElementById('workoutForm').reset();
        document.getElementById('workoutForm').classList.remove('was-validated');
        this.clearWorkoutForm();
        this.isEditing = false;
        this.editingId = null;
    }

    // Utility methods
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-v3 alert-${type} slide-in`;
        alertDiv.innerHTML = `
            <i class="bi bi-${this.getAlertIcon(type)} me-2"></i>
            ${message}
            <button type="button" class="btn-close btn-close-white ms-auto" onclick="this.parentElement.remove()"></button>
        `;
        
        alertContainer.appendChild(alertDiv);
        
        // Auto-dismiss success and info alerts after 5 seconds
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        }
    }

    getAlertIcon(type) {
        const icons = {
            'success': 'check-circle-fill',
            'danger': 'exclamation-triangle-fill',
            'warning': 'exclamation-triangle-fill',
            'info': 'info-circle-fill'
        };
        return icons[type] || 'info-circle-fill';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new GymDashboardV3();
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+N for new program
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        window.dashboard.showProgramModal();
    }
    
    // Ctrl+Shift+N for new workout
    if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        window.dashboard.showWorkoutModal();
    }
    
    // Ctrl+P for preview (if program selected)
    if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        if (window.dashboard.currentProgram) {
            window.dashboard.previewProgram();
        }
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }
        });
    }
});