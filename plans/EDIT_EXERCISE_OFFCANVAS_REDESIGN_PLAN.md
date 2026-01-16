# Edit Exercise Offcanvas Redesign Plan

**Goal:** Redesign the "Edit Exercise" offcanvas to mirror the new in-card editor layout and styling.

**Date:** 2026-01-15  
**Version:** 1.0.0

---

## 📋 Requirements Summary

Based on user feedback, the redesigned offcanvas should:

1. ✅ **Protocol Section (Sets × Reps)** - Single full-width text input (open section, not collapsed)
2. ✅ **Weight Section** - Use segmented button group (lbs | kg | DIY) instead of dropdown
3. ✅ **Rest Time** - Move to its own line below protocol, make it editable
4. ✅ **Update Template Toggle** - Keep this feature for full editing power
5. ✅ **Consistent Styling** - Match the in-card editor's visual design

---

## 🎨 Current vs. New Layout

### Current Layout (OLD)
```
┌─────────────────────────────────────┐
│ Edit Exercise                    [×]│
├─────────────────────────────────────┤
│ Exercise Name                       │
│                                     │
│ ┌─────┬─────┬─────┐                │
│ │Sets │Reps │Rest │                │
│ │  3  │8-12 │ 60s │                │
│ └─────┴─────┴─────┘                │
│                                     │
│ Weight: [135] [lbs ▼]              │
│                                     │
│ ☐ Update Workout Template          │
│                                     │
│ [Cancel]  [Save Changes]           │
└─────────────────────────────────────┘
```

### New Layout (REDESIGNED)
```
┌─────────────────────────────────────┐
│ Edit Exercise                    [×]│
├─────────────────────────────────────┤
│ Exercise Name                       │
│                                     │
│ PROTOCOL                            │
│ ┌─────────────────────────────────┐ │
│ │ 3×8-12                          │ │
│ └─────────────────────────────────┘ │
│ (e.g., 3×10, AMRAP, 3 sets to fail) │
│                                     │
│ WEIGHT                              │
│ ┌─────┐  ┌─────────────────┐       │
│ │ 135 │  │lbs│kg │DIY│      │       │
│ └─────┘  └─────────────────┘       │
│                                     │
│ REST TIME                           │
│ ┌─────────────────────────────────┐ │
│ │ 60s                             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ☑ Update Workout Template          │
│ ℹ Changes will update template AND  │
│   session history                   │
│                                     │
│ [Cancel]  [Save Changes]           │
└─────────────────────────────────────┘
```

---

## 🔧 Implementation Details

### File to Modify
- **`frontend/assets/js/components/offcanvas/offcanvas-forms.js`**
  - Function: `createExerciseDetailsEditor()` (lines 655-854)

### Changes Required

#### 1. Protocol Section (Sets × Reps)
**Current:** Three separate inputs in a row
```html
<div class="row g-2 mb-3">
    <div class="col-4">
        <label>Sets</label>
        <input id="editSetsInput" value="${sets}">
    </div>
    <div class="col-4">
        <label>Reps</label>
        <input id="editRepsInput" value="${reps}">
    </div>
    <div class="col-4">
        <label>Rest</label>
        <input id="editRestInput" value="${rest}">
    </div>
</div>
```

**New:** Single full-width text input
```html
<div class="mb-3">
    <label class="form-label">Protocol</label>
    <input type="text" class="form-control" id="editProtocolInput"
           value="${sets}×${reps}" 
           placeholder="e.g., 3×10, AMRAP, 3 sets to failure">
    <small class="text-muted">Enter sets and reps in any format</small>
</div>
```

#### 2. Weight Section
**Current:** Input + Dropdown
```html
<div class="d-flex gap-2">
    <input type="text" id="editWeightInput" value="${weight}">
    <select id="editWeightUnitSelect">
        <option value="lbs">lbs</option>
        <option value="kg">kg</option>
        <option value="other">DIY</option>
    </select>
</div>
```

