# Sets/Reps Single Text Field Implementation Plan

## Overview
Convert the sets/reps editor from two separate numeric inputs to a single open **full-width** text field that accepts any format the user wants to type (e.g., "2x5", "2x5 by 10", "3 set to failure", "AMRAP", etc.).

**Section Label:** Changed from "Sets × Reps" to **"Protocol"**

**Date:** 2026-01-14
**Status:** Planning
**Version:** 1.0.0

---

## Current Implementation Analysis

### Current Structure (Two Separate Inputs)

**HTML Structure** (from [`exercise-card-renderer.js`](frontend/assets/js/components/exercise-card-renderer.js:430-469)):
```html
<div class="logbook-repssets-field" data-sets="3" data-reps="8-12">
    <!-- Display Mode -->
    <div class="repssets-display">
        <div class="repssets-value-group">
            <span class="sets-value">3</span>
            <span class="repssets-separator">×</span>
            <span class="reps-value">8-12</span>
        </div>
    </div>
    
    <!-- Edit Mode -->
    <div class="repssets-editor" style="display: none;">
        <input type="text" class="repssets-input sets-input" value="3" />
        <span class="repssets-separator-edit">×</span>
        <input type="text" class="repssets-input reps-input" value="8-12" />
        <!-- Save/Cancel buttons -->
    </div>
</div>
```

**Controller** ([`repssets-field-controller.js`](frontend/assets/js/controllers/repssets-field-controller.js)):
- Manages two separate inputs: `setsInput` and `repsInput`
- Stores values separately in session service as `sets` and `reps` properties
- Currently supports text input (v2.4.0) but still maintains two fields

**Data Storage:**
- Firestore: `target_sets` (string) and `target_reps` (string)
- Session Service: Stores as separate properties
- Display shows: `${sets} × ${reps}`

---

## Requirements

### User Requirements
1. **Single text input** - Users can type freely in one field
2. **Full-width layout** - Input stretches edge-to-edge for prominence
3. **No format restrictions** - Accept any text the user wants
4. **Display exactly what user typed** - No parsing or reformatting
5. **Section labeled "Protocol"** - More general than "Sets × Reps"
6. **Examples of expected inputs:**
   - `2x5` - traditional format
   - `2x5 by 10` - with additional context
   - `3 set to failure` - descriptive format
   - `AMRAP` - shorthand
   - `3-4 sets of 8-12` - verbose format
   - Any other format the user prefers

### Technical Requirements
1. Maintain compatibility with existing unified edit mode
2. Preserve save/cancel functionality
3. Keep green flash animation on save
4. Support keyboard shortcuts (Enter = save, Escape = cancel)
5. Maintain session service integration
6. Backward compatibility with existing `sets`/`reps` data

---

## Architecture Design

### Data Model Changes

**Current:**
```javascript
{
  target_sets: "3",        // String or number
  target_reps: "8-12"      // String (can be range)
}
```

**New (v3.0.0):**
```javascript
{
  target_sets_reps: "2x5 by 10",  // Single string field (NEW)
  target_sets: "2",                // Deprecated but maintained for backward compatibility
  target_reps: "5"                 // Deprecated but maintained for backward compatibility
}
```

**Migration Strategy:**
1. Check for `target_sets_reps` first (new format)
2. If not present, fallback to `${target_sets}×${target_reps}` (old format)
3. When saving, store both formats for backward compatibility

---

## Implementation Plan

### 1. Update HTML Structure
**File:** [`frontend/assets/js/components/exercise-card-renderer.js`](frontend/assets/js/components/exercise-card-renderer.js:430-469)

