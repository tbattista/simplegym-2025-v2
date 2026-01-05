# Workout Mode Controller Refactoring Plan

## Overview

This document outlines a comprehensive refactoring plan for [`workout-mode-controller.js`](../frontend/assets/js/controllers/workout-mode-controller.js:1) to improve maintainability, testability, and code organization.

### Current State Analysis

**File Statistics:**
- **Lines of Code:** ~2,500 lines
- **Methods:** 60+ methods in a single class
- **Responsibilities:** Auth, sessions, UI, timers, weights, reordering, bonus exercises, data collection

**Key Issues Identified:**

1. **Single Responsibility Violation:** The `WorkoutModeController` class handles too many concerns
2. **Tight Coupling to Globals:** Heavy reliance on `window.*` objects
3. **Inconsistent Abstraction Levels:** Mixes high-level orchestration with low-level DOM manipulation
4. **Difficult to Test:** Large class with many dependencies makes unit testing challenging
5. **Code Duplication:** Similar patterns repeated for modals/offcanvas interactions

---

## Critical External API Surface

Based on a comprehensive search of the codebase, the following methods/properties are called externally and **MUST be preserved as facade methods** on `window.workoutModeController`:

### From ExerciseCardRenderer (onclick handlers)
| Method | Called From | Purpose |
|--------|-------------|---------|
| `toggleExerciseCard(index)` | Card header click | Expand/collapse card |
| `showQuickNotes(this)` | Quick notes button | Weight direction popover |
| `showPlateSettings()` | Plate settings button | Configure plates |
| `handleEditExercise(name, index)` | Modify button | Edit exercise details |
| `handleUnskipExercise(name, index)` | Unskip button | Resume skipped exercise |
| `handleUncompleteExercise(name, index)` | Uncomplete button | Mark not completed |
| `handleCompleteExercise(name, index)` | Complete button | Mark as completed |
| `handleSkipExercise(name, index)` | Skip button | Skip exercise |

### From bottom-action-bar-config.js
| Method | Called From | Purpose |
|--------|-------------|---------|
| `handleBonusExercises()` | Add bonus button | Open bonus exercise form |
| `skipExercise()` | Skip button (action bar) | Skip current exercise |
| `handleStartWorkout()` | Start button | Begin workout session |
| `handleCompleteWorkout()` | End button | Complete workout |

### From workout-mode-refactored.js
| Method/Property | Called From | Purpose |
|-----------------|-------------|---------|
| `soundEnabled` | RestTimer | Check sound preference |
| `toggleExerciseCard(index)` | Global function | Toggle card |
| `goToNextExercise(index)` | Global function | Navigate to next |

### From offcanvas-workout.js
| Method | Called From | Purpose |
|--------|-------------|---------|
| `autoSave(null)` | Weight save | Persist changes |
| `renderWorkout()` | After weight save | Re-render cards |

### From workout-mode.html
| Method | Called From | Purpose |
|--------|-------------|---------|
| `initializeStartButtonTooltip()` | Auth ready callback | Update tooltip |

**Total: 18 unique external API methods/properties that MUST remain on controller**

---

## Proposed Architecture

### New File Structure

```
frontend/assets/js/
├── controllers/
│   └── workout-mode-controller.js  # Slimmed down (~400 lines, orchestration only)
├── components/
│   ├── exercise-card-renderer.js   # Existing, enhanced
│   ├── exercise-card-manager.js    # NEW: Card interactions
│   ├── session-lifecycle-manager.js # NEW: Session start/complete/resume
│   ├── reorder-manager.js          # NEW: Drag-and-drop reordering
│   └── weight-interaction-manager.js # NEW: Weight UI management
├── services/
│   ├── workout-session-service.js  # Existing, unchanged
│   ├── workout-timer-manager.js    # NEW: Timer consolidation
│   └── workout-ui-state-manager.js # NEW: UI state management
└── utils/
    └── workout-utils.js            # NEW: Shared utilities
```

