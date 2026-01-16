# Weight Editor Unit Switching & Layout Improvement Plan

**Date:** 2026-01-13  
**Status:** Planning  
**Mode:** Architect  

---

## 🎯 Objectives

1. **Reposition quick adjust buttons**: Move +5/-5 buttons to the RIGHT of the weight input
2. **Add unit switching**: Allow users to toggle between lbs/kg/DIY modes
3. **DIY mode**: Allow free-text entries like "body weight + 10 lbs"

---

## 📊 Current Implementation Analysis

### Current Weight Editor Structure (from [`exercise-card-renderer.js:374-413`](frontend/assets/js/components/exercise-card-renderer.js:374))

```html
<div class="weight-editor" style="display: none;">
    <button class="weight-stepper-btn minus">−5</button>
    <input type="number" class="weight-input" />
    <button class="weight-stepper-btn plus">+5</button>
    <div class="weight-editor-actions">
        <button class="weight-save-btn">✓</button>
        <button class="weight-cancel-btn">✕</button>
    </div>
</div>
```

**Current Data Storage** (from [`workout-session-service.js:365-399`](frontend/assets/js/services/workout-session-service.js:365)):
- `weight`: numeric value
- `weight_unit`: string ('lbs', 'kg', 'other')
- Stored in session exercises object

---

## 🎨 Proposed Design

### Layout: Segmented Control Above Input

```
┌─────────────────────────────────────────┐
│  [ lbs ] [ kg ] [ DIY ]  ← Segmented    │
│                              control     │
├─────────────────────────────────────────┤
│  [input field]  [-5]  [+5] ← Quick btns │
│                         [✓]  [✕]         │
└─────────────────────────────────────────┘
```

### Three Modes

#### 1. **LBS Mode** (Numeric)
- Standard numeric input with quick +5/-5 buttons
- Unit display: "lbs"
- Storage: `{ weight: 100, weight_unit: 'lbs', weight_mode: 'numeric' }`

#### 2. **KG Mode** (Numeric)
- Standard numeric input with quick +2.5/-2.5 buttons (adjusted for kg)
- Unit display: "kg"
- **No auto-conversion** - User manually enters kg value
- Storage: `{ weight: 45.4, weight_unit: 'kg', weight_mode: 'numeric' }`

#### 3. **DIY Mode** (Text)
- Free-text input field (replaces numeric input)
- Quick buttons hidden
- Placeholder: "e.g., body weight + 10 lbs"
- Storage: `{ weight_text: 'body weight + 10 lbs', weight_unit: 'other', weight_mode: 'text' }`

---

## 🏗️ Implementation Plan

### Phase 1: HTML Structure Updates

**File:** [`exercise-card-renderer.js`](frontend/assets/js/components/exercise-card-renderer.js:374)

**Current:**
```javascript
_renderWeightField(weight, unit, exerciseName) {
    // Line 395: Edit mode structure
}
```

**New Structure:**
```html
<div class="weight-editor" style="display: none;">
    <!-- NEW: Unit Selector (Segmented Control) -->
    <div class="weight-unit-selector">
        <button class="weight-unit-btn active" data-unit="lbs">lbs</button>
        <button class="weight-unit-btn" data-unit="kg">kg</button>
        <button class="weight-unit-btn" data-unit="diy">DIY</button>
    </div>
    
    <!-- Input Row: Numeric mode -->
    <div class="weight-editor-row numeric-mode">
        <input type="number" class="weight-input" placeholder="0" />
        <button class="weight-stepper-btn minus">−5</button>
        <button class="weight-stepper-btn plus">+5</button>
        <div class="weight-editor-actions">
            <button class="weight-save-btn"><i class="bx bx-check"></i></button>
            <button class="weight-cancel-btn"><i class="bx bx-x"></i></button>
        </div>
    </div>
    
    <!-- Input Row: DIY mode (hidden initially) -->
    <div class="weight-editor-row diy-mode" style="display: none;">
        <input type="text" class="weight-text-input" placeholder="e.g., body weight + 10 lbs" />
        <div class="weight-editor-actions">
            <button class="weight-save-btn"><i class="bx bx-check"></i></button>
            <button class="weight-cancel-btn"><i class="bx bx-x"></i></button>
        </div>
    </div>
</div>
```

