# Weight Field Morph Pattern Implementation Plan

## Overview

This document outlines the implementation of an inline edit pattern for the weight field in the workout logbook demo. The pattern morphs between a **display mode** (text + pencil icon) and an **edit mode** (input box + steppers + cancel button).

---

## Design Specification

### State 1: Display Mode (Default)

```
┌──────────────────────────────────────────┐
│  Today                                    │
│                                           │
│     185 lbs  ✏️                           │
│              ↑                            │
│         pencil/edit icon                  │
└──────────────────────────────────────────┘
```

- Weight shown as **plain text** with prominent styling
- Small **pencil icon** (bx-pencil) serves as edit trigger
- Tapping pencil → morphs to Edit Mode

### State 2: Edit Mode (Active)

```
┌──────────────────────────────────────────┐
│  Today                                    │
│                                           │
│  [ −5 ]  ┌─────────┐  [ +5 ]    ✕         │
│          │   185   │          cancel      │
│          └─────────┘                      │
└──────────────────────────────────────────┘
```

- Pencil morphs to **✕ (X/close)** for cancel
- Weight becomes an **editable input box** with visible border
- **−5** and **+5** stepper buttons appear
- Keyboard Enter key saves and morphs back

---

## Confirmed Behavior

| Action | Result |
|--------|--------|
| Tap pencil icon | Morph to edit mode, focus input |
| Tap +5 button | Increment weight by 5, auto-save, morph back to display |
| Tap −5 button | Decrement weight by 5, auto-save, morph back to display |
| Press Enter in input | Save value, morph back to display |
| Tap ✕ cancel button | Discard changes, morph back to display |
| Tap outside (blur) | Save value, morph back to display |

### Visual Feedback

- **Green flash animation** when value is saved (brief highlight)
- Smooth CSS transition for morph effect
- Single tap per increment (no hold-repeat behavior)
- Increment value: ±5 for all exercises

---

## HTML Structure

### Current Implementation (lines 1220-1228)

```html
<div class="logbook-weight-row">
    <div class="logbook-weight-input">
        <input type="text" class="logbook-weight-value" value="185" />
        <span class="logbook-weight-unit">lbs</span>
    </div>
    <div class="logbook-weight-stepper">
        <button class="logbook-stepper-btn" title="-5">−</button>
        <button class="logbook-stepper-btn" title="+5">+</button>
    </div>
</div>
```

### New Implementation

```html
<div class="logbook-weight-field" data-weight="185" data-unit="lbs">
    <!-- Display Mode -->
    <div class="weight-display">
        <span class="weight-value">185</span>
        <span class="weight-unit">lbs</span>
        <button class="weight-edit-btn" aria-label="Edit weight" title="Edit weight">
            <i class="bx bx-pencil"></i>
        </button>
    </div>
    
    <!-- Edit Mode (hidden initially) -->
    <div class="weight-editor" style="display: none;">
        <button class="weight-stepper-btn minus" aria-label="Decrease by 5">−5</button>
        <input type="number" 
               class="weight-input" 
               value="185" 
               step="5" 
               min="0" 
               max="9999"
               inputmode="decimal" />
        <button class="weight-stepper-btn plus" aria-label="Increase by 5">+5</button>
        <button class="weight-cancel-btn" aria-label="Cancel edit" title="Cancel">
            <i class="bx bx-x"></i>
        </button>
    </div>
</div>
```

---

## CSS Styles