### Architecture Diagram

```mermaid
graph TD
    WMC[WorkoutModeController<br/>~400 lines orchestration]
    
    subgraph Services
        WSS[WorkoutSessionService<br/>Existing - Session State]
        WTM[WorkoutTimerManager<br/>NEW - All Timer Logic]
        WUSM[WorkoutUIStateManager<br/>NEW - Loading/Error States]
    end
    
    subgraph Components
        ECR[ExerciseCardRenderer<br/>Existing - Card HTML]
        ECM[ExerciseCardManager<br/>NEW - Card Interactions]
        SLM[SessionLifecycleManager<br/>NEW - Start/Complete/Resume]
        RM[ReorderManager<br/>NEW - Drag/Drop]
        WIM[WeightInteractionManager<br/>NEW - Weight UI]
    end
    
    subgraph Utils
        WU[WorkoutUtils<br/>Shared Helpers]
    end
    
    WMC --> WSS
    WMC --> WTM
    WMC --> WUSM
    WMC --> ECR
    WMC --> ECM
    WMC --> SLM
    WMC --> RM
    WMC --> WIM
    
    ECM --> ECR
    WIM --> WSS
    WTM --> WSS
    SLM --> WSS
    SLM --> WUSM
</graph>
```

---

## Module Specifications

### 1. WorkoutUtils (utils/workout-utils.js)

**Purpose:** Shared utility functions used across workout modules

**Methods to Extract:**
| Method | Current Location | Lines |
|--------|-----------------|-------|
| `escapeHtml()` | controller:2436 | 5 |
| `stripHtml()` | controller:63 | 5 |
| `parseRestTime()` | controller:2428 | 4 |

**Example Implementation:**
```javascript
// workout-utils.js
export const WorkoutUtils = {
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    },
    
    parseRestTime(restStr) {
        const match = restStr.match(/(\d+)/);
        return match ? parseInt(match[1]) : 60;
    }
};
```

---

### 2. WorkoutUIStateManager (services/workout-ui-state-manager.js)

**Purpose:** Centralized management of loading, error, and UI states

**Methods to Extract:**
| Method | Current Location | Lines |
|--------|-----------------|-------|
| `showLoadingState()` | controller:2352 | 13 |
| `hideLoadingState()` | controller:2369 | 15 |
| `showError()` | controller:2386 | 38 |
| `updateLoadingMessage()` | controller:2342 | 5 |
| `updateSessionUI()` | controller:1748 | 33 |
| `showSaveIndicator()` | controller:1021 | 18 |

**Interface:**
```javascript
class WorkoutUIStateManager {
    constructor(containerIds) // DOM element IDs for states
    
    // Loading States
    showLoading(message)
    hideLoading()
    updateLoadingMessage(message)
    
    // Error States
    showError(message, options)
    hideError()
    
    // Session UI
    updateSessionState(isActive, session)
    
    // Save Indicators
    showSaveIndicator(element, state) // 'saving' | 'success' | 'error'
}
```

---

### 3. WorkoutTimerManager (services/workout-timer-manager.js)

**Purpose:** Consolidate all timer functionality

**Methods to Extract:**
| Method | Current Location | Lines |
|--------|-----------------|-------|
| `initializeTimers()` | controller:417 | 12 |
| `initializeGlobalRestTimer()` | controller:434 | 19 |
| `syncGlobalTimerWithExpandedCard()` | controller:459 | 15 |
| `startSessionTimer()` | controller:1786 | 28 |
| `stopSessionTimer()` | controller:1819 | 11 |

**Interface:**
```javascript
class WorkoutTimerManager {
    constructor(sessionService)
    
    // Session Timer
    startSessionTimer(session)
    stopSessionTimer()
    getElapsedTime()
    
    // Rest Timers
    initializeCardTimers()
    syncWithExpandedCard(cardIndex)
    
    // Global Rest Timer Integration
    connectGlobalTimer(globalRestTimer)
    
    // Events
    onTimerTick(callback)
    onRestComplete(callback)
}
```

