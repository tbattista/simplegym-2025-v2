// @ts-check
const { test, expect } = require('playwright/test');
const { BASE, waitForAppReady } = require('./fixtures');

test.describe('Exercise Database', () => {

  test('exercise list loads with cards', async ({ page }) => {
    await page.goto(`${BASE}/exercise-database.html`);
    await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });

    const cards = page.locator('#exerciseTableContainer .card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('search input filters exercises by name', async ({ page }) => {
    await page.goto(`${BASE}/exercise-database.html`);
    await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });

    const searchInput = page.locator('#exerciseSearchInput');
    await expect(searchInput).toBeVisible();

    // Get initial count
    const initialCount = await page.locator('#exerciseTableContainer .card').count();

    // Search for a specific exercise
    await searchInput.fill('bench press');
    await page.waitForTimeout(500);

    const filteredCount = await page.locator('#exerciseTableContainer .card').count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test('exercise card has dropdown menu with Add to Workout option', async ({ page, viewport }) => {
    test.skip(viewport && viewport.width < 768, 'Cart interaction is desktop-only');
    await page.goto(`${BASE}/exercise-database.html`);
    await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });

    const firstCard = page.locator('#exerciseTableContainer .card').first();
    const menuBtn = firstCard.locator('.dropdown-toggle');
    await expect(menuBtn).toBeVisible();

    await menuBtn.click();
    const addLink = firstCard.locator('.add-to-workout-link');
    await expect(addLink).toBeVisible();
  });

  test('adding exercise shows cart panel with count', async ({ page, viewport }) => {
    test.skip(viewport && viewport.width < 768, 'Cart interaction is desktop-only');
    await page.goto(`${BASE}/exercise-database.html`);
    await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });

    const firstCard = page.locator('#exerciseTableContainer .card').first();
    await firstCard.locator('.dropdown-toggle').click();
    await firstCard.locator('.add-to-workout-link').click();

    const cart = page.locator('#exerciseCartContent');
    await expect(cart).toBeVisible({ timeout: 3000 });
    await expect(cart.locator('.exercise-cart-count')).toContainText('1 exercise');
  });

  test('cart chip removal returns to empty state', async ({ page, viewport }) => {
    test.skip(viewport && viewport.width < 768, 'Cart interaction is desktop-only');
    await page.goto(`${BASE}/exercise-database.html`);
    await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });

    // Add exercise
    const firstCard = page.locator('#exerciseTableContainer .card').first();
    await firstCard.locator('.dropdown-toggle').click();
    await firstCard.locator('.add-to-workout-link').click();

    const cart = page.locator('#exerciseCartContent');
    await expect(cart).toBeVisible();

    // Remove via chip
    await cart.locator('.exercise-cart-chip-remove').first().click();
    await expect(cart).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator('#exerciseCartEmpty')).toBeVisible();
  });

  test('cart clear button removes all exercises', async ({ page, viewport }) => {
    test.skip(viewport && viewport.width < 768, 'Cart interaction is desktop-only');
    await page.goto(`${BASE}/exercise-database.html`);
    await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });

    const cards = page.locator('#exerciseTableContainer .card');

    // Add two exercises
    await cards.nth(0).locator('.dropdown-toggle').click();
    await cards.nth(0).locator('.add-to-workout-link').click();
    await page.waitForTimeout(500);

    await cards.nth(1).locator('.dropdown-toggle').click();
    await cards.nth(1).locator('.add-to-workout-link').click();

    const cart = page.locator('#exerciseCartContent');
    await expect(cart.locator('.exercise-cart-count')).toContainText('2 exercises');

    // Clear all
    await cart.locator('.exercise-cart-clear').click();
    await expect(cart).not.toBeVisible({ timeout: 3000 });
  });

  test('Build Workout button navigates to builder', async ({ page, viewport }) => {
    test.skip(viewport && viewport.width < 768, 'Cart interaction is desktop-only');
    await page.goto(`${BASE}/exercise-database.html`);
    await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });

    const firstCard = page.locator('#exerciseTableContainer .card').first();
    await firstCard.locator('.dropdown-toggle').click();
    await firstCard.locator('.add-to-workout-link').click();

    const cart = page.locator('#exerciseCartContent');
    await expect(cart).toBeVisible();

    await cart.locator('a.btn-primary').click();
    await page.waitForURL(/workout-builder\.html/, { timeout: 10000 });
  });

  test('exercise toolbar has sort and filter controls', async ({ page }) => {
    await page.goto(`${BASE}/exercise-database.html`);
    await waitForAppReady(page);

    const toolbar = page.locator('#exerciseToolbar');
    await expect(toolbar).toBeAttached();

    const searchInput = page.locator('#exerciseSearchInput');
    await expect(searchInput).toBeAttached();
  });

  test('clearing search restores full exercise list', async ({ page }) => {
    await page.goto(`${BASE}/exercise-database.html`);
    await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });

    const searchInput = page.locator('#exerciseSearchInput');
    const initialCount = await page.locator('#exerciseTableContainer .card').count();

    // Filter
    await searchInput.fill('squat');
    await page.waitForTimeout(500);
    const filteredCount = await page.locator('#exerciseTableContainer .card').count();

    // Clear
    await searchInput.fill('');
    await page.waitForTimeout(500);
    const restoredCount = await page.locator('#exerciseTableContainer .card').count();

    expect(restoredCount).toBeGreaterThanOrEqual(filteredCount);
  });
});
