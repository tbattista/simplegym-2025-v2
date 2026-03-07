// @ts-check
const { test, expect } = require('playwright/test');

const BASE = 'http://localhost:8001';

test('desktop builder page has a Start Workout button', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE}/workout-builder.html`);

  const startBtn = page.locator('#desktopStartWorkoutBtn');
  await expect(startBtn).toBeAttached();
  await expect(startBtn).toHaveText(/Start/);
});

test('Start Workout button triggers navigation to workout mode', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });

  // Intercept navigation to workout-mode.html
  let navigatedUrl = null;
  await page.route('**/workout-mode.html**', route => {
    navigatedUrl = route.request().url();
    route.fulfill({ status: 200, body: '<html><body>Workout Mode</body></html>' });
  });

  await page.goto(`${BASE}/workout-builder.html`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // Set up mock workout ID, show the form, then click the button
  await page.evaluate(() => {
    window.ffn = window.ffn || {};
    window.ffn.workoutBuilder = window.ffn.workoutBuilder || {};
    window.ffn.workoutBuilder.selectedWorkoutId = 'test-workout-123';
    document.getElementById('desktopStartWorkoutBtn')?.click();
  });

  await page.waitForTimeout(500);
  expect(navigatedUrl).toContain('workout-mode.html?id=test-workout-123');
});