**Display Mode Update:**
```html
<div class="weight-display">
    <div class="weight-value-group">
        <span class="weight-value">100</span>
        <span class="weight-unit">lbs</span> <!-- or show text in DIY mode -->
    </div>
    <button class="weight-edit-btn">...</button>
</div>
```

---

### Phase 2: CSS Styling

**File:** [`logbook-theme.css`](frontend/assets/css/logbook-theme.css:277)

**Add After Line 487 (weight morph pattern section):**

```css
/* ============================================
   WEIGHT UNIT SELECTOR - Segmented Control
   ============================================ */

.weight-unit-selector {
    display: flex;
    gap: 0;
    margin-bottom: 0.5rem;
    border: 1px solid var(--logbook-border);
    border-radius: 0.375rem;
    overflow: hidden;
    background: var(--logbook-card-bg);
}

.weight-unit-btn {
    flex: 1;
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
    border: none;
    background: transparent;
    color: var(--logbook-muted);
    cursor: pointer;
    transition: all 0.15s ease;
    border-right: 1px solid var(--logbook-border);
}

.weight-unit-btn:last-child {
    border-right: none;
}

.weight-unit-btn:hover {
    background: var(--status-active);
    color: var(--logbook-accent);
}

.weight-unit-btn.active {
    background: var(--logbook-accent);
    color: white;
    font-weight: 700;
}

/* ============================================
   WEIGHT EDITOR ROW - Repositioned Buttons
   ============================================ */

.weight-editor-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.weight-editor-row.numeric-mode {
    /* Default: visible */
}

.weight-editor-row.diy-mode {
    /* Hidden by default, shown when DIY mode active */
}

/* Numeric input - slightly smaller to fit new layout */
.weight-editor-row .weight-input {
    width: 100px;
    flex-shrink: 0;
}

/* Text input - takes more space */
.weight-editor-row .weight-text-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    font-weight: 500;
    color: var(--logbook-text);
    border: 2px solid var(--logbook-accent);
    border-radius: 0.375rem;
    background: var(--logbook-card-bg);
    outline: none;
}

.weight-editor-row .weight-text-input:focus {
    border-color: var(--logbook-accent);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.weight-editor-row .weight-text-input::placeholder {
    color: var(--logbook-muted);
    font-weight: 400;
}

/* Quick adjust buttons - now after input */
.weight-editor-row .weight-stepper-btn {
    order: 2; /* Position after input */
}

.weight-editor-row .weight-input {
    order: 1;
}

.weight-editor-row .weight-editor-actions {
    order: 3; /* Actions at the end */
    margin-left: auto;
}

/* Mobile adjustments */
@media (max-width: 576px) {
    .weight-unit-btn {
        padding: 0.25rem 0.5rem;
        font-size: 0.8125rem;
    }
    
    .weight-editor-row .weight-input {
        width: 80px;
    }
}
```

---

### Phase 3: JavaScript Controller Updates

**File:** [`weight-field-controller.js`](frontend/assets/js/controllers/weight-field-controller.js:1)

#### 3.1: Constructor Updates (Line 17-50)

