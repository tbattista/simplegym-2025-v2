# Weight Editor DIY Mode Fix Plan

**Date**: 2026-01-13  
**Status**: In Progress  
**Approach**: Option A - Shared Controls with CSS Repositioning

---

## 🐛 Issues Identified

### Issue 1: DIY Mode Not Wrapping to Second Line
**Root Cause**: The HTML structure creates **two separate input rows**, each with their own unit selectors and action buttons. When DIY mode is active, the numeric row is hidden, but the DIY row's controls compete for horizontal space instead of wrapping cleanly.

**Current Structure** (Problematic):
```html
<div class="weight-editor">
  <!-- Numeric Row -->
  <div class="weight-input-row numeric-mode">
    [input] [−5] [+5] [unit selector] [✓] [✗]
  </div>
  
  <!-- DIY Row -->
  <div class="weight-input-row diy-mode">
    [text input] [unit selector] [✓] [✗]
  </div>
</div>
```

**CSS Expectation vs Reality**:
- CSS sets `.weight-input-row.diy-mode { width: 100%; order: 2; }`
- Expected: DIY input wraps to second line
- Reality: DIY input shares space with its own controls, preventing clean wrap

---

### Issue 2: DIY Save Button Not Bound
**Root Cause**: The controller uses `querySelector('.weight-save-btn')` which only returns the **first** matching element. Since the numeric row appears first in the DOM, the DIY save button is never bound.

**Controller Code** (weight-field-controller.js:43, 91-100):
```javascript
this.saveBtn = container.querySelector('.weight-save-btn');  // ← First match only

if (this.saveBtn) {  // ← Binds only to numeric save button
    this.saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.blurTimeout) {
            clearTimeout(this.blurTimeout);
            this.blurTimeout = null;
        }
        this.exitEditMode(true);
    });
}
```

---

## ✅ Solution: Shared Controls (Option A)

### Architecture
1. **Single Set of Controls**: Unit selector and save/cancel buttons live **outside** both input rows
2. **CSS Positioning**: Use `order` and `width: 100%` to force controls to wrap below DIY input
3. **No Duplicate Bindings**: Controller binds once to the shared controls

### New HTML Structure
```html
<div class="weight-editor">
  <!-- Numeric Input Row (order: 1) -->
  <div class="weight-input-row numeric-mode">
    <input type="number" class="weight-input" />
    <button class="weight-stepper-btn minus">−5</button>
    <button class="weight-stepper-btn plus">+5</button>
  </div>
  
  <!-- DIY Input Row (order: 1, width: 100% when visible) -->
  <div class="weight-input-row diy-mode">
    <input type="text" class="weight-text-input" />
  </div>
  
  <!-- Shared Controls (order: 2) -->
  <div class="weight-unit-selector">
    <button class="unit-btn" data-unit="lbs">lbs</button>
    <button class="unit-btn" data-unit="kg">kg</button>
    <button class="unit-btn" data-unit="diy">DIY</button>
  </div>
  
  <button class="weight-save-btn">✓</button>
  <button class="weight-cancel-btn">✗</button>
</div>
```

### CSS Strategy
```css
.weight-editor {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
}

/* Numeric mode: input row stays inline with controls */
.weight-input-row.numeric-mode {
    display: flex;
    gap: 0.5rem;
    order: 1;
}

/* DIY mode: input row forces line break */
.weight-input-row.diy-mode {
    display: none;  /* Hidden by default */
    width: 100%;    /* Full width when visible */
    order: 1;       /* Same order as numeric row */
}

/* When DIY is active, show DIY row and force controls to next line */
.weight-editor.diy-active .weight-input-row.numeric-mode {
    display: none;
}

.weight-editor.diy-active .weight-input-row.diy-mode {
    display: flex;
}

/* Shared controls always appear after input rows */
.weight-unit-selector {
    order: 2;
}

.weight-save-btn,
.weight-cancel-btn {
    order: 2;
}
```

---

## 📝 Implementation Steps

### Step 1: Refactor HTML Structure (exercise-card-renderer.js)
**File**: `frontend/assets/js/components/exercise-card-renderer.js`  
**Lines**: 398-433

**Changes**:
1. Remove duplicate unit selectors from both input rows
2. Remove duplicate save/cancel buttons from both input rows
3. Move unit selector and action buttons outside both rows as siblings
4. Simplify numeric row to just: `[input] [−5] [+5]`
5. Simplify DIY row to just: `[text input]`

### Step 2: Update CSS Layout (logbook-theme.css)
**File**: `frontend/assets/css/logbook-theme.css`  
**Lines**: 339-375

**Changes**:
1. Add `.diy-active` class support to `.weight-editor`
2. Update `.weight-input-row.diy-mode` to use `display: none` by default
3. Add `.weight-editor.diy-active` rules to show DIY row and hide numeric row
4. Ensure unit selector and buttons use `order: 2` to wrap after input

### Step 3: Update Controller Logic (weight-field-controller.js)
**File**: `frontend/assets/js/controllers/weight-field-controller.js`  
**Lines**: 180-218

**Changes**:
1. Update `switchUnit()` to toggle `.diy-active` class on `.weight-editor`
2. Remove manual `style.display` toggling (CSS handles this now)
3. Verify save/cancel buttons are properly bound (no changes needed)

---

## 🧪 Testing Checklist

### Numeric Mode (lbs/kg)
- [ ] Edit button opens editor in numeric mode
- [ ] Input field shows current weight value
- [ ] Unit selector shows "lbs" active by default
- [ ] Save button persists changes
- [ ] Cancel button reverts changes
- [ ] Plus/minus buttons remain hidden

### DIY Mode
- [ ] Clicking "DIY" button hides numeric input
- [ ] Clicking "DIY" button shows text input on **second line**
- [ ] Unit selector and action buttons appear **below** text input
- [ ] Text input allows free-form text (e.g., "body weight + 10lbs")
- [ ] Save button persists DIY text value
- [ ] Cancel button reverts to original value
- [ ] Display mode shows DIY text after save

### Mode Switching
- [ ] Switching from lbs → kg preserves numeric value
- [ ] Switching from lbs → DIY clears numeric input, shows text input
- [ ] Switching from DIY → lbs shows numeric input, preserves last numeric value
- [ ] Unit selector buttons update active state correctly

---

## 📊 Success Metrics

1. **Layout**: DIY text input wraps to full-width second line
2. **Functionality**: DIY save button successfully persists text values
3. **UX**: Clean, intuitive transition between numeric and DIY modes
4. **Code Quality**: No duplicate controls, single source of truth for bindings

---

## 🔄 Rollback Plan

If Option A causes issues, revert to **Option B** (Fix Duplicate Bindings):
1. Keep current HTML structure with duplicate buttons
2. Use `querySelectorAll('.weight-save-btn')` and bind both buttons
3. Add explicit `flex-basis: 100%` to DIY row for wrapping