# Exercise Card Streamlined UX Implementation Plan

## Overview

This plan implements Option 2: Streamlined UX for exercise cards in workout mode. The goal is to simplify the editing experience by removing confusing inline edit icons and providing a single, comprehensive edit entry point while keeping quick weight +/- adjustments.

## Current State vs Target State

### Current State (Problems)
```
┌─────────────────────────────────────────────┐
│ [Header] Bench Press           [Weight] ▼   │
├─────────────────────────────────────────────┤
│ Alt1: Incline Press · Alt2: DB Press        │
│─────────────────────────────────────────────│
│ 135 lbs              [-] [+] [✏️]           │ ← Edit opens separate offcanvas
│─────────────────────────────────────────────│
│ Sets × Reps: 3 × 8-12          [✏️]         │ ← DEAD BUTTON
│ Rest: 90s                      [✏️]         │ ← DEAD BUTTON
│ Plates: 1×45lb each side                    │ ← No edit option
│─────────────────────────────────────────────│
│ [Complete] [Skip] [Edit]                    │ ← Opens DIFFERENT offcanvas
└─────────────────────────────────────────────┘
```

### Target State (Streamlined)
```
┌─────────────────────────────────────────────┐
│ [Header] Bench Press           [Weight] ▼   │
├─────────────────────────────────────────────┤
│ Alt1: Incline Press · Alt2: DB Press        │
│─────────────────────────────────────────────│
│ 💪 135 lbs                      [-5] [+5]   │ ← Quick weight adjust ONLY
│ Last: 130 lbs on 12/25/2024                 │
│─────────────────────────────────────────────│
│ Sets × Reps: 3 × 8-12                       │ ← Read-only
│ Rest: 90s                                   │ ← Read-only
│ Plates: 1×45lb each side        [⚙️]        │ ← Settings for plate config
│─────────────────────────────────────────────│
│ [Complete] [Skip] [Edit]                    │ ← ONE comprehensive editor
└─────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Phase 1: Clean Up Card Renderer
**File: `frontend/assets/js/components/exercise-card-renderer.js`**

#### Task 1.1: Remove Inline Edit Icons from Details List
Remove the edit icons from Sets/Reps and Rest rows:

```javascript
// BEFORE (lines 162-174)
<li class="list-group-item d-flex justify-content-between align-items-center px-0">
    <span class="text-muted">Sets × Reps</span>
    <div class="d-flex align-items-center gap-2">
        <strong>${sets} × ${reps}</strong>
        <i class="bx bx-edit-alt text-muted exercise-detail-edit-icon" ...></i>  // REMOVE
    </div>
</li>

// AFTER
<li class="list-group-item d-flex justify-content-between align-items-center px-0">
    <span class="text-muted">Sets × Reps</span>
    <strong>${sets} × ${reps}</strong>
</li>
```

#### Task 1.2: Simplify Weight Section
Replace the edit button with functional +/- buttons only:

```javascript
// BEFORE (lines 134-153)
<div class="btn-group btn-group-sm" role="group">
    <button class="btn btn-outline-secondary" onclick="event.stopPropagation();" title="Decrease weight">
        <i class="bx bx-minus"></i>
    </button>
    <button class="btn btn-outline-secondary" onclick="event.stopPropagation();" title="Increase weight">
        <i class="bx bx-plus"></i>
    </button>
    <button class="btn btn-outline-primary" onclick="window.workoutModeController.handleWeightButtonClick(this); ..."
            title="Edit weight">
        <i class="bx bx-edit-alt"></i>
    </button>
</div>

// AFTER - Functional +/- with configurable increment
<div class="btn-group btn-group-sm" role="group">
    <button class="btn btn-outline-secondary weight-adjust-btn" 
            data-exercise-name="${this._escapeHtml(mainExercise)}"
            data-adjustment="-5"
            onclick="window.workoutModeController.handleWeightAdjust(this); event.stopPropagation();" 
            title="Decrease weight by 5">
        <span>-5</span>
    </button>
    <button class="btn btn-outline-secondary weight-adjust-btn" 
            data-exercise-name="${this._escapeHtml(mainExercise)}"
            data-adjustment="5"
            onclick="window.workoutModeController.handleWeightAdjust(this); event.stopPropagation();" 
            title="Increase weight by 5">
        <span>+5</span>
    </button>
