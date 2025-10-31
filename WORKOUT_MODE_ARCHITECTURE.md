# Workout Mode Architecture

## Overview
A clean, focused workout execution interface that displays a selected workout with expandable exercise cards, rest timer functionality, and navigation controls.

## Design Requirements

### Page Layout
- **No app bar** - Clean, distraction-free interface
- **Top Left**: Hamburger menu button (floating or fixed)
- **Top Center**: Workout title (e.g., "Back & Biceps")
- **Below Title**: Small "Change workout" link → navigates back to workouts list
- **Main Content**: Scrollable list of exercise cards
- **Bottom**: Sticky bar with Share and Sound toggle

### Exercise Cards

#### Collapsed State
Each card displays:
```
Exercise Name • Sets × Reps • Rest: [time]
Alt1: [exercise name] (if exists)
Alt2: [exercise name] (if exists)
```

Example:
```
Barbell Bench Press • 3×8-12 • Rest: 60s
Alt1: Dumbbell Bench Press
Alt2: Machine Chest Press
```

#### Expanded State
When tapped, card expands to show:
1. **Exercise Name** (header)
2. **Sets × Reps** (prominent display)
3. **Notes** (optional, if present in data)
4. **Target/Equipment Info** (optional, if available)
5. **Rest Timer Block** (see below)
6. **Next Exercise Button** (navigates to next card)

### Rest Timer Component

#### States & UI

**1. Ready State (Initial)**
```
┌─────────────────────────┐
│   Rest: 60s             │
│  [Start Rest] button    │
└─────────────────────────┘
```

**2. Counting State**
```
┌─────────────────────────┐
│      01:00              │
│  [Pause]  [Reset]       │
└─────────────────────────┘
```

**3. Paused State**
```
┌─────────────────────────┐
│      00:45              │
│  [Resume]  [Reset]      │
└─────────────────────────┘
```

**4. Done State**
```
┌─────────────────────────┐
│   Rest: Done ✓          │
│  [Start Again] button   │
└─────────────────────────┘
```

### Navigation Flow

#### Accessing Workout Mode
1. From Workout Builder ([`workouts.html`](workouts.html:1))
   - Add "Start Workout" button to each workout card
   - Button navigates to `workout-mode.html?id={workoutId}`

2. From dedicated Workout Mode page
   - Display list of all workouts
   - User selects workout to begin

#### Within Workout Mode
- **Change workout** link → Returns to workout selection
- **Next Exercise** button → Closes current card, opens next card automatically
- Cards auto-scroll into view when expanded

### Sticky Bottom Bar

```
┌─────────────────────────────────────┐
│  [📤 Share]          [🔊 Sound: On] │
└─────────────────────────────────────┘
```

- **Share Button**: Shares workout details (text/link)
- **Sound Toggle**: Controls timer completion beep
  - States: "Sound: On" / "Sound: Off"
  - Persists in localStorage

## Data Structure

### Workout Object
```javascript
{
  id: "workout-123",
  name: "Back & Biceps",
  description: "Upper body pull day",
  tags: ["pull", "upper"],
  exercise_groups: [
    {
      exercises: {
        a: "Barbell Bench Press",
        b: "Dumbbell Bench Press",  // Alt1
        c: "Machine Chest Press"     // Alt2
      },
      sets: "3",
      reps: "8-12",
      rest: "60s",
      notes: "Focus on form"  // optional
    }
  ],
  bonus_exercises: [
    {
      name: "Face Pulls",
      sets: "2",
      reps: "15",
      rest: "30s"
    }
  ]
}
```

### Exercise Card State
```javascript
{
  isExpanded: false,
  timerState: 'ready', // 'ready' | 'counting' | 'paused' | 'done'
  remainingTime: 60,   // seconds
  timerInterval: null
}
```

## File Structure

### HTML
**`frontend/workout-mode.html`**
- Minimal layout (no app bar)
- Menu button (top left)
- Workout title + change link (top center)
- Exercise cards container
- Sticky bottom bar

### CSS
**`frontend/assets/css/workout-mode.css`**
- Clean, focused styling
- Card expansion animations
- Timer component styling
- Mobile-first responsive design
- Sticky bottom bar positioning

