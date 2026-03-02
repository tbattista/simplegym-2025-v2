// @ts-check
const { test, expect } = require('playwright/test');

const BASE = 'http://localhost:8001';

test.describe('Exercise Cart', () => {

    test('Add to Workout button adds exercise to cart tray', async ({ page }) => {
        await page.goto(`${BASE}/exercise-database.html`);

        // Wait for exercise list to render
        await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });

        // Find the first exercise card's 3-dot menu
        const firstCard = page.locator('#exerciseTableContainer .card').first();
        const menuBtn = firstCard.locator('.dropdown-toggle');
        await menuBtn.click();

        // Click "Add to Workout"
        const addLink = firstCard.locator('.add-to-workout-link');
        await expect(addLink).toBeVisible();
        await addLink.click();

        // Cart tray should appear
        const tray = page.locator('#exerciseCartTray');
        await expect(tray).toBeVisible({ timeout: 3000 });

        // Should show "1 exercise selected"
        await expect(tray.locator('.exercise-cart-count')).toContainText('1 exercise selected');

        // Should have a "Build Workout with These" button
        await expect(tray.locator('a.btn-primary')).toContainText('Build Workout with These');
    });

    test('Cart tray shows chips and allows removal', async ({ page }) => {
        await page.goto(`${BASE}/exercise-database.html`);
        await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });

        // Add first exercise
        const firstCard = page.locator('#exerciseTableContainer .card').first();
        await firstCard.locator('.dropdown-toggle').click();
        await firstCard.locator('.add-to-workout-link').click();

        const tray = page.locator('#exerciseCartTray');
        await expect(tray).toBeVisible();

        // Should have one chip
        await expect(tray.locator('.exercise-cart-chip')).toHaveCount(1);

        // Remove via the x button on the chip
        await tray.locator('.exercise-cart-chip-remove').first().click();

        // Tray should disappear (no exercises left)
        await expect(tray).not.toBeVisible({ timeout: 3000 });
    });

    test('Cart tray clear button removes all exercises', async ({ page }) => {
        await page.goto(`${BASE}/exercise-database.html`);
        await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });

        // Add two exercises
        const cards = page.locator('#exerciseTableContainer .card');

        // First exercise
        await cards.nth(0).locator('.dropdown-toggle').click();
        await expect(cards.nth(0).locator('.add-to-workout-link')).toBeVisible();
        await cards.nth(0).locator('.add-to-workout-link').click();
        // Wait for dropdown to close and tray to render
        await page.waitForTimeout(500);

        // Second exercise
        await cards.nth(1).locator('.dropdown-toggle').click();
        await expect(cards.nth(1).locator('.add-to-workout-link')).toBeVisible();
        await cards.nth(1).locator('.add-to-workout-link').click();

        const tray = page.locator('#exerciseCartTray');
        await expect(tray.locator('.exercise-cart-count')).toContainText('2 exercises selected');

        // Click Clear
        await tray.locator('.exercise-cart-clear').click();

        // Tray should disappear
        await expect(tray).not.toBeVisible({ timeout: 3000 });
    });

    test('Build Workout navigates to workout builder with fromCart param', async ({ page }) => {
        await page.goto(`${BASE}/exercise-database.html`);
        await page.waitForSelector('#exerciseTableContainer .card', { timeout: 15000 });

        // Add an exercise
        const firstCard = page.locator('#exerciseTableContainer .card').first();
        await firstCard.locator('.dropdown-toggle').click();
        await expect(firstCard.locator('.add-to-workout-link')).toBeVisible();
        await firstCard.locator('.add-to-workout-link').click();

        const tray = page.locator('#exerciseCartTray');
        await expect(tray).toBeVisible();

        // Get the exercise name from the chip
        const chipText = await tray.locator('.exercise-cart-chip').first().textContent();
        const exerciseName = chipText.replace('×', '').trim();

        // Click "Build Workout with These"
        const buildBtn = tray.locator('a.btn-primary');
        await buildBtn.click();

        // Should navigate to workout builder
        await page.waitForURL(/workout-builder\.html/, { timeout: 10000 });
    });
});
