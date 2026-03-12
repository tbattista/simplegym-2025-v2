// @ts-check
const { test, expect } = require('playwright/test');
const { BASE, waitForAppReady } = require('./fixtures');
const { CARDIO_WORKOUT } = require('./test-data');

/**
 * Helper: load workout mode with cardio workout
 */
async function loadCardioWorkout(page) {
  await page.setViewportSize({ width: 375, height: 812 });

  await page.goto(`${BASE}/settings.html`);
  await page.evaluate((workout) => {
    localStorage.setItem('gym_workouts', JSON.stringify([workout]));
  }, CARDIO_WORKOUT);

  await page.goto(`${BASE}/workout-mode.html?id=${CARDIO_WORKOUT.id}`);
  await waitForAppReady(page);
  await page.waitForTimeout(3000);
}

test.describe('Cardio Card Completion Button', () => {

  test('cardio card renders a Mark Done button during active session', async ({ page }) => {
    await loadCardioWorkout(page);

    // Simulate an active session so the button renders
    await page.evaluate(() => {
      const sessionService = window.workoutModeController?.sessionService;
      if (!sessionService) return;

      sessionService.currentSession = {
        id: 'test-cardio-session',
        workoutId: 'test-workout-cardio',
        workoutName: 'Test Cardio Session',
        startedAt: new Date(),
        status: 'in_progress',
        sessionMode: 'timed',
        exercises: {}
      };

      // Re-render to pick up session state
      window.workoutModeController?.renderWorkout?.(true);
    });
    await page.waitForTimeout(500);

    // Check that a Mark Done button exists on the cardio card
    const cardioCard = page.locator('.workout-card[data-card-type="cardio"]');
    await expect(cardioCard).toBeVisible();

    const markDoneBtn = cardioCard.locator('.workout-primary-action.save');
    await expect(markDoneBtn).toBeVisible();
    await expect(markDoneBtn).toContainText('Mark Done');
  });

  test('cardio card shows Completed state after marking done', async ({ page }) => {
    await loadCardioWorkout(page);

    // Set up active session and mark exercise as completed
    await page.evaluate(() => {
      const sessionService = window.workoutModeController?.sessionService;
      if (!sessionService) return;

      sessionService.currentSession = {
        id: 'test-cardio-session-2',
        workoutId: 'test-workout-cardio',
        workoutName: 'Test Cardio Session',
        startedAt: new Date(),
        status: 'in_progress',
        sessionMode: 'timed',
        exercises: {
          'Running': { is_completed: true, completed_at: new Date().toISOString() }
        }
      };

      window.workoutModeController?.renderWorkout?.(true);
    });
    await page.waitForTimeout(500);

    const cardioCard = page.locator('.workout-card[data-card-type="cardio"]');
    const completedBtn = cardioCard.locator('.workout-primary-action.completed');
    await expect(completedBtn).toBeVisible();
    await expect(completedBtn).toContainText('Completed');
  });

  test('cardio card has no completion button before session starts', async ({ page }) => {
    await loadCardioWorkout(page);

    // No session started — should have no button
    const cardioCard = page.locator('.workout-card[data-card-type="cardio"]');
    await expect(cardioCard).toBeVisible();

    const actionBtn = cardioCard.locator('.workout-primary-action');
    await expect(actionBtn).toHaveCount(0);
  });
});