### JavaScript
**`frontend/assets/js/workout-mode.js`**
- Load workout by ID from URL params
- Render exercise cards
- Handle card expansion/collapse
- Timer functionality (4 states)
- Next exercise navigation
- Sound toggle persistence
- Share functionality

## Component Breakdown

### 1. Workout Header Component
```html
<div class="workout-mode-header">
  <button class="menu-toggle">☰</button>
  <div class="workout-title-container">
    <h1 class="workout-title">Back & Biceps</h1>
    <a href="workouts.html" class="change-workout-link">Change workout</a>
  </div>
</div>
```

### 2. Exercise Card Component
```html
<div class="exercise-card" data-group-index="0">
  <!-- Collapsed View -->
  <div class="exercise-card-header">
    <div class="exercise-main">
      Barbell Bench Press • 3×8-12 • Rest: 60s
    </div>
    <div class="exercise-alts">
      <span class="alt">Alt1: Dumbbell Bench Press</span>
      <span class="alt">Alt2: Machine Chest Press</span>
    </div>
  </div>
  
  <!-- Expanded View (hidden by default) -->
  <div class="exercise-card-body" style="display: none;">
    <h3>Barbell Bench Press</h3>
    <div class="sets-reps-display">3 × 8-12</div>
    <div class="exercise-notes">Focus on form</div>
    <div class="exercise-info">Target: Chest | Equipment: Barbell</div>
    
    <!-- Rest Timer -->
    <div class="rest-timer" data-rest-seconds="60">
      <!-- Timer UI based on state -->
    </div>
    
    <button class="btn-next-exercise">Next Exercise →</button>
  </div>
</div>
```

### 3. Rest Timer Component
```javascript
class RestTimer {
  constructor(element, restSeconds) {
    this.element = element;
    this.totalSeconds = restSeconds;
    this.remainingSeconds = restSeconds;
    this.state = 'ready'; // ready, counting, paused, done
    this.interval = null;
    this.soundEnabled = localStorage.getItem('workoutSoundEnabled') !== 'false';
  }
  
  start() { /* ... */ }
  pause() { /* ... */ }
  resume() { /* ... */ }
  reset() { /* ... */ }
  complete() { /* ... */ }
  playBeep() { /* ... */ }
  render() { /* ... */ }
}
```

### 4. Sticky Bottom Bar
```html
<div class="workout-mode-footer">
  <button class="btn-share" onclick="shareWorkout()">
    <i class="bx bx-share-alt"></i> Share
  </button>
  <button class="btn-sound-toggle" onclick="toggleSound()">
    <i class="bx bx-volume-full"></i> Sound: <span id="soundStatus">On</span>
  </button>
</div>
```

## Implementation Steps

### Phase 1: Core Structure
1. Create [`workout-mode.html`](workout-mode.html:1) with basic layout
2. Create [`workout-mode.css`](frontend/assets/css/workout-mode.css:1) with styling
3. Create [`workout-mode.js`](frontend/assets/js/workout-mode.js:1) with data loading

### Phase 2: Exercise Cards
4. Implement card rendering from workout data
5. Add expand/collapse functionality
6. Implement auto-scroll on expansion
7. Handle alternate exercises display

### Phase 3: Rest Timer
8. Build RestTimer class with 4 states
9. Implement countdown logic
10. Add pause/resume/reset functionality
11. Implement completion state with beep

### Phase 4: Navigation
12. Add "Next Exercise" button functionality
13. Implement auto-open next card
14. Add "Change workout" navigation
15. Handle end-of-workout state

### Phase 5: Bottom Bar
16. Implement sticky positioning
17. Add share functionality (Web Share API)
18. Implement sound toggle with localStorage
19. Add sound beep on timer completion

### Phase 6: Integration
20. Add "Start Workout" buttons to workout cards in [`workouts.html`](workouts.html:1)
21. Update menu to include Workout Mode option
22. Test with various workout structures
23. Ensure mobile responsiveness

## Styling Guidelines