```javascript
constructor(container, options = {}) {
    this.container = container;
    this.sessionService = options.sessionService || window.workoutSessionService;
    this.exerciseName = options.exerciseName || container.closest('.logbook-card')?.dataset?.exerciseName;
    
    // DOM elements
    this.displayEl = container.querySelector('.weight-display');
    this.editorEl = container.querySelector('.weight-editor');
    this.valueDisplay = container.querySelector('.weight-display .weight-value');
    
    // NEW: Unit selector elements
    this.unitSelector = container.querySelector('.weight-unit-selector');
    this.unitButtons = container.querySelectorAll('.weight-unit-btn');
    
    // NEW: Dual input mode elements
    this.numericRow = container.querySelector('.weight-editor-row.numeric-mode');
    this.diyRow = container.querySelector('.weight-editor-row.diy-mode');
    this.numericInput = container.querySelector('.weight-input');
    this.textInput = container.querySelector('.weight-text-input');
    
    // Legacy references (for backward compatibility)
    this.input = this.numericInput;
    
    // Buttons
    this.editBtn = container.querySelector('.weight-edit-btn');
    this.saveBtn = container.querySelectorAll('.weight-save-btn');
    this.cancelBtn = container.querySelectorAll('.weight-cancel-btn');
    this.minusBtn = container.querySelector('.weight-stepper-btn.minus');
    this.plusBtn = container.querySelector('.weight-stepper-btn.plus');
    
    // State
    this.originalValue = parseFloat(this.numericInput?.value) || 0;
    this.originalUnit = container.dataset.unit || 'lbs';
    this.currentMode = 'numeric'; // 'numeric' or 'text'
    this.currentUnit = this.originalUnit;
    
    // NEW: Conversion constants
    this.LBS_TO_KG = 0.453592;
    this.KG_TO_LBS = 2.20462;
    
    this.bindEvents();
}
```

#### 3.2: Event Binding Updates (After Line 118)

```javascript
bindEvents() {
    // ... existing event listeners ...
    
    // NEW: Unit selector buttons
    this.unitButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetUnit = btn.dataset.unit;
            this.switchUnit(targetUnit);
        });
    });
    
    // NEW: Save buttons for both modes
    this.saveBtn.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.exitEditMode(true);
        });
    });
    
    // NEW: Cancel buttons for both modes
    this.cancelBtn.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.exitEditMode(false);
        });
    });
    
    // NEW: Text input keyboard events
    if (this.textInput) {
        this.textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.exitEditMode(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.exitEditMode(false);
            }
        });
    }
}
```

#### 3.3: NEW METHOD - Switch Unit

```javascript
/**
 * Switch between weight units (lbs/kg/DIY)
 * @param {string} targetUnit - Target unit ('lbs', 'kg', 'diy')
 */
switchUnit(targetUnit) {
    console.log(`🔄 Switching unit from ${this.currentUnit} to ${targetUnit}`);
    
    // Update active button state
    this.unitButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.unit === targetUnit);
    });
    
    // Handle DIY mode toggle
    if (targetUnit === 'diy') {
        this.enterDiyMode();
        return;
    }
    
    // Handle numeric mode (lbs/kg)
    this.enterNumericMode();
    
    // Auto-convert weight if switching between lbs/kg
    if (this.currentUnit !== targetUnit && this.currentMode === 'numeric') {
        this.convertWeight(this.currentUnit, targetUnit);
    }
    
    // Update current unit
    this.currentUnit = targetUnit;
    
    // Update increment based on unit
    this.updateIncrement();
}

/**
 * Convert weight value between units
 * @param {string} fromUnit - Source unit
 * @param {string} toUnit - Target unit
 */
convertWeight(fromUnit, toUnit) {
    const currentValue = parseFloat(this.numericInput.value) || 0;
    
    if (currentValue === 0) {
        console.log('⏭️ Skipping conversion - no weight set');
        return;
    }
    
    let convertedValue = currentValue;
    
    if (fromUnit === 'lbs' && toUnit === 'kg') {
        convertedValue = currentValue * this.LBS_TO_KG;
        console.log(`📊 Converting ${currentValue} lbs → ${convertedValue.toFixed(1)} kg`);
    } else if (fromUnit === 'kg' && toUnit === 'lbs') {
        convertedValue = currentValue * this.KG_TO_LBS;
        console.log(`📊 Converting ${currentValue} kg → ${convertedValue.toFixed(1)} lbs`);
    }
    
    // Round to 1 decimal place for readability
    this.numericInput.value = Math.round(convertedValue * 10) / 10;
}

/**
 * Update increment based on current unit
 */
updateIncrement() {
    if (this.currentUnit === 'kg') {
        this.increment = 2.5; // Smaller increment for kg
        this.minusBtn.textContent = '−2.5';
        this.plusBtn.textContent = '+2.5';
    } else {
        this.increment = 5; // Standard increment for lbs
        this.minusBtn.textContent = '−5';
        this.plusBtn.textContent = '+5';
    }
}

/**
 * Enter DIY (text) mode
 */
enterDiyMode() {
    this.currentMode = 'text';
    this.numericRow.style.display = 'none';
    this.diyRow.style.display = 'flex';
    
    // Transfer numeric value to text if exists
    const currentNumeric = parseFloat(this.numericInput.value);
    if (currentNumeric > 0) {
        this.textInput.value = `${currentNumeric} ${this.currentUnit}`;
    }
    
    // Focus text input
    setTimeout(() => this.textInput.focus(), 100);
    console.log('✏️ DIY mode enabled');
}

/**
 * Enter numeric mode (lbs/kg)
 */
enterNumericMode() {
    this.currentMode = 'numeric';
    this.numericRow.style.display = 'flex';
    this.diyRow.style.display = 'none';
    
    // Try to extract numeric value from text input if switching back
    if (this.textInput.value) {
        const numMatch = this.textInput.value.match(/(\d+\.?\d*)/);
        if (numMatch) {
            this.numericInput.value = numMatch[1];
        }
    }
    
    console.log('🔢 Numeric mode enabled');
}
```