```css
/* ============================================
   WEIGHT FIELD MORPH PATTERN
   ============================================ */

.logbook-weight-field {
    display: flex;
    align-items: center;
    min-height: 48px;
}

/* ------------------------------------------
   Display Mode
   ------------------------------------------ */

.weight-display {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.weight-display .weight-value {
    font-size: 2.25rem;
    font-weight: 700;
    color: var(--logbook-accent);
    line-height: 1;
}

.weight-display .weight-unit {
    font-size: 1rem;
    color: var(--logbook-muted);
}

.weight-edit-btn {
    padding: 0.375rem;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: var(--logbook-muted);
    cursor: pointer;
    font-size: 1.125rem;
    line-height: 1;
    margin-left: 0.5rem;
    transition: all 0.15s ease;
}

.weight-edit-btn:hover {
    border-color: var(--logbook-border);
    background: var(--status-active);
    color: var(--logbook-accent);
}

/* ------------------------------------------
   Edit Mode
   ------------------------------------------ */

.weight-editor {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

.weight-input {
    width: 100px;
    padding: 0.5rem 0.75rem;
    font-size: 1.5rem;
    font-weight: 700;
    text-align: center;
    color: var(--logbook-accent);
    border: 2px solid var(--logbook-accent);
    border-radius: 0.375rem;
    background: var(--logbook-card-bg);
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    
    /* Remove number input spinners */
    -moz-appearance: textfield;
}

.weight-input::-webkit-outer-spin-button,
.weight-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.weight-input:focus {
    border-color: var(--logbook-accent);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

/* Stepper Buttons */
.weight-stepper-btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
    border: 1px solid var(--logbook-border);
    border-radius: 0.375rem;
    background: var(--logbook-card-bg);
    color: var(--logbook-text);
    cursor: pointer;
    transition: all 0.15s ease;
    min-width: 48px;
}

.weight-stepper-btn:hover {
    border-color: var(--logbook-accent);
    background: var(--status-active);
    color: var(--logbook-accent);
}

.weight-stepper-btn:active {
    transform: scale(0.95);
}

.weight-stepper-btn.minus:hover {
    border-color: var(--logbook-warning);
    color: var(--logbook-warning);
    background: rgba(245, 158, 11, 0.1);
}

.weight-stepper-btn.plus:hover {
    border-color: var(--logbook-success);
    color: var(--logbook-success);
    background: rgba(76, 187, 23, 0.1);
}

/* Cancel Button */
.weight-cancel-btn {
    padding: 0.375rem;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: var(--logbook-muted);
    cursor: pointer;
    font-size: 1.25rem;
    line-height: 1;
    transition: all 0.15s ease;
}

.weight-cancel-btn:hover {
    border-color: var(--logbook-danger);
    background: rgba(220, 53, 69, 0.1);
    color: var(--logbook-danger);
}

/* ------------------------------------------
   Save Animation (Green Flash)
   ------------------------------------------ */

.weight-display.saved .weight-value {
    animation: saveFlash 0.6s ease;
}

@keyframes saveFlash {
    0% {
        color: var(--logbook-accent);
    }
    30% {
        color: var(--logbook-success);
        text-shadow: 0 0 8px rgba(76, 187, 23, 0.4);
    }
    100% {
        color: var(--logbook-accent);
        text-shadow: none;
    }
}

/* ------------------------------------------
   Dark Mode Adjustments
   ------------------------------------------ */

[data-bs-theme="dark"] .weight-input {
    background: var(--bs-gray-800);
    color: var(--logbook-accent);
}

[data-bs-theme="dark"] .weight-stepper-btn {
    background: var(--bs-gray-800);
    border-color: var(--bs-gray-600);
}

/* ------------------------------------------
   Mobile Responsive
   ------------------------------------------ */

@media (max-width: 576px) {
    .weight-input {
        width: 80px;
        font-size: 1.25rem;
        padding: 0.375rem 0.5rem;
    }
    
    .weight-stepper-btn {
        padding: 0.375rem 0.5rem;
        font-size: 0.8125rem;
        min-width: 40px;
    }
    
    .weight-display .weight-value {
        font-size: 1.75rem;
    }
}
```

---

## JavaScript Behavior

