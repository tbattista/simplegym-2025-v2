# Phase 7: Logbook V2 Advanced Features - Implementation Prompt

**Start Date:** 2026-01-13  
**Status:** Ready to Start  
**Prerequisites:** Phases 1-6 Complete ✅

---

## Prompt for AI Assistant

```
I need help with Phase 7 of the Workout Mode Logbook V2 implementation: Advanced Features Integration.

Context
Phases 1-6 Complete:

✅ Phase 1: Created logbook-theme.css (1,348 lines)
✅ Phase 2: Created weight-field-controller.js (289 lines)
✅ Phase 3: Created repssets-field-controller.js (280 lines)
✅ Phase 4: Refactored exercise-card-renderer.js to generate .logbook-card HTML structure
✅ Phase 5: Added controller initialization in workout-mode-controller.js
✅ Phase 6: Completed testing and integration, all morph patterns working

Phase 7 Goal
Implement advanced UI features: Direction Chips, Weight History Tree, and Enhanced Inline Rest Timer.

Implementation Tasks

1. Direction Chips Integration
   Replace the vertical toggle stack with horizontal chip buttons and wire to session service.

   Files to Modify:
   - frontend/assets/js/components/exercise-card-renderer.js
   - frontend/assets/js/services/workout-weight-manager.js (if needed)

   Tasks:
   - [ ] Update _renderDirectionChips() to create horizontal chip layout
   - [ ] Add chip selection event handlers
   - [ ] Wire chips to sessionService.setWeightDirection(exerciseName, direction)
   - [ ] Update collapsed badge to show direction indicator (↓/=/↑)
   - [ ] Persist chip selection to Firebase
   - [ ] Test chip state restoration after page reload
   - [ ] Verify chips are disabled before session starts (pre-session mode)
   
   HTML Structure:
   ```html
   <div class="logbook-section">
     <div class="logbook-section-label">Next Session Weight</div>
     <div class="logbook-next-chips">
       <button class="logbook-chip" data-direction="decrease">
         <span class="chip-icon">↓</span>
         <span class="chip-label">Decrease</span>
       </button>
       <button class="logbook-chip active" data-direction="same">
         <span class="chip-icon">=</span>
         <span class="chip-label">No Change</span>
       </button>
       <button class="logbook-chip" data-direction="increase">
         <span class="chip-icon">↑</span>
         <span class="chip-label">Increase</span>
       </button>
     </div>
   </div>
   ```

2. Weight History Tree Implementation
   Replace list-style history with tree-style display using connectors.

   Files to Modify:
   - frontend/assets/js/components/exercise-card-renderer.js

   Tasks:
   - [ ] Update _renderWeightHistory() to use tree connectors
   - [ ] Use ├─ for intermediate entries, └─ for last entry
   - [ ] Show most recent entry as primary (bold/highlighted)
   - [ ] Show last note if available ("Good form")
   - [ ] Limit display to 4 most recent entries
   - [ ] Handle empty history state
   - [ ] Format dates relative (e.g., "2 days ago")
   
   HTML Structure:
   ```html
   <div class="logbook-section">
     <div class="logbook-section-label">Weight History</div>
     <div class="logbook-history">
       <div class="history-entry primary">
         <div class="history-date">Jan 10, 2026</div>
         <div class="history-weight">185 lbs</div>
         <div class="history-note">Good form</div>
       </div>
       <div class="history-entry">
         <span class="history-connector">├─</span>
         <span class="history-date">Jan 8</span>
         <span class="history-weight">180 lbs</span>
       </div>
       <div class="history-entry">
         <span class="history-connector">├─</span>
         <span class="history-date">Jan 5</span>
         <span class="history-weight">175 lbs</span>
       </div>
       <div class="history-entry">
         <span class="history-connector">└─</span>
         <span class="history-date">Jan 3</span>
         <span class="history-weight">170 lbs</span>
       </div>
     </div>
   </div>
   ```

3. Inline Rest Timer Enhancement
   Match demo UI patterns with horizontal layout and improved controls.

   Files to Modify:
   - frontend/assets/js/components/inline-rest-timer.js (if exists)
   - frontend/assets/js/services/workout-timer-manager.js
   - frontend/assets/js/components/exercise-card-renderer.js

   Tasks:
   - [ ] Update _renderInlineRestTimer() for horizontal layout
   - [ ] Add Pause/Reset buttons next to countdown
   - [ ] Implement warning state at 10 seconds remaining
   - [ ] Coordinate with global timer (only one active at a time)
   - [ ] Play sound on timer completion (respect sound toggle)
   - [ ] Show "Ready" state when timer is not running
   - [ ] Test timer pause/resume functionality
   - [ ] Test timer reset functionality
   
   HTML Structure:
   ```html
   <div class="logbook-section">
     <div class="logbook-section-label">Rest Timer</div>
     <div class="inline-rest-timer" data-rest-duration="90" data-timer-index="0">
       <!-- Ready State -->
       <div class="timer-ready">
         <button class="timer-btn timer-start">
           <i class="bx bx-play"></i>
           Start 90s Rest
         </button>
       </div>
       <!-- Counting State (hidden initially) -->
       <div class="timer-counting" style="display: none;">
         <div class="timer-display">1:30</div>
         <div class="timer-controls">
           <button class="timer-btn timer-pause">
             <i class="bx bx-pause"></i>
           </button>
           <button class="timer-btn timer-reset">
             <i class="bx bx-reset"></i>
           </button>
         </div>
       </div>
     </div>
   </div>
   ```

4. Collapsed Badge Direction Indicator
   Add direction indicator to collapsed state badges.

   Tasks:
   - [ ] Update collapsed badge to show current direction
   - [ ] Add direction icons (↓/=/↑) to badge
   - [ ] Update badge when direction chip is clicked
   - [ ] Style indicator to match theme
   
   Example:
   ```html
   <div class="logbook-state-row">
     <span class="logbook-state-item highlight">Today: 185 lbs</span>
     <span class="logbook-state-item">Last: 180 lbs</span>
     <span class="logbook-state-item next-up">Next: ↑ +5</span>
   </div>
   ```

Success Criteria
✅ Direction chips display and function correctly
✅ Chip selection persists to Firebase
✅ Collapsed badge shows direction indicator
✅ Weight history displays in tree format with connectors
✅ History shows most recent 4 entries
✅ History shows last note if available
✅ Inline timer has horizontal layout with controls
✅ Timer pause/reset buttons work
✅ Warning state appears at 10s
✅ Sound plays on timer completion
✅ Only one timer active at a time
✅ All features work in pre-session and active session states
✅ No console errors
✅ Mobile responsive

Bug Fixes Needed
If you find issues, please:
1. Document the bug with steps to reproduce
2. Identify the root cause
3. Propose a fix
4. Implement and test the fix
5. Update this document with the resolution

Reference Files
- Main Plan: plans/WORKOUT_MODE_LOGBOOK_V2_IMPLEMENTATION_PLAN.md
- Progress Summary: plans/LOGBOOK_V2_PROGRESS_SUMMARY.md
- Phase 6 Complete: plans/PHASE_6_LOGBOOK_V2_TESTING_AND_INTEGRATION_PROMPT.md
- Card Renderer: frontend/assets/js/components/exercise-card-renderer.js
- Timer Manager: frontend/assets/js/services/workout-timer-manager.js
- Session Service: frontend/assets/js/services/workout-session-service.js

Please implement Phase 7 features and report findings.
```

