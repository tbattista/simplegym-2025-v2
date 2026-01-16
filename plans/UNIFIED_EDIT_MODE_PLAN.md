# Unified Edit Mode Plan
## Consolidate Weight/Reps Editing and Notes

**Version:** 1.0.0  
**Date:** 2026-01-14  
**Status:** Planning  

---

## 📋 Overview

This plan consolidates the separate edit buttons and notes functionality in the workout mode exercise cards into a unified editing experience. Users will have a single pencil button that opens both weight and sets/reps editors simultaneously, with a single note button at the bottom of the expanded editor.

---

## 🎯 Goals

1. **Simplify UX**: Single pencil button opens all editing fields at once
2. **Reduce Clutter**: Remove duplicate note buttons and edit buttons
3. **Improve Consistency**: One unified editing mode per exercise
4. **Maintain Functionality**: Keep all existing features (unit switching, plate calculator, etc.)

---

## 📐 Current State Analysis

### Current Structure (Per Exercise Card)

**Weight Section:**
- Label: "Today"
- Display: Weight value + unit
- Buttons: Pencil icon (edit weight) + Note icon (toggle notes)
- Notes: Collapsible textarea below weight field

**Sets/Reps Section:**
- Label: "Sets × Reps"
- Display: Sets × Reps values
- Buttons: Pencil icon (edit sets/reps) + Note icon (toggle notes)
- Notes: Collapsible textarea below sets/reps field

### Issues with Current Design

1. **Redundant Controls**: Two pencil icons, two note buttons
2. **Fragmented Notes**: Two separate note fields for the same exercise
3. **Inconsistent State**: User might expect one pencil to open all editors
4. **Visual Clutter**: Too many buttons in a compact space

---

## 🎨 Proposed Solution

### New Structure (Per Exercise Card)

```
┌─────────────────────────────────────────┐
│ Weight                                   │ ← Changed from "Today"
│ ┌─────────────────────────────────────┐ │
│ │ 185  lbs                    [pencil]│ │ ← Single edit button
│ └─────────────────────────────────────┘ │
│                                          │
│ Sets × Reps                              │
│ ┌─────────────────────────────────────┐ │
│ │ 3  ×  12                            │ │ ← Display only (no button)
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

When pencil is clicked:
┌─────────────────────────────────────────┐
│ Weight                                   │
│ ┌─────────────────────────────────────┐ │
│ │ [185]  [lbs][kg][DIY]  [✓][✗]       │ │ ← Weight editor
│ └─────────────────────────────────────┘ │
│                                          │
│ Sets × Reps                              │
│ ┌─────────────────────────────────────┐ │
│ │ [3] × [12]           [✓][✗]         │ │ ← Sets/reps editor
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ 📝 [Note button]                    │ │ ← Single note toggle
│ │ [Textarea when expanded]            │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Key Changes

1. **Single Edit Button**: Only the weight field has a pencil button
2. **Unified Edit Mode**: Clicking pencil opens BOTH editors simultaneously
3. **Single Note Button**: Located at bottom of combined editor
4. **Header Update**: Change "Today" label to "Weight"
5. **Remove Redundant Buttons**: Remove pencil from sets/reps, remove note buttons from both fields

---

## 🔧 Implementation Details

### 1. HTML Structure Changes (exercise-card-renderer.js)

**File:** [`frontend/assets/js/components/exercise-card-renderer.js`](frontend/assets/js/components/exercise-card-renderer.js:369)

#### Changes to `_renderWeightField()` method (lines 369-427):

**Before:**
```html
<div class="logbook-weight-field">
    <div class="weight-display">
        <!-- weight value -->
        <button class="weight-edit-btn">pencil</button>
        <button class="note-toggle-btn">note</button>  <!-- REMOVE -->
    </div>
    <div class="weight-editor">
        <!-- editor controls -->
    </div>
    <div class="logbook-notes-row">  <!-- REMOVE -->
        <textarea class="logbook-notes-input"></textarea>
    </div>
