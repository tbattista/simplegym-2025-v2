# Workout Mode - User Flow & Component Diagram

## User Flow Diagram

```mermaid
graph TD
    A[Workout Builder Page] -->|Click 'Start Workout'| B[Workout Mode Page]
    B --> C{Load Workout Data}
    C -->|Success| D[Display Exercise Cards]
    C -->|Error| E[Show Error Message]
    E --> A
    
    D --> F[User Taps Card]
    F --> G[Card Expands]
    G --> H[Show Rest Timer]
    G --> I[Show Next Exercise Button]
    
    H --> J{Timer State}
    J -->|Ready| K[Click 'Start Rest']
    J -->|Counting| L[Click 'Pause' or 'Reset']
    J -->|Paused| M[Click 'Resume' or 'Reset']
    J -->|Done| N[Click 'Start Again']
    
    K --> O[Timer Counts Down]
    O -->|Reaches 0| P[Play Beep if Sound On]
    P --> J
    
    I --> Q[Click 'Next Exercise']
    Q --> R[Close Current Card]
    R --> S[Open Next Card]
    S --> G
    
    D --> T[Click 'Change Workout']
    T --> A
    
    D --> U[Click 'Share']
    U --> V[Open Share Dialog]
    
    D --> W[Toggle Sound]
    W --> X[Save to localStorage]
```

## Page Layout Structure

```
┌─────────────────────────────────────────┐
│  ☰                                      │  ← Menu Button (top left)
│           Back & Biceps                 │  ← Workout Title (centered)
│         Change workout                  │  ← Link to workouts list
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Barbell Bench Press • 3×8-12 •    │ │  ← Collapsed Card
│  │ Rest: 60s                         │ │
│  │ Alt1: Dumbbell Bench Press        │ │
│  │ Alt2: Machine Chest Press         │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Barbell Row • 3×8-12 • Rest: 60s  │ │  ← Collapsed Card
│  │ Alt1: Dumbbell Row                │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Pull-ups • 3×AMRAP • Rest: 90s    │ │  ← Expanded Card
│  │                                   │ │
│  │  Sets: 3 × AMRAP                  │ │
│  │                                   │ │
│  │  Notes: Use assistance if needed  │ │
│  │  Target: Back | Equipment: Bar    │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │      Rest: 90s              │ │ │  ← Rest Timer (Ready)
│  │  │   [Start Rest]              │ │ │
│  │  └─────────────────────────────┘ │ │
│  │                                   │ │
│  │  [Next Exercise →]                │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🎁 BONUS: Face Pulls • 2×15 •     │ │  ← Bonus Exercise
│  │ Rest: 30s                         │ │
│  └───────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│  [📤 Share]          [🔊 Sound: On]    │  ← Sticky Bottom Bar
└─────────────────────────────────────────┘
```

## Rest Timer State Transitions

```mermaid
stateDiagram-v2
    [*] --> Ready: Component Loads
    Ready --> Counting: Click "Start Rest"
    Counting --> Paused: Click "Pause"
    Counting --> Done: Timer Reaches 0
    Counting --> Ready: Click "Reset"
    Paused --> Counting: Click "Resume"
    Paused --> Ready: Click "Reset"
    Done --> Ready: Click "Start Again"
    Done --> [*]: User Closes Card
```

## Component Hierarchy