#### 3.4: Update exitEditMode Method (Line 137-150)

```javascript
/**
 * Exit edit mode - hide editor, show display
 * @param {boolean} save - Whether to save the value or restore original
 */
exitEditMode(save = true) {
    if (save) {
        if (this.currentMode === 'text') {
            // Save text value
            const textValue = this.textInput.value.trim();
            this.updateTextValue(textValue);
        } else {
            // Save numeric value
            const newValue = parseFloat(this.numericInput.value) || 0;
            this.updateValue(newValue, this.currentUnit);
        }
    } else {
        // Restore original values
        this.numericInput.value = this.originalValue;
        this.textInput.value = '';
        this.currentUnit = this.originalUnit;
        
        // Restore unit button state
        this.unitButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.unit === this.originalUnit);
        });
        
        // Restore mode
        if (this.originalUnit === 'diy') {
            this.enterDiyMode();
        } else {
            this.enterNumericMode();
        }
    }
    
    this.editorEl.style.display = 'none';
    this.displayEl.style.display = 'flex';
    
    console.log('💾 Edit mode exited for:', this.exerciseName, save ? '(saved)' : '(cancelled)');
}
```

#### 3.5: NEW METHOD - Update Text Value

```javascript
/**
 * Update the displayed value with text (DIY mode)
 * @param {string} textValue - Free-text weight description
 */
updateTextValue(textValue) {
    if (!textValue) {
        console.warn('⚠️ No text value provided');
        return;
    }
    
    // Update DOM
    this.valueDisplay.textContent = textValue;
    this.container.dataset.weight = ''; // Clear numeric weight
    this.container.dataset.weightText = textValue;
    this.container.dataset.unit = 'other';
    this.container.dataset.mode = 'text';
    
    // Save to session service
    if (this.sessionService) {
        if (this.sessionService.isSessionActive()) {
            this.sessionService.updateExerciseWeight(this.exerciseName, null, 'other', textValue);
        } else {
            this.sessionService.updatePreSessionExercise(this.exerciseName, {
                weight: null,
                weight_text: textValue,
                weight_unit: 'other',
                weight_mode: 'text'
            });
        }
        console.log('💾 Text weight saved:', this.exerciseName, textValue);
    }
    
    // Trigger save animation
    this.displayEl.classList.add('saved');
    setTimeout(() => {
        this.displayEl.classList.remove('saved');
    }, 600);
    
    // Dispatch custom event
    this.container.dispatchEvent(new CustomEvent('weightChanged', {
        bubbles: true,
        detail: {
            exerciseName: this.exerciseName,
            weightText: textValue,
            unit: 'other',
            mode: 'text'
        }
    }));
}
```

#### 3.6: Update updateValue Method (Line 169-217)

