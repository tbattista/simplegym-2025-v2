# Workout Logbook Demo UI Update Plan

## Overview

This document outlines the implementation plan for updating `frontend/workout-mode-logbook-demo.html` to be more consistent with the main app's UI components.

## User Requirements

1. **Copy the action bar at the bottom** from the rest of the app
2. **Include the top nav bar and menu** in the demo
3. **Add hover action buttons** from `workout-mode.html` for start, end, and workout time (floating timer+end combo)
4. **Move the rest timer into the exercise cards** (inline timer implementation)

## Constraints

- Demo should remain **self-contained** (inline CSS/JS, no external dependencies)
- Menu/navbar should be **static demo versions** that mimic the current app (no Firebase/auth)
- Focus is on **UI mockup only** at this point

---

## Current State Analysis

### Current Demo Structure (`workout-mode-logbook-demo.html`)

```
<html>
  <head>
    - Core CSS from /static/assets/
    - Inline <style> block (700+ lines of custom logbook CSS)
  </head>
  <body>
    - Simple container with exercise cards
    - Custom .logbook-footer (fixed bottom bar)
    - No sidebar menu
    - No top navbar
  </body>
</html>
```

### Target Structure (from `workout-mode.html`)

```
<html>
  <head>
    - Core CSS
    - Component CSS (navbar-custom.css, bottom-action-bar.css, etc.)
  </head>
  <body>
    <div class="layout-wrapper layout-content-navbar">
      <div class="layout-container">
        <aside id="layout-menu"><!-- Sidebar menu --></aside>
        <div class="layout-page">
          <nav class="layout-navbar"><!-- Top navbar --></nav>
          <div class="content-wrapper">
            <div class="container-xxl"><!-- Main content --></div>
          </div>
        </div>
      </div>
      <div class="layout-overlay"></div>
    </div>
    
    <!-- Bottom Action Bar (injected by service, but we'll inline for demo) -->
    <!-- Floating Timer+End Combo -->
  </body>
</html>
```

---

## Implementation Plan

### Phase 1: Page Structure Update

**Task:** Wrap existing content in proper layout structure

**Changes:**
1. Add `layout-wrapper`, `layout-container`, `layout-page` divs
2. Add static sidebar menu (`<aside id="layout-menu">`)
3. Add top navbar (`<nav class="layout-navbar">`)
4. Add `layout-overlay` for mobile menu behavior

**HTML Structure:**

```html
<body>
  <div class="layout-wrapper layout-content-navbar">
    <div class="layout-container">
      <!-- Sidebar Menu -->
      <aside id="layout-menu" class="layout-menu menu-vertical menu bg-menu-theme">
        <!-- Static menu content -->
      </aside>
      
      <div class="layout-page">
        <!-- Top Navbar -->
        <nav class="layout-navbar container-xxl navbar navbar-expand-xl navbar-detached align-items-center bg-navbar-theme">
          <!-- Navbar content -->
        </nav>
        
        <!-- Content Wrapper -->
        <div class="content-wrapper">
          <div class="container-xxl flex-grow-1 container-p-y">
            <!-- Existing logbook content -->
          </div>
        </div>
      </div>
    </div>
    
    <div class="layout-overlay layout-menu-toggle"></div>
  </div>
</body>
```

### Phase 2: Static Sidebar Menu

**Task:** Add a static sidebar menu that mimics the current app

**Menu Items (from `menu-template.js`):**
- Ghost Gym logo/brand
- Home
- Workouts
- Workout Mode (active)
- Workout Management section header
- Workout Builder
- My Programs
- Discover Workouts
- Data Management section header
- Exercise Database

**CSS Required:** 
- Core menu styles from `core.css` (already included)
- Will add minimal inline styles for consistency

### Phase 3: Static Top Navbar

**Task:** Add a static top navbar with key elements

**Navbar Elements (from `navbar-template.js`):**
- Menu toggle button (hamburger for mobile)
- Page title or breadcrumb
- Search placeholder
- Theme toggle button
- User avatar/profile dropdown placeholder

**CSS Required:**
- Navbar styles from `navbar-custom.css` (will inline key styles)

### Phase 4: Bottom Action Bar Replacement

**Task:** Replace custom `.logbook-footer` with app's bottom action bar styling