**New:** Input + Segmented Button Group
```html
<div class="mb-3">
    <label class="form-label"><i class="bx bx-dumbbell me-1"></i>Weight</label>
    <div class="weight-input-container ${weightUnit === 'other' ? 'diy-mode' : ''}">
        <input type="text" class="form-control weight-input text-center"
               id="editWeightInput" value="${weight}"
               placeholder="${weightUnit === 'other' ? 'e.g., body weight + 10lbs' : (weightUnit === 'kg' ? '60' : '135')}">
        <div class="btn-group w-100 mt-2" role="group">
            <button type="button" class="btn btn-outline-secondary weight-unit-btn ${weightUnit === 'lbs' ? 'active' : ''}"
                    data-unit="lbs">lbs</button>
            <button type="button" class="btn btn-outline-secondary weight-unit-btn ${weightUnit === 'kg' ? 'active' : ''}"
                    data-unit="kg">kg</button>
            <button type="button" class="btn btn-outline-secondary weight-unit-btn ${weightUnit === 'other' ? 'active' : ''}"
                    data-unit="other">DIY</button>
        </div>
    </div>
</div>
```

#### 3. Rest Time Section
**New:** Separate section below protocol
```html
<div class="mb-3">
    <label class="form-label">Rest Time</label>
    <input type="text" class="form-control" id="editRestInput"
           value="${rest}" placeholder="60s">
    <small class="text-muted">e.g., 60s, 2min, 90s</small>
</div>
```

#### 4. Update Template Toggle
**Keep existing** - No changes needed, already well-designed

---

## 📝 JavaScript Changes

### Data Handling

#### Current Save Logic
```javascript
const updatedData = {
    sets: setsInput.value.trim() || '3',
    reps: repsInput.value.trim() || '8-12',
    rest: validatedRest,
    weight: weightInput.value.trim(),
    weightUnit: unitSelect.value,
    updateTemplate: updateTemplateToggle?.checked || false
};
```

#### New Save Logic
```javascript
// Parse protocol input
const protocolValue = protocolInput.value.trim() || '3×10';
const { sets, reps } = parseProtocol(protocolValue);

const updatedData = {
    protocol: protocolValue,  // NEW: Store raw protocol string
    sets: sets,               // Extracted for backward compatibility
    reps: reps,               // Extracted for backward compatibility
    rest: validatedRest,
    weight: weightInput.value.trim(),
    weightUnit: currentWeightUnit,  // From button group state
    updateTemplate: updateTemplateToggle?.checked || false
};
```

### Helper Function: Parse Protocol
```javascript
/**
 * Parse protocol string into sets and reps
 * @param {string} protocol - e.g., "3×10", "AMRAP", "3 sets to failure"
 * @returns {{sets: string, reps: string}}
 */
function parseProtocol(protocol) {
    // Try to match common patterns
    const xPattern = /(\d+)\s*[x×]\s*(.+)/i;
    const setsPattern = /(\d+)\s*set/i;
    
    const xMatch = protocol.match(xPattern);
    if (xMatch) {
        return { sets: xMatch[1], reps: xMatch[2] };
    }
    
    const setsMatch = protocol.match(setsPattern);
    if (setsMatch) {
        return { sets: setsMatch[1], reps: 'varies' };
    }
    
    // Default fallback
    return { sets: '1', reps: protocol };
}
```

### Weight Unit Button Group Handler
```javascript
// Track current weight unit
let currentWeightUnit = weightUnit;

// Weight unit button handlers
weightUnitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Update button states
        weightUnitBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentWeightUnit = btn.dataset.unit;
        
        // Toggle DIY mode layout
        const weightContainer = offcanvasElement.querySelector('.weight-input-container');
        if (currentWeightUnit === 'other') {
            weightContainer.classList.add('diy-mode');
            weightInput.placeholder = 'e.g., body weight + 10lbs';
        } else {
            weightContainer.classList.remove('diy-mode');
            weightInput.placeholder = currentWeightUnit === 'kg' ? '60' : '135';
        }
    });
});
```

---

## 🎨 CSS Styling

### Reuse Existing Logbook Theme Styles

The offcanvas should leverage existing CSS from [`logbook-theme.css`](frontend/assets/css/logbook-theme.css):

- **Weight Input Container:** `.weight-input-container` (lines 317-329)
- **Weight Unit Selector:** `.weight-unit-selector` (lines 420-459)
- **DIY Mode:** `.weight-input-container.diy-mode` (lines 410-417)
- **Protocol Input:** Similar to `.repssets-text-input` (lines 886-911)

### Additional Offcanvas-Specific Styles

```css
/* Offcanvas Exercise Editor - Match In-Card Styling */
#exerciseDetailsEditorOffcanvas .weight-input-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

#exerciseDetailsEditorOffcanvas .weight-input {
    width: 100%;
    max-width: none;
    font-size: 1.25rem;
    font-weight: 600;
    text-align: center;
}

#exerciseDetailsEditorOffcanvas .weight-unit-btn {
    flex: 1;
}

#exerciseDetailsEditorOffcanvas .form-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--logbook-muted);
    margin-bottom: 0.5rem;
}
```

