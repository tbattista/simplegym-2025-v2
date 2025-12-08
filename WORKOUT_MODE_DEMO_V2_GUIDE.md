# Workout Mode Demo V2 - User Guide

## Overview

The Workout Mode Demo V2 is a clean, fully functional demonstration of the workout mode features in Ghost Gym. It showcases the key functionality without the complexity of the full workout mode implementation.

**URL:** `/workout-mode-demo-v2` or `/workout-mode-demo-v2.html`

## Features Demonstrated

### 1. **Exercise Cards** 
- 4 sample exercises with collapsible/expandable functionality
- Weight progression indicators (↑ increased, ↓ decreased, → same, ★ new)
- Colored weight badges showing progression status
- Click card header to expand/collapse

### 2. **Bottom Action Bar** (4 Buttons)
- **Add Exercise** - Placeholder for adding exercises
- **Note** - Placeholder for adding workout notes
- **Skip** - Skip the currently expanded exercise
- **More** - Additional options placeholder

### 3. **Global Rest Timer** (Floating Button)
Located next to the workout timer when active, this morphing button provides:
- **Ready State**: Green "Rest" button to start timer
- **Counting State**: Countdown display with pause button
- **Paused State**: Displays time with Reset/Resume buttons
- **Done State**: "Done!" button with checkmark

### 4. **Floating Workout Timer**
- Displays total workout time
- Shows in top-right corner during active workout
- Updates every second

### 5. **Per-Exercise Rest Timers**
Each exercise card includes:
- Start rest timer button with preset duration
- Countdown display when active
- Pause and Stop controls

## How to Use the Demo

### Starting a Workout

1. **Click "Start Workout"** - The green floating button at the bottom
2. First exercise card automatically expands
3. Workout timer starts counting
4. Bottom action bar buttons become active
5. Global rest timer button appears

### Using Exercise Cards

1. **Expand/Collapse**: Click the card header
2. **View Details**: See exercise notes and last weight used
3. **Start Rest Timer**: Click the "Start {time}s" button
4. **Mark Complete**: Click "Next" to move to next exercise
5. **Edit Weight**: Click "Weight" button to change the weight

### Using the Global Rest Timer

1. **Start Timer**: Click the green "Rest" button
   - Uses rest time from currently expanded exercise
   - Default is 3 minutes if no exercise is expanded
   
2. **While Counting**:
   - Countdown displays current time
   - Last 5 seconds turn red
   - Click pause icon to pause
   
3. **While Paused**:
   - Shows "Reset" and "Resume" buttons
   - Click Reset to return to ready state
   - Click Resume to continue countdown
   
4. **When Complete**:
   - Shows "Done!" with checkmark
   - Notification appears
   - Auto-resets after 3 seconds

### Ending a Workout

1. Click the red "End" button next to the workout timer
2. Confirm the action
3. All timers stop
4. Returns to pre-workout state

## Weight Progression Indicators

The demo shows 4 different progression states:

| Indicator | Color | Meaning | Example |
|-----------|-------|---------|---------|
| ↑ | Green | Weight increased | 185 lbs (was 180 lbs) |
| ↓ | Red | Weight decreased | 50 lbs (was 55 lbs) |
| → | Gray | Same weight | 95 lbs (was 95 lbs) |
| ★ | Blue | New exercise | 20 lbs (first time) |

## Demo Workout Data

### Push Day Workout
1. **Bench Press**: 4 sets × 8-10 reps @ 185 lbs (↑)
2. **Overhead Press**: 3 sets × 10-12 reps @ 95 lbs (→)
3. **Incline Dumbbell Press**: 3 sets × 12-15 reps @ 50 lbs (↓)
4. **Lateral Raises**: 3 sets × 15-20 reps @ 20 lbs (★)

## Technical Implementation

### Structure
- **Single HTML file** with inline JavaScript
- **Uses existing CSS** from workout-mode.css and bottom-action-bar.css
- **No external dependencies** beyond Bootstrap and Boxicons
- **Fully self-contained** - no Firebase or backend data required