</div>
```

**After:**
```html
<div class="logbook-weight-field">
    <div class="weight-display">
        <!-- weight value -->
        <button class="weight-edit-btn" data-unified-edit="true">pencil</button>
        <!-- note button REMOVED from here -->
    </div>
    <div class="weight-editor" style="display: none;">
        <!-- editor controls -->
    </div>
    <!-- notes row REMOVED from here -->
</div>
```

#### Changes to `_renderRepsSetsField()` method (lines 433-472):

**Before:**
```html
<div class="logbook-repssets-field">
    <div class="repssets-display">
        <!-- sets x reps values -->
        <button class="repssets-edit-btn">pencil</button>  <!-- REMOVE -->
        <button class="note-toggle-btn">note</button>  <!-- REMOVE -->
    </div>
    <div class="repssets-editor">
        <!-- editor controls -->
    </div>
    <div class="logbook-notes-row">  <!-- REMOVE -->
        <textarea class="logbook-notes-input"></textarea>
    </div>
</div>
```

**After:**
```html
<div class="logbook-repssets-field">
    <div class="repssets-display">
        <!-- sets x reps values (display only) -->
        <!-- ALL buttons REMOVED -->
    </div>
    <div class="repssets-editor" style="display: none;">
        <!-- editor controls -->
    </div>
    <!-- notes row REMOVED from here -->
</div>
```

#### New Unified Notes Section:

Add after Sets/Reps section in [`renderCard()`](frontend/assets/js/components/exercise-card-renderer.js:24) method (after line 139):

```html
<!-- Unified Notes Section (NEW) -->
<div class="logbook-section logbook-unified-notes" style="display: none;">
    <button class="logbook-note-toggle-btn" data-exercise-name="${exerciseName}">
        <i class="bx bx-note"></i> Add Note
    </button>
    <div class="logbook-notes-content" style="display: none;">
        <textarea class="logbook-notes-input" 
                  placeholder="Add notes about this exercise..." 
                  rows="3"
                  data-exercise-name="${exerciseName}"></textarea>
    </div>
</div>
```

---

### 2. CSS Changes (logbook-theme.css)

**File:** [`frontend/assets/css/logbook-theme.css`](frontend/assets/css/logbook-theme.css:268)

#### Update Section Label:

Section label styling already exists at line 268.

#### New Unified Notes Styles (add after line 698):

```css
/* ============================================
   UNIFIED NOTES SECTION (NEW)
   Single note button at bottom of editor
   ============================================ */

.logbook-unified-notes {
    border-top: 1px solid var(--logbook-border);
    padding-top: 0.75rem;
    margin-top: 0.75rem;
}

.logbook-note-toggle-btn {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px dashed var(--logbook-border);
    border-radius: 0.375rem;
    background: transparent;
    color: var(--logbook-muted);
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
}

.logbook-note-toggle-btn:hover {
    border-color: var(--logbook-accent);
    border-style: solid;
    color: var(--logbook-accent);
    background: var(--status-active);
}

.logbook-note-toggle-btn.has-note {
    border-style: solid;
    border-color: var(--logbook-accent);
    color: var(--logbook-accent);
}

.logbook-note-toggle-btn i {
    font-size: 1.125rem;
}

.logbook-notes-content {
    margin-top: 0.5rem;
    animation: notesFadeIn 0.2s ease;
}

.logbook-notes-content .logbook-notes-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--logbook-border);
    border-radius: 0.375rem;
    background: var(--logbook-card-bg);
    color: var(--logbook-text);
    font-size: 0.875rem;
    resize: vertical;
    min-height: 60px;
}

.logbook-notes-content .logbook-notes-input:focus {
    outline: none;
    border-color: var(--logbook-accent);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

/* Hide individual note buttons (deprecated) */
.weight-display .note-toggle-btn,
.repssets-display .note-toggle-btn {
    display: none;
}

/* Hide individual notes rows (deprecated) */
.logbook-weight-field .logbook-notes-row,
.logbook-repssets-field .logbook-notes-row {
    display: none;
}

/* Remove edit button from sets/reps display */
.repssets-edit-btn {
    display: none;
}
```

---

### 3. JavaScript Controller Changes

#### A. Weight Field Controller

**File:** [`frontend/assets/js/controllers/weight-field-controller.js`](frontend/assets/js/controllers/weight-field-controller.js:79)

**Key Changes:**

1. **Update `bindEvents()` method** (starting at line 79):

```javascript
bindEvents() {
    // Pencil icon → enter unified edit mode
    if (this.editBtn) {
        this.editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Check if this is a unified edit button
            const isUnified = this.editBtn.dataset.unifiedEdit === 'true';
            
            if (isUnified) {
                this.enterUnifiedEditMode();
            } else {
                this.enterEditMode();
            }
        });
    }
    
    // ... rest of save/cancel/stepper button events remain
    // REMOVE note button event handlers (lines 183-205)
}
```

2. **Add new `enterUnifiedEditMode()` method:**

```javascript
/**
 * Enter unified edit mode - opens both weight and sets/reps editors
 */