---

### 4. ExerciseCardManager (components/exercise-card-manager.js)

**Purpose:** Handle all exercise card interactions

**Methods to Extract:**
| Method | Current Location | Lines |
|--------|-----------------|-------|
| `toggleExerciseCard()` | controller:1960 | 34 |
| `expandCard()` | controller:1995 | 13 |
| `collapseCard()` | controller:2013 | 14 |
| `stopExercise()` | controller:2032 | 6 |
| `goToNextExercise()` | controller:2044 | 16 |
| `expandFirstExerciseCard()` | controller:1410 | 6 |
| `getExerciseGroupByIndex()` | controller:623 | 22 |

**Interface:**
```javascript
class ExerciseCardManager {
    constructor(options: {
        containerSelector: string,
        sessionService: WorkoutSessionService,
        timerManager: WorkoutTimerManager
    })
    
    // Card Interactions
    toggle(index)
    expand(index)
    collapse(index)
    expandFirst()
    
    // Navigation
    goToNext(currentIndex)
    
    // Data Access
    getExerciseGroup(index)
    getCurrentlyExpanded()
    
    // Events
    onCardExpanded(callback)
    onCardCollapsed(callback)
}
```

---

### 5. WeightInteractionManager (components/weight-interaction-manager.js)

**Purpose:** Handle all weight-related UI interactions

**Methods to Extract:**
| Method | Current Location | Lines |
|--------|-----------------|-------|
| `handleWeightButtonClick()` | controller:650 | 10 |
| `handleWeightDirection()` | controller:682 | 42 |
| `showWeightModal()` | controller:665 | 10 |
| `showQuickNotes()` | controller:770 | 15 |
| `handleQuickNoteAction()` | controller:794 | 24 |
| `updateWeightDirectionButtons()` | controller:731 | 33 |
| `updateQuickNoteTrigger()` | controller:825 | 45 |
| `_updateCollapsedBadge()` | controller:877 | 52 |
| `_getDirectionLabel()` | controller:937 | 8 |
| `showPlateSettings()` | controller:950 | 10 |
| `_findExerciseGroupByName()` | controller:969 | 24 |

**Interface:**
```javascript
class WeightInteractionManager {
    constructor(options: {
        sessionService: WorkoutSessionService,
        offcanvasFactory: UnifiedOffcanvasFactory
    })
    
    // Weight Editing
    showWeightEditor(exerciseName, options)
    
    // Direction Indicators
    setWeightDirection(exerciseName, direction)
    updateDirectionUI(exerciseName, direction)
    
    // Quick Notes
    showQuickNotes(trigger)
    
    // Plate Calculator
    showPlateSettings()
    
    // Events
    onWeightChanged(callback)
    onDirectionChanged(callback)
}
```

---

### 6. SessionLifecycleManager (components/session-lifecycle-manager.js)

**Purpose:** Handle workout session start, complete, and resume flows

**Methods to Extract:**
| Method | Current Location | Lines |
|--------|-----------------|-------|
| `handleStartWorkout()` | controller:1302 | 50 |
| `startNewSession()` | controller:1371 | 35 |
| `handleCompleteWorkout()` | controller:1421 | 5 |
| `showCompleteWorkoutOffcanvas()` | controller:1429 | 23 |
| `showCompletionSummary()` | controller:1456 | 8 |
| `showLoginPrompt()` | controller:1467 | 72 |
| `showResumeSessionPrompt()` | controller:1548 | 30 |
| `resumeSession()` | controller:1583 | 55 |

