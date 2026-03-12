// @ts-check
const { test, expect } = require('playwright/test');
const { BASE, waitForAppReady } = require('./fixtures');
const { STANDARD_WORKOUT } = require('./test-data');

/**
 * Helper: load workout mode page with workout data
 */
async function loadWorkoutMode(page) {
  await page.setViewportSize({ width: 375, height: 812 });

  // Pre-populate localStorage with a workout
  await page.goto(`${BASE}/settings.html`);
  await page.evaluate((workout) => {
    localStorage.setItem('gym_workouts', JSON.stringify([workout]));
  }, STANDARD_WORKOUT);

  // Navigate to workout mode
  await page.goto(`${BASE}/workout-mode.html?id=${STANDARD_WORKOUT.id}`);
  await waitForAppReady(page);
  await page.waitForTimeout(3000);
}

test.describe('Exercise Notes Persistence', () => {

  test('updateExerciseNotes method exists on session service', async ({ page }) => {
    await loadWorkoutMode(page);

    const hasMethod = await page.evaluate(() => {
      const sessionService = window.workoutModeController?.sessionService;
      return typeof sessionService?.updateExerciseNotes === 'function';
    });
    expect(hasMethod).toBe(true);

    const hasPreMethod = await page.evaluate(() => {
      const sessionService = window.workoutModeController?.sessionService;
      return typeof sessionService?.updatePreSessionNotes === 'function';
    });
    expect(hasPreMethod).toBe(true);
  });

  test('exercise note is saved to session state and persisted', async ({ page }) => {
    await loadWorkoutMode(page);

    const noteText = 'Felt strong today, increase weight next time';
    const result = await page.evaluate((note) => {
      const controller = window.workoutModeController;
      const sessionService = controller?.sessionService;
      if (!sessionService) return { error: 'no sessionService' };

      // Manually create a session (starting a real session requires API call)
      sessionService.currentSession = {
        id: 'test-session-notes',
        workoutId: 'test-workout-standard',
        workoutName: 'Test Push Day',
        startedAt: new Date(),
        status: 'in_progress',
        sessionMode: 'timed',
        exercises: {}
      };

      // Save note for exercise
      sessionService.updateExerciseNotes('Barbell Bench Press', note);

      // Verify stored in session state
      const exerciseData = sessionService.currentSession.exercises['Barbell Bench Press'];
      return { notes: exerciseData?.notes, saved: exerciseData?.notes === note };
    }, noteText);

    expect(result.error).toBeUndefined();
    expect(result.saved).toBe(true);

    // Verify note persists in localStorage
    const persistedNote = await page.evaluate(() => {
      const stored = localStorage.getItem('ffn_active_workout_session');
      if (!stored) return null;
      const session = JSON.parse(stored);
      return session.exercises?.['Barbell Bench Press']?.notes;
    });

    expect(persistedNote).toBe(noteText);
  });

  test('exercise note is included in collected exercise data payload', async ({ page }) => {
    await loadWorkoutMode(page);

    const noteIncluded = await page.evaluate(() => {
      const controller = window.workoutModeController;
      const sessionService = controller?.sessionService;
      if (!sessionService) return 'no sessionService';

      // Set up session with a note
      sessionService.currentSession = {
        id: 'test-session-notes-2',
        workoutId: 'test-workout-standard',
        workoutName: 'Test Push Day',
        startedAt: new Date(),
        status: 'in_progress',
        sessionMode: 'timed',
        exercises: {}
      };

      sessionService.updateExerciseNotes('Barbell Bench Press', 'Test note for collection');

      // Collect exercise data (same path as session completion)
      const dataManager = controller?.workoutDataManager;
      if (!dataManager) return 'no dataManager';

      const workout = JSON.parse(localStorage.getItem('gym_workouts') || '[]')[0];
      if (!workout) return 'no workout';

      const exercisesPerformed = dataManager.collectExerciseData(workout);
      const benchData = exercisesPerformed.find(e => e.exercise_name === 'Barbell Bench Press');
      return benchData?.notes;
    });

    expect(noteIncluded).toBe('Test note for collection');
  });
});