**Changes:**
```html
<!-- NEW: Single field structure with full-width layout -->
<div class="logbook-repssets-field" data-sets-reps="2x5 by 10">
    <!-- Display Mode (Full Width) -->
    <div class="repssets-display">
        <span class="repssets-value-text">2x5 by 10</span>
    </div>
    
    <!-- Edit Mode (Full Width) -->
    <div class="repssets-editor" style="display: none;">
        <input type="text" 
               class="repssets-input repssets-text-input" 
               value="2x5 by 10" 
               placeholder="e.g., 3x10, 4 sets to failure, AMRAP"
               style="width: 100%;"
               onclick="event.stopPropagation();" />
        
        <!-- Unified Save/Cancel Buttons (v2.2 - icon-only) -->
        <div class="logbook-unified-actions" style="display: none;">
            <button class="btn btn-sm btn-success unified-save-btn" type="button">
                <i class="bx bx-check"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary unified-cancel-btn" type="button">
                <i class="bx bx-x"></i>
            </button>
        </div>
    </div>
</div>
```

**Key Changes:**
- Replace `.sets-value` and `.reps-value` with single `.repssets-value-text`
- Remove `×` separator from display
- Remove `.repssets-value-group` wrapper (no longer needed)
- Replace two inputs with one `.repssets-text-input`
- **Add `width: 100%` to input for full-width layout**
- Remove separate `sets-input` and `reps-input` classes
- Keep unified actions structure for shared save/cancel

---

### 2. Update CSS Styling
**File:** [`frontend/assets/css/logbook-theme.css`](frontend/assets/css/logbook-theme.css:788-940)

**Changes:**

```css
/* Updated display mode for single text value - FULL WIDTH */
.repssets-display {
    width: 100%; /* Full width container */
}

.repssets-display .repssets-value-text {
    display: block;
    width: 100%;
    font-size: 2.25rem;
    font-weight: 700;
    color: var(--logbook-accent);
    line-height: 1;
}

/* Remove separator styles (deprecated) */
.repssets-display .repssets-separator {
    display: none; /* Hide old separator */
}

/* Remove value-group wrapper (no longer needed) */
.repssets-display .repssets-value-group {
    display: none; /* Deprecated */
}

/* Updated editor for single text input - FULL WIDTH */
.repssets-editor {
    width: 100%; /* Full width editor */
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.repssets-text-input {
    width: 100% !important; /* Full width input - force override */
    min-width: unset;
    padding: 0.5rem 0.75rem;
    font-size: 1.25rem;
    font-weight: 600;
    text-align: left;
    color: var(--logbook-accent);
    border: 2px solid var(--logbook-accent);
    border-radius: 0.375rem;
    background: var(--logbook-card-bg);
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    box-sizing: border-box;
}

.repssets-text-input:focus {
    border-color: var(--logbook-accent);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.repssets-text-input::placeholder {
    color: var(--logbook-muted);
    font-style: italic;
    font-size: 0.875rem;
}

/* Hide old separator in editor (deprecated) */
.repssets-separator-edit {
    display: none;
}

/* Hide old numeric inputs (deprecated) */
.sets-input,
.reps-input {
    display: none;
}

/* Mobile responsive adjustments */
@media (max-width: 576px) {
    .repssets-text-input {
        font-size: 1rem;
        padding: 0.5rem;
    }
    
    .repssets-display .repssets-value-text {
        font-size: 1.5rem;
    }
}
```

---

### 3. Update Section Label in Card Renderer
**File:** [`frontend/assets/js/components/exercise-card-renderer.js`](frontend/assets/js/components/exercise-card-renderer.js:135-139)

**Change the section label:**
```javascript
// OLD:
<!-- Sets × Reps Section -->
<div class="logbook-section">
    <div class="logbook-section-label">Sets × Reps</div>
    ${this._renderRepsSetsField(sets, reps, mainExercise)}
</div>

// NEW:
<!-- Protocol Section (formerly Sets × Reps) -->
<div class="logbook-section">
    <div class="logbook-section-label">Protocol</div>
    ${this._renderRepsSetsField(sets, reps, mainExercise)}
</div>
```

---

### 4. Refactor Controller Logic
**File:** [`frontend/assets/js/controllers/repssets-field-controller.js`](frontend/assets/js/controllers/repssets-field-controller.js)

**Major Changes:**

