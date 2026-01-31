/**
 * Ghost Gym - Workout History Exercises
 * Exercise performance rendering and filtering
 * @version 1.0.0
 */

/* ============================================
   EXERCISE PERFORMANCE RENDERING
   ============================================ */

/**
 * Render exercise performance section
 * Dynamic filter buckets based on data distribution
 */
function renderExercisePerformance() {
  const histories = window.ghostGym.workoutHistory.exerciseHistories;
  const container = document.getElementById('exercisePerformanceContainer');
  const currentFilter = window.ghostGym.workoutHistory.exerciseFilter;
  const currentSort = window.ghostGym.workoutHistory.exerciseSort;

  const historyArray = Object.values(histories);

  if (historyArray.length === 0) {
    container.innerHTML = `
      <div class="exercise-list-empty">
        <p class="text-muted">No exercise data yet</p>
      </div>
    `;
    return;
  }

  // Calculate dynamic filter buckets based on data
  const buckets = calculateFilterBuckets(historyArray);

  // Validate current filter - reset if bucket no longer exists
  const validFilters = ['all', ...buckets.map(b => b.key)];
  const activeFilter = validFilters.includes(currentFilter) ? currentFilter : 'all';
  if (activeFilter !== currentFilter) {
    window.ghostGym.workoutHistory.exerciseFilter = activeFilter;
  }

  // Apply filter
  const filteredExercises = filterExercisesByBucket(historyArray, activeFilter, buckets);

  // Apply sort
  const sortedExercises = sortExercises(filteredExercises, currentSort);

  // Sort button label
  const sortLabels = {
    'name': 'A-Z',
    'count-asc': '↑ Count',
    'count-desc': '↓ Count'
  };

  // Build filter buttons HTML
  const filterButtonsHtml = buckets.map(bucket => `
    <button class="exercise-filter-btn ${activeFilter === bucket.key ? 'active' : ''}"
            onclick="setExerciseFilter('${bucket.key}')"
            ${bucket.count === 0 ? 'disabled' : ''}>
      ${bucket.label} <span class="filter-count">${bucket.count}</span>
    </button>
  `).join('');

  // Build filter + sort bar
  const filterHtml = `
    <div class="exercise-filter-bar">
      <div class="exercise-filter-group">
        <button class="exercise-filter-btn ${activeFilter === 'all' ? 'active' : ''}"
                onclick="setExerciseFilter('all')">
          All <span class="filter-count">${historyArray.length}</span>
        </button>
        ${filterButtonsHtml}
      </div>
      <button class="exercise-sort-btn" onclick="cycleExerciseSort()" title="Sort exercises">
        <i class="bx bx-sort-alt-2"></i> ${sortLabels[currentSort]}
      </button>
    </div>
  `;

  // Build exercise list
  const listHtml = sortedExercises.length > 0
    ? `<div class="exercise-list">
        ${sortedExercises.map(history => createExerciseRow(history)).join('')}
       </div>`
    : `<div class="exercise-list-empty">
        <p class="text-muted">No exercises match this filter</p>
       </div>`;

  container.innerHTML = filterHtml + listHtml;
}

/* ============================================
   FILTER BUCKETS
   ============================================ */

/**
 * Calculate dynamic filter buckets based on data distribution
 * Creates 3 buckets using terciles (33rd, 66th percentile)
 */
