# Phase 4: Exercise Card Renderer V2 Implementation Plan

## Overview

This document details the implementation plan for refactoring [`exercise-card-renderer.js`](../frontend/assets/js/components/exercise-card-renderer.js) to generate the new logbook-card HTML structure that integrates with the V2 morph controllers.

**Current Status:** Ready for implementation
**Dependencies:** 
- ✅ [`logbook-theme.css`](../frontend/assets/css/logbook-theme.css) (1,348 lines)
- ✅ [`weight-field-controller.js`](../frontend/assets/js/controllers/weight-field-controller.js) (289 lines)
- ✅ [`repssets-field-controller.js`](../frontend/assets/js/controllers/repssets-field-controller.js) (280 lines)

---

## Target HTML Structure

The new card structure uses a 3-layer hierarchy (from demo lines 1550-1755):

```html
<div class="logbook-card" data-exercise-index="0" data-exercise-name="Bench Press">
  <!-- Layer 1: Collapsed Header (always visible) -->
  <div class="logbook-card-header">
    <div class="logbook-exercise-info">
      <div class="logbook-exercise-name">
        Bench Press
        <span class="status-badge logged">✓ Logged</span>
        <span class="additional-exercise-badge">+</span> <!-- Bonus badge -->
      </div>
      <div class="logbook-exercise-meta">3 × 8-12 • 90s rest</div>
      <div class="logbook-state-row">
        <span class="logbook-state-item highlight">Today: 185 lbs</span>
        <span class="logbook-state-item">Last: 180 lbs</span>
        <span class="logbook-state-item next-up">Next: +5</span>
      </div>
    </div>
    <div class="logbook-header-actions">
      <button class="logbook-more-btn">⋮</button>
      <i class="bx bx-chevron-down logbook-chevron"></i>
      <!-- Layer 2: More Menu (hidden dropdown) -->
      <div class="logbook-menu">...</div>
    </div>
  </div>
  
  <!-- Layer 3: Expanded Body (shown when card is active) -->
  <div class="logbook-card-body">
    <!-- Weight Section with Morph Pattern -->
    <div class="logbook-section">
      <div class="logbook-section-label">Today</div>
      <div class="logbook-weight-field" data-weight="185" data-unit="lbs">
        <!-- Display Mode -->
        <div class="weight-display">
          <div class="weight-value-group">
            <span class="weight-value">185</span>
            <span class="weight-unit">lbs</span>
          </div>
          <button class="weight-edit-btn">✏️</button>
          <button class="note-toggle-btn">📝</button>
        </div>
        <!-- Edit Mode (hidden) -->
        <div class="weight-editor" style="display: none;">
          <button class="weight-stepper-btn minus">−5</button>
          <input type="number" class="weight-input" value="185" />
          <button class="weight-stepper-btn plus">+5</button>
          <div class="weight-editor-actions">
            <button class="weight-save-btn">✓</button>
            <button class="weight-cancel-btn">✕</button>
          </div>
        </div>
      </div>
      <div class="logbook-notes-row">
        <textarea class="logbook-notes-input" placeholder="Add a note..."></textarea>
      </div>
    </div>

    <!-- Sets × Reps Section with Morph Pattern -->
    <div class="logbook-section">
      <div class="logbook-section-label">Sets × Reps</div>
      <div class="logbook-repssets-field" data-sets="3" data-reps="10">
        <!-- Display Mode -->
        <div class="repssets-display">
          <div class="repssets-value-group">
            <span class="repssets-value sets-value">3</span>
            <span class="repssets-separator">×</span>
            <span class="repssets-value reps-value">10</span>
          </div>
          <button class="repssets-edit-btn">✏️</button>
        </div>
        <!-- Edit Mode (hidden) -->
        <div class="repssets-editor" style="display: none;">...</div>
      </div>
    </div>

    <!-- Inline Rest Timer -->
    <div class="logbook-section">
      <div class="logbook-section-label">Rest Timer</div>
      <div class="inline-rest-timer" data-rest-duration="90">...</div>
    </div>

    <!-- Weight History (Tree Style) -->
    <div class="logbook-section">
      <div class="logbook-section-label">Weight History</div>
      <div class="logbook-history">...</div>
    </div>

    <!-- Direction Chips (Horizontal) -->
    <div class="logbook-section">
      <div class="logbook-section-label">Next Session Weight</div>
      <div class="logbook-next-chips">
        <button class="logbook-chip" data-direction="decrease">↓ Decrease</button>
        <button class="logbook-chip" data-direction="same">= No Change</button>
        <button class="logbook-chip" data-direction="increase">↑ Increase</button>
      </div>
    </div>

    <!-- Primary Action -->
    <div class="logbook-actions">
      <button class="logbook-primary-action save">Log Entry</button>
    </div>
  </div>
</div>
```

