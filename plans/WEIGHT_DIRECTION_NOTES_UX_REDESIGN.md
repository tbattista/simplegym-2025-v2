# Weight Direction Notes - UX Redesign Plan

## Problem Statement

The current "quick notes" feature for weight direction has several UX issues:

1. **Too Many Clicks**: Requires clicking a pencil button → opening a popover → selecting an option
2. **Verbose Labels**: "Increase weight next session" is too long to read during a workout
3. **Scattered Information**: Direction indicators appear in multiple places (weight badge, label display, last session alert)
4. **Unclear Default**: Showing "Keep same weight next session" implies an action was taken when it's the default
5. **Mixed Concepts**: "Last session reminder" vs "current session note" are displayed similarly
6. **Intrusive**: Opening a popover during workout sets disrupts the flow

## User Requirements

- Quick (1-tap) action during workout
- Minimal cognitive load
- Clear visual indication of current state
- Clear distinction between "reminder FROM last session" and "note FOR next session"
- Default behavior should be "no change" with no action needed
- Minimal workflow interruption

---

## Design Options

### Option A: Three-Button Inline Toggle

```
185 lbs    [↓] [=] [↑]
```

| Button | Meaning | Color When Selected |
|--------|---------|---------------------|
| ↓ | Decrease next time | Orange/Warning |
| = | Keep same | Blue/Primary |
| ↑ | Increase next time | Green/Success |

**Behavior:**
- Tap to select (button highlights)
- Tap again to deselect (returns to no selection)
- Default: NO button selected (no note made)

**Pros:**
- Fastest interaction (single tap)
- Always visible, no discovery problem
- Clear visual state

**Cons:**
- Takes horizontal space (3 buttons)
- "Same" button might be unnecessary noise

---

### Option B: Two-Button Toggle ⭐ RECOMMENDED

```
185 lbs    [↓ Less] [↑ More]
```

| Button | Meaning | Color When Selected |
|--------|---------|---------------------|
| ↓ Less | Decrease next session | Orange fill |
| ↑ More | Increase next session | Green fill |

**Behavior:**
- Neither selected = "Keep same" (implied default, no visual noise)
- Tap to select (button fills with color)
- Tap selected button again to deselect
- Only one can be active at a time

**Pros:**
- Only 2 buttons, cleaner than 3
- "Same" is the natural default (no action needed)
- Very quick interaction (1 tap)
- Clear visual feedback

**Cons:**
- Cannot explicitly indicate "I deliberately want same" (though this is rarely needed)

---

### Option C: Cycle Button (Single Icon)

```
185 lbs    [📝]     → No note (gray)
185 lbs    [📝↑]    → Increase (green)  
185 lbs    [📝↓]    → Decrease (orange)
```

**Behavior:**
- Tap cycles: none → ↑ → ↓ → none
- Icon color changes based on state
- Tooltip on hover/long-press shows full meaning

**Pros:**
- Most compact (single button)
- Unobtrusive when not needed

**Cons:**
- Must cycle through to get desired state (potentially 2 taps)
- Less discoverable

---

### Option D: Improved Popover (Keep Current Pattern)

Keep the popover but make it faster:

```
[📝] → Shows popover:
┌──────────────────┐
│  [↓]  [=]  [↑]  │  ← Icon buttons only, no text
└──────────────────┘
```

**Pros:**
- Cleaner card UI (just one icon)
- Full options visible in popover

**Cons:**
- Still requires 2 clicks (tap icon → tap option)

---

## Separating Last Session Reminder vs Current Session Note

**Key Insight:** These are two different concepts that should be displayed in different locations:

### Last Session Reminder (Passive - information TO user)
*"What I told myself to do next time"*

**Location:** Top of expanded card, BEFORE the weight section
**Appearance:** Subtle, muted banner that's dismissible
**Only shows:** When there IS a reminder from last session

```
┌─────────────────────────────────────────────────┐
│ 📝 Last session: Increase weight               │
└─────────────────────────────────────────────────┘
```

Alternative: Small badge near weight value
```
185 lbs  [Last: ↑]
```

### Current Session Note (Active - action FROM user)
*"What I want to tell myself for next time"*

**Location:** Below weight value, in the weight section
**Appearance:** Action buttons, prominent when session is active
**Only shows:** During active workout session

```
Next session:  [↓ Less] [↑ More]
```

---

