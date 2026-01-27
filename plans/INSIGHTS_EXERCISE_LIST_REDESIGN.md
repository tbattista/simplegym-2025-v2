# Insights Tab - Exercise Performance Redesign

## Overview

Transform the Exercise Performance section from "card explosion" SaaS widgets into calm, notebook-style logbook rows. Primary stat: **Last Working Set** (user choice A).

## Design Philosophy

| Current | Target |
|---------|--------|
| Big cards with badges + colors | Minimal logbook rows |
| Session count badges ("7 sessions") | Last performed date + weight |
| Bright trend badges | Small, muted trend arrows |
| Full stat cards in expansion | Last 3-5 sessions, top set only |
| Avatar icons, tile shadows | Gray separators, soft backgrounds |

## Data Available (API Already Provides)

The `ExerciseHistory` model includes everything needed:

```
{
  exercise_name: "Bench Press",
  last_weight: "30",
  last_weight_unit: "kg",
  last_session_date: "2026-01-22T...",
  last_weight_direction: "up" | "down" | null,
  total_sessions: 7,
  best_weight: "32.5",
  best_weight_date: "...",
  recent_sessions: [
    { date: "2026-01-22", weight: 30, sets: 3 },
    { date: "2026-01-18", weight: 27.5, sets: 3 },
    ...
  ]
}
```

## UI Specification

### Collapsed Row (Default View)

```
┌────────────────────────────────────────────────────────┐
│ Bench Press                                        ▼   │
│ 30kg × 8  · Jan 22                              ↑      │
└────────────────────────────────────────────────────────┘
```

**Hierarchy:**
1. Exercise Name (anchor, bold)
2. Last Working Set (primary signal: `30kg × 8`)
3. Last Date (context: `Jan 22`)
4. Trend Arrow (secondary hint, muted)
5. Expand Chevron (optional deep dive)

### Expanded View (On Tap)

```
┌────────────────────────────────────────────────────────┐
│ Bench Press                                        ▲   │
│ 30kg × 8  · Jan 22                              ↑      │
├────────────────────────────────────────────────────────┤
│   Jan 22 — 30kg × 8                                    │
│   Jan 18 — 27.5kg × 8                                  │
│   Jan 15 — 25kg × 10                                   │
│                                                        │
│   Note: Felt strong, good bar speed                    │
└────────────────────────────────────────────────────────┘
```

**Expansion Content:**
- Last 3-5 sessions only
- Top set per session
- Notes (if any)
- NO stat cards, NO progress bars

## Implementation Plan

### Phase 1: JavaScript Changes

**File:** `frontend/assets/js/dashboard/workout-history.js`

#### 1.1 Replace `createExercisePerformanceCard()` Function

**Current:** (Lines 626-667)
- Uses `.card` with `.history-header`
- Avatar icons, badge pills
- Full collapse structure

**New:** `createExerciseRow()` function

```javascript
function createExerciseRow(history) {
  const sanitizedId = history.id.replace(/[^a-zA-Z0-9-_]/g, '-');
  const collapseId = `exercise-${sanitizedId}`;
  const isExpanded = window.ghostGym.workoutHistory.expandedExercises.has(history.id);

  // Primary stat: last working set
  const lastWeight = history.last_weight || '—';
  const lastUnit = history.last_weight_unit || 'lbs';
  const lastReps = getLastReps(history); // From recent_sessions[0]
  const lastDate = formatExerciseDate(history.last_session_date);

  // Trend arrow (muted)
  const trendArrow = getTrendArrow(history.last_weight_direction);

  return `
    <div class="exercise-row" id="exercise-entry-${sanitizedId}"
         data-bs-toggle="collapse"
         data-bs-target="#${collapseId}"
         role="button"
         aria-expanded="${isExpanded}"
         aria-controls="${collapseId}">
      <div class="exercise-row-main">
        <span class="exercise-name">${escapeHtml(history.exercise_name)}</span>
        <i class="bx bx-chevron-down exercise-chevron"></i>
      </div>
      <div class="exercise-row-meta">
        <span class="exercise-last-set">${lastWeight}${lastUnit} × ${lastReps}</span>
        <span class="exercise-dot">·</span>
        <span class="exercise-date">${lastDate}</span>
        ${trendArrow}
      </div>
    </div>
    <div id="${collapseId}" class="collapse exercise-details-collapse ${isExpanded ? 'show' : ''}">
      <div class="exercise-details-wrapper">
        ${renderExerciseHistory(history)}
      </div>
    </div>
  `;
}
```

