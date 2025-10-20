/**
 * Ghost Gym Dashboard - Program Management Module
 * Handles program CRUD operations, rendering, and interactions
 * @version 1.0.0
 */

/**
 * Render programs in dropdown selector (Builder view)
 */
function renderPrograms() {
    console.log('🔍 DEBUG: renderPrograms called with', window.ghostGym.programs.length, 'programs');
    const programSelector = document.getElementById('programSelector');
    if (!programSelector) {
        console.log('❌ DEBUG: programSelector element not found!');
        return;
    }
    
    // Clear existing options except the first one
    programSelector.innerHTML = '<option value="">Select a program...</option>';
    
    // Add program options
    window.ghostGym.programs.forEach(program => {
        const option = document.createElement('option');
        option.value = program.id;
        option.textContent = `${program.name} (${program.workouts?.length || 0} workouts)`;
        if (window.ghostGym.currentProgram?.id === program.id) {
            option.selected = true;
        }
        programSelector.appendChild(option);
    });
    
    console.log('🔍 DEBUG: Rendered', window.ghostGym.programs.length, 'programs in selector');
}

/**
 * Handle program selection from dropdown
 */
function handleProgramSelection(event) {
    const programId = event.target.value;
    if (programId) {
        selectProgram(programId);
    } else {
        window.ghostGym.currentProgram = null;
        showEmptyStatePanel();
    }
}

/**
 * Select a program and show its details
 */
function selectProgram(programId) {
    const program = window.ghostGym.programs.find(p => p.id === programId);
    if (!program) return;
    
    window.ghostGym.currentProgram = program;
    
    // Update dropdown selection
    const programSelector = document.getElementById('programSelector');
    if (programSelector) {
        programSelector.value = programId;
    }
    
    // Show program details panel
    showProgramDetails(program);
    hideEmptyStatePanel();
}

/**
 * Show program details in builder view
 */