```javascript
/**
 * Update the displayed value and save to session service
 * @param {number} newValue - New weight value
 * @param {string} unit - Weight unit (lbs/kg)
 */
updateValue(newValue, unit = 'lbs') {
    const clampedValue = Math.max(0, Math.min(9999, newValue));
    const displayValue = clampedValue === 0 ? '—' : clampedValue;
    const unitDisplay = unit !== 'other' ? ` ${unit}` : '';
    
    // Update DOM
    this.valueDisplay.textContent = displayValue;
    const unitSpan = this.displayEl.querySelector('.weight-unit');
    if (unitSpan) {
        unitSpan.textContent = unit;
    }
    
    this.numericInput.value = clampedValue || '';
    this.container.dataset.weight = clampedValue;
    this.container.dataset.unit = unit;
    this.container.dataset.mode = 'numeric';
    delete this.container.dataset.weightText; // Clear text mode data
    
    // Save to session service
    if (this.sessionService) {
        if (this.sessionService.isSessionActive()) {
            this.sessionService.updateExerciseWeight(this.exerciseName, clampedValue, unit, null);
        } else {
            this.sessionService.updatePreSessionExercise(this.exerciseName, {
                weight: clampedValue,
                weight_unit: unit,
                weight_mode: 'numeric',
                weight_text: null
            });
        }
        console.log('💾 Weight saved:', this.exerciseName, clampedValue, unit);
    }
    
    // Trigger save animation
    this.displayEl.classList.add('saved');
    setTimeout(() => {
        this.displayEl.classList.remove('saved');
    }, 600);
    
    // Dispatch custom event
    this.container.dispatchEvent(new CustomEvent('weightChanged', {
        bubbles: true,
        detail: {
            exerciseName: this.exerciseName,
            weight: clampedValue,
            unit: unit,
            mode: 'numeric'
        }
    }));
}
```

---

### Phase 4: Session Service Updates

**File:** [`workout-session-service.js`](frontend/assets/js/services/workout-session-service.js:365)

#### 4.1: Update updateExerciseWeight signature (Line 365)

```javascript
/**
 * Update exercise weight in current session
 * @param {string} exerciseName - Exercise name
 * @param {number|null} weight - Weight value (null for text mode)
 * @param {string} unit - Weight unit (lbs/kg/other)
 * @param {string|null} weightText - Free-text weight (for DIY mode)
 */
updateExerciseWeight(exerciseName, weight, unit, weightText = null) {
    if (!this.currentSession) {
        console.warn('No active session to update');
        return;
    }
    
    if (!this.currentSession.exercises) {
        this.currentSession.exercises = {};
    }
    
    const existingData = this.currentSession.exercises[exerciseName] || {};
    
    // Determine mode based on input
    const mode = weightText ? 'text' : 'numeric';
    
    this.currentSession.exercises[exerciseName] = {
        ...existingData,
        weight: mode === 'numeric' ? weight : null,
        weight_text: mode === 'text' ? weightText : null,
        weight_unit: unit,
        weight_mode: mode,
        is_modified: true,
        modified_at: new Date().toISOString()
    };
    
    console.log('💪 Updated weight:', exerciseName, mode === 'text' ? weightText : `${weight} ${unit}`);
    this.notifyListeners('weightUpdated', { exerciseName, weight, unit, weightText, mode });
    this.persistSession();
}
```

#### 4.2: Update updatePreSessionExercise (Line 459)

```javascript
/**
 * PHASE 1: Update exercise details BEFORE session starts (pre-session editing)
 * @param {string} exerciseName - Exercise name
 * @param {Object} details - Updated details
 */
updatePreSessionExercise(exerciseName, details) {
    console.log('📝 Storing pre-session edit for:', exerciseName, details);
    
    this.preSessionEdits[exerciseName] = {
        target_sets: details.sets || '3',
        target_reps: details.reps || '8-12',
        rest: details.rest || '60s',
        weight: details.weight || null,
        weight_text: details.weight_text || null,
        weight_unit: details.weight_unit || 'lbs',
        weight_mode: details.weight_mode || 'numeric',
        edited_at: new Date().toISOString()
    };
    
    console.log('✅ Pre-session edit stored. Total edits:', Object.keys(this.preSessionEdits).length);
    this.notifyListeners('preSessionExerciseUpdated', { exerciseName, details });
}
```

