# Unified Edit Fields Fix Plan

## Problem Analysis

Looking at the screenshot, there are several issues:

### Issue 1: Weight Input Not Full Width (100px instead of full)
The `.weight-input` is constrained to 100px because:
- The `.weight-input-row.numeric-mode` is a flex container with `gap: 0.5rem`
- The stepper buttons (`.weight-stepper-btn`) are still in the DOM even though they have `display: none`
- The input has `flex: 1` but the row itself may not be full width

### Issue 2: Unified Buttons Position
The unified save/cancel buttons are rendered **inside** the Protocol section's `<div class="workout-section">`, making them appear inline with the protocol field instead of below both fields.

### Issue 3: Structural Problem
Current HTML structure:
```html
<div class="workout-section">  <!-- Weight Section -->
    <div class="workout-section-label">Weight</div>
    <div class="workout-weight-field">
        <div class="weight-display">...</div>
        <div class="weight-editor">
            <div class="weight-input-row numeric-mode">
                <input class="weight-input" />  <!-- This is only 100px! -->
                <button class="weight-stepper-btn">−5</button>  <!-- display:none -->
                <button class="weight-stepper-btn">+5</button>  <!-- display:none -->
            </div>
            <div class="weight-unit-selector">...</div>
            <button class="weight-save-btn">...</button>  <!-- Should be hidden -->
            <button class="weight-cancel-btn">...</button>  <!-- Should be hidden -->
        </div>
    </div>
</div>

<div class="workout-section">  <!-- Protocol Section -->
    <div class="workout-section-label">Protocol</div>
    <div class="workout-repssets-field">...</div>
    <div class="workout-unified-actions">  <!-- WRONG: Inside section! -->
        <button class="unified-save-btn">...</button>
        <button class="unified-cancel-btn">...</button>
    </div>
</div>
```

## Solution Design

### Goal Layout
```
┌─────────────────────────────────────────┐
│ WEIGHT                                  │
│ ┌─────────────────────────────────────┐ │
│ │ 95                                  │ │  ← Full width input
│ └─────────────────────────────────────┘ │
│ [lbs] [kg] [DIY]                        │  ← Unit selector left-aligned
├─────────────────────────────────────────┤
│ PROTOCOL                                │
│ ┌─────────────────────────────────────┐ │
│ │ 4×10                                │ │  ← Full width input
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│                              [✓]  [✗]   │  ← Buttons right-aligned
└─────────────────────────────────────────┘
```

### Fix 1: Remove Stepper Buttons from HTML
The stepper buttons are hidden but still affect flex layout. Remove them from the HTML entirely since they're not being used.

**File:** `exercise-card-renderer.js` line 415-418

**Before:**
```html
<div class="weight-input-row numeric-mode">
    <input type="number" class="weight-input" ... />
    <button class="weight-stepper-btn minus">−5</button>
    <button class="weight-stepper-btn plus">+5</button>
</div>
```

**After:**
```html
<div class="weight-input-row numeric-mode">
    <input type="number" class="weight-input" ... />
</div>
```

### Fix 2: Move Unified Actions Outside Protocol Section
The unified actions should be rendered **after** the Protocol section ends, not inside `_renderRepsSetsField()`.

**File:** `exercise-card-renderer.js`

Move the unified actions to the main `renderCard()` method, after both sections:

```html
<!-- Weight Section -->
<div class="workout-section">
    <div class="workout-section-label">Weight</div>
    ${this._renderWeightField(...)}
    ${this._renderPlateBreakdown(...)}
</div>

<!-- Protocol Section -->
<div class="workout-section">
    <div class="workout-section-label">Protocol</div>
    ${this._renderRepsSetsField(...)}  <!-- NO unified actions here -->
</div>

<!-- Unified Save/Cancel (outside sections) -->
<div class="workout-unified-actions" onclick="event.stopPropagation();">
    <button class="unified-save-btn">...</button>
    <button class="unified-cancel-btn">...</button>
</div>
```

### Fix 3: Simplify Weight Editor CSS
Ensure the weight editor uses column layout and input takes full width.

**File:** `_weight-field.css`

```css
.weight-editor {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
}

.weight-input-row.numeric-mode {
    display: flex;
    width: 100%;
}

.weight-input {
    flex: 1;
    width: 100%;
    height: 48px;
    /* ... other styles ... */
}
```

### Fix 4: Hide Individual Save/Cancel in Unified Mode
Already have CSS for this, but ensure it's working:

```css
.workout-card.unified-edit-active .weight-save-btn,
.workout-card.unified-edit-active .weight-cancel-btn {
    display: none !important;
}
```

## Implementation Steps

### Step 1: Update `_renderWeightField()` in exercise-card-renderer.js
- Remove the stepper buttons from the numeric-mode row
- Keep only the input element

### Step 2: Update `_renderRepsSetsField()` in exercise-card-renderer.js
- Remove the unified actions from this method (they're wrongly placed here)
- Return only the repssets-field div

### Step 3: Update `renderCard()` in exercise-card-renderer.js
- Add unified actions after the Protocol section, outside any section div

### Step 4: Verify CSS in `_weight-field.css`
- Ensure `.weight-input-row.numeric-mode` doesn't have conflicting styles
- Ensure `.weight-input` has `width: 100%` and `flex: 1`

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/assets/js/components/exercise-card-renderer.js` | Remove stepper buttons, move unified actions |
| `frontend/assets/css/workout-mode/_weight-field.css` | Verify/fix input width styles |

## Testing Checklist

- [ ] Weight input stretches full width in lbs mode
- [ ] Weight input stretches full width in kg mode
- [ ] Weight input stretches full width in DIY mode
- [ ] Protocol input stretches full width
- [ ] Both inputs are same height (48px)
- [ ] Unified save/cancel buttons appear below both fields
- [ ] Buttons are right-aligned
- [ ] Clicking save saves both fields
- [ ] Clicking cancel cancels both fields
- [ ] Click-to-edit works on weight display
- [ ] Click-to-edit works on protocol display