---

## Implementation Tasks

### Task 4.1: Refactor `renderCard()` Method

**Current:** Returns HTML with `.card.exercise-card` structure
**Target:** Returns HTML with `.logbook-card` structure

**Key Changes:**
1. Replace outer `<div class="card exercise-card">` with `<div class="logbook-card">`
2. Replace `card-header exercise-card-header` with `logbook-card-header`
3. Replace `card-body exercise-card-body` with `logbook-card-body`
4. Add state classes: `logged`, `skipped`, `expanded`
5. Preserve `data-exercise-index` and `data-exercise-name` attributes

**New Method Signature:**
```javascript
renderCard(group, index, isBonus = false, totalCards = 0) {
  // Extract exercise data (keep existing logic)
  // Build new HTML structure
  return this._buildLogbookCard(data);
}
```

---

### Task 4.2: Add Data Attributes for Controller Initialization

**Weight Field:**
```html
<div class="logbook-weight-field" 
     data-weight="${currentWeight}" 
     data-unit="${currentUnit}">
```

**Reps/Sets Field:**
```html
<div class="logbook-repssets-field" 
     data-sets="${sets}" 
     data-reps="${reps}">
```

**Rest Timer:**
```html
<div class="inline-rest-timer" 
     data-rest-duration="${restSeconds}">
```

---

### Task 4.3: Render Weight Field with Morph Pattern

**New Helper Method:** `_renderWeightField()`

```javascript
_renderWeightField(exerciseName, currentWeight, currentUnit) {
  return `
    <div class="logbook-section">
      <div class="logbook-section-label">Today</div>
      <div class="logbook-weight-field" data-weight="${currentWeight || 0}" data-unit="${currentUnit}">
        <!-- Display Mode -->
        <div class="weight-display">
          <div class="weight-value-group">
            <span class="weight-value">${currentWeight || '—'}</span>
            ${currentUnit !== 'other' ? `<span class="weight-unit">${currentUnit}</span>` : ''}
          </div>
          <button class="weight-edit-btn" aria-label="Edit weight" title="Edit weight">
            <i class="bx bx-pencil"></i>
          </button>
          <button class="note-toggle-btn" aria-label="Toggle note" title="Add note">
            <i class="bx bx-note"></i>
          </button>
        </div>
        
        <!-- Edit Mode (hidden initially) -->
        <div class="weight-editor" style="display: none;">
          <button class="weight-stepper-btn minus" aria-label="Decrease by 5">−5</button>
          <input type="number" class="weight-input" value="${currentWeight || ''}" 
                 step="5" min="0" max="9999" inputmode="decimal" />
          <button class="weight-stepper-btn plus" aria-label="Increase by 5">+5</button>
          <div class="weight-editor-actions">
            <button class="weight-save-btn" aria-label="Save weight" title="Save">
              <i class="bx bx-check"></i>
            </button>
            <button class="weight-cancel-btn" aria-label="Cancel edit" title="Cancel">
              <i class="bx bx-x"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="logbook-notes-row">
        <textarea class="logbook-notes-input" placeholder="Add a note..." rows="2"></textarea>
      </div>
    </div>
  `;
}
```

---

### Task 4.4: Render Reps/Sets Field with Morph Pattern

**New Helper Method:** `_renderRepsSetsField()`

