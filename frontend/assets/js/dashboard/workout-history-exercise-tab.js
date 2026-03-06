/**
 * Workout History - Exercise Tab Renderer
 * Renders the exercise overview tab/section for All Sessions mode
 * @version 1.0.0
 */

/* ============================================
   MAIN RENDER
   ============================================ */

/**
 * Render the exercise tab content
 * Works for both mobile tab pane and desktop sidebar card
 */
function renderExerciseTab() {
  const container = document.getElementById('exerciseTabContainer');
  if (!container) return;

  const state = window.ffn.workoutHistory;
  let groups = state.allExerciseGroups || [];

  if (groups.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4">
        <i class="bx bx-dumbbell display-4 text-muted"></i>
        <p class="mt-3 text-muted">No exercise data yet</p>
      </div>
    `;
    return;
  }

  // Apply search filter
  const search = (state.exerciseTabSearch || '').toLowerCase().trim();
  if (search) {
    groups = groups.filter(g => {
      if (g.baseName.toLowerCase().includes(search)) return true;
      return g.variants.some(v => v.fullName.toLowerCase().includes(search));
    });
  }

  // Apply sort
  groups = sortExerciseGroups(groups, state.exerciseTabSort);

  // Sort labels
  const sortLabels = {
    'frequency': 'Frequency',
    'name': 'A-Z',
    'recent': 'Recent'
  };

  // Build HTML
  let html = '';

  // Search + sort bar
  html += `
    <div class="exercise-tab-toolbar">
      <div class="exercise-tab-search-wrapper">
        <i class="bx bx-search exercise-tab-search-icon"></i>
        <input type="text" class="form-control form-control-sm exercise-tab-search"
               placeholder="Search exercises..."
               value="${escapeHtml(state.exerciseTabSearch || '')}"
               oninput="handleExerciseTabSearch(this.value)">
      </div>
      <button class="exercise-sort-btn" onclick="cycleExerciseTabSort()" title="Sort exercises">
        <i class="bx bx-sort-alt-2"></i> ${sortLabels[state.exerciseTabSort]}
      </button>
    </div>
  `;

  if (groups.length === 0) {
    html += `
      <div class="text-center py-3">
        <p class="text-muted mb-0">No exercises match "${escapeHtml(search)}"</p>
      </div>
    `;
  } else {
    html += `<div class="exercise-group-list">`;
    for (const group of groups) {
      html += renderExerciseGroup(group);
    }
    html += `</div>`;
  }

  container.innerHTML = html;
}

/* ============================================
   GROUP RENDERING
   ============================================ */

/**
 * Render a single exercise group (base movement + variants)
 */
function renderExerciseGroup(group) {
  const state = window.ffn.workoutHistory;
  const groupId = `exgrp-${group.baseName.replace(/[^a-zA-Z0-9]/g, '-')}`;
  const isExpanded = state.expandedExerciseGroups.has(group.baseName);
  const sessionLabel = group.totalSessions === 1 ? '1 session' : `${group.totalSessions} sessions`;
  const lastDate = group.lastDate ? formatExerciseDate(group.lastDate) : '';
  const hasMultipleVariants = group.variants.length > 1;

  let html = `
    <div class="exercise-group-item">
      <div class="exercise-group-header"
           onclick="toggleExerciseGroup('${escapeHtml(group.baseName)}')"
           role="button"
           aria-expanded="${isExpanded}"
           aria-controls="${groupId}">
        <div class="exercise-group-header-left">
          <span class="exercise-group-name">${escapeHtml(group.baseName)}</span>
          ${hasMultipleVariants ? `<span class="exercise-group-variant-count">${group.variants.length} variants</span>` : ''}
        </div>
        <div class="exercise-group-header-right">
          <span class="exercise-group-count">${sessionLabel}</span>
          <span class="exercise-group-date">${lastDate}</span>
          <i class="bx bx-chevron-down exercise-group-chevron ${isExpanded ? 'rotated' : ''}"></i>
        </div>
      </div>
      <div id="${groupId}" class="exercise-group-body" style="${isExpanded ? '' : 'display: none;'}">
  `;

  if (hasMultipleVariants) {
    // Multiple variants: show each with equipment label
    for (const variant of group.variants) {
      html += renderExerciseVariant(variant, true);
    }
  } else {
    // Single variant: show timeline directly
    html += renderExerciseVariant(group.variants[0], false);
  }

  html += `
      </div>
    </div>
  `;

  return html;
}

/**
 * Render a single equipment variant
 */
function renderExerciseVariant(variant, showHeader) {
  const lastWeight = variant.lastWeight || '--';
  const lastUnit = variant.lastWeightUnit || 'lbs';
  const lastReps = variant.lastReps || '--';
  const sessionLabel = variant.totalSessions === 1 ? '1x' : `${variant.totalSessions}x`;

  let html = `<div class="exercise-variant">`;

  if (showHeader) {
    html += `
      <div class="variant-header">
        <span class="variant-equipment">${escapeHtml(variant.equipment)}</span>
        <span class="variant-stats">${lastWeight} ${lastUnit} x ${lastReps} &middot; ${sessionLabel}</span>
      </div>
    `;
  }

  // Timeline entries
  const entries = variant.entries || [];
  if (entries.length > 0) {
    html += `<div class="variant-timeline">`;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const weight = entry.weight || '--';
      const unit = entry.weightUnit || 'lbs';
      const reps = entry.reps || entry.sets || '--';
      const date = formatExerciseDate(entry.date);
      const fadeClass = i === 0 ? '' : 'history-row-faded';

      html += `
        <div class="variant-entry ${fadeClass}">
          <span class="variant-entry-weight">${weight} ${unit} x ${reps}</span>
          <span class="variant-entry-date">&middot; ${date}</span>
        </div>
      `;
    }
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

/* ============================================
   INTERACTIONS
   ============================================ */

/**
 * Toggle exercise group expansion
 */
function toggleExerciseGroup(baseName) {
  const state = window.ffn.workoutHistory;
  if (state.expandedExerciseGroups.has(baseName)) {
    state.expandedExerciseGroups.delete(baseName);
  } else {
    state.expandedExerciseGroups.add(baseName);
  }

  // Toggle visibility directly for performance
  const groupId = `exgrp-${baseName.replace(/[^a-zA-Z0-9]/g, '-')}`;
  const body = document.getElementById(groupId);
  if (body) {
    body.style.display = state.expandedExerciseGroups.has(baseName) ? '' : 'none';
  }

  // Toggle chevron
  const header = body?.previousElementSibling;
  const chevron = header?.querySelector('.exercise-group-chevron');
  if (chevron) {
    chevron.classList.toggle('rotated', state.expandedExerciseGroups.has(baseName));
  }
}

/**
 * Handle search input
 */
function handleExerciseTabSearch(value) {
  window.ffn.workoutHistory.exerciseTabSearch = value;
  renderExerciseTab();
}

/**
 * Cycle sort mode
 */
function cycleExerciseTabSort() {
  const sortOrder = ['frequency', 'name', 'recent'];
  const current = window.ffn.workoutHistory.exerciseTabSort;
  const idx = sortOrder.indexOf(current);
  window.ffn.workoutHistory.exerciseTabSort = sortOrder[(idx + 1) % sortOrder.length];
  renderExerciseTab();
}

/* ============================================
   SORTING
   ============================================ */

function sortExerciseGroups(groups, mode) {
  const sorted = [...groups];
  switch (mode) {
    case 'frequency':
      sorted.sort((a, b) => b.totalSessions - a.totalSessions);
      break;
    case 'name':
      sorted.sort((a, b) => a.baseName.localeCompare(b.baseName));
      break;
    case 'recent':
      sorted.sort((a, b) => {
        const dateA = a.lastDate ? new Date(a.lastDate) : new Date(0);
        const dateB = b.lastDate ? new Date(b.lastDate) : new Date(0);
        return dateB - dateA;
      });
      break;
  }
  return sorted;
}

/* ============================================
   TAB VISIBILITY (MOBILE)
   ============================================ */

/**
 * Initialize tab visibility toggling for mobile
 * Hides session list when Exercises tab is active
 */
function initExerciseTabVisibility() {
  const tabsEl = document.getElementById('historyTabs');
  if (!tabsEl) return;

  tabsEl.addEventListener('shown.bs.tab', function(event) {
    const isExerciseTab = event.target.id === 'exercises-tab';
    const sessionContainer = document.getElementById('sessionHistoryContainer');
    const dateFilter = document.getElementById('dateFilterIndicator');

    if (sessionContainer) {
      sessionContainer.style.display = isExerciseTab ? 'none' : '';
    }
    if (dateFilter && isExerciseTab) {
      dateFilter.style.display = 'none';
    }
  });
}

/* ============================================
   EXPORTS
   ============================================ */

window.renderExerciseTab = renderExerciseTab;
window.toggleExerciseGroup = toggleExerciseGroup;
window.handleExerciseTabSearch = handleExerciseTabSearch;
window.cycleExerciseTabSort = cycleExerciseTabSort;
window.initExerciseTabVisibility = initExerciseTabVisibility;

console.log('Workout History Exercise Tab module loaded (v1.0.0)');