**Interface:**
```javascript
class SessionLifecycleManager {
    constructor(options: {
        sessionService: WorkoutSessionService,
        uiStateManager: WorkoutUIStateManager,
        offcanvasFactory: UnifiedOffcanvasFactory,
        authService: AuthService
    })
    
    // Session Start
    async startWorkout(workout)
    showLoginPrompt()
    
    // Session Complete
    async completeWorkout(exercisesPerformed)
    showCompletionSummary(session)
    
    // Session Resume
    checkForPersistedSession()
    showResumePrompt(sessionData)
    async resumeSession(sessionData)
    
    // Events
    onSessionStarted(callback)
    onSessionCompleted(callback)
    onSessionResumed(callback)
}
```

---

### 7. ReorderManager (components/reorder-manager.js)

**Purpose:** Handle drag-and-drop exercise reordering

**Methods to Extract:**
| Method | Current Location | Lines |
|--------|-----------------|-------|
| `initializeSortable()` | controller:480 | 40 |
| `initializeReorderMode()` | controller:525 | 13 |
| `enterReorderMode()` | controller:543 | 27 |
| `exitReorderMode()` | controller:578 | 15 |
| `handleExerciseReorder()` | controller:600 | 19 |

**Interface:**
```javascript
class ReorderManager {
    constructor(options: {
        containerSelector: string,
        sessionService: WorkoutSessionService,
        cardManager: ExerciseCardManager
    })
    
    // Mode Control
    initialize()
    enterReorderMode()
    exitReorderMode()
    isReorderModeActive()
    
    // Events
    onReorder(callback)
}
```

---

## Implementation Phases

### Phase 1: Foundation (Low Risk)
**Goal:** Extract utilities and UI state management

| Task | Description | Risk |
|------|-------------|------|
| Create `workout-utils.js` | Extract shared helpers | Low |
| Create `WorkoutUIStateManager` | Extract loading/error states | Low |
| Update controller imports | Add script tags | Low |
| Test all UI state transitions | Verify no regressions | Low |

**Deliverables:**
- [ ] `frontend/assets/js/utils/workout-utils.js`
- [ ] `frontend/assets/js/services/workout-ui-state-manager.js`
- [ ] Updated `workout-mode.html` with new script tags

---

### Phase 2: Timer Consolidation (Medium Risk)
**Goal:** Centralize all timer logic

| Task | Description | Risk |
|------|-------------|------|
| Create `WorkoutTimerManager` | Consolidate timer logic | Medium |
| Integrate with `GlobalRestTimer` | Ensure compatibility | Medium |
| Update session timer handling | Wire new manager | Medium |
| Test timer synchronization | Verify card sync works | Medium |

**Deliverables:**
- [ ] `frontend/assets/js/services/workout-timer-manager.js`
- [ ] Updated controller timer references

---

### Phase 3: Card Interactions (Medium Risk)
**Goal:** Extract card expand/collapse logic

| Task | Description | Risk |
|------|-------------|------|
| Create `ExerciseCardManager` | Extract card interactions | Medium |
| Maintain `onclick` compatibility | Keep `window.workoutModeController.toggleExerciseCard()` working | Medium |
| Update card navigation | Wire goToNext properly | Medium |
| Test all card transitions | Verify animations work | Medium |

**Deliverables:**
- [ ] `frontend/assets/js/components/exercise-card-manager.js`
- [ ] Updated card onclick handlers

---

### Phase 4: Weight Management (Higher Risk)
**Goal:** Extract weight UI interactions

| Task | Description | Risk |
|------|-------------|------|
| Create `WeightInteractionManager` | Extract weight logic | Higher |
| Preserve direction button behavior | Complex state management | Higher |
| Integrate with quick notes | Popover interactions | Medium |
| Test weight editing flow | Full workflow testing | Higher |

**Deliverables:**
- [ ] `frontend/assets/js/components/weight-interaction-manager.js`
- [ ] Updated weight button handlers

---

### Phase 5: Session Lifecycle (Medium-High Risk)
**Goal:** Extract session start/complete/resume flows