enterUnifiedEditMode() {
    // Open weight editor
    this.enterEditMode();
    
    // Find and open sets/reps editor
    const card = this.container.closest('.logbook-card');
    const repsSetsField = card.querySelector('.logbook-repssets-field');
    if (repsSetsField && repsSetsField.repsSetsController) {
        repsSetsField.repsSetsController.enterEditMode();
    }
    
    // Show unified notes section
    const unifiedNotes = card.querySelector('.logbook-unified-notes');
    if (unifiedNotes) {
        unifiedNotes.style.display = 'block';
    }
    
    console.log('📝 Unified edit mode entered');
}
```

3. **Update [`exitEditMode()`](frontend/assets/js/controllers/weight-field-controller.js:266) method** (line 266):

```javascript
exitEditMode(save = true) {
    // ... existing save logic
    
    this.editorEl.style.display = 'none';
    this.displayEl.style.display = 'flex';
    
    // If unified mode, also close sets/reps editor
    const isUnified = this.editBtn?.dataset.unifiedEdit === 'true';
    if (isUnified) {
        const card = this.container.closest('.logbook-card');
        const repsSetsField = card.querySelector('.logbook-repssets-field');
        if (repsSetsField && repsSetsField.repsSetsController) {
            repsSetsField.repsSetsController.exitEditMode(save);
        }
        
        // Hide unified notes if no content
        const unifiedNotes = card.querySelector('.logbook-unified-notes');
        const notesInput = card.querySelector('.logbook-unified-notes .logbook-notes-input');
        if (unifiedNotes && notesInput && !notesInput.value.trim()) {
            unifiedNotes.style.display = 'none';
        }
    }
    
    console.log('💾 Edit mode exited:', save ? '(saved)' : '(cancelled)');
}
```

4. **Remove note-related methods** (lines 429-507):
   - [`toggleNotes()`](frontend/assets/js/controllers/weight-field-controller.js:430)
   - [`saveNotes()`](frontend/assets/js/controllers/weight-field-controller.js:452)
   - [`loadExistingNotes()`](frontend/assets/js/controllers/weight-field-controller.js:487)

#### B. Reps/Sets Field Controller

**File:** [`frontend/assets/js/controllers/repssets-field-controller.js`](frontend/assets/js/controllers/repssets-field-controller.js:64)

**Key Changes:**

1. **Update [`bindEvents()`](frontend/assets/js/controllers/repssets-field-controller.js:64) method** (line 64):

```javascript
bindEvents() {
    // Edit button removed - now controlled by weight field
    // DELETE lines 66-71 (edit button click handler)
    
    // Save/Cancel buttons remain (lines 74-87)
    // Keyboard handlers remain (lines 91-115)
    
    // REMOVE note button event handlers (lines 117-140)
}
```

2. **Remove note-related methods** (lines 270-349):
   - [`toggleNotes()`](frontend/assets/js/controllers/repssets-field-controller.js:272)
   - [`saveNotes()`](frontend/assets/js/controllers/repssets-field-controller.js:294)
   - [`loadExistingNotes()`](frontend/assets/js/controllers/repssets-field-controller.js:329)

#### C. New Unified Notes Controller

**New File:** `frontend/assets/js/controllers/unified-notes-controller.js`

```javascript
/**
 * Ghost Gym - Unified Notes Controller
 * Manages the single note field for each exercise
 * @version 1.0.0
 * @date 2026-01-14
 */