---

### Phase 5: Exercise Card Renderer Updates

**File:** [`exercise-card-renderer.js`](frontend/assets/js/components/exercise-card-renderer.js:374)

Update `_renderWeightField` method:

```javascript
/**
 * Render weight field with morph pattern HTML
 * @private
 */
_renderWeightField(weight, unit, exerciseName) {
    // Check for text mode weight
    const exerciseData = this.sessionService.getExerciseWeight(exerciseName);
    const weightMode = exerciseData?.weight_mode || 'numeric';
    const weightText = exerciseData?.weight_text || '';
    
    // Display value based on mode
    let displayValue, displayUnit;
    if (weightMode === 'text' && weightText) {
        displayValue = weightText;
        displayUnit = '';
    } else {
        displayValue = weight || '—';
        displayUnit = unit !== 'other' ? unit : '';
    }
    
    // Determine active unit button
    const activeUnit = weightMode === 'text' ? 'diy' : (unit || 'lbs');
    
    return `
        <div class="logbook-weight-field" 
             data-weight="${weight || 0}" 
             data-weight-text="${this._escapeHtml(weightText)}"
             data-unit="${unit}" 
             data-mode="${weightMode}"
             data-exercise-name="${this._escapeHtml(exerciseName)}">
            <!-- Display Mode -->
            <div class="weight-display">
                <div class="weight-value-group">
                    <span class="weight-value">${this._escapeHtml(displayValue)}</span>
                    ${displayUnit ? `<span class="weight-unit">${displayUnit}</span>` : ''}
                </div>
                <button class="weight-edit-btn" aria-label="Edit weight" title="Edit weight" onclick="event.stopPropagation();">
                    <i class="bx bx-pencil"></i>
                </button>
                <button class="note-toggle-btn" aria-label="Toggle note" title="Add note" onclick="event.stopPropagation();">
                    <i class="bx bx-note"></i>
                </button>
            </div>
            
            <!-- Edit Mode -->
            <div class="weight-editor" style="display: none;">
                <!-- Unit Selector -->
                <div class="weight-unit-selector">
                    <button class="weight-unit-btn ${activeUnit === 'lbs' ? 'active' : ''}" data-unit="lbs">lbs</button>
                    <button class="weight-unit-btn ${activeUnit === 'kg' ? 'active' : ''}" data-unit="kg">kg</button>
                    <button class="weight-unit-btn ${activeUnit === 'diy' ? 'active' : ''}" data-unit="diy">DIY</button>
                </div>
                
                <!-- Numeric Mode Row -->
                <div class="weight-editor-row numeric-mode" style="display: ${weightMode === 'text' ? 'none' : 'flex'};">
                    <input type="number" 
                           class="weight-input" 
                           value="${weight || ''}" 
                           step="${unit === 'kg' ? '2.5' : '5'}" 
                           min="0" 
                           max="9999" 
                           inputmode="decimal" 
                           placeholder="0" 
                           onclick="event.stopPropagation();" />
                    <button class="weight-stepper-btn minus" 
                            aria-label="Decrease by ${unit === 'kg' ? '2.5' : '5'}" 
                            onclick="event.stopPropagation();">
                        ${unit === 'kg' ? '−2.5' : '−5'}
                    </button>
                    <button class="weight-stepper-btn plus" 
                            aria-label="Increase by ${unit === 'kg' ? '2.5' : '5'}" 
                            onclick="event.stopPropagation();">
                        ${unit === 'kg' ? '+2.5' : '+5'}
                    </button>
                    <div class="weight-editor-actions">
                        <button class="weight-save-btn" aria-label="Save weight" title="Save" onclick="event.stopPropagation();">
                            <i class="bx bx-check"></i>
                        </button>
                        <button class="weight-cancel-btn" aria-label="Cancel edit" title="Cancel" onclick="event.stopPropagation();">
                            <i class="bx bx-x"></i>
                        </button>
                    </div>
                </div>
                
                <!-- DIY Mode Row -->
                <div class="weight-editor-row diy-mode" style="display: ${weightMode === 'text' ? 'flex' : 'none'};">
                    <input type="text" 
                           class="weight-text-input" 
                           value="${this._escapeHtml(weightText)}" 
                           placeholder="e.g., body weight + 10 lbs" 
                           onclick="event.stopPropagation();" />
                    <div class="weight-editor-actions">
                        <button class="weight-save-btn" aria-label="Save" title="Save" onclick="event.stopPropagation();">
                            <i class="bx bx-check"></i>
                        </button>
                        <button class="weight-cancel-btn" aria-label="Cancel" title="Cancel" onclick="event.stopPropagation();">
                            <i class="bx bx-x"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="logbook-notes-row">
            <textarea class="logbook-notes-input" placeholder="Add a note..." rows="2" onclick="event.stopPropagation();"></textarea>
        </div>
    `;
}
```