| Task | Description | Risk |
|------|-------------|------|
| Create `SessionLifecycleManager` | Extract session flows | Medium |
| Handle start workout logic | Auth checks, session init | Higher |
| Handle complete workflow | Summary, data persistence | Medium |
| Handle resume flow | Persisted session restoration | Higher |
| Preserve login prompt modal | Keep existing behavior | Medium |

**Deliverables:**
- [ ] `frontend/assets/js/components/session-lifecycle-manager.js`
- [ ] Updated session button handlers
- [ ] Resume session integration

---

### Phase 6: Reorder & Bonus (Lower Risk)
**Goal:** Extract drag-drop and bonus exercise handling

| Task | Description | Risk |
|------|-------------|------|
| Create `ReorderManager` | Extract SortableJS integration | Lower |
| Consolidate bonus handlers | Already partially in session service | Lower |
| Test reorder functionality | Drag-drop testing | Lower |
| Test bonus exercise flow | Add/remove bonus | Lower |

**Deliverables:**
- [ ] `frontend/assets/js/components/reorder-manager.js`
- [ ] Updated reorder event handlers

---

### Phase 7: Controller Slim-down
**Goal:** Finalize controller refactoring

| Task | Description | Risk |
|------|-------------|------|
| Remove extracted methods | Clean up controller | Medium |
| Add all facade methods (17) | Backward compatibility | Low |
| Update initialization | Wire all new modules | Medium |
| Full regression testing | Complete flow testing | Medium |

**Deliverables:**
- [ ] Slimmed `workout-mode-controller.js` (~400 lines)
- [ ] All facade methods implemented
- [ ] Complete test coverage

---

## Backward Compatibility Strategy

### Facade Pattern for Global Access

The existing code uses `window.workoutModeController.*` extensively. To maintain compatibility:

```javascript
// In slimmed controller
class WorkoutModeController {
    constructor() {
        this.cardManager = new ExerciseCardManager(...);
        this.weightManager = new WeightInteractionManager(...);
        // ...
    }
    
    // Facade methods for backward compatibility
    toggleExerciseCard(index) {
        return this.cardManager.toggle(index);
    }
    
    handleWeightDirection(button) {
        return this.weightManager.handleDirection(button);
    }
    
    // ...other delegated methods
}
```

### onclick Handler Strategy

Current HTML uses inline handlers like:
```html
onclick="window.workoutModeController.toggleExerciseCard(0)"
```

Options:
1. **Keep facades** (Recommended) - Maintain compatibility, delegate to new modules
2. **Update handlers** - Change to event delegation (more work, breaking changes)

---

## Testing Strategy

### Unit Testing
Each new module can be tested in isolation:

```javascript
// Example: WorkoutUIStateManager tests
describe('WorkoutUIStateManager', () => {
    it('should show loading state', () => {
        const manager = new WorkoutUIStateManager({...mockIds});
        manager.showLoading('Loading workout...');
        expect(document.getElementById('loading').style.display).toBe('block');
    });
});
```

### Integration Testing
Test module interactions:

```javascript
describe('Card + Timer Integration', () => {
    it('should sync timer when card expands', () => {
        cardManager.expand(0);
        expect(timerManager.syncWithExpandedCard).toHaveBeenCalledWith(0);
    });
});
```

### Manual Testing Checklist

- [ ] Start workout session
- [ ] Expand/collapse exercise cards
- [ ] Edit weight values
- [ ] Set weight direction indicators
- [ ] Use rest timer
- [ ] Reorder exercises
- [ ] Add bonus exercise
- [ ] Complete workout
- [ ] Resume interrupted session
- [ ] Test on mobile devices

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Event handler breakage | High | Keep facade methods, test each extraction |
| State synchronization bugs | Medium | Use observer pattern for state changes |
| Timer desync | Medium | Centralize all timer logic in one module |
| Backward compatibility breaks | High | Maintain all `window.workoutModeController.*` methods |
| CSS/animation issues | Low | Keep DOM structure unchanged |

---

## Success Metrics

