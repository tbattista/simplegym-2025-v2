# Ghost Gym V2 - CSS Refactor Handoff Document

> **Created**: 2026-01-20
> **Updated**: 2026-01-22 (Phase 5 COMPLETE)
> **Purpose**: Complete context for continuing the CSS refactor project in a new Claude Code session
> **Project Path**: `c:\Users\user\iCloudDrive\PARA\1 - Projects\_Websites\simple gym log\simplegym_v2`

---

## Quick Start Prompt for New Session

Copy and paste this prompt to continue the work:

```
I'm continuing a CSS refactor project for Ghost Gym V2. Please read the handoff document at:
CSS_REFACTOR_HANDOFF.md

**Current Status**: Phase 5 is COMPLETE. Ready to start Phase 6.

Please review the handoff document and continue with Phase 6: Final Cleanup.
```

---

## Project Overview

**Ghost Gym V2** is a workout log generator with:
- **Backend**: FastAPI (Python) on port 8001
- **Frontend**: Vanilla JavaScript + Bootstrap 5 (Sneat template)
- **Start Command**: `python run.py`

**CSS Refactor Goal**: Clean up ~380KB of CSS across 48 files by:
- Removing dead/unused code
- Establishing a unified design system
- Reducing `!important` declarations (468 → 194, 58.5% reduction)
- Eliminating `transition: all` (136 → 0)
- Keeping files under ~500 lines

---

## Completed Phases

### Phase 1: Design System Foundation ✅ COMPLETE

**What was done**:
- Created `frontend/assets/css/design-system.css` (357 lines)
- Unified design tokens with `--gs-*` prefix convention
- Contains: colors, spacing, typography, shadows, border-radius, transitions, z-index, breakpoints
- Added legacy aliases (`--ghost-*` → `--gs-*`, `--floating-fab-*` → `--gs-fab-*`)

**Files created/modified**:
- `frontend/assets/css/design-system.css` (NEW - 357 lines)
- `frontend/assets/css/components.css` (MODIFIED - imports design-system.css first)

---

### Phase 2: ghost-gym-custom.css Split ✅ COMPLETE

**What was done**:
- Split 1,702-line ghost-gym-custom.css into focused modules
- Reduced ghost-gym-custom.css to 629 lines (-63%)

**Files created/modified**:
- `frontend/assets/css/layout.css` (NEW - 409 lines) - Container/grid layouts
- `frontend/assets/css/menu-sidebar.css` (NEW - 224 lines) - Sidebar and mobile menu
- `frontend/assets/css/utilities.css` (NEW - 226 lines) - Animations, scrollbar, loading
- `frontend/assets/css/ghost-gym-custom.css` (REDUCED - 629 lines)
- `frontend/assets/css/components.css` (MODIFIED - v1.4.0, imports new modules)

---

### Phase 3: workout-mode.css Dead Code Removal ✅ COMPLETE

**What was done**:
- Analyzed JavaScript to determine which CSS classes are actually used
- **Critical finding**: JavaScript exclusively uses `logbook-*` classes (from logbook-theme.css)
- The old `.exercise-card` system was completely replaced by `.logbook-card`
- Removed ~1,312 lines of dead code (52% reduction)

**Files modified**:
- `frontend/assets/css/workout-mode.css` (REDUCED - 2,521 → 1,209 lines, -52%)

---

### Phase 4: Workout Mode CSS Consolidation & Modularization ✅ COMPLETE

**What was done**:
- Merged `logbook-theme.css` and `workout-mode.css` into a unified modular system
- Renamed all `.logbook-*` classes to `.workout-*` (54+ classes)
- Renamed all `--logbook-*` CSS variables to `--workout-*` (9+ variables)
- Split into 15 small modular CSS files under `workout-mode/` directory
- Updated all JavaScript files (7 files) with new class names
- Replaced hardcoded rgba values with design-system tokens
- Deleted old `logbook-theme.css`

**New Modular File Structure**:
```
frontend/assets/css/
├── workout-mode/                    # NEW directory (15 files)
│   ├── _variables.css              # CSS variables (~100 lines)
│   ├── _card-base.css              # Card, states, header, body (~270 lines)
│   ├── _weight-field.css           # Weight morph pattern (~280 lines)
│   ├── _repssets-field.css         # Reps/sets morph pattern (~140 lines)
│   ├── _notes.css                  # Notes section (~165 lines)
│   ├── _timer.css                  # Inline rest timer (~120 lines)
│   ├── _menu.css                   # More menu dropdown (~90 lines)
│   ├── _chips.css                  # Next session chips (~70 lines)
│   ├── _history.css                # Weight history tree (~100 lines)
│   ├── _actions.css                # Actions, add exercise (~90 lines)
│   ├── _bottom-bar.css             # Fixed bottom bar (~100 lines)
│   ├── _badges.css                 # Weight progression badges (~130 lines)
│   ├── _direction-toggle.css       # Direction buttons (~160 lines)
│   ├── _session-controls.css       # Session header/controls (~190 lines)
│   └── _responsive.css             # Media queries (~160 lines)
│
├── workout-mode.css                # Entry point - @imports only (~60 lines)
```