```javascript
_renderRepsSetsField(exerciseName, sets, reps) {
  // Parse sets and reps (handle "8-12" format)
  const setsNum = parseInt(sets) || 3;
  const repsDisplay = reps; // Keep original format for display
  const repsNum = parseInt(reps) || 10; // For input default
  
  return `
    <div class="logbook-section">
      <div class="logbook-section-label">Sets × Reps</div>
      <div class="logbook-repssets-field" data-sets="${setsNum}" data-reps="${repsNum}">
        <!-- Display Mode -->
        <div class="repssets-display">
          <div class="repssets-value-group">
            <span class="repssets-value sets-value">${setsNum}</span>
            <span class="repssets-separator">×</span>
            <span class="repssets-value reps-value">${repsDisplay}</span>
          </div>
          <button class="repssets-edit-btn" aria-label="Edit sets and reps" title="Edit sets and reps">
            <i class="bx bx-pencil"></i>
          </button>
        </div>
        
        <!-- Edit Mode (hidden initially) -->
        <div class="repssets-editor" style="display: none;">
          <input type="number" class="repssets-input sets-input" value="${setsNum}" 
                 min="1" max="20" inputmode="numeric" />
          <span class="repssets-separator-edit">×</span>
          <input type="number" class="repssets-input reps-input" value="${repsNum}" 
                 min="1" max="999" inputmode="numeric" />
          <div class="repssets-editor-actions">
            <button class="repssets-save-btn" aria-label="Save" title="Save">
              <i class="bx bx-check"></i>
            </button>
            <button class="repssets-cancel-btn" aria-label="Cancel" title="Cancel">
              <i class="bx bx-x"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
