# Workout Mode Landing Page Plan

## Current Behavior Analysis

When a user clicks "Workout Mode" in the menu:
1. Goes to `workout-mode.html` (no `?id=` parameter)
2. Controller checks for persisted session (`lifecycleManager.checkPersistedSession()`)
3. **If active session exists** → Shows resume prompt offcanvas (resume/start fresh/cancel) ✅
4. **If NO active session AND no `?id=`** → Immediately redirects to `workout-database.html` ❌

**Location of redirect logic:** [workout-mode-controller.js:197-201](frontend/assets/js/controllers/workout-mode-controller.js#L197-L201)
```javascript
if (!workoutId) {
    console.log('🔄 No workout ID provided, redirecting to workout database...');
    window.location.href = 'workout-database.html';
    return;
}
```

---

## Proposed Solution

Replace the automatic redirect with a **landing page UI** that displays when no workout is in progress.

### User Flow (Updated)
1. User clicks "Workout Mode" in menu
2. **If active session exists** → Resume flow (unchanged)
3. **If NO active session** → Show landing page with options:
   - **Start a Workout** (required) → Navigate to workout database
   - **Create a Workout** (required) → Navigate to workout builder
   - Additional suggestions based on best practices

---

## Landing Page Design

### Required Options (Per User Request)
| Option | Icon | Description | Action |
|--------|------|-------------|--------|
| Start a Workout | `bx-play-circle` | Browse your saved workouts | → `workout-database.html` |
| Create a Workout | `bx-plus-circle` | Build a new workout from scratch | → `workout-builder.html` |

### Best Practice Addition: Today's Suggestion (Conditional)
Show a "Today's Suggestion" card **only if** the user has workout history. This:
- Reduces decision fatigue ("What should I do today?")
- Leverages existing suggestion logic from workout-database.js
- Provides one-tap access to start working out

### Visual Design (Finalized)
- **Empty state pattern**: Large centered icon + message + action cards
- **Card-based layout**: Each option as a clickable card (mobile-friendly)
- **Consistent with app design**: Use existing Bootstrap/Sneat styling
- **Ghost Gym branding**: Use ghost emoji 👻
- **Large touch targets**: Min 56px height, full-width on mobile
- **Mobile-first**: Single column mobile, 2-col tablet+

### Mockup Structure (Finalized)
```
┌─────────────────────────────────────────┐
│      👻 No Workout in Progress          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ⭐ Suggested: Upper Body        │   │  ← Only if available
│  │    Last done 3 days ago         │   │
│  │              [Start Now]        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌───────────────┐ ┌───────────────┐   │
│  │ ▶️ Start a    │ │ ➕ Create a   │   │
│  │   Workout     │ │   Workout     │   │
│  └───────────────┘ └───────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Sign in to track progress...    │   │  ← Only if not authenticated
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Add Landing Page HTML Structure
**File:** `workout-mode.html`

1. Add new `<div id="noWorkoutLandingPage">` section after loading state
2. Include:
   - Header with icon and message
   - Primary action cards (Start/Create)
   - Secondary action buttons (History/Discover)

### Phase 2: Add Landing Page CSS
**File:** `workout-mode.css` (or new `workout-mode-landing.css`)

1. Style the landing page container
2. Style action cards (hover states, responsive layout)
3. Ensure consistency with existing app design

### Phase 3: Update Controller Logic
**File:** `workout-mode-controller.js`

1. **Remove redirect** at line 199-201
2. **Add new method:** `showLandingPage()`
3. **Update `initialize()`** to call `showLandingPage()` instead of redirecting
4. Update `uiStateManager` to handle new landing state

### Phase 4: Update UI State Manager
**File:** `workout-ui-state-manager.js`

1. Add `landing` element ID to constructor options
2. Add `showLanding()` method to handle landing page visibility
3. Update state transitions

---

## Files to Modify

| File | Changes |
|------|---------|
| [workout-mode.html](frontend/workout-mode.html) | Add landing page HTML section |
| [workout-mode.css](frontend/assets/css/workout-mode.css) | Add landing page styles |
| [workout-mode-controller.js](frontend/assets/js/controllers/workout-mode-controller.js) | Replace redirect with showLandingPage() |
| [workout-ui-state-manager.js](frontend/assets/js/services/workout-ui-state-manager.js) | Add landing state management |

---

## Considerations

### Edge Cases
1. **User navigates directly with `?id=`** → Should still load that workout (unchanged)
2. **User bookmarks `workout-mode.html`** → Landing page is appropriate
3. **Session expires while on landing page** → No change needed (already on landing)
4. **Deep link from workout card** → Includes `?id=`, loads workout directly

### Mobile Responsiveness
- Cards should stack vertically on small screens
- Touch targets should be at least 44px
- Consider bottom nav bar overlap (add padding)

### Accessibility
- All cards should be keyboard navigable
- Proper ARIA labels for screen readers
- Focus management when landing page appears

---

## Questions for Clarification

1. **Should "View History" link to workout-history.html or show inline?**
   - Recommendation: Link to existing page for simplicity

2. **Should we show a "Today's Suggestion" card if one is available?**
   - The workout-database.html already has this feature
   - Could be duplicated here for convenience

3. **Should unauthenticated users see different options?**
   - Anonymous users can't save sessions
   - Consider showing a "Sign in to track progress" prompt

---

## Success Criteria

- [ ] Clicking "Workout Mode" with no active session shows landing page
- [ ] "Start a Workout" navigates to workout database
- [ ] "Create a Workout" navigates to workout builder
- [ ] Active session still triggers resume prompt
- [ ] Direct links with `?id=` still work
- [ ] Mobile responsive layout
- [ ] Matches existing app design language
