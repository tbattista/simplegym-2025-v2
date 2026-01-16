# Unified Editor V2: Shared Save/Cancel Buttons Implementation Plan

**Date**: 2026-01-14  
**Version**: 2.0  
**Status**: Planning

## Overview

Refactor the unified edit mode to provide a truly unified editing experience where:
- Single pencil click opens BOTH weight and sets/reps editors simultaneously
- Editors stay open (no blur-to-close)
- Single set of save/cancel buttons at the bottom saves/cancels BOTH fields
- Sets/reps accepts any text input (e.g., "8-12", "to failure", "AMRAP")

## Current Issues

1. **Weight editor auto-closes**: Blur event fires when focus moves to sets/reps field
2. **Duplicate save/cancel buttons**: Each field has its own buttons causing confusion
3. **Sets/reps restricted to numbers**: Uses `type="number"` input, can't accept text ranges
4. **No coordinated state**: Each controller manages its own edit mode independently

## Proposed Architecture

### Visual Layout (Unified Edit Mode)

```
┌─────────────────────────────────────────┐
│ Weight                            📝    │ ← Header with single pencil icon
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Weight Editor (OPEN)                │ │
│ │ [Unit: lbs | kg | DIY]              │ │
│ │ [ 135 ] [−5] [+5]  or  [DIY text]   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Sets × Reps Editor (OPEN)           │ │
│ │ Sets: [3]    Reps: [8-12]           │ │ ← Text inputs (not number)
│ └─────────────────────────────────────┘ │
│                                         │
│        [✓ Save]  [✗ Cancel]            │ ← SHARED buttons at bottom
└─────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: HTML Structure Changes

**File**: `frontend/assets/js/components/exercise-card-renderer.js`

#### Changes Needed:

1. **Remove individual save/cancel buttons** from weight editor
   - Lines ~160-170: Comment out or remove save/cancel buttons in weight editor
   
2. **Remove individual save/cancel buttons** from sets/reps editor
   - Lines ~420-430: Comment out or remove save/cancel buttons in sets/reps editor

3. **Change sets/reps inputs to text type**
   - Line ~405: Change `<input type="number" class="sets-input"...>` to `<input type="text" class="sets-input"...>`
   - Line ~420: Change `<input type="number" class="reps-input"...>` to `<input type="text" class="reps-input"...>`

4. **Add unified action buttons container** after sets/reps editor
   ```html
   <!-- Unified Save/Cancel Buttons (NEW - v2.0) -->
   <div class="logbook-unified-actions" style="display: none;">
       <button class="btn btn-sm btn-success unified-save-btn" type="button">
           <i class="bx bx-check"></i> Save
       </button>
       <button class="btn btn-sm btn-outline-secondary unified-cancel-btn" type="button">
           <i class="bx bx-x"></i> Cancel
       </button>
   </div>
   ```

### Phase 2: CSS Updates

**File**: `frontend/assets/css/logbook-theme.css`

#### New Styles:

```css
/* Unified Actions Container */
.logbook-unified-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    padding: 0.75rem 0;
    margin-top: 0.5rem;
    border-top: 1px dashed var(--bs-border-color);
}

/* Hide individual save/cancel buttons in unified mode */
.logbook-card.unified-edit-active .weight-save-btn,
.logbook-card.unified-edit-active .weight-cancel-btn,
.logbook-card.unified-edit-active .repssets-save-btn,
.logbook-card.unified-edit-active .repssets-cancel-btn {
    display: none !important;
}

/* Show unified actions in unified edit mode */
.logbook-card.unified-edit-active .logbook-unified-actions {
    display: flex !important;
}
```

### Phase 3: Controller Refactoring

#### A. WeightFieldController Changes

**File**: `frontend/assets/js/controllers/weight-field-controller.js`

**Changes**:

1. **Disable blur-to-close in unified mode** (lines 172-188)
   ```javascript
   // Only attach blur handlers if NOT in unified mode
   if (!this.editBtn.dataset.unifiedEdit) {
       this.input.addEventListener('blur', (e) => { /* existing blur logic */ });
       this.textInput.addEventListener('blur', (e) => { /* existing blur logic */ });
   }
   ```

2. **Don't auto-exit on save/cancel** in unified mode
   - Modify `exitEditMode()` to accept a `unified` parameter
   - If `unified === true`, don't hide editor, just update values

#### B. RepsSetsFieldController Changes

**File**: `frontend/assets/js/controllers/repssets-field-controller.js`

**Changes**:

1. **Accept text input for sets/reps** (update validation logic)
   - Change `parseInt()` to allow text values
   - Store original text, not just numbers
   - Update `updateValues()` to handle text

2. **Disable blur-to-close** (lines 107-117)
   ```javascript
   // Don't attach blur handlers - unified mode controls lifecycle
   // handleBlur logic removed
   ```

#### C. Create UnifiedEditController (NEW)

**File**: `frontend/assets/js/controllers/unified-edit-controller.js`

**Purpose**: Coordinate the unified editing experience

```javascript
class UnifiedEditController {
    constructor(weightController, repsSetsController, container) {
        this.weightController = weightController;
        this.repsSetsController = repsSetsController;
        this.container = container;
        this.saveBtn = container.querySelector('.unified-save-btn');
        this.cancelBtn = container.querySelector('.unified-cancel-btn');
        this.actionsContainer = container.querySelector('.logbook-unified-actions');
        
        this.bindEvents();
    }
    
