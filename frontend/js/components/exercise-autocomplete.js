/**
 * Exercise Autocomplete Component for Ghost Gym V2
 * Provides real-time exercise search with autocomplete functionality
 */

class ExerciseAutocomplete {
    constructor(inputElement, options = {}) {
        this.input = inputElement;
        this.options = {
            minChars: 2,
            maxResults: 20,
            debounceMs: 300,
            placeholder: 'Search exercises...',
            showMuscleGroup: true,
            showEquipment: true,
            showDifficulty: true,
            allowCustom: true,
            onSelect: null,
            ...options
        };
        
        this.exercises = [];
        this.customExercises = [];
        this.filteredResults = [];
        this.selectedIndex = -1;
        this.isOpen = false;
        this.debounceTimer = null;
        this.dropdown = null;
        
        this.init();
    }
    
    /**
     * Initialize autocomplete component
     */
    init() {
        // Set input attributes
        this.input.setAttribute('autocomplete', 'off');
        this.input.setAttribute('placeholder', this.options.placeholder);
        
        // Create dropdown element
        this.createDropdown();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load exercises
        this.loadExercises();
        
        console.log('✅ Exercise autocomplete initialized');
    }
    
    /**
     * Create dropdown element
     */
    createDropdown() {
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'exercise-autocomplete-dropdown';
        this.dropdown.style.display = 'none';
        
        // Position dropdown below input
        this.input.parentElement.style.position = 'relative';
        this.input.parentElement.appendChild(this.dropdown);
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Input events
        this.input.addEventListener('input', (e) => this.handleInput(e));
        this.input.addEventListener('focus', (e) => this.handleFocus(e));
        this.input.addEventListener('blur', (e) => this.handleBlur(e));
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.input.contains(e.target) && !this.dropdown.contains(e.target)) {
                this.close();
            }
        });
    }
    
    /**
     * Load exercises from API and cache
     */
    async loadExercises() {
        try {
            // Check cache first
            const cached = this.getCache();
            if (cached && this.isCacheValid(cached)) {
                this.exercises = cached.exercises;
                console.log(`✅ Loaded ${this.exercises.length} exercises from cache`);
                return;
            }
            
            // Load from API in batches (respecting 500 max page_size limit)
            console.log('📡 Loading exercises from API...');
            const PAGE_SIZE = 500;
            let allExercises = [];
            let page = 1;
            let hasMore = true;
            
            while (hasMore) {
                const response = await fetch(`/api/v3/exercises?page=${page}&page_size=${PAGE_SIZE}`);
                
                if (!response.ok) {
                    throw new Error(`Failed to load exercises (page ${page})`);
                }
                
                const data = await response.json();
                const exercises = data.exercises || [];
                
                allExercises = [...allExercises, ...exercises];
                console.log(`📦 Loaded page ${page}: ${exercises.length} exercises (total: ${allExercises.length})`);
                
                // Check if there are more pages
                hasMore = exercises.length === PAGE_SIZE;
                page++;
            }
            
            this.exercises = allExercises;
            
            // Cache the results
            this.setCache(this.exercises);
            
            console.log(`✅ Loaded ${this.exercises.length} exercises from API`);
            
            // Load custom exercises if user is authenticated
            if (window.dataManager && window.dataManager.isUserAuthenticated()) {
                await this.loadCustomExercises();
            }
            
        } catch (error) {
            console.error('❌ Error loading exercises:', error);
            this.exercises = [];
        }
    }
    
    /**
     * Load user's custom exercises
     */
    async loadCustomExercises() {
        try {
            const token = await window.dataManager.getAuthToken();
            const response = await fetch('/api/v3/users/me/exercises', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.customExercises = data.exercises || [];
                console.log(`✅ Loaded ${this.customExercises.length} custom exercises`);
            }
        } catch (error) {
            console.warn('⚠️ Could not load custom exercises:', error.message);
            this.customExercises = [];
        }
    }
    
    /**
     * Handle input event
     */
    handleInput(e) {
        const query = e.target.value.trim();
        
        // Clear previous timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Debounce search
        this.debounceTimer = setTimeout(() => {
            this.search(query);
        }, this.options.debounceMs);
    }
    
    /**
     * Handle focus event
     */
    handleFocus(e) {
        const query = e.target.value.trim();
        if (query.length >= this.options.minChars) {
            this.search(query);
        }
    }
    
    /**
     * Handle blur event
     */
    handleBlur(e) {
        // Delay to allow click on dropdown item
        setTimeout(() => {
            this.close();
        }, 200);
    }
    
    /**
     * Handle keyboard navigation
     */
    handleKeydown(e) {
        if (!this.isOpen) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectNext();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectPrevious();
                break;
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0 && this.filteredResults[this.selectedIndex]) {
                    this.selectExercise(this.filteredResults[this.selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.close();
                break;
        }
    }
    
    /**
     * Search exercises
     */
    search(query) {
        if (query.length < this.options.minChars) {
            this.close();
            return;
        }
        
        const queryLower = query.toLowerCase();
        
        // Combine global and custom exercises
        const allExercises = [...this.exercises, ...this.customExercises];
        
        // Filter exercises
        this.filteredResults = allExercises.filter(exercise => {
            // Search in name
            if (exercise.name.toLowerCase().includes(queryLower)) {
                return true;
            }
            
            // Search in muscle group
            if (exercise.targetMuscleGroup && 
                exercise.targetMuscleGroup.toLowerCase().includes(queryLower)) {
                return true;
            }
            
            // Search in equipment
            if (exercise.primaryEquipment && 
                exercise.primaryEquipment.toLowerCase().includes(queryLower)) {
                return true;
            }
            
            return false;
        });
        
        // Limit results
        this.filteredResults = this.filteredResults.slice(0, this.options.maxResults);
        
        // Render results
        this.render();
    }
    
    /**
     * Render dropdown with results
     */
    render() {
        if (this.filteredResults.length === 0) {
            if (this.options.allowCustom) {
                this.renderNoResults();
            } else {
                this.close();
            }
            return;
        }
        
        let html = '<div class="exercise-autocomplete-results">';
        
        this.filteredResults.forEach((exercise, index) => {
            const isSelected = index === this.selectedIndex;
            const isCustom = !exercise.isGlobal;
            
            html += `
                <div class="exercise-autocomplete-item ${isSelected ? 'selected' : ''}" 
                     data-index="${index}"
                     onclick="window.exerciseAutocompleteInstances['${this.input.id}'].selectExercise(${JSON.stringify(exercise).replace(/"/g, '&quot;')})">
                    <div class="exercise-name">
                        ${isCustom ? '<i class="bx bx-star text-warning me-1"></i>' : ''}
                        ${this.escapeHtml(exercise.name)}
                    </div>
                    <div class="exercise-meta">
                        ${this.options.showMuscleGroup && exercise.targetMuscleGroup ? 
                            `<span class="badge bg-label-primary">${this.escapeHtml(exercise.targetMuscleGroup)}</span>` : ''}
                        ${this.options.showEquipment && exercise.primaryEquipment ? 
                            `<span class="badge bg-label-secondary">${this.escapeHtml(exercise.primaryEquipment)}</span>` : ''}
                        ${this.options.showDifficulty && exercise.difficultyLevel ? 
                            `<span class="badge bg-label-info">${this.escapeHtml(exercise.difficultyLevel)}</span>` : ''}
                    </div>
                </div>
            `;
        });
        
        // Add custom exercise option
        if (this.options.allowCustom) {
            html += `
                <div class="exercise-autocomplete-item exercise-autocomplete-custom" 
                     onclick="window.exerciseAutocompleteInstances['${this.input.id}'].showCustomExerciseModal()">
                    <i class="bx bx-plus-circle me-2"></i>
                    Add custom exercise
                </div>
            `;
        }
        
        html += '</div>';
        
        this.dropdown.innerHTML = html;
        this.open();
    }
    
    /**
     * Render no results message
     */
    renderNoResults() {
        this.dropdown.innerHTML = `
            <div class="exercise-autocomplete-results">
                <div class="exercise-autocomplete-item text-muted">
                    <i class="bx bx-search me-2"></i>
                    No exercises found
                </div>
                ${this.options.allowCustom ? `
                    <div class="exercise-autocomplete-item exercise-autocomplete-custom" 
                         onclick="window.exerciseAutocompleteInstances['${this.input.id}'].showCustomExerciseModal()">
                        <i class="bx bx-plus-circle me-2"></i>
                        Add custom exercise
                    </div>
                ` : ''}
            </div>
        `;
        this.open();
    }
    
    /**
     * Select next item
     */
    selectNext() {
        if (this.selectedIndex < this.filteredResults.length - 1) {
            this.selectedIndex++;
            this.updateSelection();
        }
    }
    
    /**
     * Select previous item
     */
    selectPrevious() {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this.updateSelection();
        }
    }
    
    /**
     * Update visual selection
     */
    updateSelection() {
        const items = this.dropdown.querySelectorAll('.exercise-autocomplete-item:not(.exercise-autocomplete-custom)');
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    /**
     * Select an exercise
     */
    selectExercise(exercise) {
        // Set input value
        this.input.value = exercise.name;
        
        // Store exercise data
        this.input.dataset.exerciseId = exercise.id;
        this.input.dataset.exerciseName = exercise.name;
        this.input.dataset.isCustom = !exercise.isGlobal;
        
        // Call callback if provided
        if (this.options.onSelect && typeof this.options.onSelect === 'function') {
            this.options.onSelect(exercise);
        }
        
        // Close dropdown
        this.close();
        
        console.log('✅ Exercise selected:', exercise.name);
    }
    
    /**
     * Show custom exercise modal
     */
    showCustomExerciseModal() {
        this.close();
        
        // Trigger custom exercise modal
        if (window.showCustomExerciseModal) {
            window.showCustomExerciseModal(this.input.value);
        } else {
            console.warn('Custom exercise modal not implemented');
            alert('Custom exercise functionality coming soon!');
        }
    }
    
    /**
     * Open dropdown
     */
    open() {
        this.dropdown.style.display = 'block';
        this.isOpen = true;
    }
    
    /**
     * Close dropdown
     */
    close() {
        this.dropdown.style.display = 'none';
        this.isOpen = false;
        this.selectedIndex = -1;
    }
    
    /**
     * Get selected exercise data
     */
    getSelectedExercise() {
        return {
            id: this.input.dataset.exerciseId || null,
            name: this.input.value,
            isCustom: this.input.dataset.isCustom === 'true'
        };
    }
    
    /**
     * Clear selection
     */
    clear() {
        this.input.value = '';
        delete this.input.dataset.exerciseId;
        delete this.input.dataset.exerciseName;
        delete this.input.dataset.isCustom;
        this.close();
    }
    
    /**
     * Cache management
     */
    getCache() {
        try {
            const cached = localStorage.getItem('exercise_cache');
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Error reading exercise cache:', error);
            return null;
        }
    }
    
    setCache(exercises) {
        try {
            const cacheData = {
                exercises: exercises,
                timestamp: Date.now(),
                version: '1.0'
            };
            localStorage.setItem('exercise_cache', JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error setting exercise cache:', error);
        }
    }
    
    isCacheValid(cached) {
        const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
        const age = Date.now() - cached.timestamp;
        return age < CACHE_DURATION && cached.version === '1.0';
    }
    
    /**
     * Utility: Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    /**
     * Destroy autocomplete instance
     */
    destroy() {
        if (this.dropdown && this.dropdown.parentElement) {
            this.dropdown.parentElement.removeChild(this.dropdown);
        }
        this.exercises = [];
        this.customExercises = [];
        this.filteredResults = [];
    }
}

// Global registry for autocomplete instances
window.exerciseAutocompleteInstances = window.exerciseAutocompleteInstances || {};

/**
 * Initialize autocomplete on an input element
 */
function initExerciseAutocomplete(inputElement, options = {}) {
    if (!inputElement) {
        console.error('Input element not found for autocomplete');
        return null;
    }
    
    // Ensure input has an ID
    if (!inputElement.id) {
        inputElement.id = `exercise-input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Create autocomplete instance
    const autocomplete = new ExerciseAutocomplete(inputElement, options);
    
    // Store in global registry
    window.exerciseAutocompleteInstances[inputElement.id] = autocomplete;
    
    return autocomplete;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExerciseAutocomplete, initExerciseAutocomplete };
}

console.log('📦 Exercise Autocomplete component loaded');