```javascript
/**
 * Ghost Gym - Reps/Sets Field Controller (Logbook V3)
 * Single text field for flexible sets/reps input
 * v3.0.0 - Single text input with freeform entry and full-width layout
 */

class RepsSetsFieldController {
    constructor(container, options = {}) {
        this.container = container;
        this.sessionService = options.sessionService || window.workoutSessionService;
        this.exerciseName = options.exerciseName || container.closest('.logbook-card')?.dataset?.exerciseName;
        
        // DOM elements - UPDATED for single field
        this.displayEl = container.querySelector('.repssets-display');
        this.editorEl = container.querySelector('.repssets-editor');
        this.valueDisplay = container.querySelector('.repssets-value-text'); // NEW
        this.textInput = container.querySelector('.repssets-text-input'); // NEW
        
        // REMOVED: setsInput, repsInput, setsValueDisplay, repsValueDisplay
        
        // State
        this.originalValue = this.textInput?.value || '3×10'; // Store single value
        this.isUnifiedEditMode = false;
        
        // Validate required elements
        if (!this.displayEl || !this.editorEl || !this.textInput) {
            console.error('❌ RepsSetsFieldController: Missing required DOM elements');
            return;
        }
        
        this.bindEvents();
        console.log('✅ RepsSetsFieldController v3.0.0 initialized for:', this.exerciseName);
    }
    
    /**
     * Enter edit mode - show editor, hide display
     */
    enterEditMode() {
        this.originalValue = this.textInput.value || '3×10';
        this.displayEl.style.display = 'none';
        this.editorEl.style.display = 'flex';
        this.textInput.focus();
        this.textInput.select();
        
        console.log('📝 Edit mode entered for:', this.exerciseName, 'Original:', this.originalValue);
    }
    
    /**
     * Update the displayed value and save to session service (v3.0.0)
     * @param {string} newValue - New sets/reps value (any text format)
     */
    updateValues(newValue) {
        const value = String(newValue || '1×1').trim();
        
        // Update DOM
        this.valueDisplay.textContent = value;
        this.textInput.value = value;
        this.container.dataset.setsReps = value;
        
        // Save to session service
        if (this.sessionService) {
            const updateData = {
                target_sets_reps: value,  // NEW: Single field
                // Backward compatibility: Try to extract sets/reps for old format
                sets: this._extractSets(value),
                reps: this._extractReps(value)
            };
            
            if (this.sessionService.isSessionActive()) {
                this.sessionService.updateExerciseDetails(this.exerciseName, updateData);
                console.log('💾 Protocol saved to active session:', this.exerciseName, value);
            } else {
                this.sessionService.updatePreSessionExercise(this.exerciseName, updateData);
                console.log('📝 Protocol saved to pre-session edits:', this.exerciseName, value);
            }
        }
        
        // Trigger save animation (green flash)
        this.displayEl.classList.add('saved');
        setTimeout(() => {
            this.displayEl.classList.remove('saved');
        }, 600);
        
        // Dispatch custom event
        this.container.dispatchEvent(new CustomEvent('repsSetsChanged', {
            bubbles: true,
            detail: {
                exerciseName: this.exerciseName,
                setsReps: value,
                sets: this._extractSets(value),
                reps: this._extractReps(value)
            }
        }));
        
        console.log('✅ Protocol updated:', this.exerciseName, '→', value);
    }
    
    /**
     * Helper: Extract sets from text (for backward compatibility)
     * Tries to parse common formats, returns first number found or default
     */
    _extractSets(text) {
        // Try formats: "3x10", "3×10", "3 sets", etc.
        const match = text.match(/^(\d+)\s*[x×]/i) || text.match(/(\d+)\s+set/i);
        return match ? match[1] : '3'; // Default to 3 if unparseable
    }
    
    /**
     * Helper: Extract reps from text (for backward compatibility)
     * Tries to parse common formats, returns portion after 'x' or full text
     */
    _extractReps(text) {
        // Try formats: "3x10", "3×10-12", extract everything after separator
        const match = text.match(/[x×]\s*(.+)/i);
        return match ? match[1].trim() : text; // Return full text if no separator
    }
    
    /**
     * Get current value
     * @returns {string} Current sets/reps text
     */
    getValue() {
        return this.textInput.value || '1×1';
    }
    
    // ... rest of methods (saveChanges, cancelChanges, etc.) remain similar
    // but operate on single textInput instead of separate sets/reps inputs
}
```

