# Bonus Exercise Pre-Workout Disappearing Issue - Complete Analysis

## The Real Problem

When a user adds a bonus exercise BEFORE starting the workout, it disappears when they click "Start Workout" and re-render happens.

## Root Cause Identified

Looking at [`startNewSession()`](frontend/assets/js/controllers/workout-mode-controller.js:823-859):

```javascript
async startNewSession() {
    // 1. Start session (line 826-830)
    await this.sessionService.startSession(
        this.currentWorkout.id,
        this.currentWorkout.name,
        this.currentWorkout
    );
    
    // 2. Transfer pre-workout bonuses (line 833)
    this.sessionService.transferPreWorkoutBonusToSession();
    
    // 3. Fetch history (line 836)
    await this.sessionService.fetchExerciseHistory(this.currentWorkout.id);
    
    // 4. Update UI (line 839)
    this.updateSessionUI(true);
    
    // 5. RE-RENDER (line 842) ⚠️ THE PROBLEM
    this.renderWorkout();
}
```

The issue is in [`renderWorkout()`](frontend/assets/js/controllers/workout-mode-controller.js:316-361):

```javascript
renderWorkout() {
    const container = document.getElementById('exerciseCardsContainer');
    if (!container) return;
    
    // Calculate total cards (line 324)
    const regularCount = this.currentWorkout.exercise_groups?.length || 0;
    const bonusExercises = this.sessionService.getBonusExercises();  // Line 325
    const bonusCount = bonusExercises?.length || 0;
    const totalCards = regularCount + bonusCount;
    
    // ... render regular exercises ...
    
    // Render bonus exercises (line 337-352)
    if (bonusExercises && bonusExercises.length > 0) {
        bonusExercises.forEach((bonus) => {
            // ... render bonus cards ...
        });
    }
}
```

## The Issue with `getBonusExercises()`

Looking at [`getBonusExercises()`](frontend/assets/js/services/workout-session-service.js:564-581):

```javascript
getBonusExercises() {
    // If no active session, return pre-workout list
    if (!this.currentSession) {
        return this.preWorkoutBonusExercises;
    }
    
    // Active session - return from session exercises
    if (!this.currentSession.exercises) {
        return [];
    }
    
    return Object.entries(this.currentSession.exercises)
        .filter(([name, data]) => data.is_bonus)
        .map(([name, data]) => ({
            name: name,
            ...data
        }));
}
```

## The Race Condition

**The Problem Flow:**

1. User adds bonus exercise → stored in `preWorkoutBonusExercises[]` ✅
2. User clicks "Start Workout"
3. `startSession()` is called → creates `currentSession` object ✅
4. `transferPreWorkoutBonusToSession()` is called → should transfer bonuses ✅
5. **BUT** `renderWorkout()` is called immediately after
6. `getBonusExercises()` checks `if (!this.currentSession)` → **session EXISTS now**
7. So it looks in `this.currentSession.exercises` for bonus exercises
8. **THE PROBLEM**: The transfer added exercises with `is_bonus: true`, BUT they might be using different property names or structure than what the render expects

## Verification Needed

Let me check what `transferPreWorkoutBonusToSession()` actually does:

From [`transferPreWorkoutBonusToSession()`](frontend/assets/js/services/workout-session-service.js:599-645):

```javascript
this.preWorkoutBonusExercises.forEach((bonus, index) => {
    console.log(`  ${index + 1}. Transferring: ${bonus.name}`);
    this.addBonusExercise(bonus);  // ⚠️ Calls addBonusExercise
    transferredCount++;
});
```

And [`addBonusExercise()`](frontend/assets/js/services/workout-session-service.js:494-548) adds to `currentSession.exercises`:

```javascript
this.currentSession.exercises[name] = bonusExercise;
```

So the transfer SHOULD work...

## The REAL Problem

I found it! Look at [`renderWorkout()`](frontend/assets/js/controllers/workout-mode-controller.js:337-352):

```javascript
if (bonusExercises && bonusExercises.length > 0) {
    bonusExercises.forEach((bonus) => {
        const bonusGroup = {
            exercises: { a: bonus.name },
            sets: bonus.sets,
            reps: bonus.reps,
            rest: bonus.rest || '60s',
            default_weight: bonus.weight,
            default_weight_unit: bonus.weight_unit || 'lbs',
            notes: bonus.notes
        };
        html += this.cardRenderer.renderCard(bonusGroup, exerciseIndex, true, totalCards);
        exerciseIndex++;
    });
}
```

It expects:
- `bonus.sets`
- `bonus.reps`
- `bonus.rest`
- `bonus.weight`
- `bonus.weight_unit`
- `bonus.notes`

But `getBonusExercises()` returns objects with properties from `currentSession.exercises`, which has:
- `target_sets` (NOT `sets`)
- `target_reps` (NOT `reps`)
- `weight`
- `weight_unit`

**MISMATCH!** The render code expects one property name format, but the session data uses a different format!

## The Fix

We need to normalize the property names in `getBonusExercises()` OR update the render code to handle both formats.

The best fix is in `getBonusExercises()` to normalize the output format for consistency.