---

## �� Data Structure Changes

### Session Exercise Object (Extended)

```javascript
{
    exerciseName: {
        // Existing fields
        weight: 100,                  // Numeric weight (null if text mode)
        weight_unit: 'lbs',           // 'lbs', 'kg', 'other'
        target_sets: '3',
        target_reps: '8-12',
        rest: '60s',
        
        // NEW fields
        weight_text: null,            // Free-text weight (DIY mode only)
        weight_mode: 'numeric',       // 'numeric' or 'text'
        
        // Metadata
        is_modified: true,
        modified_at: '2026-01-13T23:00:00Z',
        is_completed: false,
        is_skipped: false,
        order_index: 0
    }
}
```

---

## 🧪 Testing Checklist

### Unit Mode Tests
- [ ] **LBS → KG conversion**: 100 lbs → 45.4 kg
- [ ] **KG → LBS conversion**: 50 kg → 110.2 lbs
- [ ] **Quick buttons**: +5/-5 in lbs, +2.5/-2.5 in kg
- [ ] **Save numeric value**: Persists to session
- [ ] **Cancel numeric edit**: Restores original

### DIY Mode Tests
- [ ] **Enter DIY mode**: Switches to text input
- [ ] **Save text value**: "body weight + 10 lbs" persists
- [ ] **Display text value**: Shows in collapsed card
- [ ] **Switch from DIY to numeric**: Extracts number if possible
- [ ] **Cancel DIY edit**: Restores original

### Persistence Tests
- [ ] **Pre-session edits**: Weight edits saved before starting
- [ ] **Active session updates**: Updates session data immediately
- [ ] **Page refresh**: Restores weight mode correctly
- [ ] **History display**: Shows last weight with correct unit

### Mobile Tests
- [ ] **Touch targets**: All buttons >44px tap target
- [ ] **Segmented control**: Works on small screens
- [ ] **Text input**: Mobile keyboard shows correctly

---

## 🚀 Implementation Steps

1. ✅ Analyze current implementation
2. ✅ Design UX pattern and data model
3. 📝 **Create this plan document**
4. ⏳ Update HTML structure in `exercise-card-renderer.js`
5. ⏳ Add CSS for segmented control and layout
6. ⏳ Update `weight-field-controller.js` with unit switching
7. ⏳ Update session service methods
8. ⏳ Test all three modes thoroughly
9. ⏳ Document user-facing changes

---

## 📚 References

- **Current Implementation:**
  - [`weight-field-controller.js`](frontend/assets/js/controllers/weight-field-controller.js:1)
  - [`exercise-card-renderer.js`](frontend/assets/js/components/exercise-card-renderer.js:374)
  - [`logbook-theme.css`](frontend/assets/css/logbook-theme.css:277)
  - [`workout-session-service.js`](frontend/assets/js/services/workout-session-service.js:365)

- **Related Patterns:**
  - Morph pattern (Display → Edit → Save)
  - Segmented control (iOS-style unit selector)
  - Auto-conversion (lbs ↔ kg)

---

**Next Step:** Ready for Code mode implementation when approved.