### Key Files
- `frontend/workout-mode-demo-v2.html` - Main demo page
- `backend/main.py` - Backend route (lines 168-180)
- `frontend/assets/css/workout-mode.css` - Exercise card styles
- `frontend/assets/css/bottom-action-bar.css` - Action bar and timer styles

### JavaScript Functions

#### State Management
```javascript
workoutState = {
    isActive: boolean,
    startTime: timestamp,
    currentExerciseIndex: number,
    expandedCardIndex: number,
    restTimers: object,
    workoutTimer: interval,
    globalRestTimer: {
        state: string,
        interval: interval,
        remainingSeconds: number,
        totalSeconds: number
    }
}
```

#### Main Functions
- `startWorkout()` - Initialize workout session
- `endWorkout()` - End workout and cleanup
- `toggleCard(index)` - Expand/collapse exercise cards
- `startRestTimer(index, duration)` - Start per-exercise timer
- `nextExercise(index)` - Complete exercise and move to next

#### Global Rest Timer Functions
- `startGlobalRestTimer()` - Start the global rest timer
- `pauseGlobalRestTimer()` - Pause the countdown
- `resumeGlobalRestTimer()` - Resume from pause
- `resetGlobalRestTimer()` - Reset to ready state
- `completeGlobalRestTimer()` - Handle timer completion
- `renderGlobalRestTimer()` - Update UI based on state

## Testing the Demo

### Basic Functionality Tests
1. ✅ Start workout → Timer starts, UI updates
2. ✅ Expand/collapse cards → Smooth transitions
3. ✅ Start per-exercise timer → Countdown works
4. ✅ Start global rest timer → Morphing UI works
5. ✅ Pause/resume global timer → State changes correctly
6. ✅ Complete exercise → Moves to next
7. ✅ Skip exercise → Shows notification
8. ✅ End workout → Cleanup works

### Edge Cases to Test
- Click Start Workout twice
- Expand multiple cards rapidly
- Start multiple rest timers
- End workout with timers running
- Pause and never resume
- Let timer count to zero

## Differences from Full Workout Mode

### Simplified Features
- No Firebase integration
- No data persistence
- No weight logging to database
- No bonus exercises
- No workout history
- No sharing functionality
- No offline support

### Demonstration Only
- Static workout data (hardcoded)
- Toast notifications instead of full modals
- No actual weight saving
- No exercise editing
- Simplified error handling

## Future Enhancements

Potential improvements for the demo:
1. Add localStorage to persist demo state
2. Include multiple workout examples
3. Add sound effects for timer completion
4. Show more exercise variations
5. Add dark mode toggle
6. Include exercise GIFs/videos
7. Add workout summary screen

## Troubleshooting

### Timer Not Starting
- Check browser console for JavaScript errors
- Ensure Bootstrap and Boxicons are loaded
- Verify CSS files are loading correctly

### Cards Not Expanding
- Check if JavaScript is loaded
- Verify click event listeners are attached
- Look for console errors

### Styling Issues
- Clear browser cache
- Check CSS file paths
- Verify version numbers in links

## Related Documentation

- [WORKOUT_MODE_DEMO_GUIDE.md](./WORKOUT_MODE_DEMO_GUIDE.md) - Original demo (V1)
- [BOTTOM_ACTION_BAR_IMPLEMENTATION.md](./BOTTOM_ACTION_BAR_IMPLEMENTATION.md) - Action bar details
- [WORKOUT_MODE_REFACTORING_COMPLETE.md](./WORKOUT_MODE_REFACTORING_COMPLETE.md) - Full implementation

## Support

For issues or questions about the demo:
1. Check the browser console for errors
2. Review this guide for expected behavior
3. Compare with the full workout mode implementation
4. Check CSS and JavaScript file loading

---

**Last Updated:** 2025-12-08  
**Version:** 2.0.0  
**Status:** ✅ Complete and functional