### Code Quality
- [ ] Controller reduced from ~2500 to ~500 lines
- [ ] Each new module < 300 lines
- [ ] Single responsibility per module
- [ ] No global variable pollution (except backward compat facades)

### Maintainability
- [ ] New developers can understand a module in < 15 minutes
- [ ] Bug fixes localized to single module
- [ ] Features can be added without modifying controller

### Testability
- [ ] Each module can be unit tested in isolation
- [ ] 80%+ code coverage achievable
- [ ] Integration tests for critical paths

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize phases** based on current pain points
3. **Start Phase 1** (lowest risk, immediate value)
4. **Iterate** through remaining phases

---

## Appendix: Method Inventory

### Methods Remaining in Controller (~400 lines)

| Method | Purpose | Lines |
|--------|---------|-------|
| `constructor()` | Initialize services and managers | 40 |
| `initialize()` | Orchestrate startup | 50 |
| `loadWorkout()` | Load workout data | 100 |
| `renderWorkout()` | Delegate to CardRenderer | 80 |
| `handleAuthStateChange()` | Auth event handling | 10 |
| `setupEventListeners()` | Event binding | 30 |
| `collectExerciseData()` | Data aggregation | 100 |
| Facade methods | Backward compatibility delegates | ~100 |

### Methods Extracted

| Module | Method Count | Lines |
|--------|-------------|-------|
| WorkoutUtils | 3 | ~50 |
| WorkoutUIStateManager | 6 | ~150 |
| WorkoutTimerManager | 5 | ~200 |
| ExerciseCardManager | 7 | ~200 |
| WeightInteractionManager | 11 | ~300 |
| SessionLifecycleManager | 8 | ~280 |
| ReorderManager | 5 | ~150 |
| **Total Extracted** | **45** | **~1330** |

### Required Facade Methods

These methods MUST remain on `window.workoutModeController` for backward compatibility:

| Facade Method | Delegates To | Called From |
|---------------|-------------|-------------|
| `toggleExerciseCard(index)` | `cardManager.toggle()` | exercise-card-renderer.js onclick |
| `showQuickNotes(trigger)` | `weightManager.showQuickNotes()` | exercise-card-renderer.js onclick |
| `showPlateSettings()` | `weightManager.showPlateSettings()` | exercise-card-renderer.js onclick |
| `handleEditExercise(name, index)` | `cardManager.editExercise()` | exercise-card-renderer.js onclick |
| `handleUnskipExercise(name, index)` | `cardManager.unskipExercise()` | exercise-card-renderer.js onclick |
| `handleUncompleteExercise(name, index)` | `cardManager.uncompleteExercise()` | exercise-card-renderer.js onclick |
| `handleCompleteExercise(name, index)` | `cardManager.completeExercise()` | exercise-card-renderer.js onclick |
| `handleSkipExercise(name, index)` | `cardManager.skipExercise()` | exercise-card-renderer.js onclick |
| `handleBonusExercises()` | `sessionLifecycleManager.addBonusExercise()` | bottom-action-bar-config.js |
| `skipExercise()` | `cardManager.skipCurrentExercise()` | bottom-action-bar-config.js |
| `handleStartWorkout()` | `sessionLifecycleManager.startWorkout()` | bottom-action-bar-config.js |
| `handleCompleteWorkout()` | `sessionLifecycleManager.completeWorkout()` | bottom-action-bar-config.js |
| `soundEnabled` (property) | Direct property access | workout-mode-refactored.js |
| `goToNextExercise(index)` | `cardManager.goToNext()` | workout-mode-refactored.js |
| `autoSave(card)` | `sessionService.autoSaveSession()` | offcanvas-workout.js |
| `renderWorkout()` | Direct method | offcanvas-workout.js |
| `initializeStartButtonTooltip()` | `uiStateManager.updateStartButtonTooltip()` | workout-mode.html |

**Total: 17 facade methods/properties (maintains 100% backward compatibility)**

---

*Document created: 2025-01-05*
*Last updated: 2025-01-05*