## Recommended Design: Option B with Separation

### Collapsed Card (Header)
```
┌────────────────────────────────────────────────────────┐
│ ≡  Bench Press                              185 lbs ↑ │
│    3 sets × 8-12 reps • 60s                      ▼    │
└────────────────────────────────────────────────────────┘
```
- Weight badge shows current direction indicator if set
- Arrow icon (↑ or ↓) only appears if user made a note this session

### Expanded Card (Body)
```
┌────────────────────────────────────────────────────────┐
│ ≡  Bench Press                              185 lbs   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 📝 From last session: Increase weight           │  │  ← Only if reminder exists
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  Weight                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━               │
│  185 lbs                                               │
│  Last: 180 lbs on Dec 28                               │
│                                                        │
│  Next session:  [↓ Less] [↑ More]                      │  ← Only during active workout
│                              ▲                         │
│                     (green when selected)              │
│                                                        │
│  Sets × Reps ─────────────────────────── 3 × 8-12     │
│  Rest ───────────────────────────────────── 60s       │
│                                                        │
│  [✓ Complete]  [⏭ Skip]  [✏ Edit]                     │
└────────────────────────────────────────────────────────┘
```

---

## Visual States

### No Note Set (Default)
```
Next session:  [↓ Less] [↑ More]
               outline   outline
```
- Both buttons have outline style (not filled)
- No direction indicator on weight badge

### "Increase" Selected
```
Next session:  [↓ Less] [↑ More]
               outline   ██████
                         green
```
- "More" button is filled green
- Weight badge shows ↑ indicator

### "Decrease" Selected  
```
Next session:  [↓ Less] [↑ More]
               ██████   outline
               orange
```
- "Less" button is filled orange
- Weight badge shows ↓ indicator

---

## Interaction Flow

### During Active Workout:

1. User expands exercise card
2. If there's a reminder from last session, they see the banner at top
3. They do their sets
4. Before/after completing, they can optionally tap [↓ Less] or [↑ More]
5. Single tap = note saved
6. If they change their mind, tap the selected button again to deselect
7. Move on to next exercise

### Before Workout (Pre-Session):
- Show last session reminders only (read-only)
- Don't show the note buttons (can't make notes until workout starts)

---

## Implementation Changes

### Files to Modify:

1. **exercise-card-renderer.js**
   - Replace popover trigger with inline toggle buttons
   - Separate "last session reminder" to its own section at top
   - Add "next session" label above buttons

2. **workout-mode.css** (or new CSS file)
   - Style for toggle buttons (outline and filled states)
   - Style for last session reminder banner
   - Responsive sizing for mobile

3. **workout-mode-controller.js**
   - Simplify click handlers (no popover management)
   - Direct toggle behavior

4. **Remove/deprecate:**
   - quick-notes-popover.js (or keep for future text notes)
   - Complex popover CSS

### New Button Styles:
```css
.weight-direction-toggle {
  display: inline-flex;
  gap: 0.5rem;
}

.weight-direction-btn {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1px solid;
  background: transparent;
  transition: all 0.2s ease;
}

.weight-direction-btn.decrease {
  border-color: var(--bs-warning);
  color: var(--bs-warning);
}

.weight-direction-btn.decrease.active {
  background: var(--bs-warning);
  color: white;
}

.weight-direction-btn.increase {
  border-color: var(--bs-success);
  color: var(--bs-success);
}

.weight-direction-btn.increase.active {
  background: var(--bs-success);
  color: white;
}
```

---

## Questions for Discussion

1. **Button labels:** Should we use icons only `[↓] [↑]`, short text `[Less] [More]`, or icon+text `[↓ Less] [↑ More]`?

2. **Last session banner:** Should it be dismissible? Auto-hide after workout starts?

3. **Badge indicator:** Should the collapsed card weight badge show the direction? Or only when expanded?

4. **Toast feedback:** Show a brief toast when note is saved, or rely on visual button state alone?

---

## Summary

| Aspect | Current | Proposed |
|--------|---------|----------|
| Clicks to set note | 2+ (button → popover → option) | 1 (direct tap) |
| Default state | Shows "Keep same weight next session" | No text, buttons are unselected |
| Last session info | Mixed with current session | Separate banner at top |
| UI footprint | Popover overlay | Inline buttons |
| Cognitive load | Read long labels | Recognize icons/short words |
