/**
 * Ghost Gym - Workout History Workout Filter Offcanvas
 * Searchable multi-select workout filter using offcanvas pattern
 * @version 1.1.0
 */

/**
 * Open the workout filter offcanvas
 * Shows a searchable, multi-select list of workout names
 */
function openWorkoutFilterOffcanvas() {
  const state = window.ffn.workoutHistory;
  const uniqueWorkouts = state.uniqueWorkouts || [];
  const currentFilters = [...(state.workoutTypeFilters || [])];

  // Track local selection state (applied on "Apply")
  const selected = new Set(currentFilters);

  // Build workout list HTML
  const workoutListHtml = uniqueWorkouts.map(w => {
    const checked = selected.has(w.name) ? 'checked' : '';
    return `
      <div class="workout-filter-item" data-workout-name="${escapeHtml(w.name)}">
        <input type="checkbox" class="form-check-input workout-filter-checkbox"
               value="${escapeHtml(w.name)}" ${checked} id="wf_${escapeHtml(w.name).replace(/\s+/g, '_')}">
        <div class="workout-filter-item-info">
          <span class="workout-filter-item-name">${escapeHtml(w.name)}</span>
        </div>
        <span class="workout-filter-item-count">${w.count}</span>
      </div>
    `;
  }).join('');

  const offcanvasHtml = `
    <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1"
         id="workoutFilterOffcanvas" aria-labelledby="workoutFilterOffcanvasLabel"
         data-bs-scroll="false" style="height: 85vh;">

      <!-- Header -->
      <div class="offcanvas-header border-bottom">
        <h5 class="offcanvas-title" id="workoutFilterOffcanvasLabel">
          <i class="bx bx-filter-alt me-2"></i>Filter Workouts
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>

      <!-- Body -->
      <div class="offcanvas-body p-0 d-flex flex-column">

        <!-- Search Section -->
        <div class="p-3 border-bottom">
          <div class="input-group" style="gap: 0.25rem;">
            <input type="text" class="form-control" id="workoutFilterSearchInput"
                   placeholder="Search workouts..." autocomplete="off"
                   style="padding-right: 0.75rem;">
            <button class="btn btn-outline-secondary" type="button" id="workoutFilterSearchClear"
                    style="display: none;" title="Clear search">
              <i class="bx bx-x"></i>
            </button>
          </div>
        </div>

        <!-- Section Header -->
        <div class="p-3 pb-2 border-bottom bg-light d-flex justify-content-between align-items-center">
          <h6 class="mb-0 text-muted small fw-semibold">
            <i class="bx bx-dumbbell me-1"></i>Your Workouts
            <span class="ms-1" id="workoutFilterSelectionCount">${selected.size > 0 ? '(' + selected.size + ' selected)' : ''}</span>
          </h6>
          <div>
            <button class="btn btn-sm btn-link p-0 me-2 text-decoration-none" id="workoutFilterSelectAllBtn">
              Select All
            </button>
            <button class="btn btn-sm btn-link p-0 text-danger text-decoration-none" id="workoutFilterClearAllBtn">
              Clear
            </button>
          </div>
        </div>

        <!-- Scrollable Workout List -->
        <div class="flex-grow-1" style="overflow-y: auto;">
          <div class="workout-filter-list" id="workoutFilterList">
            ${workoutListHtml}
          </div>

          <!-- Empty search state -->
          <div class="text-center py-5" id="workoutFilterEmpty" style="display: none;">
            <i class="bx bx-search-alt display-1 text-muted"></i>
            <p class="text-muted mt-3 mb-0">No workouts match your search</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="offcanvas-footer border-top p-3">
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-outline-secondary flex-fill" id="workoutFilterClearBtn">
            <i class="bx bx-x me-1"></i>Clear
          </button>
          <button type="button" class="btn btn-primary flex-fill" id="workoutFilterApplyBtn">
            <i class="bx bx-check me-1"></i>Apply
          </button>
        </div>
      </div>
    </div>
  `;

  window.offcanvasManager.create('workoutFilterOffcanvas', offcanvasHtml, (offcanvas, element) => {
    const searchInput = element.querySelector('#workoutFilterSearchInput');
    const searchClear = element.querySelector('#workoutFilterSearchClear');
    const filterList = element.querySelector('#workoutFilterList');
    const emptyState = element.querySelector('#workoutFilterEmpty');
    const selectionCount = element.querySelector('#workoutFilterSelectionCount');
    const selectAllBtn = element.querySelector('#workoutFilterSelectAllBtn');
    const clearAllBtn = element.querySelector('#workoutFilterClearAllBtn');
    const clearBtn = element.querySelector('#workoutFilterClearBtn');
    const applyBtn = element.querySelector('#workoutFilterApplyBtn');

    // Update selection count display
    const updateSelectionCount = () => {
      if (selected.size === 0) {
        selectionCount.textContent = '';
      } else {
        selectionCount.textContent = `(${selected.size} selected)`;
      }
    };

    // Search / filter the list
    const filterWorkoutList = () => {
      const query = searchInput.value.toLowerCase().trim();
      searchClear.style.display = query ? '' : 'none';

      const items = filterList.querySelectorAll('.workout-filter-item');
      let visibleCount = 0;

      items.forEach(item => {
        const name = item.dataset.workoutName.toLowerCase();
        const match = !query || name.includes(query);
        item.style.display = match ? '' : 'none';
        if (match) visibleCount++;
      });

      emptyState.style.display = visibleCount === 0 ? '' : 'none';
    };

    // Click on item row toggles checkbox
    filterList.addEventListener('click', (e) => {
      const item = e.target.closest('.workout-filter-item');
      if (!item) return;

      // Don't double-toggle if clicking directly on checkbox
      const checkbox = item.querySelector('.workout-filter-checkbox');
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
      }

      const name = checkbox.value;
      if (checkbox.checked) {
        selected.add(name);
      } else {
        selected.delete(name);
      }
      updateSelectionCount();
    });

    // Search input
    searchInput.addEventListener('input', filterWorkoutList);

    // Search clear
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      filterWorkoutList();
      searchInput.focus();
    });

    // Select All (only visible items)
    selectAllBtn.addEventListener('click', () => {
      const items = filterList.querySelectorAll('.workout-filter-item');
      items.forEach(item => {
        if (item.style.display !== 'none') {
          const checkbox = item.querySelector('.workout-filter-checkbox');
          checkbox.checked = true;
          selected.add(checkbox.value);
        }
      });
      updateSelectionCount();
    });

    // Clear All
    clearAllBtn.addEventListener('click', () => {
      const checkboxes = filterList.querySelectorAll('.workout-filter-checkbox');
      checkboxes.forEach(cb => { cb.checked = false; });
      selected.clear();
      updateSelectionCount();
    });

    // Clear button (footer) - reset and close
    clearBtn.addEventListener('click', () => {
      setWorkoutTypeFilters([]);
      offcanvas.hide();
    });

    // Apply button - save selection and close
    applyBtn.addEventListener('click', () => {
      setWorkoutTypeFilters(Array.from(selected));
      offcanvas.hide();
    });

    // Focus search input after offcanvas is shown
    element.addEventListener('shown.bs.offcanvas', () => {
      searchInput.focus();
    }, { once: true });
  });
}

/* ============================================
   EXPORTS
   ============================================ */

window.openWorkoutFilterOffcanvas = openWorkoutFilterOffcanvas;

console.log('📦 Workout History Workout Filter module loaded (v1.1.0)');
