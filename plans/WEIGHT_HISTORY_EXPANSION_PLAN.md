# Weight History Expansion Feature Plan

## Overview

Add an expandable weight history section under the "Last:" text in the weight section of exercise cards. Users can click an arrow to expand/collapse and see their last 5 workout weights for that exercise.

## Current State

### Data Available
The backend `ExerciseHistory` model already includes:
```python
recent_sessions: List[Dict[str, Any]] = Field(
    default_factory=list,
    max_items=5,
    description="Last 5 sessions with date, weight, sets"
)
```

This field stores the last 5 sessions with date, weight, and sets - exactly what we need.

### Current UI
```
┌─────────────────────────────────────────────┐
│  225 lbs          │  Next session:          │
│  Last: 205 lbs    │  [  ↑ More  ]          │
│  on Dec 28        │  [  ↓ Less  ]          │
└─────────────────────────────────────────────┘
```

## Proposed UI Design

### Collapsed State (Default)
```
┌─────────────────────────────────────────────┐
│  225 lbs          │  Next session:          │
│  Last: 205 lbs ▼  │  [  ↑ More  ]          │
│  on Dec 28        │  [  ↓ Less  ]          │
└─────────────────────────────────────────────┘
```
- Small down arrow (▼) indicates expandable content
- Single click expands the history

### Expanded State
```
┌─────────────────────────────────────────────┐
│  225 lbs          │  Next session:          │
│  Last: 205 lbs ▲  │  [  ↑ More  ]          │
│  ├─ Dec 28: 205   │  [  ↓ Less  ]          │
│  ├─ Dec 21: 200                             │
│  ├─ Dec 14: 195                             │
│  ├─ Dec 07: 190                             │
│  └─ Nov 30: 185                             │
└─────────────────────────────────────────────┘
```
- Arrow rotates to up (▲) when expanded
- Shows up to 5 previous sessions
- Each entry shows date and weight
- Tree-style connectors (├─, └─) for visual hierarchy

## Implementation Plan

### Phase 1: Update Frontend Data Flow

#### 1.1 Update workout-session-service.js
- Ensure `recent_sessions` is passed through when fetching exercise history
- The data should already be available from the API

#### 1.2 Update exercise-card-renderer.js
- Access `history.recent_sessions` array
- Pass to new rendering method

### Phase 2: Update Exercise Card Renderer

#### 2.1 Modify `renderCard()` method
```javascript
// Get exercise history
const history = this.sessionService.getExerciseHistory(mainExercise);
const lastWeight = history?.last_weight || '';
const lastWeightUnit = history?.last_weight_unit || 'lbs';
const lastSessionDate = history?.last_session_date
    ? new Date(history.last_session_date).toLocaleDateString()
    : null;
const recentSessions = history?.recent_sessions || []; // NEW
```

