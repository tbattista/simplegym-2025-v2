# Weight Direction Buttons Redesign V2

## User Feedback Summary

The user rejected the 3-button icon layout and requested:
1. **Two text buttons only**: "Decrease" and "Increase" (no "Same" button)
2. **Dot separator**: A dot (•) between buttons when neither is selected
3. **Small/compact buttons**: Keep them minimal
4. **Toast notification**: Show notification from top when direction is set
5. **No card closing**: Card should NOT close when buttons are clicked

## New Design

```
Neutral (no selection):   [Decrease] • [Increase]
Decrease selected:        [Decrease]   [Increase]
Increase selected:        [Decrease]   [Increase]
```

When a button is clicked:
- Button becomes highlighted (active state)
- Dot disappears (space between buttons remains)
- Toast notification appears from top: "Decrease weight next session" or "Increase weight next session"
- **Card stays open** (does NOT collapse)

## Card Closing Rules

The card should ONLY close when:
1. The chevron arrow (collapse button) is clicked
2. Another exercise card is opened
3. "Next" button is hit
4. "Complete" button is hit

**NOT when:**
- Weight direction buttons are clicked
- Any other interaction within the card

---

## Files to Modify

### 1. exercise-card-renderer.js (Lines 141-169)

**Current code:**
```javascript
<div class="weight-direction-container">
    <span class="weight-direction-label">Next session:</span>
    <div class="btn-group btn-group-sm weight-direction-group">
        <button class="btn weight-direction-btn ${currentDirection === 'down' ? 'active btn-direction-down' : ''}...">
            <i class="bx bx-chevron-down"></i>
        </button>
        <button class="btn weight-direction-btn ${(!currentDirection || currentDirection === 'same') ? 'active btn-direction-same' : ''}...">
            <i class="bx bx-minus"></i>
        </button>
        <button class="btn weight-direction-btn ${currentDirection === 'up' ? 'active btn-direction-up' : ''}...">
            <i class="bx bx-chevron-up"></i>
        </button>
    </div>
</div>
```

**New code:**
```javascript
<div class="weight-direction-container">
    <button class="btn btn-sm weight-direction-btn ${currentDirection === 'down' ? 'active btn-direction-down' : 'btn-outline-secondary'}"
            data-exercise-name="${this._escapeHtml(mainExercise)}"
            data-direction="down"
            onclick="window.workoutModeController.handleWeightDirection(this); event.stopPropagation();"
            title="Decrease weight next session">
        Decrease
    </button>
    <span class="weight-direction-dot ${currentDirection ? 'hidden' : ''}">•</span>
    <button class="btn btn-sm weight-direction-btn ${currentDirection === 'up' ? 'active btn-direction-up' : 'btn-outline-secondary'}"
            data-exercise-name="${this._escapeHtml(mainExercise)}"
            data-direction="up"
            onclick="window.workoutModeController.handleWeightDirection(this); event.stopPropagation();"
            title="Increase weight next session">
        Increase
    </button>
</div>
```

### 2. workout-mode.css (Lines 69-314)

**Changes needed:**

1. **Remove `.weight-direction-label`** - No longer needed
2. **Update `.weight-direction-container`** - Simple flex layout with gap
3. **Add `.weight-direction-dot`** - Dot separator styling
4. **Update `.weight-direction-btn`** - Smaller text-based buttons
5. **Remove btn-direction-same styles** - No longer used

**New CSS:**
```css
/* Weight Direction Container - Two-button with dot layout */
.weight-direction-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

/* Dot separator between buttons */
.weight-direction-dot {
    font-size: 0.75rem;
    color: var(--bs-secondary);
    line-height: 1;
    transition: opacity 0.2s ease;
}

.weight-direction-dot.hidden {
    opacity: 0;
}

/* Compact text buttons */
.weight-direction-btn {
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    min-height: 28px;
    height: 28px;
    border: 1px solid var(--bs-border-color);
    background: transparent;
    color: var(--bs-body-color);
    transition: all 0.2s ease;
}

.weight-direction-btn:hover:not(.active) {
    background: rgba(var(--bs-primary-rgb), 0.08);
    border-color: var(--bs-primary);
    color: var(--bs-primary);
}

/* Active state for DOWN */
.weight-direction-btn.active.btn-direction-down {
    background: var(--bs-warning);
    border-color: var(--bs-warning);
    color: #fff;
}

/* Active state for UP */
.weight-direction-btn.active.btn-direction-up {
    background: var(--bs-success);
    border-color: var(--bs-success);
    color: #fff;
}
```

### 3. workout-mode-controller.js (Lines 677-722)

**Current problem:**
Line 710 calls `this.renderWorkout()` which destroys and recreates all cards, causing the expanded card to collapse.

**Solution:**
Update the button states directly in the DOM instead of re-rendering.

**Current code:**
```javascript
handleWeightDirection(button) {
    const exerciseName = button.getAttribute('data-exercise-name');
    const direction = button.getAttribute('data-direction');
    
    if (!this.sessionService.isSessionActive()) {
        if (window.showAlert) {
            window.showAlert('Start your workout to set weight direction', 'warning');
        }
        return;
    }
    
    console.log(`🎯 Weight direction for ${exerciseName}: ${direction}`);
    
    // Update session service
    this.sessionService.setWeightDirection(exerciseName, direction);
    
    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(15);
    }
    
    // Auto-save
    this.autoSave(null).catch(error => {
        console.error('❌ Failed to auto-save after direction change:', error);
    });
    
    // Re-render to update button states  <-- THIS CAUSES CARD TO CLOSE
    this.renderWorkout();
    
    // Show feedback
    if (window.showAlert) {
        const messages = {
            'up': `${exerciseName}: ⬆️ Increase weight next time`,
            'down': `${exerciseName}: ⬇️ Decrease weight next time`,
            'same': `${exerciseName}: ↔️ Keep same weight next time`
        };
        window.showAlert(messages[direction] || 'Weight direction set', 'info');
    }
}
```