---

### 5. Update Exercise Card Renderer
**File:** [`frontend/assets/js/components/exercise-card-renderer.js`](frontend/assets/js/components/exercise-card-renderer.js)

**Method to Update:** `_renderRepsSetsField(sets, reps, exerciseName)`

```javascript
/**
 * Render reps/sets field with single text input (v3.0.0)
 * Full-width layout, labeled "Protocol"
 * @private
 */
_renderRepsSetsField(sets, reps, exerciseName) {
    // Check if we have new format (single field) or need to construct from old format
    let displayValue;
    
    if (sets && reps) {
        // Old format: Combine with separator for display
        displayValue = `${sets}×${reps}`;
    } else {
        // Already combined or default
        displayValue = sets || reps || '3×10';
    }
    
    return `
        <div class="logbook-repssets-field" data-sets-reps="${displayValue}" data-exercise-name="${this._escapeHtml(exerciseName)}">
            <!-- Display Mode (Full Width) -->
            <div class="repssets-display">
                <span class="repssets-value-text">${displayValue}</span>
            </div>
            
            <!-- Edit Mode (Full Width) -->
            <div class="repssets-editor" style="display: none;">
                <input type="text" 
                       class="repssets-input repssets-text-input" 
                       value="${displayValue}" 
                       placeholder="e.g., 3x10, 4 sets to failure, AMRAP"
                       style="width: 100%;" 
                       onclick="event.stopPropagation();" />
                
                <!-- Unified Save/Cancel Buttons (v2.2 - icon-only, right-justified) -->
                <div class="logbook-unified-actions" style="display: none; justify-content: flex-end;">
                    <button class="btn btn-sm btn-success unified-save-btn" type="button" onclick="event.stopPropagation();" aria-label="Save changes" title="Save">
                        <i class="bx bx-check"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary unified-cancel-btn" type="button" onclick="event.stopPropagation();" aria-label="Cancel changes" title="Cancel">
                        <i class="bx bx-x"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}
```

**Update Card Rendering Call** (line 138):
```javascript
// In renderCard method - update section label
<!-- Protocol Section (formerly Sets × Reps) -->
<div class="logbook-section">
    <div class="logbook-section-label">Protocol</div>
    ${this._renderRepsSetsField(sets, reps, mainExercise)}