</div>
```

#### Task 1.3: Add Plate Calculator Settings Button
Add a settings button to the plates row:

```javascript
// BEFORE (lines 176-181)
${plateBreakdown ? `
    <li class="list-group-item d-flex justify-content-between align-items-start px-0">
        <span class="text-muted"><i class="bx bx-dumbbell me-1"></i>Plates</span>
        <span class="text-muted small text-end">${plateBreakdown}</span>
    </li>
` : ''}

// AFTER - With settings button
${plateBreakdown ? `
    <li class="list-group-item d-flex justify-content-between align-items-center px-0">
        <span class="text-muted"><i class="bx bx-dumbbell me-1"></i>Plates</span>
        <div class="d-flex align-items-center gap-2">
            <span class="text-muted small text-end">${plateBreakdown}</span>
            <button class="btn btn-sm btn-outline-secondary plate-settings-btn"
                    onclick="window.workoutModeController.showPlateSettings(); event.stopPropagation();"
                    title="Configure available plates">
                <i class="bx bx-cog"></i>
            </button>
        </div>
    </li>
` : ''}
```

---

### Phase 2: Wire Up Weight Adjustment
**File: `frontend/assets/js/controllers/workout-mode-controller.js`**

#### Task 2.1: Add Weight Adjustment Handler

```javascript
/**
 * Handle quick weight adjustment (+/- buttons)
 * @param {HTMLElement} button - The adjustment button clicked
 */
handleWeightAdjust(button) {
    const exerciseName = button.getAttribute('data-exercise-name');
    const adjustment = parseFloat(button.getAttribute('data-adjustment'));
    
    if (!exerciseName || isNaN(adjustment)) return;
    
    // Get current weight
    const currentData = this.sessionService.getExerciseWeight(exerciseName);
    const currentWeight = parseFloat(currentData?.weight) || 0;
    const currentUnit = currentData?.weight_unit || 'lbs';
    
    // Calculate new weight
    const newWeight = Math.max(0, currentWeight + adjustment);
    
    // Update the session
    if (this.sessionService.isSessionActive()) {
        this.sessionService.updateExerciseWeight(exerciseName, {
            weight: newWeight,
            weight_unit: currentUnit
        });
    } else {
        this.sessionService.savePreSessionEdit(exerciseName, {
            weight: newWeight,
            weight_unit: currentUnit
        });
    }
    
    // Re-render the card to show updated weight
    this.refreshExerciseCard(exerciseName);
    
    // Haptic feedback (if available)
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}
```

---

### Phase 3: Plate Calculator Settings
**New File: `frontend/assets/js/services/plate-calculator-service.js`**

#### Task 3.1: Create Plate Calculator Service

```javascript
/**
 * Ghost Gym - Plate Calculator Service
 * Manages user's gym plate configuration and calculates plate breakdowns
 * @version 1.0.0
 */

class PlateCalculatorService {
    constructor() {
        this.storageKey = 'ghostGym_plateConfig';
        this.defaultConfig = {
            barWeight: 45,
            barUnit: 'lbs',
            availablePlates: {
                45: true,
                35: true,
                25: true,
                10: true,
                5: true,
                2.5: true
            },
            customPlates: [] // Array of custom plate weights
        };
        this.config = this.loadConfig();
    }
    
