/**
 * Exercise Autocomplete Component for Ghost Gym V2
 * Provides real-time exercise search with autocomplete functionality
 * Now uses global ExerciseCacheService for shared data
 * @version 2.0.0 - Performance Optimized
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
            showTier: true,  // New option to show tier
            preferFoundational: false,  // New option to prefer foundational exercises
            tierFilter: null,  // New option to filter by tier
            allowCustom: true,
            allowAutoCreate: false,  // New option to enable auto-creation
            onSelect: null,
            onAutoCreate: null,  // New callback for auto-created exercises
            ...options
        };
        
        // Use global cache service instead of local storage
        this.cacheService = window.exerciseCacheService;
        this.autoCreateService = window.autoCreateExerciseService;
        this.filteredResults = [];
        this.selectedIndex = -1;
        this.isOpen = false;
        this.debounceTimer = null;
        this.dropdown = null;
        this.cacheListener = null;
        this.isAutoCreating = false;
        
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
        
        // Load exercises from global cache (lazy loading)
        this.loadExercises();
        
        // Listen for cache updates
        this.cacheListener = this.cacheService.addListener((event, data) => {
            if (event === 'loaded' || event === 'customLoaded') {
                console.log(`🔄 Cache updated: ${event}`);
            } else if (event === 'customExerciseCreated') {
                console.log(`🆕 New custom exercise created: ${data.exercise.name}`);
                // Re-run search if dropdown is open and has a valid query
                if (this.isOpen && this.input.value.trim().length >= this.options.minChars) {
                    const currentQuery = this.input.value.trim();
                    console.log(`🔄 Refreshing search results for: "${currentQuery}"`);
                    this.search(currentQuery);
                }
            }
        });
        
        console.log('✅ Exercise autocomplete initialized (using global cache)');
    }
    
    /**
     * Create dropdown element and wrap input in SNEAT input-group
     */
    createDropdown() {
        // Check if input is already wrapped in input-group
        const parentElement = this.input.parentElement;
        const isAlreadyWrapped = parentElement.classList.contains('input-group') ||
                                 parentElement.classList.contains('exercise-autocomplete-wrapper');
        
        if (!isAlreadyWrapped) {
            // Create SNEAT-style input-group wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'input-group input-group-merge exercise-autocomplete-wrapper';
            wrapper.style.position = 'relative';
            
            // Create search icon
            const iconSpan = document.createElement('span');
            iconSpan.className = 'input-group-text';
            iconSpan.innerHTML = '<i class="bx bx-search"></i>';
            
            // Create clear button
            const clearBtn = document.createElement('button');
            clearBtn.className = 'btn btn-outline-secondary exercise-autocomplete-clear';
            clearBtn.type = 'button';
            clearBtn.style.display = 'none';
            clearBtn.innerHTML = '<i class="bx bx-x"></i>';
            clearBtn.setAttribute('aria-label', 'Clear search');
            clearBtn.addEventListener('click', () => this.clear());
            
            // Wrap the input
            this.input.parentNode.insertBefore(wrapper, this.input);
            wrapper.appendChild(iconSpan);
            wrapper.appendChild(this.input);
            wrapper.appendChild(clearBtn);
            
            // Store reference to clear button
            this.clearButton = clearBtn;
        } else {
            // Already wrapped, just find the clear button if it exists
            this.clearButton = parentElement.querySelector('.exercise-autocomplete-clear');
        }
        
        // Create dropdown element
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'exercise-autocomplete-dropdown';
        this.dropdown.style.display = 'none';
        
        // Position dropdown below input wrapper
        const dropdownParent = this.input.closest('.exercise-autocomplete-wrapper') || this.input.parentElement;
        dropdownParent.style.position = 'relative';
        dropdownParent.appendChild(this.dropdown);
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
     * Load exercises from global cache service
     * This is now lazy and shared across all instances
     */
    async loadExercises() {
        try {
            // Use global cache service - this will deduplicate requests
            await this.cacheService.loadExercises();
            console.log('✅ Exercises ready from global cache');
        } catch (error) {
            console.error('❌ Error loading exercises:', error);
        }
    }
    
    /**
     * Handle input event
     */
    handleInput(e) {
        const query = e.target.value.trim();
        
        // Show/hide clear button
        if (this.clearButton) {
            this.clearButton.style.display = query ? 'block' : 'none';
        }
        
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
     * Search exercises using global cache service
     */
    search(query) {
        if (query.length < this.options.minChars) {
            this.close();
            return;
        }
        
        // Show loading state
        this.showLoading();
        
        // Clear previous timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Debounce search
        this.debounceTimer = setTimeout(() => {
            // Use cache service for searching
            this.filteredResults = this.cacheService.searchExercises(query, {
                maxResults: this.options.maxResults,
                includeCustom: true,
                preferFoundational: this.options.preferFoundational,
                tierFilter: this.options.tierFilter
            });
            
            console.log(`🔍 Found ${this.filteredResults.length} exercises for "${query}"`);
            
            // Render results
            this.render();
        }, this.options.debounceMs);
    }
    
    /**
     * Show loading state
     */
    showLoading() {
        this.dropdown.innerHTML = `
            <div class="exercise-autocomplete-loading">
                <i class="bx bx-loader-alt bx-spin"></i>
                <span class="ms-2">Searching...</span>
            </div>
        `;
        this.open();
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
            const isFoundational = exercise.isFoundational;
            const tier = exercise.exerciseTier || 2;
            
            let tierBadge = '';
            if (this.options.showTier) {
                if (tier === 1) {
                    tierBadge = '<span class="badge bg-label-success">Foundation</span>';
                } else if (tier === 2) {
                    tierBadge = '<span class="badge bg-label-primary">Standard</span>';
                } else if (tier === 3) {
                    tierBadge = '<span class="badge bg-label-warning">Specialized</span>';
                }
            }
            
            html += `
                <div class="exercise-autocomplete-item ${isSelected ? 'selected' : ''} ${isFoundational ? 'is-foundational' : ''}"
                     data-index="${index}"
                     onclick="window.exerciseAutocompleteInstances['${this.input.id}'].selectExercise(${JSON.stringify(exercise).replace(/"/g, '&quot;')})">
                    <div class="exercise-name">
                        ${isCustom ? '<span class="badge bg-label-primary me-1" style="font-size: 0.7rem;"><i class="bx bx-user"></i> Custom</span>' : ''}
                        ${isFoundational ? '<i class="bx bx-badge-check text-success me-1"></i>' : ''}
                        ${this.escapeHtml(exercise.name)}
                    </div>
                    <div class="exercise-meta">
                        ${tierBadge}
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
        const query = this.input.value.trim();
        
        this.dropdown.innerHTML = `
            <div class="exercise-autocomplete-results">
                <div class="exercise-autocomplete-item text-muted">
                    <i class="bx bx-search me-2"></i>
                    No exercises found
                </div>
                ${this.options.allowAutoCreate && query.length >= this.options.minChars ? `
                    <div class="exercise-autocomplete-item exercise-autocomplete-auto-create"
                         onclick="window.exerciseAutocompleteInstances['${this.input.id}'].handleAutoCreate()">
                        <i class="bx bx-plus-circle me-2"></i>
                        Auto-create "${this.escapeHtml(query)}"
                    </div>
                ` : ''}
                ${this.options.allowCustom && !this.options.allowAutoCreate ? `
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
        // Haptic feedback on selection (if supported)
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
        
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
     * Handle auto-creation of exercise
     */
    async handleAutoCreate() {
        const query = this.input.value.trim();
        if (!query) return;
        
        this.close();
        
        try {
            const exercise = await this.autoCreateExercise(query);
            if (exercise) {
                this.selectExercise(exercise);
            }
        } catch (error) {
            console.error('❌ Error in auto-creation handler:', error);
        }
    }
    
    /**
     * Auto-create exercise if needed
     * @param {string} exerciseName - Name of exercise to auto-create
     * @returns {Promise<Object|null>} Created exercise or null
     */
    async autoCreateExercise(exerciseName) {
        if (this.isAutoCreating) {
            console.warn('Auto-creation already in progress');
            return null;
        }
        
        try {
            this.isAutoCreating = true;
            
            // Check if auto-create service is available
            if (!this.autoCreateService) {
                console.warn('Auto-Create Exercise Service not available');
                return null;
            }
            
            // Attempt auto-creation
            const exercise = await this.autoCreateService.autoCreateIfNeeded(exerciseName, {
                trackUsage: true,
                showError: true,
                fallbackToModal: false
            });
            
            if (exercise) {
                console.log(`✅ Auto-created exercise: ${exerciseName}`);
                
                // Call auto-create callback if provided
                if (this.options.onAutoCreate && typeof this.options.onAutoCreate === 'function') {
                    this.options.onAutoCreate(exercise);
                }
                
                return exercise;
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Error in auto-creation:', error);
            return null;
        } finally {
            this.isAutoCreating = false;
        }
    }
    
    /**
     * Open dropdown
     */
    open() {
        this.dropdown.style.display = 'block';
        this.isOpen = true;
        
        // Ensure dropdown is visible (scroll into view)
        setTimeout(() => {
            this.input.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }, 100);
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
        
        // Hide clear button
        if (this.clearButton) {
            this.clearButton.style.display = 'none';
        }
        
        this.close();
        this.input.focus();
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
        // Remove cache listener
        if (this.cacheListener) {
            this.cacheListener();
            this.cacheListener = null;
        }
        
        // Remove dropdown
        if (this.dropdown && this.dropdown.parentElement) {
            this.dropdown.parentElement.removeChild(this.dropdown);
        }
        
        // Clear references
        this.filteredResults = [];
        this.cacheService = null;
        
        console.log('🧹 Autocomplete instance destroyed');
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