</div>
```

---

### 6. Session Service Integration

**Files to Check:**
- [`frontend/assets/js/services/workout-session-service.js`](frontend/assets/js/services/workout-session-service.js:246)
- [`frontend/assets/js/services/workout-data-manager.js`](frontend/assets/js/services/workout-data-manager.js)

**Changes Needed:**
1. When reading exercise data, check for `target_sets_reps` field first
2. If not present, construct from `target_sets` and `target_reps`
3. When saving, store both `target_sets_reps` (new) and individual fields (backward compat)

```javascript
// Example reading logic
getExerciseSetsReps(exerciseName) {
    const data = this.getExerciseData(exerciseName);
    
    // New format (single field)
    if (data.target_sets_reps) {
        return data.target_sets_reps;
    }
    
    // Old format (combine)
    if (data.target_sets && data.target_reps) {
        return `${data.target_sets}×${data.target_reps}`;
    }
    
    // Default
    return '3×10';
}
```

---

### 7. Backward Compatibility Strategy

**Reading Old Data:**
1. Check for `target_sets_reps` (new format)
2. If not present, construct from `target_sets × target_reps`
3. Display constructed value in new single-field UI

**Writing New Data:**
```javascript
{
    target_sets_reps: "2x5 by 10",      // NEW: Primary field
    target_sets: "2",                   // OLD: Extracted for compatibility
    target_reps: "5"                    // OLD: Extracted for compatibility
}
```

**Migration:**
- No manual migration needed
- First edit of any exercise updates to new format
- Old format continues to work via fallback logic

---

## Testing Plan

### Manual Testing Checklist
- [ ] Enter "2x5" → Display shows "2x5" (full width)
- [ ] Enter "2x5 by 10" → Display shows "2x5 by 10" (full width)
- [ ] Enter "3 set to failure" → Display shows "3 set to failure"
- [ ] Enter "AMRAP" → Display shows "AMRAP"
- [ ] Enter "3-4 sets of 8-12" → Display shows "3-4 sets of 8-12"
- [ ] Input box stretches edge-to-edge (full width)
- [ ] Section label shows "Protocol" instead of "Sets × Reps"
- [ ] Save animation (green flash) works
- [ ] Cancel restores original value
- [ ] Unified edit mode opens both weight and protocol editors
- [ ] Shared save/cancel buttons work correctly
- [ ] Keyboard shortcuts (Enter = save, Escape = cancel) work
- [ ] Data persists in session service
- [ ] Load old format data (separate sets/reps) → Displays as "3×10"
- [ ] Edit old format exercise → Saves in new format
- [ ] Mobile responsive layout works (full width maintained)

### Edge Cases
- [ ] Empty input → Falls back to default "3×10"
- [ ] Very long text → Input field handles overflow gracefully
- [ ] Special characters (emojis, symbols) → Stored and displayed correctly
- [ ] Whitespace trimming works correctly

---

## Implementation Order

1. ✅ **Planning Complete**
2. **Phase 1: HTML & CSS** (Low Risk)
   - Update CSS for full-width single text field styling
   - Update card renderer HTML structure
   - Update section label to "Protocol"
   
3. **Phase 2: Controller Refactor** (Medium Risk)
   - Refactor `RepsSetsFieldController` for single input
   - Update event handlers and state management
   
4. **Phase 3: Data Integration** (High Risk)
   - Update session service integration
   - Add backward compatibility helpers
   - Test data persistence
   
5. **Phase 4: Testing & Polish**
   - Manual testing all formats
   - Fix any edge cases
   - Update documentation

---

## Rollback Plan

If issues arise:
1. Revert `exercise-card-renderer.js` to two-input HTML
2. Revert `logbook-theme.css` changes
3. Revert `repssets-field-controller.js` to v2.4.0
4. Data remains safe (old format still stored as fallback)

---

## Documentation Updates

### Files to Update:
- [ ] [`UNIFIED_EDITOR_V2_SHARED_BUTTONS_IMPLEMENTATION_COMPLETE.md`](plans/UNIFIED_EDITOR_V2_SHARED_BUTTONS_IMPLEMENTATION_COMPLETE.md) - Note v3.0.0 upgrade
- [ ] Add new implementation complete doc: `REPSSETS_SINGLE_TEXT_FIELD_IMPLEMENTATION_COMPLETE.md`
- [ ] Update section label from "Sets × Reps" to "Protocol" in card renderer

### Version Bump:
- `RepsSetsFieldController`: v2.4.0 → v3.0.0
- `ExerciseCardRenderer`: v1.1.0 → v1.2.0

### UI Updates:
- **Section label:** "Sets × Reps" → **"Protocol"**
- **Input width:** Compact → **Full width (100%)**
- **Display width:** Compact → **Full width (100%)**

---

## Benefits

1. **User Flexibility** - Users can express protocol in any format they prefer
2. **Simplicity** - One input is simpler than two
3. **Future-Proof** - Supports unconventional formats (AMRAP, to failure, etc.)
4. **Backward Compatible** - Existing data continues to work
5. **No Data Loss** - Old format preserved during transition
6. **Better Visibility** - Full-width layout makes input more prominent
7. **Clearer Labeling** - "Protocol" is more intuitive than "Sets × Reps"

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Loss of structured data (sets/reps as numbers) | Medium | Maintain extraction helpers for analytics |
| Session service compatibility issues | High | Thorough integration testing, fallback logic |
| Unified edit mode breaks | High | Test unified edit controller thoroughly |
| User confusion from format change | Low | Single field is actually simpler, "Protocol" is clear |
| Full-width layout issues on mobile | Low | Test responsive CSS, use box-sizing: border-box |

---

## Next Steps

Ready to proceed with implementation? I recommend starting with Phase 1 (HTML & CSS) as it's low-risk and will let you see the UI changes immediately.

Would you like me to switch to Code mode to implement this plan?