function calculateFilterBuckets(exercises) {
  const counts = exercises.map(h => h.total_sessions || 1);
  const sorted = [...counts].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // If all same count or very small range, return minimal buckets
  if (max <= 2 || min === max) {
    return [{
      key: 'single',
      label: max === 1 ? '1×' : `1-${max}×`,
      min: 1,
      max: max,
      count: exercises.length
    }];
  }

  // Calculate tercile breakpoints
  const len = sorted.length;
  const t1Index = Math.floor(len / 3);
  const t2Index = Math.floor(2 * len / 3);

  let t1 = sorted[t1Index];
  let t2 = sorted[t2Index];

  // Ensure distinct boundaries (avoid overlapping buckets)
  if (t1 === t2) {
    // All values clustered - try to find natural breaks
    const unique = [...new Set(sorted)];
    if (unique.length >= 3) {
      t1 = unique[Math.floor(unique.length / 3)];
      t2 = unique[Math.floor(2 * unique.length / 3)];
    } else if (unique.length === 2) {
      t1 = unique[0];
      t2 = unique[1];
    }
  }

  // Build buckets
  const buckets = [];

  // Low bucket
  const lowCount = exercises.filter(h => (h.total_sessions || 1) <= t1).length;
  if (lowCount > 0) {
    buckets.push({
      key: 'low',
      label: t1 === 1 ? '1×' : `1-${t1}×`,
      min: 1,
      max: t1,
      count: lowCount
    });
  }

  // Mid bucket (only if distinct from low and high)
  if (t2 > t1) {
    const midCount = exercises.filter(h => {
      const c = h.total_sessions || 1;
      return c > t1 && c <= t2;
    }).length;
    if (midCount > 0) {
      buckets.push({
        key: 'mid',
        label: t2 === t1 + 1 ? `${t2}×` : `${t1 + 1}-${t2}×`,
        min: t1 + 1,
        max: t2,
        count: midCount
      });
    }
  }

  // High bucket
  if (max > t2) {
    const highCount = exercises.filter(h => (h.total_sessions || 1) > t2).length;
    if (highCount > 0) {
      buckets.push({
        key: 'high',
        label: `${t2 + 1}+×`,
        min: t2 + 1,
        max: Infinity,
        count: highCount
      });
    }
  }

  // Fallback: if somehow no buckets, return a single bucket
  if (buckets.length === 0) {
    return [{
      key: 'all-range',
      label: `${min}-${max}×`,
      min: min,
      max: max,
      count: exercises.length
    }];
  }

  return buckets;
}

/**
 * Filter exercises by dynamic bucket
 */
function filterExercisesByBucket(exercises, filterKey, buckets) {
  if (filterKey === 'all') return exercises;

  const bucket = buckets.find(b => b.key === filterKey);
  if (!bucket) return exercises;

  return exercises.filter(h => {
    const count = h.total_sessions || 1;
    return count >= bucket.min && count <= bucket.max;
  });
}

/**
 * Set exercise filter and re-render
 */
function setExerciseFilter(filter) {
  window.ghostGym.workoutHistory.exerciseFilter = filter;
  renderExercisePerformance();
}

/* ============================================
   SORTING
   ============================================ */

/**
 * Sort exercises by current sort mode
 */
function sortExercises(exercises, sortMode) {
  const sorted = [...exercises];

  switch (sortMode) {
    case 'name':
      sorted.sort((a, b) => (a.exercise_name || '').localeCompare(b.exercise_name || ''));
      break;
    case 'count-asc':
      sorted.sort((a, b) => (a.total_sessions || 1) - (b.total_sessions || 1));
      break;
    case 'count-desc':
      sorted.sort((a, b) => (b.total_sessions || 1) - (a.total_sessions || 1));
      break;
  }

  return sorted;
}

/**
 * Cycle through sort options and re-render
 */
function cycleExerciseSort() {
  const sortOrder = ['name', 'count-desc', 'count-asc'];
  const currentSort = window.ghostGym.workoutHistory.exerciseSort;
  const currentIndex = sortOrder.indexOf(currentSort);
  const nextIndex = (currentIndex + 1) % sortOrder.length;

  window.ghostGym.workoutHistory.exerciseSort = sortOrder[nextIndex];
  renderExercisePerformance();
}

/* ============================================
   EXERCISE ROW RENDERING
   ============================================ */

/**
 * Create exercise row (logbook style)
 */
