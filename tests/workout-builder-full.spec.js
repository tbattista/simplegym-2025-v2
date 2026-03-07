// @ts-check
const { test, expect } = require('playwright/test');
const { BASE, waitForAppReady } = require('./fixtures');

test.describe('Workout Builder', () => {

  test('builder page loads and shows content', async ({ page }) => {
    await page.goto(`${BASE}/workout-builder.html`);
    await waitForAppReady(page);

    // Page should have loaded — layout is present
    const layoutPage = page.locator('.layout-page');
    await expect(layoutPage).toBeAttached({ timeout: 10000 });
  });

  test('desktop Start Workout button exists', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/workout-builder.html`);
    await waitForAppReady(page);

    const startBtn = page.locator('#desktopStartWorkoutBtn');
    await expect(startBtn).toBeAttached();
  });

  test('builder has sidebar navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/workout-builder.html`);
    await waitForAppReady(page);

    const menu = page.locator('#layout-menu');
    await expect(menu).toBeAttached();
  });

  test('offcanvas elements are created dynamically after init', async ({ page }) => {
    await page.goto(`${BASE}/workout-builder.html`);
    await waitForAppReady(page);
    await page.waitForTimeout(2000);

    // Offcanvas elements are created by UnifiedOffcanvasFactory — check the factory loaded
    const hasFactory = await page.evaluate(() => !!window.UnifiedOffcanvasFactory);
    expect(hasFactory).toBe(true);
  });

  test('Start Workout button triggers navigation with workout ID', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    let navigatedUrl = null;
    await page.route('**/workout-mode.html**', route => {
      navigatedUrl = route.request().url();
      route.fulfill({ status: 200, body: '<html><body>Workout Mode</body></html>' });
    });

    await page.goto(`${BASE}/workout-builder.html`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      window.ffn = window.ffn || {};
      window.ffn.workoutBuilder = window.ffn.workoutBuilder || {};
      window.ffn.workoutBuilder.selectedWorkoutId = 'test-workout-123';
      document.getElementById('desktopStartWorkoutBtn')?.click();
    });

    await page.waitForTimeout(500);
    expect(navigatedUrl).toContain('workout-mode.html?id=test-workout-123');
  });
});