#### 1.2 Add Helper Functions

```javascript
function getLastReps(history) {
  if (history.recent_sessions && history.recent_sessions.length > 0) {
    const lastSession = history.recent_sessions[0];
    return lastSession.reps || lastSession.sets || '—';
  }
  return '—';
}

function getTrendArrow(direction) {
  if (!direction) return '';
  if (direction === 'up') {
    return '<span class="trend-arrow trend-up" title="Trending up">↑</span>';
  }
  if (direction === 'down') {
    return '<span class="trend-arrow trend-down" title="Trending down">↓</span>';
  }
  return '<span class="trend-arrow trend-stable" title="Stable">→</span>';
}

function formatExerciseDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();

  // Same year: "Jan 22"
  // Different year: "Jan 22, 2025"
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
```

#### 1.3 Replace `renderExercisePerformanceDetails()` Function

**Current:** (Lines 672-718)
- Row of colored stat cards
- Full table with headers

**New:** `renderExerciseHistory()` function

```javascript
function renderExerciseHistory(history) {
  const recentSessions = (history.recent_sessions || []).slice(0, 5);

  if (recentSessions.length === 0) {
    return '<div class="exercise-history-empty">No session data yet</div>';
  }

  const sessionsHtml = recentSessions.map(session => {
    const date = formatExerciseDate(session.date);
    const weight = session.weight || '—';
    const unit = session.weight_unit || history.last_weight_unit || 'lbs';
    const reps = session.reps || session.sets || '—';

    return `
      <div class="exercise-history-row">
        <span class="history-date">${date}</span>
        <span class="history-dash">—</span>
        <span class="history-set">${weight}${unit} × ${reps}</span>
      </div>
    `;
  }).join('');

  // Optional: notes from last session
  const notesHtml = history.notes ? `
    <div class="exercise-history-notes">
      <span class="notes-label">Note:</span> ${escapeHtml(history.notes)}
    </div>
  ` : '';

  return `
    <div class="exercise-history-list">
      ${sessionsHtml}
    </div>
    ${notesHtml}
  `;
}
```

#### 1.4 Update `renderExercisePerformance()` Function

**Current:** (Lines 602-621)
- Renders cards with `createExercisePerformanceCard`

**Change:** Use new row-based structure

```javascript
function renderExercisePerformance() {
  const histories = window.ghostGym.workoutHistory.exerciseHistories;
  const container = document.getElementById('exercisePerformanceContainer');

  const historyArray = Object.values(histories);

  if (historyArray.length === 0) {
    container.innerHTML = `
      <div class="exercise-list-empty">
        <p class="text-muted">No exercise data yet</p>
      </div>
    `;
    return;
  }

  // Wrap in exercise list container (no card)
  container.innerHTML = `
    <div class="exercise-list">
      ${historyArray.map(history => createExerciseRow(history)).join('')}
    </div>
  `;
}
```

---

### Phase 2: CSS Changes

**File:** `frontend/assets/css/workout-history.css`

Add new section for exercise rows:

```css
/* ============================================
   V2.1 - EXERCISE LIST (Logbook Style)
   ============================================ */

/* Container - no card, just list */
.exercise-list {
  background: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  overflow: hidden;
}

/* Single Exercise Row */
.exercise-row {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--bs-border-color);
  cursor: pointer;
  transition: background-color 0.15s ease;
  background: var(--bs-card-bg);
}

.exercise-row:last-of-type {
  border-bottom: none;
}

.exercise-row:hover {
  background-color: var(--bs-gray-50);
}

.exercise-row[aria-expanded="true"] {
  background-color: var(--bs-gray-100);
}

/* Main row: name + chevron */
.exercise-row-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exercise-name {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--bs-heading-color);
}

.exercise-chevron {
  font-size: 1.125rem;
  color: var(--bs-secondary-color);
  transition: transform 0.2s ease;
}

.exercise-row[aria-expanded="true"] .exercise-chevron {
  transform: rotate(180deg);
}

/* Meta row: set + date + trend */
.exercise-row-meta {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
}

.exercise-last-set {
  font-weight: 500;
  color: var(--bs-body-color);
}

.exercise-dot {
  color: var(--bs-secondary-color);
}

.exercise-date {
  color: var(--bs-secondary-color);
}

/* Trend Arrows - MUTED */
.trend-arrow {
  font-size: 0.75rem;
  margin-left: 0.25rem;
}

.trend-arrow.trend-up {
  color: var(--bs-secondary-color); /* NOT bright green */
}

.trend-arrow.trend-down {
  color: var(--bs-secondary-color);
}

.trend-arrow.trend-stable {
  color: var(--bs-secondary-color);
}

/* Expanded Details */
.exercise-details-collapse {
  border-bottom: 1px solid var(--bs-border-color);
}

.exercise-details-wrapper {
  padding: 0.75rem 1rem 1rem;
  background: var(--bs-gray-50);
}

/* History List (expanded) */
.exercise-history-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.exercise-history-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--bs-body-color);
}

.history-date {
  color: var(--bs-secondary-color);
  min-width: 4rem;
}

.history-dash {
  color: var(--bs-secondary-color);
}

.history-set {
  font-weight: 500;
}

/* Notes in expansion */
.exercise-history-notes {
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--bs-border-color);
  font-size: 0.8125rem;
  font-style: italic;
  color: var(--bs-secondary-color);
}

.notes-label {
  font-style: normal;
  font-weight: 500;
}

/* Empty state */
.exercise-history-empty,
.exercise-list-empty {
  padding: 1.5rem;
  text-align: center;
  color: var(--bs-secondary-color);
  font-size: 0.875rem;
}

/* ============================================
   V2.1 - DARK MODE
   ============================================ */

[data-bs-theme="dark"] .exercise-list {
  background: var(--bs-gray-900);
}

[data-bs-theme="dark"] .exercise-row {
  background: var(--bs-gray-900);
}

[data-bs-theme="dark"] .exercise-row:hover {
  background: var(--bs-gray-800);
}

[data-bs-theme="dark"] .exercise-row[aria-expanded="true"] {
  background: var(--bs-gray-800);
}

[data-bs-theme="dark"] .exercise-details-wrapper {
  background: var(--bs-gray-800);
}

/* ============================================
   V2.1 - MOBILE RESPONSIVE
   ============================================ */

@media (max-width: 767.98px) {
  .exercise-row {
    padding: 0.75rem;
  }

  .exercise-name {
    font-size: 0.875rem;
  }

  .exercise-row-meta {
    font-size: 0.75rem;
  }

  .exercise-details-wrapper {
    padding: 0.625rem 0.75rem 0.875rem;
  }

  .exercise-history-row {
    font-size: 0.8125rem;
  }
}

/* ============================================
   V2.1 - REDUCED MOTION
   ============================================ */

@media (prefers-reduced-motion: reduce) {
  .exercise-row,
  .exercise-chevron,
  .exercise-details-collapse {
    transition: none !important;
  }
}
```

---

### Phase 3: HTML Updates (Minor)

**File:** `frontend/workout-history.html`

The current HTML structure is fine. The container `#exercisePerformanceContainer` remains the same - just the JS renders different content.

**Optional cleanup:** Remove the "Exercise Performance" heading's icon if desired:

```html
<!-- Current -->
<h5 class="mb-3">
  <i class="bx bx-trending-up me-2"></i>
  Exercise Performance
</h5>

<!-- Simpler (optional) -->
<h5 class="mb-3">Exercises</h5>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/assets/js/dashboard/workout-history.js` | Replace card functions with row functions |
| `frontend/assets/css/workout-history.css` | Add exercise-list CSS, can remove old history-card exercise styles |
| `frontend/workout-history.html` | Optional: simplify heading |

## Data Validation Rules

Apply these before rendering:

- `last_weight <= 0` → show "—"
- `last_reps > 30` → cap display at 30
- `recent_sessions` → limit to 5 max
- Missing data → graceful fallbacks ("—")

## Design Constraints

**DO:**
- Gray separators
- Soft backgrounds
- Minimal borders
- Single tap target per row

**DON'T:**
- Colored stat cards
- Progress bars
- Gamification visuals
- Tile shadows
- Avatar icons

## Testing Checklist

- [ ] Collapsed rows show: name, last set, date, trend
- [ ] Tap expands to show 3-5 sessions
- [ ] Trend arrows are muted gray
- [ ] Dark mode works
- [ ] Mobile responsive (smaller text, tighter padding)
- [ ] Empty state renders correctly
- [ ] Exercises with missing data show "—"
- [ ] Notes display in expansion when present

## Rollback

If issues arise, the original functions can be restored:
- `createExercisePerformanceCard()` → line 626
- `renderExercisePerformanceDetails()` → line 672

Simply rename the new functions and swap back.