---

## ✅ Validation & Error Handling

### Protocol Validation
- Accept any text input (no strict validation)
- Store raw string for flexibility
- Extract sets/reps for backward compatibility

### Rest Time Validation
- Reuse existing `WorkoutUtils.validateRestTime()` function
- Show inline error feedback
- Prevent save if invalid format

### Weight Validation
- Numeric mode: Allow numbers only
- DIY mode: Allow any text

---

## 🔄 Backward Compatibility

### Data Structure
The new implementation maintains backward compatibility:

```javascript
// NEW format (preferred)
{
    protocol: "3×8-12",
    rest: "60s",
    weight: "135",
    weightUnit: "lbs"
}

// OLD format (still supported)
{
    sets: "3",
    reps: "8-12",
    rest: "60s",
    weight: "135",
    weightUnit: "lbs"
}
```

### Migration Strategy
- New saves include both `protocol` and extracted `sets`/`reps`
- Old data without `protocol` field will be constructed as `${sets}×${reps}`
- No database migration needed

---

## 📱 Mobile Responsiveness

### Layout Adjustments
- Protocol input: Full width on all screen sizes
- Weight input: Full width on mobile, centered on desktop
- Button group: Stack vertically on very small screens (<400px)

```css
@media (max-width: 400px) {
    #exerciseDetailsEditorOffcanvas .btn-group {
        flex-direction: column;
    }
    
    #exerciseDetailsEditorOffcanvas .weight-unit-btn {
        width: 100%;
    }
}
```

---

## 🧪 Testing Checklist

### Functional Testing
- [ ] Protocol input accepts various formats (3×10, AMRAP, etc.)
- [ ] Weight unit switching works (lbs ↔ kg ↔ DIY)
- [ ] DIY mode shows/hides correctly
- [ ] Rest time validation works
- [ ] Update template toggle saves correctly
- [ ] Cancel button discards changes
- [ ] Save button persists changes

### Visual Testing
- [ ] Layout matches in-card editor
- [ ] Spacing and alignment consistent
- [ ] Dark mode styling correct
- [ ] Mobile responsive layout works
- [ ] Button states (active/hover) work

### Integration Testing
- [ ] Saved data updates workout session
- [ ] Template updates when toggle is checked
- [ ] Protocol parsing extracts sets/reps correctly
- [ ] Backward compatibility with old data format

---

## 📦 Files to Modify

1. **`frontend/assets/js/components/offcanvas/offcanvas-forms.js`**
   - Update `createExerciseDetailsEditor()` function
   - Add `parseProtocol()` helper function
   - Update event handlers for new UI elements

2. **`frontend/assets/css/logbook-theme.css`** (optional)
   - Add offcanvas-specific overrides if needed
   - Most styles can be reused from existing classes

---

## 🚀 Implementation Steps

1. **Backup current implementation**
   - Save current `createExerciseDetailsEditor()` function

2. **Update HTML structure**
   - Replace 3-column row with single protocol input
   - Replace dropdown with segmented button group
   - Add separate rest time section

3. **Update JavaScript logic**
   - Add `parseProtocol()` helper
   - Update weight unit button handlers
   - Update save logic to handle new data structure

4. **Test thoroughly**
   - Test all input formats
   - Test unit switching
   - Test save/cancel behavior
   - Test template update toggle

5. **Deploy and monitor**
   - Deploy to staging first
   - Monitor for any issues
   - Gather user feedback

---

## 📊 Success Metrics

- ✅ Offcanvas layout matches in-card editor
- ✅ All existing functionality preserved
- ✅ No breaking changes to data structure
- ✅ Improved user experience with consistent UI
- ✅ Mobile responsive design works

---

## 🔗 Related Files

- [`exercise-card-renderer.js`](frontend/assets/js/components/exercise-card-renderer.js) - In-card editor reference
- [`repssets-field-controller.js`](frontend/assets/js/controllers/repssets-field-controller.js) - Protocol field logic
- [`weight-field-controller.js`](frontend/assets/js/controllers/weight-field-controller.js) - Weight field logic
- [`logbook-theme.css`](frontend/assets/css/logbook-theme.css) - Styling reference

---

**Ready for implementation approval! 🎯**
