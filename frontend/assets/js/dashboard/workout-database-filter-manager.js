/**
 * Ghost Gym Dashboard - Workout Database Filter Manager
 * Handles filtering, sorting, tag management, search overlay, and toolbar controls
 * @version 1.0.0 - Extracted from workout-database.js
 */

/**
 * ============================================
 * TOOLBAR SORT OPTIONS
 * ============================================
 */

const SORT_OPTIONS = [
    { value: 'modified_date', label: 'Newest', icon: 'bx-sort-alt-2' },
    { value: 'created_date', label: 'Created', icon: 'bx-calendar-plus' },
    { value: 'name', label: 'A-Z', icon: 'bx-sort-a-z' },
    { value: 'exercise_count', label: 'Exercises', icon: 'bx-list-ol' }
];

let currentSortIndex = 0;

/**
 * ============================================
 * SEARCH OVERLAY
 * ============================================
 */

let searchOverlay = null;

/**
 * Initialize search overlay using shared component
 */
function initSearchOverlay() {
    searchOverlay = new FFNSearchOverlay({
        placeholder: 'Search workouts by name, description, or tags...',
        onSearch: (searchTerm) => {
            console.log('🔍 Search callback triggered with term:', searchTerm);

            // Update global state
            window.ffn.workoutDatabase.filters.search = searchTerm;
            console.log('📊 Updated filter state:', window.ffn.workoutDatabase.filters);

            // Use existing filter function
            filterWorkouts();

            console.log('✅ Search performed and filtered');
        },
        onResultsCount: (searchTerm) => {
            if (!searchTerm) {
                return { count: 0, total: 0 };
            }

            // Calculate matching workouts
            const searchLower = searchTerm.toLowerCase();
            const filtered = window.ffn.workoutDatabase.all.filter(workout => {
                return workout.name.toLowerCase().includes(searchLower) ||
                       (workout.description || '').toLowerCase().includes(searchLower) ||
                       (workout.tags || []).some(tag => tag.toLowerCase().includes(searchLower));
            });

            return {
                count: filtered.length,
                total: window.ffn.workoutDatabase.all.length
            };
        }
    });

    console.log('✅ Search overlay initialized with shared component');
}

/**
 * Show search overlay
 */
function showSearchOverlay() {
    if (searchOverlay) {
        searchOverlay.show();
    }
}

/**
 * Hide search overlay
 */
function hideSearchOverlay() {
    if (searchOverlay) {
        searchOverlay.hide();
    }
}

/**
 * ============================================
 * TAG MANAGEMENT
 * ============================================
 */

/**
 * Load available tags and render filter UI
 */
function loadTagOptions() {
    // Get all unique tags
    const tagSet = new Set();
    window.ffn.workoutDatabase.all.forEach(workout => {
        (workout.tags || []).forEach(tag => tagSet.add(tag));
    });

    const tags = Array.from(tagSet).sort();

    console.log(`✅ Loaded ${tags.length} unique tags`);

    // Render tags in offcanvas
    renderTagFilterCheckboxes(tags);

    // Update stats display
    updateStatsDisplay();
}

/**
 * Render tag filter checkboxes in offcanvas
 */