---

## Implementation Checklist

### Direction Chips
- [ ] Horizontal chip layout renders correctly
- [ ] Chip click handlers attached
- [ ] Active chip styling works
- [ ] Direction persists to sessionService
- [ ] Collapsed badge shows direction indicator
- [ ] Chips disabled in pre-session mode
- [ ] Direction state restores after reload
- [ ] Mobile touch interactions work

### Weight History Tree
- [ ] Tree structure renders with connectors
- [ ] Primary entry highlighted correctly
- [ ] ├─ connector for intermediate entries
- [ ] └─ connector for last entry
- [ ] Limit to 4 most recent entries works
- [ ] Last note displays if available
- [ ] Empty history handled gracefully
- [ ] Dates formatted correctly

### Inline Rest Timer
- [ ] Horizontal layout renders correctly
- [ ] Start button initiates countdown
- [ ] Countdown displays correctly (MM:SS)
- [ ] Pause button pauses timer
- [ ] Resume after pause works
- [ ] Reset button resets to initial time
- [ ] Warning state at 10s works
- [ ] Sound plays on completion
- [ ] Only one timer active globally
- [ ] Ready state displays correctly

### Integration Tests
- [ ] Direction chip selection saves to Firebase
- [ ] History loads from exercise history API
- [ ] Timer coordinates with global timer
- [ ] All features work pre-session
- [ ] All features work during session
- [ ] Page reload preserves state

### Cross-Platform Tests
- [ ] Chrome/Edge: All features work
- [ ] Firefox: All features work
- [ ] Safari: All features work (if available)
- [ ] Mobile: Touch interactions work
- [ ] Mobile: Layouts are responsive

---

## Phase 7 Components Summary

| Component | File(s) Modified | Lines Changed (Est.) |
|-----------|------------------|----------------------|
| Direction Chips | exercise-card-renderer.js | ~50 |
| Weight History Tree | exercise-card-renderer.js | ~80 |
| Inline Rest Timer | exercise-card-renderer.js, workout-timer-manager.js | ~100 |
| Collapsed Badge Update | exercise-card-renderer.js | ~30 |

**Total Estimated Changes:** ~260 lines

---

## Next Phase Preview: Phase 8

After Phase 7 features are complete and tested, Phase 8 will focus on:

1. **Bottom Action Bar Updates**
   - Update button configuration for workout-mode context
   - Add new action buttons (Add Exercise, Notes, Reorder, History)
   - Preserve existing actions (Sound, Share, Edit, Change)

2. **Floating Timer + End Combo**
   - Implement pill-shaped floating control
   - Combine session timer display with End Workout button
   - Toggle visibility based on session state (hidden before start, visible during workout)
   - Position at top-right of screen
   - Make draggable (optional enhancement)

3. **Start Workout FAB**
   - Update FAB to hide when session starts
   - Show floating timer+end combo in its place
   - Coordinate state transitions

---

## Known Issues (To Be Documented)

_This section will be filled during implementation_

---

## Fixes Applied (To Be Documented)

_This section will be filled as bugs are fixed_

---

**Created:** 2026-01-13  
**Status:** Ready for Implementation