**Files modified**:
- `frontend/assets/css/design-system.css` - Added `--gs-weight-decreased-rgb` variable
- `frontend/workout-mode.html` - Removed logbook-theme.css import, updated workout-mode.css version
- `frontend/assets/js/components/exercise-card-renderer.js` - Renamed all class references
- `frontend/assets/js/controllers/workout-mode-controller.js` - Renamed all class references
- `frontend/assets/js/controllers/weight-field-controller.js` - Renamed all class references
- `frontend/assets/js/controllers/repssets-field-controller.js` - Renamed all class references
- `frontend/assets/js/controllers/unified-notes-controller.js` - Renamed all class references
- `frontend/assets/js/components/note-card-renderer.js` - Renamed all class references
- `frontend/assets/js/components/offcanvas/offcanvas-workout.js` - Renamed variable reference
- `frontend/assets/css/components/note-card.css` - Renamed all class/variable references
- `frontend/assets/css/components/unified-offcanvas.css` - Renamed class references

**Files deleted**:
- `frontend/assets/css/logbook-theme.css` (DELETED - merged into workout-mode/)

**Class Rename Reference**:
| Old Class | New Class |
|-----------|-----------|
| `.logbook-card` | `.workout-card` |
| `.logbook-card-header` | `.workout-card-header` |
| `.logbook-card-body` | `.workout-card-body` |
| `.logbook-exercise-name` | `.workout-exercise-name` |
| `.logbook-section` | `.workout-section` |
| `.logbook-menu` | `.workout-menu` |
| `.logbook-chip` | `.workout-chip` |
| `--logbook-*` | `--workout-*` |

---

### Phase 5: !important Reduction Campaign ✅ COMPLETE

**Goal**: Reduce `!important` declarations to essential overrides only.

**Results**:
- **Starting count**: 468 `!important` declarations
- **Final count**: 194 `!important` declarations
- **Reduction**: 274 removed (58.5% reduction)

**Sub-phases completed**:

#### Phase 5.1: Bottom Action Bar & Utilities
- Removed 30+ `!important` from `bottom-action-bar.css`
- Removed 15+ from `utilities.css`
- **Technique**: Increased specificity using parent class selectors

#### Phase 5.2: Exercise Database & Workout Database
- Removed 42 `!important` from `exercise-database.css`
- Removed 38 `!important` from `workout-database.css`
- **Technique**: Added ID selectors for page-specific scoping (`#exercise-database-page`, `#workout-database-page`)

#### Phase 5.3: Ghost-gym-custom & Workout Mode Modules
- Removed 17 `!important` from `ghost-gym-custom.css`
- Removed remaining non-essential `!important` from workout-mode modules
- **Technique**: Parent class prefixes, increased selector specificity

**Files modified in Phase 5**:
- `frontend/assets/css/bottom-action-bar.css`
- `frontend/assets/css/utilities.css`
- `frontend/assets/css/exercise-database.css`
- `frontend/assets/css/workout-database.css`
- `frontend/assets/css/ghost-gym-custom.css`
- Various `frontend/assets/css/workout-mode/*.css` modules

**Techniques used**:
1. **Specificity increase**: Added parent class selectors (`.page-container .element`)
2. **ID selectors**: Used page-level IDs for page-specific styles
3. **Contextual selectors**: Combined with Bootstrap classes (`.btn.btn-custom`)
4. **Removal**: Deleted truly unnecessary `!important` declarations

**Legitimate remaining !important categories (194 total)**:
| Category | Count | Reason |
|----------|-------|--------|
| Print styles (`@media print`) | ~60 | Required for PDF/print output |
| Accessibility/forced states | ~25 | Screen readers, focus visibility |
| SortableJS library overrides | ~40 | Third-party drag-drop library |
| Bootstrap Popper dropdowns | ~35 | Framework z-index/positioning |
| Critical state overrides | ~34 | Active/disabled states that must win |

**Note**: The remaining 194 `!important` declarations are in legitimate use cases where they are either:
1. Required for third-party library compatibility
2. Essential for print/PDF generation
3. Necessary for accessibility compliance
4. Part of state management where the override must always win