### Color Scheme
- Use existing Ghost Gym theme variables
- Timer states:
  - Ready: Primary color
  - Counting: Success color (green)
  - Paused: Warning color (yellow)
  - Done: Success color with checkmark

### Typography
- Workout title: Large, bold, centered
- Exercise names: Medium, semi-bold
- Sets/reps: Large, prominent in expanded view
- Alternate exercises: Smaller, muted

### Spacing
- Cards: 1rem gap between cards
- Expanded card: Generous padding (1.5rem)
- Timer: Prominent, centered in card
- Bottom bar: Fixed height (60px)

### Animations
- Card expansion: Smooth height transition (300ms)
- Timer countdown: Subtle pulse on last 10 seconds
- Button interactions: Standard hover/active states

## Mobile Optimization

### Touch Targets
- All buttons minimum 44×44px
- Card tap area: Full card width
- Adequate spacing between interactive elements

### Viewport
- No horizontal scroll
- Cards full width with padding
- Bottom bar always visible
- Menu button easily accessible

### Performance
- Lazy load exercise data
- Efficient timer updates (1 second intervals)
- Minimal DOM manipulation
- Smooth scrolling with CSS

## Bonus Exercises Handling

Bonus exercises appear at the end of the workout with:
- Visual distinction (badge or different card color)
- Same card structure as regular exercises
- Same timer functionality
- Labeled as "Bonus" in card header

Example:
```
🎁 BONUS: Face Pulls • 2×15 • Rest: 30s
```

## Error Handling

### No Workout Selected
- Redirect to workout selection page
- Show error message

### Invalid Workout ID
- Show "Workout not found" message
- Provide link back to workouts list

### Empty Workout
- Show "No exercises in this workout"
- Provide edit workout link

## Future Enhancements

1. **Progress Tracking**: Mark completed sets
2. **Workout History**: Save completed workouts
3. **Custom Rest Times**: Override per exercise
4. **Video Links**: Add exercise demonstration videos
5. **Notes**: Add per-set notes during workout
6. **Timer Presets**: Quick rest time adjustments
7. **Background Music**: Integrate music player
8. **Voice Announcements**: Text-to-speech for exercises

## Testing Checklist

- [ ] Load workout by ID from URL
- [ ] Display all exercise groups correctly
- [ ] Display alternate exercises (b, c)
- [ ] Card expand/collapse works
- [ ] Auto-scroll on card expansion
- [ ] Timer starts and counts down
- [ ] Timer pause/resume works
- [ ] Timer reset works
- [ ] Timer completion triggers beep (if enabled)
- [ ] Next Exercise button opens next card
- [ ] Last exercise handles end-of-workout
- [ ] Bonus exercises display with badge
- [ ] Change workout link navigates correctly
- [ ] Share button works
- [ ] Sound toggle persists
- [ ] Mobile responsive layout
- [ ] Touch targets adequate size
- [ ] No horizontal scroll on mobile
- [ ] Bottom bar stays fixed

## Dependencies

### Existing
- Bootstrap 5 (UI framework)
- Boxicons (icons)
- Firebase/DataManager (workout data)
- Menu template system

### New
- Web Audio API (for timer beep)
- Web Share API (for share functionality)
- localStorage (for sound preference)

## Integration Points

### Workout Builder ([`workouts.html`](workouts.html:1))
Add "Start Workout" button to workout cards:
```javascript
function startWorkout(workoutId) {
  window.location.href = `workout-mode.html?id=${workoutId}`;
}
```

### Menu ([`menu-template.js`](frontend/assets/js/components/menu-template.js:1))
Add Workout Mode menu item:
```html
<li class="menu-item ${activePage === 'workout-mode' ? 'active' : ''}">
  <a href="workout-mode.html" class="menu-link">
    <i class="menu-icon tf-icons bx bx-play-circle"></i>
    <div class="text-truncate">Workout Mode</div>
  </a>
</li>
```

### Data Manager
Use existing workout loading:
```javascript
const workoutId = new URLSearchParams(window.location.search).get('id');
const workout = await window.dataManager.getWorkout(workoutId);
```

---

**Ready for implementation!** This architecture provides a complete blueprint for building the Workout Mode feature with all specified requirements.