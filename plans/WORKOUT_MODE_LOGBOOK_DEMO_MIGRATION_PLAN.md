# Workout Mode Logbook Demo Migration Plan

## Overview

This document outlines the migration of features from `frontend/workout-mode-logbook-demo.html` to the live `frontend/workout-mode.html` page.

---

## Feature Comparison Matrix

### Legend
- ✅ = Feature exists in that version
- ❌ = Feature missing
- 🆕 = New feature in demo (to be added)
- 🔄 = Feature needs update/enhancement

---

## A. Exercise Card Features

| Feature | Live | Demo | Action |
|---------|------|------|--------|
| Expand/collapse cards | ✅ | ✅ | Keep |
| Exercise name display | ✅ | ✅ | Keep |
| Sets × Reps display | ✅ | ✅ | Keep |
| Rest time display | ✅ | ✅ | Keep |
| Status badges (Logged, Skipped) | ✅ | ✅ | Keep |
| Skipped card styling | ✅ | ✅ | Keep |
| Weight field morph pattern | ❌ | ✅ | 🆕 Add |
| Sets×Reps field morph pattern | ❌ | ✅ | 🆕 Add |
| Tree-style weight history | ❌ | ✅ | 🆕 Add |
| Next session weight chips | ❌ | ✅ | 🆕 Add |
| Note toggle per field | ❌ | ✅ | 🆕 Add |
| State row with Today/Last/Next | ❌ | ✅ | 🆕 Add |

---

## B. Weight Management Features

| Feature | Live | Demo | Action |
|---------|------|------|--------|
| Weight direction toggle | ✅ | ❌ | 🔄 Replace with chips |
| Weight display | ✅ | ✅ | 🔄 Update styling |
| Weight edit inline | ❌ | ✅ | 🆕 Add |
| Weight stepper buttons (+5/-5) | ❌ | ✅ | 🆕 Add |
| Weight save animation | ❌ | ✅ | 🆕 Add |
| Last weight reference | ✅ | ✅ | 🔄 Enhance with tree view |
| Weight history tree | ❌ | ✅ | 🆕 Add |
| Exercise notes | ✅ | ✅ | 🔄 Enhance UI |

---

## C. Timer Features

| Feature | Live | Demo | Action |
|---------|------|------|--------|
| Global rest timer | ✅ | ❌ | Keep |
| Inline rest timer per card | ✅ | ✅ | Keep |
| Workout duration timer | ✅ | ✅ | Keep |
| Rest timer start/pause/reset | ✅ | ✅ | Keep |
| Timer warning state (last 10s) | ✅ | ✅ | Keep |
| Timer done state | ✅ | ✅ | Keep |

---

## D. Bottom Action Bar Features

| Feature | Live | Demo | Action |
|---------|------|------|--------|
| Add exercise button | ✅ | ✅ | Keep |
| Note button | ✅ | ✅ | Keep |
| Reorder button | ✅ | ✅ | Keep |
| More/Settings button | ✅ | ✅ | Keep |
| History button | ❌ | ✅ | 🆕 Add |
| Floating Start button | ✅ | ✅ | Keep |
| Floating Timer + End combo | ✅ | ✅ | Keep |

---

## E. Menu Features (⋯ More Menu)

| Feature | Live | Demo | Action |
|---------|------|------|--------|
| Modify exercise | ❌ | ✅ | 🆕 Add |
| Replace exercise | ✅ | ✅ | Keep |
| Skip for today | ✅ | ✅ | Keep |
| Move up/down | ✅ | ✅ | Keep |
| Remove from workout | ✅ | ✅ | Keep |
| Unskip exercise | ❌ | ✅ | 🆕 Add |

---

## F. Backend/Firebase Features (MUST PRESERVE)

| Feature | Live | Demo | Action |
|---------|------|------|--------|
| Firebase authentication | ✅ | ❌ | Keep |
| Exercise history API | ✅ | ❌ | Keep |
| Session persistence | ✅ | ❌ | Keep |
| Workout data loading | ✅ | ❌ | Keep |
| Weight logging to Firebase | ✅ | ❌ | Keep |
| Session save on complete | ✅ | ❌ | Keep |

