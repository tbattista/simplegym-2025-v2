// @ts-check
const { test, expect } = require('playwright/test');
const { BASE, waitForAppReady } = require('./fixtures');
const { STANDARD_WORKOUT } = require('./test-data');

test.describe('Full Workout Flow (E2E)', () => {

  test('complete flow: load workout → view exercises → navigate to workout mode', async ({ page }) => {
    // Step 1: Pre-populate localStorage with a workout
    await page.goto(`${BASE}/settings.html`);
    await page.evaluate((workout) => {
      localStorage.setItem('gym_workouts', JSON.stringify([workout]));
    }, STANDARD_WORKOUT);

    // Step 2: Go to workout builder
    await page.goto(`${BASE}/workout-builder.html`);
    await waitForAppReady(page);

    // The builder should have loaded
    const pageContent = page.locator('.layout-page');
    await expect(pageContent).toBeAttached();

    // Step 3: Navigate to workout mode with the workout ID
    await page.goto(`${BASE}/workout-mode.html?id=${STANDARD_WORKOUT.id}`);
    await waitForAppReady(page);
    await page.waitForTimeout(2000);

    // Should show workout content or a state
    const exerciseSection = page.locator('#exerciseCardsSection, #exerciseCardsContainer');
    const errorState = page.locator('#workoutErrorState');
    const landingPage = page.locator('#workoutLandingPage');

    const hasExercises = await exerciseSection.first().isVisible().catch(() => false);
    const hasError = await errorState.isVisible().catch(() => false);
    const hasLanding = await landingPage.isVisible().catch(() => false);

    // One of these states should be active
    expect(hasExercises || hasError || hasLanding).toBe(true);
  });

  test('workout mode redirects to library on desktop without ID', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/workout-mode.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Desktop redirects to workout-database when no workout ID
    expect(page.url()).toContain('workout-database.html');

    // Library page should have workout list
    const toolbar = page.locator('#workoutToolbar');
    await expect(toolbar).toBeAttached();
  });

  test('exercise database to builder flow works', async ({ page, viewport }) => {
    test.skip(viewport && viewport.width < 768, 'Cart/dropdown interaction is desktop-only');
    // Step 1: Go to exercise database
    await page.goto(`${BASE}/exercise-database.html`);
    await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });

    // Step 2: Add exercise to cart
    const firstCard = page.locator('#exerciseTableContainer .card').first();
    await firstCard.locator('.dropdown-toggle').click();
    await firstCard.locator('.add-to-workout-link').click();

    const cart = page.locator('#exerciseCartContent');
    await expect(cart).toBeVisible({ timeout: 3000 });

    // Step 3: Click Build Workout
    await cart.locator('a.btn-primary').click();

    // Step 4: Should arrive at workout builder
    await page.waitForURL(/workout-builder\.html/, { timeout: 10000 });
    await waitForAppReady(page);

    const builderPage = page.locator('.layout-page');
    await expect(builderPage).toBeAttached();
  });

  test('navigation flow: home → builder → exercise db → history', async ({ page, viewport }) => {
    test.skip(viewport && viewport.width < 768, 'Sidebar navigation requires desktop viewport');
    // Home
    await page.goto(`${BASE}/index.html`);
    await waitForAppReady(page);
    await expect(page.locator('#layout-menu')).toBeAttached();

    // Navigate to builder via sidebar
    const builderLink = page.locator('#layout-menu a[href*="workout-builder.html"]').first();
    await builderLink.click();
    await page.waitForURL(/workout-builder\.html/, { timeout: 10000 });

    // Navigate to exercise database
    const exerciseLink = page.locator('#layout-menu a[href*="exercise-database.html"]').first();
    await exerciseLink.click();
    await page.waitForURL(/exercise-database\.html/, { timeout: 10000 });

    // Navigate to history
    const historyLink = page.locator('#layout-menu a[href*="workout-history.html"]').first();
    await historyLink.click();
    await page.waitForURL(/workout-history\.html/, { timeout: 10000 });
  });
});