```javascript
// ============================================
// WEIGHT FIELD MORPH CONTROLLER
// ============================================

class WeightFieldController {
    constructor(container) {
        this.container = container;
        this.displayEl = container.querySelector('.weight-display');
        this.editorEl = container.querySelector('.weight-editor');
        this.valueDisplay = container.querySelector('.weight-display .weight-value');
        this.input = container.querySelector('.weight-input');
        this.editBtn = container.querySelector('.weight-edit-btn');
        this.cancelBtn = container.querySelector('.weight-cancel-btn');
        this.minusBtn = container.querySelector('.weight-stepper-btn.minus');
        this.plusBtn = container.querySelector('.weight-stepper-btn.plus');
        
        this.originalValue = parseFloat(this.input.value) || 0;
        this.increment = 5;
        
        this.bindEvents();
    }
    
    bindEvents() {
        // Pencil icon → enter edit mode
        this.editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.enterEditMode();
        });
        
        // Cancel button → exit without saving
        this.cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.exitEditMode(false);
        });
        
        // Minus button → decrement and auto-save
        this.minusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.adjustWeight(-this.increment);
        });
        
        // Plus button → increment and auto-save
        this.plusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.adjustWeight(this.increment);
        });
        
        // Enter key → save and exit
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.exitEditMode(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.exitEditMode(false);
            }
        });
        
        // Blur → save and exit
        this.input.addEventListener('blur', (e) => {
            // Delay to allow button clicks to process first
            setTimeout(() => {
                if (this.editorEl.style.display !== 'none' && 
                    !this.editorEl.contains(document.activeElement)) {
                    this.exitEditMode(true);
                }
            }, 150);
        });
    }
    
    enterEditMode() {
        this.originalValue = parseFloat(this.input.value) || 0;
        this.displayEl.style.display = 'none';
        this.editorEl.style.display = 'flex';
        this.input.focus();
        this.input.select();
    }
    
    exitEditMode(save = true) {
        if (save) {
            const newValue = parseFloat(this.input.value) || 0;
            this.updateValue(newValue);
        } else {
            // Restore original value
            this.input.value = this.originalValue;
        }
        
        this.editorEl.style.display = 'none';
        this.displayEl.style.display = 'flex';
    }
    
    adjustWeight(delta) {
        const currentValue = parseFloat(this.input.value) || 0;
        const newValue = Math.max(0, currentValue + delta);
        this.input.value = newValue;
        this.exitEditMode(true);
    }
    
    updateValue(newValue) {
        const clampedValue = Math.max(0, Math.min(9999, newValue));
        this.valueDisplay.textContent = clampedValue;
        this.input.value = clampedValue;
        this.container.dataset.weight = clampedValue;
        
        // Trigger save animation
        this.displayEl.classList.add('saved');
        setTimeout(() => {
            this.displayEl.classList.remove('saved');
        }, 600);
        
        // Dispatch custom event for integration
        this.container.dispatchEvent(new CustomEvent('weightChanged', {
            bubbles: true,
            detail: { weight: clampedValue }
        }));
    }
}

// ============================================
// INITIALIZATION
// ============================================

function initWeightFields() {
    document.querySelectorAll('.logbook-weight-field').forEach(container => {
        if (!container.weightController) {
            container.weightController = new WeightFieldController(container);
        }
    });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initWeightFields);

// Re-initialize when new cards are added dynamically
// Call initWeightFields() after adding new exercise cards
```

---

## Integration Points

### 1. Event Listener for Weight Changes

```javascript
// Listen for weight changes from any field
document.addEventListener('weightChanged', (e) => {
    const { weight } = e.detail;
    const card = e.target.closest('.logbook-card');
    const exerciseId = card?.dataset.exerciseId;
    
    console.log(`Weight updated: ${weight} for exercise ${exerciseId}`);
    // Update workout session data here
});
```

### 2. Updating the Demo Page

Replace each instance of the old weight row structure with the new morph pattern structure in `workout-mode-logbook-demo.html`.

---

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/workout-mode-logbook-demo.html` | Replace weight row HTML structure |
| `frontend/workout-mode-logbook-demo.html` | Add new CSS in `<style>` section |
| `frontend/workout-mode-logbook-demo.html` | Add JavaScript controller |

---

## Testing Checklist

- [ ] Pencil icon click opens edit mode
- [ ] Input is focused and selected on edit mode enter
- [ ] +5 button increments and auto-closes
- [ ] −5 button decrements and auto-closes
- [ ] Minimum value is 0 (no negative weights)
- [ ] Enter key saves and closes
- [ ] Escape key cancels and closes
- [ ] Cancel (✕) button discards changes
- [ ] Green flash animation plays on save
- [ ] Works in light theme
- [ ] Works in dark theme
- [ ] Mobile responsive (smaller buttons/input)
- [ ] Keyboard accessible (Tab navigation works)

---

## Visual Mockup

### Animation Sequence

```
STEP 1: Display Mode
┌────────────────────────────────────┐
│     185 lbs  [✏️]                  │
└────────────────────────────────────┘
                 │
                 │ tap pencil
                 ▼
STEP 2: Edit Mode (fade in)
┌────────────────────────────────────┐
│  [−5]  ┌───────┐  [+5]  [✕]       │
│        │  185  │                   │
│        └───────┘                   │
└────────────────────────────────────┘
                 │
                 │ tap +5
                 ▼
STEP 3: Value Updates
┌────────────────────────────────────┐
│  [−5]  ┌───────┐  [+5]  [✕]       │
│        │  190  │                   │
│        └───────┘                   │
└────────────────────────────────────┘
                 │
                 │ auto-morphs back
                 ▼
STEP 4: Display Mode (with flash)
┌────────────────────────────────────┐
│     190 lbs  [✏️]  ← green flash  │
└────────────────────────────────────┘
```

---

## Ready for Implementation

This plan is complete. Switch to **Code mode** to implement the changes.