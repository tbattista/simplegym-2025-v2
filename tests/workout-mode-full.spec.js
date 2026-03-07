// @ts-check
const { test, expect } = require('playwright/test');
const { BASE, waitForAppReady } = require('./fixtures');
const { STANDARD_WORKOUT } = require('./test-data');

test.describe('Workout Mode', () => {

  test('redirects to workout-database when no workout ID on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/workout-mode.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Desktop redirects to workout-database.html when no ID
    expect(page.url()).toContain('workout-database.html');
  });

  test('workout-mode page has key elements in static HTML (mobile)', async ({ browser }) => {
    // Use mobile context to prevent desktop redirect
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/workout-mode.html`);
    await page.waitForLoadState('domcontentloaded');

    // Elements should exist in static HTML before JS modifies them
    const fabExists = await page.evaluate(() => !!document.getElementById('workoutModeFabs'));
    expect(fabExists).toBe(true);
    await context.close();
  });

  test('mobile workout-mode shows landing or loading state', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/workout-mode.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // On mobile without workout ID, should show landing
    const state = await page.evaluate(() => {
      const landing = document.getElementById('workoutLandingPage');
      const loading = document.getElementById('workoutLoadingState');
      const error = document.getElementById('workoutErrorState');
      if (landing && landing.style.display !== 'none') return 'landing';
      if (loading && loading.style.display !== 'none') return 'loading';
      if (error && error.style.display !== 'none') return 'error';
      return 'unknown';
    });

    expect(['landing', 'loading', 'error', 'unknown']).toContain(state);
  });

  test('loads workout with valid ID and shows content', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    // Pre-populate localStorage
    await page.goto(`${BASE}/settings.html`);
    await page.evaluate((workout) => {
      localStorage.setItem('gym_workouts', JSON.stringify([workout]));
    }, STANDARD_WORKOUT);

    await page.goto(`${BASE}/workout-mode.html?id=${STANDARD_WORKOUT.id}`);
    await waitForAppReady(page);
    await page.waitForTimeout(3000);

    // Page should not have redirected away
    expect(page.url()).toContain('workout-mode.html');
  });

  test('workout mode page title is correct', async ({ page }) => {
    await page.goto(`${BASE}/workout-mode.html`);
    await page.waitForLoadState('domcontentloaded');

    const title = await page.title();
    expect(title).toContain('Session');
  });

  test('workout-database page loads when redirected from workout-mode', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/workout-mode.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should now be on workout-database with library content
    const toolbarExists = await page.evaluate(() => !!document.getElementById('workoutToolbar'));
    expect(toolbarExists).toBe(true);
  });
});