function renderTagFilterCheckboxes(tags) {
    const container = document.getElementById('tagsFilterContainer');
    if (!container) return;

    if (tags.length === 0) {
        container.innerHTML = '<p class="text-muted small">No tags available</p>';
        return;
    }

    // Build checkbox HTML
    let html = '<div class="tags-list" style="max-height: 200px; overflow-y: auto;">';

    tags.forEach(tag => {
        const isChecked = window.ffn.workoutDatabase.filters.tags.includes(tag);
        html += `
            <div class="form-check mb-2">
                <input class="form-check-input tag-filter-checkbox"
                       type="checkbox"
                       value="${tag}"
                       id="tag_${tag.replace(/\s+/g, '_')}"
                       ${isChecked ? 'checked' : ''}>
                <label class="form-check-label" for="tag_${tag.replace(/\s+/g, '_')}">
                    <span class="badge bg-label-primary">${tag}</span>
                </label>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Attach event listeners to checkboxes
    container.querySelectorAll('.tag-filter-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleTagFilterChange);
    });

    console.log('✅ Tag filter checkboxes rendered');
}

/**
 * Handle tag filter checkbox change
 */
function handleTagFilterChange(e) {
    const tag = e.target.value;
    const isChecked = e.target.checked;

    if (isChecked) {
        // Add tag to filters
        if (!window.ffn.workoutDatabase.filters.tags.includes(tag)) {
            window.ffn.workoutDatabase.filters.tags.push(tag);
        }
    } else {
        // Remove tag from filters
        window.ffn.workoutDatabase.filters.tags =
            window.ffn.workoutDatabase.filters.tags.filter(t => t !== tag);
    }

    console.log('🏷️ Tag filters updated:', window.ffn.workoutDatabase.filters.tags);

    // Apply filters in real-time
    filterWorkouts();

    // Update visual feedback
    updateFilterBadge();
}

/**
 * ============================================
 * STATS & BADGE
 * ============================================
 */

/**
 * Update stats display in offcanvas
 */
function updateStatsDisplay() {
    const totalCountEl = document.getElementById('totalCount');
    const showingCountEl = document.getElementById('showingCount');

    if (totalCountEl) {
        totalCountEl.textContent = window.ffn.workoutDatabase.stats.total;
    }

    if (showingCountEl) {
        const showingCount = window.ffn.workoutDatabase.filtered?.length ||
                            window.ffn.workoutDatabase.all.length;
        showingCountEl.textContent = showingCount;
        window.ffn.workoutDatabase.stats.showing = showingCount;
    }
}

/**
 * Update filter badge with active filter count
 */
function updateFilterBadge() {
    const badge = document.getElementById('filterBadge');
    if (!badge) return;

    let count = window.ffn.workoutDatabase.filters.tags.length;

    // Include favorites filter in count
    if (window.ffn.workoutDatabase.filters.favoritesOnly) {
        count += 1;
    }

    // Include archive filter in count
    if (window.ffn.workoutDatabase.filters.showArchived) {
        count += 1;
    }

    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
}

/**
 * ============================================
 * FILTERING & SORTING
 * ============================================
 */

/**
 * Apply all filters and sort
 */
function filterWorkouts() {
    let filtered = [...window.ffn.workoutDatabase.all];

    // Get filter values from state
    const searchTerm = window.ffn.workoutDatabase.filters.search || '';
    const selectedTags = window.ffn.workoutDatabase.filters.tags || [];
    const sortBy = window.ffn.workoutDatabase.filters.sortBy || 'modified_date';
    const favoritesOnly = window.ffn.workoutDatabase.filters.favoritesOnly || false;
    const showArchived = window.ffn.workoutDatabase.filters.showArchived || false;

    console.log('🔍 Applying filters:', { searchTerm, selectedTags, sortBy, favoritesOnly, showArchived });

    // Archive filter: show only archived, or exclude archived
    if (showArchived) {
        filtered = filtered.filter(workout => workout.is_archived);
    } else {
        filtered = filtered.filter(workout => !workout.is_archived);
    }

    // Apply favorites filter
    if (favoritesOnly) {
        filtered = filtered.filter(workout => workout.is_favorite);
    }

    // Apply search filter
    if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();

        filtered = filtered.filter(workout => {
            return workout.name.toLowerCase().includes(searchLower) ||
                   (workout.description || '').toLowerCase().includes(searchLower) ||
                   (workout.tags || []).some(tag => tag.toLowerCase().includes(searchLower));
        });
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
        filtered = filtered.filter(workout => {
            return selectedTags.some(tag => (workout.tags || []).includes(tag));
        });
    }

    // Sort workouts
    filtered = sortWorkouts(filtered, sortBy);

    // Update filtered array
    window.ffn.workoutDatabase.filtered = filtered;

    // Reset to page 1
    window.ffn.workoutDatabase.currentPage = 1;

    // Update grid with filtered data
    if (window.workoutGrid) {
        window.workoutGrid.setData(filtered);
    }

    // Update stats display
    updateStatsDisplay();

    // Update filter badge
    updateFilterBadge();

    // Re-apply desktop selection highlight after grid re-render
    if (window.reapplyWorkoutSelection) {
        window.reapplyWorkoutSelection();
    }

    console.log('📊 Filter results:', filtered.length, 'of', window.ffn.workoutDatabase.all.length);
}

/**
 * Sort workouts by specified criteria
 */
function sortWorkouts(workouts, sortBy) {
    const sorted = [...workouts];

    switch (sortBy) {
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;

        case 'created_date':
            sorted.sort((a, b) => {
                const dateA = new Date(a.created_date);
                const dateB = new Date(b.created_date);
                return dateB - dateA; // Newest first
            });
            break;

        case 'modified_date':
            sorted.sort((a, b) => {
                const dateA = new Date(a.modified_date);
                const dateB = new Date(b.modified_date);
                return dateB - dateA; // Newest first
            });
            break;

        case 'exercise_count':
            sorted.sort((a, b) => {
                const countA = window.getTotalExerciseCount(a);
                const countB = window.getTotalExerciseCount(b);
                return countB - countA; // Most exercises first
            });
            break;
    }

    return sorted;
}

/**
 * Clear all filters
 */
function clearFilters() {
    console.log('🧹 Clearing all filters');

    // Clear search in toolbar
    const workoutSearchInput = document.getElementById('workoutSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (workoutSearchInput) {
        workoutSearchInput.value = '';
    }
    if (clearSearchBtn) {
        clearSearchBtn.style.display = 'none';
    }

    // Reset filter state (including search, favorites, and archive)
    window.ffn.workoutDatabase.filters.search = '';
    window.ffn.workoutDatabase.filters.tags = [];
    window.ffn.workoutDatabase.filters.sortBy = 'modified_date';
    window.ffn.workoutDatabase.filters.favoritesOnly = false;
    window.ffn.workoutDatabase.filters.showArchived = false;

    // Reset favorites filter toggle immediately after state change
    const favoritesToggle = document.getElementById('favoritesFilterToggle');
    console.log('🔄 Resetting favorites toggle:', favoritesToggle, favoritesToggle?.checked);
    if (favoritesToggle) {
        favoritesToggle.checked = false;
        console.log('✅ Favorites toggle set to:', favoritesToggle.checked);
    }

    // Reset archive filter toggle
    const archiveToggle = document.getElementById('archiveFilterToggle');
    if (archiveToggle) {
        archiveToggle.checked = false;
    }

    // Reset sort cycle button to default
    currentSortIndex = 0;
    const sortCycleBtn = document.getElementById('sortCycleBtn');
    if (sortCycleBtn) {
        sortCycleBtn.querySelector('.sort-label').textContent = SORT_OPTIONS[0].label;
        sortCycleBtn.querySelector('i').className = `bx ${SORT_OPTIONS[0].icon}`;
    }

    // Uncheck all tag checkboxes
    document.querySelectorAll('.tag-filter-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Re-apply filters (will show all workouts)
    filterWorkouts();

    // Re-render favorites section (will be shown again)
    window.renderFavoritesSection?.();

    // Update filter badge
    updateFilterBadge();

    console.log('✅ Filters cleared');
}

/**
 * ============================================
 * TOOLBAR FUNCTIONS
 * ============================================
 */

/**
 * Cycle through sort options
 */
function cycleWorkoutSort() {
    currentSortIndex = (currentSortIndex + 1) % SORT_OPTIONS.length;
    const sortOption = SORT_OPTIONS[currentSortIndex];

    // Update filter state (reuse existing)
    window.ffn.workoutDatabase.filters.sortBy = sortOption.value;

    // Update button UI
    const btn = document.getElementById('sortCycleBtn');
    if (btn) {
        btn.querySelector('.sort-label').textContent = sortOption.label;
        btn.querySelector('i').className = `bx ${sortOption.icon}`;
    }

    console.log('📊 Sort changed to:', sortOption.label);

    // Reuse existing filter function
    filterWorkouts();
}

/**
 * Initialize toolbar search input
 */
function initToolbarSearch() {
    const searchInput = document.getElementById('workoutSearchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (!searchInput) return;

    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        clearBtn.style.display = query ? 'block' : 'none';

        searchTimeout = setTimeout(() => {
            // Reuse existing filter state & function
            window.ffn.workoutDatabase.filters.search = query;
            filterWorkouts();
        }, 300);
    });

    clearBtn?.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        window.ffn.workoutDatabase.filters.search = '';
        filterWorkouts();
    });

    console.log('✅ Toolbar search initialized');
}

// Window exports
window.filterWorkouts = filterWorkouts;
window.clearFilters = clearFilters;
window.loadTagOptions = loadTagOptions;
window.cycleWorkoutSort = cycleWorkoutSort;
window.initToolbarSearch = initToolbarSearch;
window.updateFilterBadge = updateFilterBadge;
window.initSearchOverlay = initSearchOverlay;
window.showSearchOverlay = showSearchOverlay;
window.hideSearchOverlay = hideSearchOverlay;

console.log('📦 WorkoutDatabaseFilterManager loaded');