    loadConfig() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? { ...this.defaultConfig, ...JSON.parse(stored) } : this.defaultConfig;
        } catch (e) {
            console.error('Failed to load plate config:', e);
            return this.defaultConfig;
        }
    }
    
    saveConfig(config) {
        this.config = { ...this.config, ...config };
        localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    }
    
    getAvailablePlates() {
        const plates = [];
        // Add standard plates that are enabled
        for (const [weight, enabled] of Object.entries(this.config.availablePlates)) {
            if (enabled) plates.push(parseFloat(weight));
        }
        // Add custom plates
        plates.push(...this.config.customPlates);
        // Sort descending
        return plates.sort((a, b) => b - a);
    }
    
    calculateBreakdown(totalWeight, unit = 'lbs') {
        if (unit !== this.config.barUnit) {
            // Convert if units don't match
            totalWeight = unit === 'kg' ? totalWeight * 2.205 : totalWeight / 2.205;
        }
        
        if (totalWeight <= this.config.barWeight) {
            return null; // Just the bar or less
        }
        
        const weightPerSide = (totalWeight - this.config.barWeight) / 2;
        const plates = this.getAvailablePlates();
        const plateCount = {};
        let remaining = weightPerSide;
        
        for (const plate of plates) {
            const count = Math.floor(remaining / plate);
            if (count > 0) {
                plateCount[plate] = count;
                remaining -= count * plate;
            }
        }
        
        if (Object.keys(plateCount).length === 0) {
            return null;
        }
        
        const plateParts = Object.entries(plateCount)
            .map(([plate, count]) => `${count}×${plate}${this.config.barUnit === 'kg' ? 'kg' : 'lb'}`)
            .join(' + ');
        
        return `${this.config.barWeight}${this.config.barUnit === 'kg' ? 'kg' : 'lb'} bar + (${plateParts}) each side`;
    }
}

window.plateCalculatorService = new PlateCalculatorService();
```

#### Task 3.2: Create Plate Settings Offcanvas
**Add to: `frontend/assets/js/components/offcanvas/offcanvas-workout.js`**

```javascript
/**
 * Create plate calculator settings offcanvas
 * Allows user to configure available plates at their gym
 */