    bindEvents() {
        // Save button → save both fields
        this.saveBtn.addEventListener('click', () => this.saveAll());
        
        // Cancel button → cancel both fields
        this.cancelBtn.addEventListener('click', () => this.cancelAll());
        
        // Enter key → save all
        this.container.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.isActive()) {
                e.preventDefault();
                this.saveAll();
            } else if (e.key === 'Escape' && this.isActive()) {
                e.preventDefault();
                this.cancelAll();
            }
        });
    }
    
    enterUnifiedEditMode() {
        // Open both editors
        this.weightController.enterEditMode();
        this.repsSetsController.enterEditMode();
        
        // Show unified actions
        this.actionsContainer.style.display = 'flex';
        
        // Mark card as in unified edit mode
        this.container.closest('.logbook-card').classList.add('unified-edit-active');
    }
    
    exitUnifiedEditMode() {
        // Hide both editors
        this.weightController.exitEditMode(false);
        this.repsSetsController.exitEditMode(false);
        
        // Hide unified actions
        this.actionsContainer.style.display = 'none';
        
        // Remove unified edit flag
        this.container.closest('.logbook-card').classList.remove('unified-edit-active');
    }
    
    saveAll() {
        // Save both fields
        this.weightController.exitEditMode(true);
        this.repsSetsController.exitEditMode(true);
        
        // Exit unified mode
        this.exitUnifiedEditMode();
    }
    
    cancelAll() {
        // Cancel both fields
        this.exitUnifiedEditMode();
    }
    
    isActive() {
        return this.actionsContainer.style.display !== 'none';
    }
}
```

### Phase 4: Integration

**File**: `frontend/assets/js/controllers/weight-field-controller.js`

Modify `enterUnifiedEditMode()` (lines 274-289):

```javascript
enterUnifiedEditMode() {
    console.log('🔗 Unified edit mode triggered for:', this.exerciseName);
    
    // Find the unified edit controller
    const card = this.container.closest('.logbook-card');
    if (card && card.unifiedEditController) {
        card.unifiedEditController.enterUnifiedEditMode();
    } else {
        console.warn('⚠️ UnifiedEditController not found, falling back to individual mode');
        this.enterEditMode();
    }
}
```

### Phase 5: Initialization

**File**: `frontend/assets/js/controllers/workout-mode-controller.js`

Add to `initializeLogbookControllers()`:

```javascript
// Initialize unified edit controllers
document.querySelectorAll('.logbook-card').forEach(card => {
    const weightField = card.querySelector('.logbook-weight-field');
    const repsSetsField = card.querySelector('.logbook-repssets-field');
    
    if (weightField?.weightController && repsSetsField?.repsSetsController) {
        card.unifiedEditController = new UnifiedEditController(
            weightField.weightController,
            repsSetsField.repsSetsController,
            card
        );
        console.log('✅ UnifiedEditController initialized for card');
    }
});
```

## Testing Checklist

### Visual Tests
- [ ] Single pencil icon visible on weight field
- [ ] Both editors open simultaneously when pencil clicked
- [ ] Individual save/cancel buttons hidden
- [ ] Shared save/cancel buttons visible at bottom
- [ ] Sets/reps inputs accept text (no spinner controls)

### Functional Tests
- [ ] Pencil → both editors open
- [ ] Editors stay open (no blur-to-close)
- [ ] Checkmark (✓) saves BOTH fields together
- [ ] X cancels BOTH fields, restores original values
- [ ] Enter key saves both
- [ ] Escape key cancels both
- [ ] Sets/reps can save text like "8-12", "AMRAP", "to failure"

### Edge Cases
- [ ] Multiple cards can't be in edit mode simultaneously
- [ ] Switching units in weight editor doesn't close sets/reps
- [ ] Clicking outside editors doesn't close them
- [ ] Save animation plays on both fields after save

## Rollback Plan

If issues arise:
1. Git tag current version: `v2.3.0-shared-buttons-before`
2. Restore individual save/cancel buttons
3. Re-enable blur-to-close
4. Remove UnifiedEditController

## Files Modified

1. `frontend/assets/js/components/exercise-card-renderer.js` - HTML structure
2. `frontend/assets/css/logbook-theme.css` - Styling for unified actions
3. `frontend/assets/js/controllers/weight-field-controller.js` - Disable blur in unified mode
4. `frontend/assets/js/controllers/repssets-field-controller.js` - Text input support, disable blur
5. `frontend/assets/js/controllers/unified-edit-controller.js` - NEW controller
6. `frontend/assets/js/controllers/workout-mode-controller.js` - Initialize unified controller
7. `frontend/workout-mode.html` - Add script tag for unified-edit-controller.js

## Success Criteria

✅ User can edit weight AND sets/reps together  
✅ Single shared save/cancel buttons  
✅ Sets/reps accepts any text  
✅ No auto-closing on blur  
✅ Clear visual feedback for edit state  
✅ All existing functionality preserved

---

**Next Steps**: Get user approval, then proceed with implementation.