```
WorkoutModePage
├── WorkoutHeader
│   ├── MenuButton
│   ├── WorkoutTitle
│   └── ChangeWorkoutLink
│
├── ExerciseCardsList
│   ├── ExerciseCard (Regular) × N
│   │   ├── CardHeader (collapsed view)
│   │   │   ├── ExerciseName
│   │   │   ├── SetsRepsRest
│   │   │   └── AlternateExercises
│   │   │
│   │   └── CardBody (expanded view)
│   │       ├── ExerciseDetails
│   │       ├── SetsRepsDisplay
│   │       ├── Notes (optional)
│   │       ├── TargetEquipment (optional)
│   │       ├── RestTimer
│   │       │   ├── TimerDisplay
│   │       │   └── TimerControls
│   │       └── NextExerciseButton
│   │
│   └── ExerciseCard (Bonus) × N
│       └── [Same structure with bonus badge]
│
└── StickyBottomBar
    ├── ShareButton
    └── SoundToggle
```

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Page
    participant DataManager
    participant Timer
    participant LocalStorage
    
    User->>Page: Navigate to workout-mode.html?id=123
    Page->>DataManager: getWorkout(123)
    DataManager-->>Page: Workout Data
    Page->>Page: Render Exercise Cards
    
    User->>Page: Tap Exercise Card
    Page->>Page: Expand Card & Auto-scroll
    
    User->>Timer: Click "Start Rest"
    Timer->>Timer: Begin Countdown
    Timer->>Page: Update Display (every 1s)
    Timer->>LocalStorage: Check Sound Preference
    LocalStorage-->>Timer: Sound Enabled
    Timer->>Timer: Play Beep (when done)
    
    User->>Page: Click "Next Exercise"
    Page->>Page: Close Current Card
    Page->>Page: Open Next Card
    Page->>Page: Auto-scroll to Card
    
    User->>Page: Toggle Sound
    Page->>LocalStorage: Save Preference
    
    User->>Page: Click Share
    Page->>Page: Open Share Dialog
```

## Key Interactions

### 1. Card Expansion
```javascript
// When user taps a card
card.addEventListener('click', (e) => {
  if (!e.target.closest('.exercise-card-body')) {
    // Collapse all other cards
    collapseAllCards();
    // Expand this card
    expandCard(card);
    // Auto-scroll into view
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});
```

### 2. Timer Countdown
```javascript
// Timer update loop
setInterval(() => {
  if (state === 'counting') {
    remainingSeconds--;
    updateDisplay();
    
    if (remainingSeconds === 0) {
      state = 'done';
      if (soundEnabled) playBeep();
      updateDisplay();
    }
  }
}, 1000);
```

### 3. Next Exercise Navigation
```javascript
// Next exercise button
nextButton.addEventListener('click', () => {
  const currentIndex = getCurrentCardIndex();
  const nextIndex = currentIndex + 1;
  
  // Close current card
  collapseCard(currentIndex);
  
  // Open next card (if exists)
  if (nextIndex < totalCards) {
    expandCard(nextIndex);
    scrollToCard(nextIndex);
  } else {
    showWorkoutComplete();
  }
});
```

## Mobile Responsive Behavior

### Portrait Mode (< 768px)
- Full-width cards
- Stacked layout
- Large touch targets (44×44px minimum)
- Bottom bar fixed at bottom
- Menu button easily accessible

### Landscape Mode
- Slightly wider cards with max-width
- Same functionality
- Optimized spacing

## Accessibility Considerations

1. **Keyboard Navigation**
   - Tab through cards
   - Enter to expand/collapse
   - Space to start/pause timer

2. **Screen Readers**
   - Proper ARIA labels
   - Timer state announcements
   - Card expansion state

3. **Color Contrast**
   - WCAG AA compliant
   - Timer states distinguishable without color

4. **Focus Management**
   - Clear focus indicators
   - Focus moves to expanded card
   - Focus returns on collapse

## Performance Optimizations

1. **Lazy Rendering**
   - Only render visible cards initially
   - Load more as user scrolls

2. **Timer Efficiency**
   - Single interval per timer
   - Pause when card collapsed
   - Clear intervals on unmount

3. **Smooth Animations**
   - CSS transitions for card expansion
   - RequestAnimationFrame for smooth scrolling
   - Hardware-accelerated transforms

4. **Memory Management**
   - Clean up event listeners
   - Clear timer intervals
   - Remove unused DOM elements

---

This diagram provides a complete visual reference for implementing the Workout Mode feature!