function createExerciseRow(history) {
  const sanitizedId = history.id.replace(/[^a-zA-Z0-9-_]/g, '-');
  const collapseId = `exercise-${sanitizedId}`;
  const isExpanded = window.ghostGym.workoutHistory.expandedExercises.has(history.id);

  // Primary stat: last working set
  const lastWeight = history.last_weight || '—';
  const lastUnit = history.last_weight_unit || 'lbs';
  const lastReps = getLastReps(history);
  const lastDate = formatExerciseDate(history.last_session_date);

  // Session count
  const sessionCount = history.total_sessions || 1;
  const sessionLabel = sessionCount === 1 ? '1×' : `${sessionCount}×`;

  // Trend arrow (muted)
  const trendArrow = getTrendArrow(history.last_weight_direction);

  return `
    <div class="exercise-row" id="exercise-entry-${sanitizedId}"
         data-bs-toggle="collapse"
         data-bs-target="#${collapseId}"
         role="button"
         aria-expanded="${isExpanded}"
         aria-controls="${collapseId}"
         data-session-count="${sessionCount}">
      <div class="exercise-row-main">
        <span class="exercise-name">${escapeHtml(history.exercise_name)}</span>
        <span class="exercise-session-count" title="${sessionCount} sessions recorded">${sessionLabel}</span>
        ${trendArrow}
      </div>
      <div class="exercise-row-meta">
        <span class="exercise-last-set">${lastWeight} ${lastUnit} × ${lastReps}</span>
        <span class="exercise-date">· ${lastDate}</span>
      </div>
    </div>
    <div id="${collapseId}" class="collapse exercise-details-collapse ${isExpanded ? 'show' : ''}">
      <div class="exercise-details-wrapper">
        ${renderExerciseHistory(history)}
      </div>
    </div>
  `;
}

/**
 * Render exercise history (logbook style expansion)
 * Deduplicated, opacity fade for older entries
 */
function renderExerciseHistory(history) {
  const recentSessions = (history.recent_sessions || []).slice(0, 5);

  if (recentSessions.length === 0) {
    return '<div class="exercise-history-empty">No session data yet</div>';
  }

  // Deduplicate by date (keep highest weight per date)
  const uniqueSessions = deduplicateSessions(recentSessions, history.last_weight_unit);

  const sessionsHtml = uniqueSessions.map((session, index) => {
    const date = formatExerciseDate(session.date);
    const weight = session.weight || '—';
    const unit = session.weight_unit || history.last_weight_unit || 'lbs';
    const reps = session.reps || session.sets || '—';

    // Fade older entries: first is full, rest are muted
    const fadeClass = index === 0 ? '' : 'history-row-faded';

    return `
      <div class="exercise-history-row ${fadeClass}">
        <span class="history-set">${weight} ${unit} × ${reps}</span>
        <span class="history-date">· ${date}</span>
      </div>
    `;
  }).join('');

  return `<div class="exercise-history-list">${sessionsHtml}</div>`;
}

/**
 * Deduplicate sessions by date, keeping best set per date
 */
function deduplicateSessions(sessions, defaultUnit) {
  const byDate = {};

  sessions.forEach(s => {
    const dateKey = new Date(s.date).toDateString();
    const weight = parseFloat(s.weight) || 0;

    // Keep the entry with highest weight for each date
    if (!byDate[dateKey] || weight > (parseFloat(byDate[dateKey].weight) || 0)) {
      byDate[dateKey] = s;
    }
  });

  // Return sorted by date descending
  return Object.values(byDate).sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  );
}

/* ============================================
   EXPORTS
   ============================================ */

// Export to window for backwards compatibility
window.renderExercisePerformance = renderExercisePerformance;
window.calculateFilterBuckets = calculateFilterBuckets;
window.filterExercisesByBucket = filterExercisesByBucket;
window.setExerciseFilter = setExerciseFilter;
window.sortExercises = sortExercises;
window.cycleExerciseSort = cycleExerciseSort;
window.createExerciseRow = createExerciseRow;
window.renderExerciseHistory = renderExerciseHistory;
window.deduplicateSessions = deduplicateSessions;

console.log('📦 Workout History Exercises module loaded (v1.0.0)');