#### 2.2 Create weight history HTML template
```javascript
_renderWeightHistory(recentSessions, lastWeight, lastWeightUnit, lastSessionDate) {
    if (!lastWeight || !lastSessionDate) {
        return '';
    }
    
    const hasMultipleSessions = recentSessions && recentSessions.length > 1;
    const historyId = `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return `
        <div class="exercise-weight-history-container">
            <div class="exercise-weight-history-toggle" 
                 data-history-id="${historyId}"
                 onclick="window.workoutModeController.toggleWeightHistory('${historyId}'); event.stopPropagation();">
                <small class="exercise-weight-history">
                    Last: ${lastWeight}${lastWeightUnit !== 'other' ? ` ${lastWeightUnit}` : ''} on ${lastSessionDate}
                </small>
                ${hasMultipleSessions ? `
                    <i class="bx bx-chevron-down weight-history-arrow" id="arrow-${historyId}"></i>
                ` : ''}
            </div>
            ${hasMultipleSessions ? `
                <div class="weight-history-list" id="list-${historyId}" style="display: none;">
                    ${recentSessions.slice(1).map((session, index) => {
                        const isLast = index === recentSessions.length - 2;
                        const connector = isLast ? '└─' : '├─';
                        const date = new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        const weight = session.weight || '—';
                        const unit = session.weight_unit || 'lbs';
                        return `
                            <div class="weight-history-item ${isLast ? 'last' : ''}">
                                <span class="weight-history-connector">${connector}</span>
                                <span class="weight-history-date">${date}:</span>
                                <span class="weight-history-weight">${weight}${unit !== 'other' ? ` ${unit}` : ''}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : ''}
        </div>
    `;
}
```

### Phase 3: Update CSS Styles

Add to `frontend/assets/css/workout-mode.css`:

```css
/* Weight History Expansion */
.exercise-weight-history-container {
    margin-top: 0.25rem;
}

.exercise-weight-history-toggle {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
    user-select: none;
}

.exercise-weight-history-toggle:hover {
    color: var(--bs-primary);
}

.weight-history-arrow {
    font-size: 0.875rem;
    transition: transform 0.2s ease;
    color: var(--bs-secondary);
}

.weight-history-arrow.expanded {
    transform: rotate(180deg);
}

.exercise-weight-history-toggle:hover .weight-history-arrow {
    color: var(--bs-primary);
}

/* History list */
.weight-history-list {
    margin-top: 0.375rem;
    padding-left: 0.25rem;
}

.weight-history-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: var(--bs-secondary);
    padding: 0.125rem 0;
}

.weight-history-connector {
    color: var(--bs-border-color);
    font-family: monospace;
    font-size: 0.875rem;
}

.weight-history-date {
    color: var(--bs-secondary);
}

.weight-history-weight {
    font-weight: 500;
    color: var(--bs-body-color);
}

/* Dark theme */
[data-bs-theme="dark"] .weight-history-connector {
    color: var(--bs-gray-600);
}

/* Animation */
.weight-history-list.expanding {
    animation: expandIn 0.2s ease-out;
}

.weight-history-list.collapsing {
    animation: collapseOut 0.15s ease-in;
}

@keyframes expandIn {
    from {
        opacity: 0;
        transform: translateY(-8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes collapseOut {
    from {
        opacity: 1;
        transform: translateY(0);
    }
    to {
        opacity: 0;
        transform: translateY(-8px);
    }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
    .weight-history-arrow {
        transition: none !important;
    }
    .weight-history-list.expanding,
    .weight-history-list.collapsing {
        animation: none !important;
    }
}
```

### Phase 4: Add Toggle Handler

Add to `frontend/assets/js/controllers/workout-mode-controller.js`:

```javascript
/**
 * Toggle weight history expansion
 * @param {string} historyId - Unique ID for the history container
 */
toggleWeightHistory(historyId) {
    const list = document.getElementById(`list-${historyId}`);
    const arrow = document.getElementById(`arrow-${historyId}`);
    
    if (!list || !arrow) {
        console.warn('Weight history elements not found:', historyId);
        return;
    }
    
    const isExpanded = list.style.display !== 'none';
    
    if (isExpanded) {
        // Collapse
        list.classList.add('collapsing');
        arrow.classList.remove('expanded');
        
        setTimeout(() => {
            list.style.display = 'none';
            list.classList.remove('collapsing');
        }, 150);
    } else {
        // Expand
        list.style.display = 'block';
        list.classList.add('expanding');
        arrow.classList.add('expanded');
        
        setTimeout(() => {
            list.classList.remove('expanding');
        }, 200);
    }
}
```

## Files to Modify

1. **frontend/assets/js/components/exercise-card-renderer.js**
   - Add `_renderWeightHistory()` helper method
   - Update weight section rendering to use new method
   - Pass `recentSessions` data to helper

2. **frontend/assets/css/workout-mode.css**
   - Add weight history expansion styles
   - Add expand/collapse animations
   - Add dark theme support

3. **frontend/assets/js/controllers/workout-mode-controller.js**
   - Add `toggleWeightHistory()` method

4. **frontend/assets/js/services/workout-session-service.js**
   - Ensure `recent_sessions` is accessible (may already be available)

## Testing Checklist

- [ ] Verify `recent_sessions` data is returned from API
- [ ] Arrow only shows when multiple sessions exist
- [ ] Click expands/collapses the history
- [ ] Arrow rotates on expand/collapse
- [ ] Animations work correctly
- [ ] Dark theme looks correct
- [ ] Mobile responsive
- [ ] Reduced motion preference respected
- [ ] Tree connectors display correctly
- [ ] Clicking doesn't bubble up to card

## Alternative Designs Considered

### Option A: Simple List (Selected)
- Pros: Clean, familiar tree-style UI
- Cons: Takes vertical space

### Option B: Horizontal Pills
```
Last: 205 → 200 → 195 → 190
```
- Pros: Compact
- Cons: Less readable, no dates

### Option C: Tooltip on Hover
- Pros: No extra space needed
- Cons: Not mobile friendly, hidden feature

## Recommendation

Implement Option A (Simple List with Tree Connectors) as it provides:
- Clear visual hierarchy
- Dates for context
- Familiar expand/collapse pattern
- Works well on mobile with touch
- Accessible and discoverable