class UnifiedNotesController {
    constructor(container, options = {}) {
        this.container = container;
        this.sessionService = options.sessionService || window.workoutSessionService;
        this.exerciseName = options.exerciseName || 
            container.closest('.logbook-card')?.dataset?.exerciseName;
        
        // DOM elements
        this.toggleBtn = container.querySelector('.logbook-note-toggle-btn');
        this.notesContent = container.querySelector('.logbook-notes-content');
        this.notesInput = container.querySelector('.logbook-notes-input');
        
        // State
        this.notesSaveTimeout = null;
        
        if (!this.toggleBtn || !this.notesContent || !this.notesInput) {
            console.error('❌ UnifiedNotesController: Missing required DOM elements');
            return;
        }
        
        this.bindEvents();
        this.loadExistingNotes();
        console.log('✅ UnifiedNotesController initialized for:', this.exerciseName);
    }
    
    bindEvents() {
        // Toggle button
        this.toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        // Auto-save on blur
        this.notesInput.addEventListener('blur', () => {
            this.saveNotes();
        });
        
        // Debounced auto-save on input
        this.notesInput.addEventListener('input', () => {
            if (this.notesSaveTimeout) {
                clearTimeout(this.notesSaveTimeout);
            }
            this.notesSaveTimeout = setTimeout(() => {
                this.saveNotes();
            }, 1000);
        });
    }
    
    toggle() {
        const isVisible = this.notesContent.style.display !== 'none';
        
        if (isVisible) {
            this.notesContent.style.display = 'none';
        } else {
            this.notesContent.style.display = 'block';
            this.notesInput.focus();
        }
    }
    
    saveNotes() {
        if (!this.sessionService) return;
        
        const notes = this.notesInput.value.trim();
        
        // Update button state
        if (notes) {
            this.toggleBtn.classList.add('has-note');
            this.toggleBtn.innerHTML = `<i class="bx bxs-note"></i> Edit Note`;
        } else {
            this.toggleBtn.classList.remove('has-note');
            this.toggleBtn.innerHTML = `<i class="bx bx-note"></i> Add Note`;
        }
        
        // Save to session
        if (this.sessionService.isSessionActive()) {
            const exerciseData = this.sessionService.getCurrentSession()?.exercises?.[this.exerciseName];
            if (exerciseData) {
                exerciseData.notes = notes;
                console.log('💾 Notes saved to active session:', this.exerciseName);
            }
        } else {
            this.sessionService.updatePreSessionExercise(this.exerciseName, {
                notes: notes
            });
            console.log('📝 Notes saved to pre-session edits:', this.exerciseName);
        }
    }
    
    loadExistingNotes() {
        if (!this.sessionService) return;
        
        let existingNotes = '';
        
        if (this.sessionService.isSessionActive()) {
            const exerciseData = this.sessionService.getCurrentSession()?.exercises?.[this.exerciseName];
            existingNotes = exerciseData?.notes || '';
        } else {
            const preSessionData = this.sessionService.getPreSessionEdits(this.exerciseName);
            existingNotes = preSessionData?.notes || '';
        }
        
        if (existingNotes) {
            this.notesInput.value = existingNotes;
            this.toggleBtn.classList.add('has-note');
            this.toggleBtn.innerHTML = `<i class="bx bxs-note"></i> Edit Note`;
            console.log('📄 Existing notes loaded for:', this.exerciseName);
        }
    }
    
    destroy() {
        if (this.notesSaveTimeout) {
            clearTimeout(this.notesSaveTimeout);
        }
        this.container = null;
        this.sessionService = null;
    }
}

function initializeUnifiedNotes(sessionService) {
    const controllers = [];
    
    document.querySelectorAll('.logbook-unified-notes').forEach(container => {
        if (!container.unifiedNotesController) {
            const exerciseName = container.closest('.logbook-card')?.dataset?.exerciseName;
            container.unifiedNotesController = new UnifiedNotesController(container, {
                sessionService: sessionService,
                exerciseName: exerciseName
            });
            controllers.push(container.unifiedNotesController);
        }
    });
    
    console.log('✅ Initialized', controllers.length, 'unified notes controllers');
    return controllers;
}