---

## G. UI/UX Design System Features

| Feature | Live | Demo | Action |
|---------|------|------|--------|
| Three-layer action hierarchy | ❌ | ✅ | 🆕 Add |
| Logbook design system v2.0 | ❌ | ✅ | 🆕 Add |
| Custom CSS variables | ❌ | ✅ | 🆕 Add |
| Light theme default | ❌ | ✅ | 🔄 Consider |
| Dark theme support | ✅ | ✅ | Keep |

---

## Implementation Phases

### Phase 1: CSS Foundation
- [ ] Extract demo CSS into new `workout-mode-logbook.css` file
- [ ] Create CSS custom properties for logbook design system
- [ ] Ensure dark mode compatibility

### Phase 2: Weight Field Morph Pattern
- [ ] Create `WeightFieldController` class
- [ ] Implement display ↔ edit mode transition
- [ ] Add stepper buttons (+5/-5)
- [ ] Implement save animation

### Phase 3: Sets×Reps Field Morph Pattern
- [ ] Create `RepsSetsFieldController` class
- [ ] Implement inline editing
- [ ] Connect to Firebase data model

### Phase 4: Enhanced Weight History
- [ ] Update `_renderWeightHistory()` in card renderer
- [ ] Add tree-style visualization
- [ ] Include notes from previous sessions

### Phase 5: Next Session Weight Chips
- [ ] Replace weight direction toggle with chip selector
- [ ] Add Decrease/No Change/Increase chips
- [ ] Update Firebase data model if needed

### Phase 6: Note Toggle per Field
- [ ] Add note toggle button to weight section
- [ ] Add note toggle button to sets/reps section
- [ ] Implement collapsible note areas

### Phase 7: Menu Enhancements
- [ ] Add "Modify exercise" option
- [ ] Add "Unskip exercise" option for skipped cards
- [ ] Verify all menu actions work

### Phase 8: Bottom Bar Updates
- [ ] Add History button
- [ ] Verify all buttons work with new card design

### Phase 9: Testing & Firebase Verification
- [ ] Test all Firebase integrations
- [ ] Verify session persistence
- [ ] Test weight logging
- [ ] Cross-browser testing
- [ ] Mobile responsive testing

---

## Files to Modify

### Frontend Files
1. `frontend/workout-mode.html` - Add new CSS link
2. `frontend/assets/css/workout-mode.css` - Update or extend styles
3. `frontend/assets/js/components/exercise-card-renderer.js` - Update card HTML
4. `frontend/assets/js/controllers/workout-mode-controller.js` - Add new interactions

### New Files to Create
1. `frontend/assets/css/workout-mode-logbook.css` - New logbook design styles
2. `frontend/assets/js/components/weight-field-controller.js` - Weight morph pattern
3. `frontend/assets/js/components/reps-sets-field-controller.js` - Reps/sets morph pattern

### Backend Verification
1. Verify `weight_direction` field in Firebase data model
2. Verify `notes` field structure for per-exercise notes
3. Verify session data structure supports new fields

---

## Risk Assessment

### Low Risk
- CSS styling changes
- UI text updates
- Icon changes

### Medium Risk
- Weight field morph pattern (new interaction)
- Sets/reps field morph pattern (new interaction)
- Note toggle functionality

### High Risk (Requires Careful Testing)
- Firebase data model changes
- Session persistence with new fields
- Weight history API integration

---

## Questions for User

1. Should we keep the weight direction toggle OR replace with chips?
2. Should light theme become the default or keep dark theme?
3. Do we need "Modify exercise" to open an offcanvas or modal?
4. Should History button show a separate view or offcanvas?

---

## Next Steps

1. Review this plan and provide feedback
2. Clarify any questions above
3. Begin Phase 1: CSS Foundation
4. Proceed through phases sequentially with testing at each stage