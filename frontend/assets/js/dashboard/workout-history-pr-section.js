/**
 * Workout History - Personal Records Section
 * Renders horizontal scrolling PR chips at the top of the history page
 * @version 2.1.0
 */

/** Rewrite external ExerciseDB CDN URLs to local proxy */
function _proxyGifUrl(url) {
  if (!url) return url;
  return url.replace('https://static.exercisedb.dev/media/', '/api/v3/exercise-image/');
}

/** Cache of exercise name -> gifUrl lookups */
let _prGifCache = {};
let _exerciseCacheReady = false;

/**
 * Initialize the exercise cache for GIF lookups (called once)
 */
async function _initExerciseCacheForPR() {
  if (_exerciseCacheReady) return;
  const cacheService = window.exerciseCacheService;
  if (!cacheService) return;
  try {
    await cacheService.getExercisesWithInstantFallback();
    _exerciseCacheReady = true;
  } catch (e) {
    console.warn('[PR] Could not init exercise cache for GIFs:', e);
  }
}

/**
 * Look up a GIF URL for an exercise name
 */
function _lookupGifUrl(exerciseName) {
  if (!exerciseName) return null;
  if (_prGifCache[exerciseName] !== undefined) return _prGifCache[exerciseName];

  const cacheService = window.exerciseCacheService;
  if (!cacheService || !_exerciseCacheReady) {
    return null;
  }

  // Search with more results to find a good match
  const results = cacheService.searchExercises(exerciseName, { limit: 5 });
  const nameLower = exerciseName.toLowerCase();

  for (const match of results) {
    if (!match || !match.gifUrl || !match.name) continue;
    const matchLower = match.name.toLowerCase();
    // Accept: exact match, or PR name is contained in DB name (e.g. "Bench Press" in "Barbell Bench Press")
    if (matchLower === nameLower || matchLower.includes(nameLower) || nameLower.includes(matchLower)) {
      const proxied = _proxyGifUrl(match.gifUrl);
      _prGifCache[exerciseName] = proxied;
      return proxied;
    }
  }
  _prGifCache[exerciseName] = null;
  return null;
}

/**
 * Render the PR chips section at the top of the history page
 * Called on page load and whenever PRs change
 */
async function renderPRSection() {
  const container = document.getElementById('prSectionContainer');
  if (!container) return;

  const state = window.ffn.workoutHistory;
  const records = Array.from(state.personalRecords.values());

  if (records.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = '';

  // Sort: most recent first
  records.sort((a, b) => {
    const dateA = new Date(a.marked_at || a.session_date || 0);
    const dateB = new Date(b.marked_at || b.session_date || 0);
    return dateB - dateA;
  });

  // Initialize exercise cache for GIF lookups
  await _initExerciseCacheForPR();

  // Check stored visibility preference
  const isCollapsed = localStorage.getItem('ffn_pr_section_visible') === 'false';

  const chips = records.map(pr => {
    const dateStr = _formatPRDate(pr.session_date || pr.marked_at);
    const prId = pr.id;
    const gifUrl = _lookupGifUrl(pr.exercise_name);

    return `
      <div class="pr-chip" onclick="editPRValue('${escapeHtml(prId)}')" role="button" title="Click to edit PR value">
        <div class="pr-chip-top">
          <i class="bx bxs-trophy text-warning"></i>
          <span class="pr-chip-name">${escapeHtml(pr.exercise_name)}</span>
        </div>
        ${gifUrl ? `<img src="${escapeHtml(gifUrl)}" alt="" class="pr-chip-gif" onerror="this.style.display='none'" loading="lazy">` : ''}
        <span class="pr-chip-value">${escapeHtml(pr.value)} ${escapeHtml(pr.value_unit)}</span>
        ${dateStr ? `<span class="pr-chip-date">${dateStr}</span>` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="pr-section-header">
      <span class="pr-section-label">
        <i class="bx bxs-trophy"></i> Personal Records
      </span>
      <button class="pr-collapse-btn" onclick="togglePRSection()" title="Toggle PR section">
        <i class="bx ${isCollapsed ? 'bx-chevron-down' : 'bx-chevron-up'}"></i>
      </button>
    </div>
    <div class="pr-chips-collapsible${isCollapsed ? ' collapsed' : ''}">
      <div class="pr-chips-container">
        <div class="pr-chips-scroll">
          ${chips}
        </div>
      </div>
    </div>
  `;
}

/**
 * Edit a PR value inline — click on a chip to change the value
 */
async function editPRValue(prId) {
  const state = window.ffn.workoutHistory;
  const pr = state.personalRecords.get(prId);
  if (!pr) return;

  const newValue = await new Promise(resolve => {
    window.ffnModalManager.prompt(
      `Edit PR: ${pr.exercise_name}`,
      `Enter new PR value (${pr.value_unit}):`,
      pr.value,
      (val) => resolve(val),
      () => resolve(null)
    );
  });

  if (newValue === null || newValue.trim() === '' || newValue.trim() === pr.value) return;

  try {
    if (!window.dataManager) return;
    const token = await window.dataManager.getAuthToken();

    const response = await fetch(`/api/v3/users/me/personal-records/${prId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: newValue.trim(),
        value_unit: pr.value_unit
      })
    });

    if (response.ok) {
      // Update local state
      pr.value = newValue.trim();
      pr.marked_at = new Date().toISOString();

      if (window.showToast) window.showToast(`PR updated for ${pr.exercise_name}!`, 'success');
      renderPRSection();
      // Re-render exercise tab to reflect any changes
      if (window.renderExerciseTab) window.renderExerciseTab();
    } else {
      if (window.showToast) window.showToast('Failed to update PR', 'danger');
    }
  } catch (error) {
    console.error('Error updating PR:', error);
    if (window.showToast) window.showToast('Failed to update PR', 'danger');
  }
}

function _formatPRDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Toggle the PR chips section visibility
 */
function togglePRSection() {
  const collapsible = document.querySelector('.pr-chips-collapsible');
  const icon = document.querySelector('.pr-collapse-btn i');
  if (!collapsible || !icon) return;

  const isCollapsing = !collapsible.classList.contains('collapsed');
  collapsible.classList.toggle('collapsed');
  icon.className = isCollapsing ? 'bx bx-chevron-down' : 'bx bx-chevron-up';
  localStorage.setItem('ffn_pr_section_visible', !isCollapsing ? 'true' : 'false');
}

// Exports
window.renderPRSection = renderPRSection;
window.editPRValue = editPRValue;
window.togglePRSection = togglePRSection;

console.log('Workout History PR Section module loaded (v2.1.0)');