---

## Remaining Phases

### Phase 6: Final Cleanup ⏳ NEXT

**Goal**: Remove remaining code smells.

**Tasks**:
1. Replace all `transition: all` with specific properties
2. Remove empty/near-empty rules
3. Consolidate duplicate media queries
4. Final line count audit (all files <500 lines)

---

## File Structure Summary

### Design System (Core)
```
frontend/assets/css/
├── design-system.css     # ~400 lines - Design tokens
├── components.css        # ~250 lines - Component imports
├── layout.css            # ~410 lines - Container/grid layouts
├── menu-sidebar.css      # ~225 lines - Sidebar/mobile menu
├── utilities.css         # ~230 lines - Animations, scrollbar
└── ghost-gym-custom.css  # ~630 lines - Core page styles
```

### Workout Mode (Modular)
```
frontend/assets/css/
├── workout-mode.css      # ~60 lines - Entry point (@imports)
└── workout-mode/         # NEW directory
    ├── _variables.css    # ~100 lines
    ├── _card-base.css    # ~270 lines
    ├── _weight-field.css # ~280 lines
    └── ... (12 more modules)
```

### Page-Specific
```
frontend/assets/css/
├── workout-database.css  # ~500 lines
├── exercise-database.css # ~600 lines
├── workout-builder.css   # ~350 lines
└── bottom-action-bar.css # ~200 lines
```

---

## Key Technical Details

### Class Naming Convention
- All workout mode classes use `.workout-*` prefix
- CSS variables use `--workout-*` prefix for local tokens
- Design system tokens use `--gs-*` prefix

### JavaScript Integration
The following JS files reference workout mode CSS classes:
1. `exercise-card-renderer.js` - Renders exercise cards
2. `workout-mode-controller.js` - Main controller
3. `weight-field-controller.js` - Weight editing
4. `repssets-field-controller.js` - Protocol editing
5. `unified-notes-controller.js` - Notes handling
6. `note-card-renderer.js` - Note cards
7. `offcanvas-workout.js` - Workout offcanvas

### Testing Checklist for Changes
After any CSS changes, verify:
- [ ] Start dev server: `python run.py`
- [ ] Open http://localhost:8001/workout-mode.html
- [ ] Select a workout and enter workout mode
- [ ] Exercise cards render correctly
- [ ] Expand/collapse cards work
- [ ] Weight field edit mode works
- [ ] Reps/sets field edit mode works
- [ ] Notes toggle and input work
- [ ] Inline rest timer functions
- [ ] More menu (dropdown) works
- [ ] Card states: logged, skipped, active
- [ ] Weight progression badges display
- [ ] Direction toggle buttons work
- [ ] Light/dark mode consistent
- [ ] Mobile responsive (< 576px)

---

## Current Metrics

### Line Count Progress
| File | Before | After | Status |
|------|--------|-------|--------|
| design-system.css | 0 | ~400 | ✅ Phase 1 |
| ghost-gym-custom.css | 1,702 | ~630 | ✅ Phase 2 |
| workout-mode.css | 2,521 | ~60 (entry) | ✅ Phase 4 |
| workout-mode/ (total) | 0 | ~1,900 | ✅ Phase 4 |
| logbook-theme.css | 1,847 | 0 (deleted) | ✅ Phase 4 |

**Total lines saved**: ~2,600+ lines (logbook-theme merged/deleted, workout-mode streamlined)

### !important Reduction Progress (Phase 5)
| Metric | Value |
|--------|-------|
| Starting count | 468 |
| Final count | 194 |
| Removed | 274 |
| **Reduction** | **58.5%** |

| Category of Remaining | Count |
|-----------------------|-------|
| Print styles | ~60 |
| Accessibility | ~25 |
| SortableJS overrides | ~40 |
| Bootstrap Popper | ~35 |
| Critical states | ~34 |
| **Total legitimate** | **194** |

---

## Notes for Future Sessions

1. **Always run the dev server** before testing: `python run.py`
2. **Check browser console** for 404 errors on CSS files after structural changes
3. **Search for remaining patterns** before considering a refactor complete:
   - `grep -r "logbook-" frontend/` should return 0 results
   - `grep -r "--logbook-" frontend/` should return 0 results
4. **Modular CSS uses @import** - order matters, variables must load first
5. **!important audit command**: `grep -r "!important" frontend/assets/css/ | wc -l`
   - Current count: 194 (all legitimate)
   - If adding new `!important`, document the reason (print/a11y/library/state)