function showProgramDetails(program) {
    const detailsPanel = document.getElementById('programDetailsPanel');
    const emptyStatePanel = document.getElementById('emptyStatePanel');
    
    if (!detailsPanel) return;
    
    // Hide empty state and show details
    if (emptyStatePanel) emptyStatePanel.style.display = 'none';
    detailsPanel.style.display = 'block';
    
    // Update title
    const title = document.getElementById('programDetailsTitle');
    if (title) {
        title.innerHTML = `<i class="bx bx-folder-open me-2"></i>${escapeHtml(program.name)}`;
    }
    
    // Render program info
    const programInfo = document.getElementById('programInfo');
    if (programInfo) {
        programInfo.innerHTML = `
            <div>
                <small class="text-muted d-block mb-1">Description</small>
                <p class="mb-0">${escapeHtml(program.description || 'No description provided')}</p>
            </div>
            <div>
                <small class="text-muted d-block mb-1">Duration</small>
                <p class="mb-0">${program.duration_weeks || 0} weeks</p>
            </div>
            <div>
                <small class="text-muted d-block mb-1">Difficulty</small>
                <p class="mb-0">${program.difficulty_level || 'intermediate'}</p>
            </div>
            ${program.tags && program.tags.length > 0 ? `
                <div>
                    <small class="text-muted d-block mb-1">Tags</small>
                    <div class="workout-tags">
                        ${program.tags.map(tag => `<span class="workout-tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }
    
    // Render program workouts
    renderProgramWorkouts(program);
}

/**
 * Render program workouts as chips
 */
function renderProgramWorkouts(program) {
    const programWorkouts = document.getElementById('programWorkouts');
    if (!programWorkouts) return;
    
    if (!program.workouts || program.workouts.length === 0) {
        programWorkouts.innerHTML = `
            <div class="text-center py-3 w-100">
                <i class="bx bx-dumbbell text-muted" style="font-size: 2rem;"></i>
                <p class="text-muted mb-0 small">No workouts in this program</p>
                <small class="text-muted">Drag workouts from the library above to add them</small>
            </div>
        `;
        return;
    }
    
    programWorkouts.innerHTML = program.workouts.map((programWorkout, index) => {
        const workout = window.ghostGym.workouts.find(w => w.id === programWorkout.workout_id);
        if (!workout) return '';
        
        return `
            <div class="program-workout-chip" data-workout-id="${workout.id}" data-order="${index}">
                <i class="bx bx-menu drag-handle"></i>
                <span>${escapeHtml(programWorkout.custom_name || workout.name)}</span>
                <i class="bx bx-x remove-btn" onclick="removeWorkoutFromProgram('${program.id}', '${workout.id}')"></i>
            </div>
        `;
    }).join('');
}

/**
 * Save program (create or update)
 */
async function saveProgram() {
    try {
        const form = document.getElementById('programForm');
        if (!form) return;
        
        // Collect form data
        const programData = {
            name: document.getElementById('programName')?.value?.trim(),
            description: document.getElementById('programDescription')?.value?.trim(),
            duration_weeks: parseInt(document.getElementById('programDuration')?.value) || null,
            difficulty_level: document.getElementById('programDifficulty')?.value || 'intermediate',
            tags: document.getElementById('programTags')?.value?.split(',').map(tag => tag.trim()).filter(tag => tag) || []
        };
        
        // Validate required fields
        if (!programData.name) {
            showAlert('Program name is required', 'danger');
            return;
        }
        
        // Show loading state
        const saveBtn = document.getElementById('saveProgramBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin me-1"></i>Saving...';
        saveBtn.disabled = true;
        
        // Save using data manager
        const savedProgram = await window.dataManager.createProgram(programData);
        
        // Update local state
        window.ghostGym.programs.unshift(savedProgram);
        renderPrograms();
        renderProgramsView();
        updateStats();
        
        // Close modal and show success
        const modal = bootstrap.Modal.getInstance(document.getElementById('programModal'));
        modal.hide();
        showAlert(`Program "${savedProgram.name}" created successfully!`, 'success');
        
        // Select the new program
        selectProgram(savedProgram.id);
        
    } catch (error) {
        console.error('❌ Error saving program:', error);
        showAlert('Failed to save program: ' + error.message, 'danger');
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('saveProgramBtn');
        if (saveBtn) {
            saveBtn.innerHTML = 'Save Program';
            saveBtn.disabled = false;
        }
    }
}

/**
 * Edit current program
 */
function editCurrentProgram() {
    if (window.ghostGym.currentProgram) {
        editProgram(window.ghostGym.currentProgram.id);
    }
}

/**
 * Edit program by ID
 */
function editProgram(id) {
    const program = window.ghostGym.programs.find(p => p.id === id);
    if (!program) return;
    
    // Populate form with program data
    document.getElementById('programName').value = program.name || '';
    document.getElementById('programDescription').value = program.description || '';
    document.getElementById('programDuration').value = program.duration_weeks || '';
    document.getElementById('programDifficulty').value = program.difficulty_level || 'intermediate';
    document.getElementById('programTags').value = program.tags ? program.tags.join(', ') : '';
    
    // Update modal title
    document.getElementById('programModalTitle').textContent = 'Edit Program';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('programModal'));
    modal.show();
}

/**
 * Duplicate program
 */
function duplicateProgram(id) {
    const program = window.ghostGym.programs.find(p => p.id === id);
    if (!program) return;
    
    // Create duplicate with new name
    const duplicateData = {
        ...program,
        name: `${program.name} (Copy)`,
        id: undefined,
        created_date: undefined,
        modified_date: undefined
    };
    
    // Save duplicate
    window.dataManager.createProgram(duplicateData).then(savedProgram => {
        window.ghostGym.programs.unshift(savedProgram);
        renderPrograms();
        renderProgramsView();
        updateStats();
        showAlert(`Program duplicated as "${savedProgram.name}"`, 'success');
    }).catch(error => {
        showAlert('Failed to duplicate program: ' + error.message, 'danger');
    });
}

/**
 * Delete program
 */
function deleteProgram(id) {
    const program = window.ghostGym.programs.find(p => p.id === id);
    if (!program) return;
    
    if (confirm(`Are you sure you want to delete "${program.name}"? This action cannot be undone.`)) {
        // Remove from local state
        window.ghostGym.programs = window.ghostGym.programs.filter(p => p.id !== id);
        
        // Clear selection if this was the current program
        if (window.ghostGym.currentProgram?.id === id) {
            window.ghostGym.currentProgram = null;
            showEmptyStatePanel();
        }
        
        renderPrograms();
        renderProgramsView();
        updateStats();
        showAlert(`Program "${program.name}" deleted`, 'success');
    }
}

/**
 * Clear program form
 */
function clearProgramForm() {
    const form = document.getElementById('programForm');
    if (form) {
        form.reset();
        document.getElementById('programDifficulty').value = 'intermediate';
    }
}

/**
 * Preview program
 */
async function previewProgram() {
    if (!window.ghostGym.currentProgram) {
        showAlert('No program selected', 'warning');
        return;
    }
    
    try {
        // Show preview modal
        const modal = new bootstrap.Modal(document.getElementById('previewModal'));
        modal.show();
        
        // Show loading
        document.getElementById('previewLoading').classList.remove('d-none');
        document.getElementById('previewFrame').classList.add('d-none');
        
        // Generate preview
        const response = await fetch(getApiUrl(`/api/v3/programs/${window.ghostGym.currentProgram.id}/preview-html`), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await window.dataManager.getAuthToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate preview');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Show preview
        document.getElementById('previewLoading').classList.add('d-none');
        const frame = document.getElementById('previewFrame');
        frame.src = url;
        frame.classList.remove('d-none');
        
    } catch (error) {
        console.error('❌ Error generating preview:', error);
        showAlert('Failed to generate preview: ' + error.message, 'danger');
        document.getElementById('previewLoading').classList.add('d-none');
    }
}

/**
 * Generate program document (HTML or PDF)
 */
async function generateDocument() {
    if (!window.ghostGym.currentProgram) {
        showAlert('No program selected', 'warning');
        return;
    }
    
    try {
        // Get generation options
        const format = document.querySelector('input[name="format"]:checked')?.value || 'html';
        const startDate = document.getElementById('startDate')?.value;
        const includeCover = document.getElementById('includeCover')?.checked;
        const includeToc = document.getElementById('includeToc')?.checked;
        const includeProgress = document.getElementById('includeProgress')?.checked;
        
        console.log('🔍 DEBUG: Generation request:', {
            programId: window.ghostGym.currentProgram.id,
            format,
            startDate,
            includeCover,
            includeToc,
            includeProgress
        });
        
        // Show loading state
        const generateBtn = document.getElementById('confirmGenerateBtn');
        generateBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin me-1"></i>Generating...';
        generateBtn.disabled = true;
        
        // Prepare request body
        const requestBody = {
            program_id: window.ghostGym.currentProgram.id,
            start_date: startDate || null,
            include_cover_page: includeCover !== false,
            include_table_of_contents: includeToc !== false,
            include_progress_tracking: includeProgress !== false
        };
        
        // Get auth token
        let authToken = null;
        try {
            if (window.dataManager && window.dataManager.getAuthToken) {
                authToken = await window.dataManager.getAuthToken();
            } else if (window.authService && window.authService.getIdToken) {
                authToken = await window.authService.getIdToken();
            }
        } catch (authError) {
            console.warn('⚠️ Could not get auth token:', authError.message);
        }
        
        // Prepare headers
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        // Generate document
        const endpoint = format === 'pdf' ? 'generate-pdf' : 'generate-html';
        const url = `/api/v3/programs/${window.ghostGym.currentProgram.id}/${endpoint}`;
        
        const response = await fetch(getApiUrl(url), {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            let errorMessage = 'Failed to generate document';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch (e) {
                // Ignore parse error
            }
            throw new Error(`${errorMessage} (Status: ${response.status})`);
        }
        
        // Download the file
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${window.ghostGym.currentProgram.name.replace(/[^a-z0-9]/gi, '_')}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        
        // Close modal and show success
        const modal = bootstrap.Modal.getInstance(document.getElementById('generateModal'));
        modal.hide();
        showAlert(`${format.toUpperCase()} document generated successfully!`, 'success');
        
    } catch (error) {
        console.error('❌ Error generating document:', error);
        showAlert('Failed to generate document: ' + error.message, 'danger');
    } finally {
        // Reset button state
        const generateBtn = document.getElementById('confirmGenerateBtn');
        if (generateBtn) {
            generateBtn.innerHTML = '<i class="bx bx-download me-1"></i>Generate Document';
            generateBtn.disabled = false;
        }
    }
}

/**
 * Add workout to program
 */
function addWorkoutToProgram(programId, workoutId) {
    const program = window.ghostGym.programs.find(p => p.id === programId);
    const workout = window.ghostGym.workouts.find(w => w.id === workoutId);
    
    if (!program || !workout) return;
    
    // Check if workout is already in program
    if (program.workouts && program.workouts.some(w => w.workout_id === workoutId)) {
        showAlert('Workout is already in this program', 'warning');
        return;
    }
    
    // Add workout to program
    if (!program.workouts) program.workouts = [];
    program.workouts.push({
        workout_id: workoutId,
        order_index: program.workouts.length,
        custom_name: null,
        custom_date: null
    });
    
    // Update UI
    if (window.ghostGym.currentProgram?.id === programId) {
        renderProgramWorkouts(program);
    }
    
    showAlert(`"${workout.name}" added to "${program.name}"`, 'success');
}

/**
 * Remove workout from program
 */
function removeWorkoutFromProgram(programId, workoutId) {
    const program = window.ghostGym.programs.find(p => p.id === programId);
    if (!program || !program.workouts) return;
    
    const workout = window.ghostGym.workouts.find(w => w.id === workoutId);
    const workoutName = workout ? workout.name : 'Workout';
    
    if (confirm(`Remove "${workoutName}" from this program?`)) {
        program.workouts = program.workouts.filter(w => w.workout_id !== workoutId);
        
        // Update UI
        if (window.ghostGym.currentProgram?.id === programId) {
            renderProgramWorkouts(program);
        }
        
        showAlert(`"${workoutName}" removed from program`, 'success');
    }
}

/**
 * Reorder program workouts after drag and drop
 */
function reorderProgramWorkouts(evt) {
    if (!window.ghostGym.currentProgram) return;
    
    const program = window.ghostGym.currentProgram;
    if (!program.workouts) return;
    
    // Update order based on new positions
    const workoutElements = document.querySelectorAll('#programWorkouts .workout-item');
    const newOrder = [];
    
    workoutElements.forEach((element, index) => {
        const workoutId = element.dataset.workoutId;
        const programWorkout = program.workouts.find(w => w.workout_id === workoutId);
        if (programWorkout) {
            programWorkout.order_index = index;
            newOrder.push(programWorkout);
        }
    });
    
    program.workouts = newOrder;
    showAlert('Workout order updated', 'success');
}

/**
 * Edit program workout (placeholder)
 */
function editProgramWorkout(programId, workoutId) {
    showAlert('Edit program workout functionality coming soon!', 'info');
}

// Make functions globally available
window.renderPrograms = renderPrograms;
window.handleProgramSelection = handleProgramSelection;
window.selectProgram = selectProgram;
window.showProgramDetails = showProgramDetails;
window.renderProgramWorkouts = renderProgramWorkouts;
window.saveProgram = saveProgram;
window.editCurrentProgram = editCurrentProgram;
window.editProgram = editProgram;
window.duplicateProgram = duplicateProgram;
window.deleteProgram = deleteProgram;
window.clearProgramForm = clearProgramForm;
window.previewProgram = previewProgram;
window.generateDocument = generateDocument;
window.addWorkoutToProgram = addWorkoutToProgram;
window.removeWorkoutFromProgram = removeWorkoutFromProgram;
window.reorderProgramWorkouts = reorderProgramWorkouts;
window.editProgramWorkout = editProgramWorkout;

console.log('📦 Programs module loaded');