**New code:**
```javascript
handleWeightDirection(button) {
    const exerciseName = button.getAttribute('data-exercise-name');
    const direction = button.getAttribute('data-direction');
    
    if (!this.sessionService.isSessionActive()) {
        if (window.showAlert) {
            window.showAlert('Start your workout to set weight direction', 'warning');
        }
        return;
    }
    
    // Get current direction to check if toggling off
    const currentDirection = this.sessionService.getWeightDirection(exerciseName);
    const newDirection = (currentDirection === direction) ? null : direction;
    
    console.log(`🎯 Weight direction for ${exerciseName}: ${newDirection || 'cleared'}`);
    
    // Update session service
    this.sessionService.setWeightDirection(exerciseName, newDirection);
    
    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(15);
    }
    
    // Auto-save (don't await - fire and forget)
    this.autoSave(null).catch(error => {
        console.error('❌ Failed to auto-save after direction change:', error);
    });
    
    // UPDATE UI DIRECTLY - Don't re-render entire workout
    this.updateWeightDirectionButtons(exerciseName, newDirection);
    
    // Show toast notification
    if (window.showAlert && newDirection) {
        const messages = {
            'up': `Increase weight next session ⬆️`,
            'down': `Decrease weight next session ⬇️`
        };
        window.showAlert(messages[newDirection], 'success');
    }
}

/**
 * Update weight direction button states in DOM without re-rendering
 * @param {string} exerciseName - Name of exercise
 * @param {string|null} direction - 'up', 'down', or null
 */
updateWeightDirectionButtons(exerciseName, direction) {
    // Find the card for this exercise
    const card = document.querySelector(`.exercise-card[data-exercise-name="${exerciseName}"]`);
    if (!card) return;
    
    // Find all direction buttons in this card
    const buttons = card.querySelectorAll('.weight-direction-btn');
    const dot = card.querySelector('.weight-direction-dot');
    
    // Update button states
    buttons.forEach(btn => {
        const btnDirection = btn.getAttribute('data-direction');
        btn.classList.remove('active', 'btn-direction-up', 'btn-direction-down', 'btn-outline-secondary');
        
        if (btnDirection === direction) {
            btn.classList.add('active', `btn-direction-${direction}`);
        } else {
            btn.classList.add('btn-outline-secondary');
        }
    });
    
    // Toggle dot visibility
    if (dot) {
        if (direction) {
            dot.classList.add('hidden');
        } else {
            dot.classList.remove('hidden');
        }
    }
}
```

---

## Implementation Checklist

- [ ] Update `exercise-card-renderer.js`:
  - [ ] Remove "Next session:" label
  - [ ] Remove "Same" button (middle button)
  - [ ] Change icons to text: "Decrease" and "Increase"
  - [ ] Add dot separator element with conditional hidden class
  
- [ ] Update `workout-mode.css`:
  - [ ] Remove `.weight-direction-label` references
  - [ ] Remove `.btn-direction-same` styles
  - [ ] Add `.weight-direction-dot` styles
  - [ ] Update button styles for compact text buttons
  - [ ] Update responsive breakpoints
  
- [ ] Update `workout-mode-controller.js`:
  - [ ] Remove `this.renderWorkout()` from `handleWeightDirection()`
  - [ ] Add toggle logic (click again to deselect)
  - [ ] Add `updateWeightDirectionButtons()` method for direct DOM updates
  - [ ] Update toast messages to be cleaner

- [ ] Optional: Update `workout-session-service.js`:
  - [ ] Remove 'same' from valid directions array (line 647)

---

## Visual Design

```
┌─────────────────────────────────────────────────────┐
│ Weight Section                                      │
│                                                     │
│   185 lbs                    [Decrease] • [Increase]│
│   Last: 180 lbs on Dec 28                          │
│                                                     │
└─────────────────────────────────────────────────────┘

Button states:
┌──────────┐     ┌──────────┐
│ Decrease │  •  │ Increase │   (neither selected)
└──────────┘     └──────────┘

┌──────────┐     ┌──────────┐
│▓Decrease▓│     │ Increase │   (decrease selected - orange bg)
└──────────┘     └──────────┘

┌──────────┐     ┌──────────┐
│ Decrease │     │▓Increase▓│   (increase selected - green bg)
└──────────┘     └──────────┘
```

## Toast Notification

When direction is selected, show toast from top:
- "Decrease weight next session ⬇️" (warning color)
- "Increase weight next session ⬆️" (success color)

When direction is cleared (click selected button again):
- No toast (silent clear)

---

## Testing Scenarios

1. **Basic selection**
   - Click "Increase" → Button highlighted green, dot hidden, toast shown
   - Click "Decrease" → Button highlighted orange, dot hidden, toast shown
   
2. **Toggle off**
   - Click selected button → Deselects, dot reappears, no toast
   
3. **Switch selection**
   - With "Increase" selected, click "Decrease" → Switches to decrease
   
4. **Card stays open**
   - Click any direction button → Card remains expanded
   - Only closes via chevron, Next, Complete, or opening another card
   
5. **Persistence**
   - Direction saves to session and persists through page refresh