// Export globally
window.UnifiedNotesController = UnifiedNotesController;
window.initializeUnifiedNotes = initializeUnifiedNotes;

console.log('📦 UnifiedNotesController loaded');
```

---

### 4. Update workout-mode.html

**File:** [`frontend/workout-mode.html`](frontend/workout-mode.html:280)

Add new script after repssets-field-controller.js (after line 280):

```html
<!-- Unified Notes Controller (NEW - Phase 9) -->
<script src="/static/assets/js/controllers/unified-notes-controller.js?v=1.0.0"></script>
```

---

### 5. Controller Initialization Updates

**File:** [`frontend/assets/js/controllers/workout-mode-controller.js`](frontend/assets/js/controllers/workout-mode-controller.js)

Find the initialization section where field controllers are set up, and add:

```javascript
// Initialize unified notes controllers
if (window.initializeUnifiedNotes) {
    window.initializeUnifiedNotes(this.sessionService);
}
```

---

## 🧪 Testing Checklist

### Functional Tests

- [ ] **Single Pencil Button**
  - [ ] Click pencil on weight → both weight and sets/reps editors open
  - [ ] Editors show correct current values
  - [ ] Unit selector still works in weight editor
  
- [ ] **Save/Cancel Behavior**
  - [ ] Save button in weight editor → saves both weight and sets/reps
  - [ ] Cancel button in weight editor → cancels both editors
  - [ ] Enter key in weight input → saves and closes
  - [ ] Escape key → cancels and closes
  - [ ] Click outside editors → cancels and closes

- [ ] **Unified Notes**
  - [ ] Note button appears at bottom when editors are open
  - [ ] Click note button → textarea expands
  - [ ] Notes save automatically on blur
  - [ ] Notes save automatically 1 second after typing stops
  - [ ] Button shows "Add Note" when empty
  - [ ] Button shows "Edit Note" with filled icon when note exists
  - [ ] Notes persist across page reloads
  
- [ ] **Pre-Session vs Active Session**
  - [ ] Pre-session edits save to `preSessionEdits`
  - [ ] Active session edits save to `session.exercises`
  - [ ] Notes load correctly in both modes

### Visual Tests

- [ ] "Weight" header displays above weight value
- [ ] No pencil button on sets/reps field
- [ ] No note buttons on individual fields
- [ ] Unified notes section hidden by default
- [ ] Unified notes section visible when editors open
- [ ] Smooth animations for editor transitions
- [ ] Proper spacing and alignment
- [ ] Dark mode compatibility

### Edge Cases

- [ ] Multiple cards open simultaneously
- [ ] Rapid clicking pencil button
- [ ] Very long notes (textarea resizes properly)
- [ ] Empty exercise name handling
- [ ] Missing sessionService graceful degradation

---

## 📦 Files to Modify

1. ✅ **HTML Renderer**: [`exercise-card-renderer.js`](frontend/assets/js/components/exercise-card-renderer.js)
2. ✅ **CSS**: [`logbook-theme.css`](frontend/assets/css/logbook-theme.css)
3. ✅ **Weight Controller**: [`weight-field-controller.js`](frontend/assets/js/controllers/weight-field-controller.js)
4. ✅ **Reps/Sets Controller**: [`repssets-field-controller.js`](frontend/assets/js/controllers/repssets-field-controller.js)
5. ✅ **New Controller**: `unified-notes-controller.js` (create new file)
6. ✅ **HTML**: [`workout-mode.html`](frontend/workout-mode.html)
7. ✅ **Workout Controller**: [`workout-mode-controller.js`](frontend/assets/js/controllers/workout-mode-controller.js)

---

## 🚀 Implementation Order

1. **Phase 1: CSS Preparation**
2. **Phase 2: HTML Structure**
3. **Phase 3: JavaScript Controllers**
4. **Phase 4: Integration**
5. **Phase 5: Polish & Testing**

---

## ✅ Success Criteria

- [ ] Single pencil button opens both editors
- [ ] Single note button at bottom of editor
- [ ] "Weight" header displays correctly
- [ ] All existing functionality preserved
- [ ] Notes save and load correctly
- [ ] No console errors
- [ ] Smooth user experience

---

**End of Plan**