```

---

### Task 4.5: Update Direction Chips to Horizontal Layout

**New Helper Method:** `_renderDirectionChips()`

Replace the vertical toggle buttons with horizontal chips:

```javascript
_renderDirectionChips(exerciseName, currentDirection, isSessionActive) {
  if (!isSessionActive) {
    return ''; // Only show during active session
  }
  
  return `
    <div class="logbook-section">
      <div class="logbook-section-label">Next Session Weight (optional)</div>
      <div class="logbook-next-chips">
        <button class="logbook-chip ${currentDirection === 'down' ? 'active' : ''}" 
                data-direction="decrease"
                data-exercise-name="${this._escapeHtml(exerciseName)}"
                onclick="window.workoutModeController.toggleWeightDirection(this, '${this._escapeHtml(exerciseName)}', 'down'); event.stopPropagation();">
          <i class="bx bx-minus"></i>Decrease
        </button>
        <button class="logbook-chip ${!currentDirection || currentDirection === 'same' ? 'active' : ''}" 
                data-direction="same"
                data-exercise-name="${this._escapeHtml(exerciseName)}"
                onclick="window.workoutModeController.toggleWeightDirection(this, '${this._escapeHtml(exerciseName)}', 'same'); event.stopPropagation();">
          <i class="bx bx-check"></i>No Change
        </button>
        <button class="logbook-chip ${currentDirection === 'up' ? 'active' : ''}" 
                data-direction="increase"
                data-exercise-name="${this._escapeHtml(exerciseName)}"
                onclick="window.workoutModeController.toggleWeightDirection(this, '${this._escapeHtml(exerciseName)}', 'up'); event.stopPropagation();">
          <i class="bx bx-plus"></i>Increase
        </button>
      </div>
    </div>
  `;
}
```

---

### Task 4.6: Update Weight History to Tree-Style Display

**Update existing** `_renderWeightHistory()` method:

```javascript
_renderWeightHistory(exerciseName, lastWeight, lastWeightUnit, lastSessionDate, recentSessions) {
  if (!lastWeight || !lastSessionDate) {
    return '';
  }
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  const sessionsToShow = recentSessions ? recentSessions.slice(0, 4) : [];
  
  return `
    <div class="logbook-section">
      <div class="logbook-section-label">Weight History</div>
      <div class="logbook-history">
        <div class="logbook-history-primary">
          <span class="history-label">Last:</span>
          <span class="history-weight">${lastWeight}${lastWeightUnit !== 'other' ? ` ${lastWeightUnit}` : ''}</span>
          <span class="history-date">on ${formatDate(lastSessionDate)}</span>
        </div>
        ${sessionsToShow.length > 1 ? `
          <div class="logbook-history-tree">
            ${sessionsToShow.slice(1).map((session, idx) => {
              const isLast = idx === sessionsToShow.length - 2;
              const connector = isLast ? '└─' : '├─';
              const weight = session.weight || '—';
              const unit = session.weight_unit || 'lbs';
              return `
                <div class="logbook-history-tree-item">
                  <span class="tree-branch">${connector}</span>
                  <span class="history-weight">${weight}${unit !== 'other' ? ` ${unit}` : ''}</span>
                  <span>on ${formatDate(session.date)}</span>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}
```

---

### Task 4.7: Add Inline Rest Timer Section

**New Helper Method:** `_renderInlineRestTimer()`

```javascript
_renderInlineRestTimer(restSeconds, restDisplay) {
  return `
    <div class="logbook-section">
      <div class="logbook-section-label">Rest Timer</div>
      <div class="inline-rest-timer" data-rest-duration="${restSeconds}">
        <div class="rest-timer-ready">
          <span class="rest-timer-duration">${restDisplay}</span>
          <a href="javascript:void(0)" class="rest-timer-start-link" 
             onclick="window.inlineTimerStart && window.inlineTimerStart(this); return false;">
            <i class="bx bx-play-circle"></i> Start Rest
          </a>
        </div>
        <div class="rest-timer-counting">
          <span class="rest-timer-countdown">${restSeconds}</span>
          <div class="rest-timer-inline-controls">
            <button class="rest-timer-inline-btn pause" onclick="window.inlineTimerPause && window.inlineTimerPause(this)">
              <i class="bx bx-pause"></i>
              <span class="btn-label">Pause</span>
            </button>
            <button class="rest-timer-inline-btn" onclick="window.inlineTimerReset && window.inlineTimerReset(this)">
              <i class="bx bx-refresh"></i>
              <span class="btn-label">Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
```

---

## Integration with Controllers

After card rendering, initialize controllers in the card manager or workout mode controller:

```javascript
// In workout-mode-controller.js or exercise-card-manager.js
function initializeLogbookControllers() {
  // Initialize weight field controllers
  if (window.initializeWeightFields) {
    window.initializeWeightFields(window.workoutSessionService);
  }
  
  // Initialize reps/sets field controllers
  if (window.initializeRepsSetsFields) {
    window.initializeRepsSetsFields(window.workoutSessionService);
  }
  
  console.log('✅ Logbook controllers initialized');
}

// Call after cards are rendered
document.addEventListener('cardsRendered', initializeLogbookControllers);
```

---

## State Classes Reference

| Class | When Applied | Visual Effect |
|-------|--------------|---------------|
| `.logbook-card` | Always | Base card styling |
| `.logbook-card.expanded` | Card is open | Blue border, body visible |
| `.logbook-card.logged` | Entry saved | Green left border, success background |
| `.logbook-card.skipped` | Exercise skipped | Orange left border, strikethrough name |

---

## Backward Compatibility Considerations

1. **Keep existing data flow**: All data still comes from `sessionService.getExerciseWeight()`, etc.
2. **Preserve event handlers**: `toggleExerciseCard()`, `handleCompleteExercise()`, etc. still work
3. **Support gradual rollout**: Could add feature flag to switch between V1 and V2 rendering

---

## Files to Modify

| File | Changes |
|------|---------|
| [`exercise-card-renderer.js`](../frontend/assets/js/components/exercise-card-renderer.js) | Complete refactor of `renderCard()` method |
| [`workout-mode.html`](../frontend/workout-mode.html) | Link `logbook-theme.css` and controller scripts |

---

## Testing Checklist

- [ ] Cards render with new `.logbook-card` structure
- [ ] Weight field morph pattern works (display → edit → save)
- [ ] Reps/sets field morph pattern works
- [ ] Direction chips are horizontal and functional
- [ ] Weight history shows tree-style display
- [ ] Inline rest timer placeholder renders
- [ ] Bonus exercise badge displays correctly
- [ ] Skipped state styling applies correctly
- [ ] Completed state styling applies correctly
- [ ] Mobile responsive layout works
- [ ] Dark mode styling applies

---

## Next Steps After Phase 4

1. **Phase 5**: Initialize controllers in workout mode flow
2. **Phase 6**: Test full integration with session service
3. **Phase 7-12**: Complete remaining features per main implementation plan

---

*Document created: 2026-01-13*
*Related: [WORKOUT_MODE_LOGBOOK_V2_IMPLEMENTATION_PLAN.md](./WORKOUT_MODE_LOGBOOK_V2_IMPLEMENTATION_PLAN.md)*