**Current Footer Elements:**
- Timer display (workout duration)
- Tool buttons (Add, Notes, Reorder, Rest Timer)
- End workout button

**New Bottom Action Bar Structure (from `bottom-action-bar.css`):**

```html
<div class="bottom-action-bar">
  <div class="bottom-action-bar-container">
    <!-- 4-button layout -->
    <div class="bottom-bar-buttons">
      <button class="bottom-bar-btn">
        <i class="bx bx-plus"></i>
        <span class="bottom-bar-btn-label">Add</span>
      </button>
      <button class="bottom-bar-btn">
        <i class="bx bx-note"></i>
        <span class="bottom-bar-btn-label">Notes</span>
      </button>
      <button class="bottom-bar-btn">
        <i class="bx bx-sort-alt-2"></i>
        <span class="bottom-bar-btn-label">Reorder</span>
      </button>
      <button class="bottom-bar-btn">
        <i class="bx bx-stopwatch"></i>
        <span class="bottom-bar-btn-label">Rest</span>
      </button>
    </div>
  </div>
</div>
```

**CSS to Include (inline):**
- `.bottom-action-bar` base styles
- `.bottom-bar-buttons` layout
- `.bottom-bar-btn` button styles
- Dark/light theme support

### Phase 5: Floating Timer + Start/End Combo

**Task:** Add the floating timer display with start/end button that appears above the bottom action bar

**Component Structure (from `bottom-action-bar.css`):**

```html
<!-- Floating Timer + End Combo (when workout active) -->
<div class="floating-timer-end-combo" id="floatingTimerEndCombo">
  <div class="floating-timer-display">
    <i class="bx bx-time-five"></i>
    <span id="workoutTimerDisplay">12:34</span>
  </div>
  <button class="floating-end-btn" id="floatingEndBtn">
    <i class="bx bx-stop-circle"></i>
    End
  </button>
</div>

<!-- Start Button (when workout not started) -->
<div class="floating-fab-container" id="floatingStartContainer">
  <button class="floating-fab floating-fab-start" id="floatingStartBtn">
    <i class="bx bx-play"></i>
  </button>
</div>
```

**States:**
1. **Before workout started:** Show floating green "Start" FAB
2. **During workout:** Show timer display + "End" button combo

**CSS to Include:**
- `.floating-timer-end-combo` positioning and styling
- `.floating-timer-display` timer bubble
- `.floating-end-btn` end button
- `.floating-fab-container` and `.floating-fab-start` for start button

### Phase 6: Inline Rest Timer in Exercise Cards

**Task:** Move rest timer from footer into each exercise card body

**Current Location:** Rest timer is a tool button in the footer
**New Location:** Inside each expanded exercise card body, near the weight/notes section

**Component Structure (from `inline-rest-timer.js` and `workout-mode.css`):**

```html
<div class="logbook-section">
  <div class="logbook-section-label">Rest Timer</div>
  <div class="inline-rest-timer" data-rest-duration="90">
    <div class="rest-timer-controls">
      <span class="rest-timer-duration">90s</span>
      <a href="#" class="rest-timer-action" data-action="start">
        <i class="bx bx-play-circle"></i> Start Rest
      </a>
    </div>
    <div class="rest-timer-countdown" style="display: none;">
      <span class="rest-timer-remaining">90</span>
      <span class="rest-timer-label">sec remaining</span>
      <div class="rest-timer-inline-controls">
        <button class="rest-timer-inline-btn pause">
          <i class="bx bx-pause"></i>
        </button>
        <button class="rest-timer-inline-btn reset">
          <i class="bx bx-refresh"></i>
        </button>
      </div>
    </div>
  </div>
</div>
```

**States:**
1. **Ready:** Shows duration and "Start Rest" link
2. **Counting:** Shows countdown with pause/reset buttons
3. **Done:** Shows completion state, option to restart

**CSS to Include:**
- `.inline-rest-timer` container styles
- `.rest-timer-controls` and `.rest-timer-countdown` states
- Timer button styles

---

## CSS Organization

All CSS will be kept inline in the `<style>` block. New sections to add:

```css
/* ============================================
   LAYOUT STRUCTURE (from core.css)
   ============================================ */

/* ============================================
   SIDEBAR MENU
   ============================================ */

/* ============================================
   TOP NAVBAR
   ============================================ */

/* ============================================
   BOTTOM ACTION BAR
   ============================================ */

/* ============================================
   FLOATING TIMER + START/END COMBO
   ============================================ */

/* ============================================
   INLINE REST TIMER
   ============================================ */
```

---

## JavaScript Updates

### Demo-Only JS Features

1. **Menu toggle:** Open/close sidebar on mobile
2. **Workout timer:** Start/stop/display workout duration
3. **Start/End button states:** Toggle between start FAB and timer+end combo
4. **Inline rest timer:** Start/pause/reset countdown per exercise card
5. **Existing functionality:** Card expand/collapse, weight steppers, save buttons

### New Functions to Add

```javascript
// Toggle sidebar menu (mobile)
function toggleMenu() { ... }

// Workout timer management
function startWorkout() { ... }
function endWorkout() { ... }
function updateWorkoutTimer() { ... }

// Inline rest timer
function startRestTimer(cardElement) { ... }
function pauseRestTimer(cardElement) { ... }
function resetRestTimer(cardElement) { ... }
function updateRestTimerDisplay(cardElement) { ... }
```

---

## Visual Reference

### Bottom Action Bar Layout

```
┌─────────────────────────────────────────────────────┐
│  Floating Timer+End Combo (when active)             │
│  ┌──────────────────────────────────────────────┐   │
│  │  🕐 12:34          [■ End]                   │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Bottom Action Bar                                  │
│  ┌──────────────────────────────────────────────┐   │
│  │   [+]      [📝]      [↕]      [⏱]           │   │
│  │   Add     Notes   Reorder    Rest           │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Exercise Card with Inline Rest Timer

```
┌─────────────────────────────────────────────────────┐
│ Incline Dumbbell Press                          ⋮ ▼ │
│ 3 × 10-12 • 60s rest                               │
│ Last: 55 lbs on Jan 7                              │
├─────────────────────────────────────────────────────┤
│ TODAY                                               │
│ ┌─────┐                                            │
│ │ 55  │ lbs   [-] [+]                              │
│ └─────┘                                            │
│ 📝 Add a note...                                   │
│                                                     │
│ REST TIMER                                          │
│ 60s  [▶ Start Rest]                                │
│                                                     │
│ LAST TIME                                           │
│ ┌─────────────────────────────────────────────┐    │
│ │ 55 lbs • Jan 7                               │    │
│ └─────────────────────────────────────────────┘    │
│                                                     │
│ NEXT SESSION (optional)                            │
│ [Same] [+5] [-5]                                   │
│                                                     │
│ ───────────────────────────────────────────────── │
│                               [Log Entry]          │
└─────────────────────────────────────────────────────┘
```

---

## File Changes Summary

### File to Modify
- `frontend/workout-mode-logbook-demo.html`

### Changes Overview

| Section | Current | New |
|---------|---------|-----|
| HTML Structure | Simple container | Full layout-wrapper with menu/navbar |
| Sidebar | None | Static demo menu |
| Navbar | None | Static demo navbar |
| Bottom Bar | Custom `.logbook-footer` | App's `.bottom-action-bar` style |
| Timer Display | In footer | Floating combo above action bar |
| Start/End | In footer | Floating FAB / combo |
| Rest Timer | Footer tool button | Inline in each exercise card |

---

## Implementation Order

1. ✅ Analysis complete
2. ⏳ Create implementation plan (this document)
3. 🔲 Update HTML structure (layout-wrapper, etc.)
4. 🔲 Add static sidebar menu
5. 🔲 Add static top navbar
6. 🔲 Replace footer with bottom action bar
7. 🔲 Add floating timer + start/end combo
8. 🔲 Add inline rest timer to exercise cards
9. 🔲 Update CSS (inline styles)
10. 🔲 Update JavaScript (demo functionality)
11. 🔲 Test and verify

---

## Ready for Implementation

This plan is ready for review. Once approved, switch to **Code mode** to implement the changes to `frontend/workout-mode-logbook-demo.html`.

**Key Decisions:**
- Demo remains self-contained (no external JS dependencies beyond Bootstrap/jQuery)
- Static menu/navbar (non-functional navigation for demo purposes)
- All styling inline in the HTML file
- Focus on visual consistency with the main app

Would you like me to proceed with implementation?