export function createPlateSettings(onSave) {
    const config = window.plateCalculatorService?.config || {
        barWeight: 45,
        barUnit: 'lbs',
        availablePlates: { 45: true, 35: true, 25: true, 10: true, 5: true, 2.5: true },
        customPlates: []
    };
    
    const standardPlates = [45, 35, 25, 10, 5, 2.5];
    
    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1"
             id="plateSettingsOffcanvas" aria-labelledby="plateSettingsLabel" data-bs-scroll="false">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="plateSettingsLabel">
                    <i class="bx bx-cog me-2"></i>Plate Calculator Settings
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
                <!-- Bar Weight -->
                <div class="mb-4">
                    <label class="form-label fw-semibold">Bar Weight</label>
                    <div class="row g-2">
                        <div class="col-6">
                            <input type="number" class="form-control" id="plateBarWeight"
                                   value="${config.barWeight}" min="0" step="5">
                        </div>
                        <div class="col-6">
                            <div class="btn-group w-100" role="group">
                                <input type="radio" class="btn-check" name="barUnit" id="barUnitLbs"
                                       value="lbs" ${config.barUnit === 'lbs' ? 'checked' : ''}>
                                <label class="btn btn-outline-secondary" for="barUnitLbs">lbs</label>
                                <input type="radio" class="btn-check" name="barUnit" id="barUnitKg"
                                       value="kg" ${config.barUnit === 'kg' ? 'checked' : ''}>
                                <label class="btn btn-outline-secondary" for="barUnitKg">kg</label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Available Plates -->
                <div class="mb-4">
                    <label class="form-label fw-semibold">Available Plates (per side)</label>
                    <div class="row g-2">
                        ${standardPlates.map(weight => `
                            <div class="col-4">
                                <div class="form-check">
                                    <input class="form-check-input plate-checkbox" type="checkbox"
                                           id="plate${weight}" data-weight="${weight}"
                                           ${config.availablePlates[weight] ? 'checked' : ''}>
                                    <label class="form-check-label" for="plate${weight}">
                                        ${weight} lb
                                    </label>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Custom Plates -->
                <div class="mb-4">
                    <label class="form-label fw-semibold">Custom Plates</label>
                    <div id="customPlatesContainer">
                        ${config.customPlates.map((weight, i) => `
                            <div class="input-group mb-2 custom-plate-row" data-index="${i}">
                                <input type="number" class="form-control custom-plate-input"
                                       value="${weight}" min="0.5" step="0.5">
                                <span class="input-group-text">lb</span>
                                <button type="button" class="btn btn-outline-danger remove-custom-plate">
                                    <i class="bx bx-x"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <button type="button" class="btn btn-outline-secondary btn-sm w-100" id="addCustomPlateBtn">
                        <i class="bx bx-plus me-1"></i>Add Custom Plate
                    </button>
                </div>
                
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="offcanvas">
                        Cancel
                    </button>
                    <button type="button" class="btn btn-primary flex-fill" id="savePlateSettingsBtn">
                        <i class="bx bx-save me-1"></i>Save
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return createOffcanvas('plateSettingsOffcanvas', offcanvasHtml, (offcanvas, element) => {
        // Add custom plate button
        const addBtn = element.querySelector('#addCustomPlateBtn');
        const container = element.querySelector('#customPlatesContainer');
        
        addBtn?.addEventListener('click', () => {
            const index = container.children.length;
            const html = `
                <div class="input-group mb-2 custom-plate-row" data-index="${index}">
                    <input type="number" class="form-control custom-plate-input"
                           placeholder="Weight" min="0.5" step="0.5">
                    <span class="input-group-text">lb</span>
                    <button type="button" class="btn btn-outline-danger remove-custom-plate">
                        <i class="bx bx-x"></i>
                    </button>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        });
        
        // Remove custom plate
        container?.addEventListener('click', (e) => {
            if (e.target.closest('.remove-custom-plate')) {
                e.target.closest('.custom-plate-row').remove();
            }
        });
        
        // Save button
        const saveBtn = element.querySelector('#savePlateSettingsBtn');
        saveBtn?.addEventListener('click', () => {
            const barWeight = parseFloat(element.querySelector('#plateBarWeight').value) || 45;
            const barUnit = element.querySelector('input[name="barUnit"]:checked')?.value || 'lbs';
            
            const availablePlates = {};
            element.querySelectorAll('.plate-checkbox').forEach(cb => {
                availablePlates[cb.dataset.weight] = cb.checked;
            });
            
            const customPlates = [];
            element.querySelectorAll('.custom-plate-input').forEach(input => {
                const weight = parseFloat(input.value);
                if (weight > 0) customPlates.push(weight);
            });
            
            const newConfig = { barWeight, barUnit, availablePlates, customPlates };
            
            if (window.plateCalculatorService) {
                window.plateCalculatorService.saveConfig(newConfig);
            }
            
            if (onSave) onSave(newConfig);
            offcanvas.hide();
        });
    });
}
```

---

### Phase 4: Update Exercise Card Renderer to Use Plate Service
**File: `frontend/assets/js/components/exercise-card-renderer.js`**

#### Task 4.1: Update `_calculatePlateBreakdown` Method

```javascript
_calculatePlateBreakdown(weightStr, unit) {
    // Use plate calculator service if available
    if (window.plateCalculatorService) {
        return window.plateCalculatorService.calculateBreakdown(parseFloat(weightStr), unit);
    }
    
    // Fallback to current implementation if service not loaded
    // ... existing code ...
}
```

---

## Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `exercise-card-renderer.js` | Modify | Remove inline edit icons, add +/- handlers, add plate settings button |
| `workout-mode-controller.js` | Modify | Add `handleWeightAdjust()` and `showPlateSettings()` methods |
| `plate-calculator-service.js` | Create | New service for plate configuration |
| `offcanvas-workout.js` | Modify | Add `createPlateSettings()` function |
| `offcanvas/index.js` | Modify | Export new `createPlateSettings` function |
| `workout-mode.css` | Modify | Add styles for weight adjust buttons and plate settings |
| `workout-mode.html` | Modify | Add script tag for plate calculator service |

---

## Testing Checklist

- [ ] +5/-5 buttons correctly adjust weight
- [ ] Weight adjustments persist to session/pre-session data
- [ ] Cards re-render after weight adjustment
- [ ] Plate settings offcanvas opens correctly
- [ ] Plate configuration saves to localStorage
- [ ] Plate breakdown recalculates after config change
- [ ] Custom plates work correctly
- [ ] Unit switching (lbs/kg) works
- [ ] Single "Edit" button opens comprehensive editor
- [ ] No duplicate edit entry points remain
- [ ] Mobile responsiveness maintained

---

## Visual Design Reference

### Weight Adjust Buttons
```css
.weight-adjust-btn {
    min-width: 45px;
    font-weight: 600;
    font-size: 0.8rem;
}

.weight-adjust-btn span {
    font-variant-numeric: tabular-nums;
}
```

### Plate Settings Button
```css
.plate-settings-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
}

.plate-settings-btn:hover {
    background-color: var(--bs-primary);
    color: white;
}
```
